// src/utils/discountUtils.ts

import { validateDiscountCode, applyDiscountCode as applyDiscountToDatabase } from '../services/discountService';
import { DiscountValidation, DiscountUsage } from '../types/discount';

export interface DiscountApplicationResult {
  success: boolean;
  message: string;
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  usageRecord?: DiscountUsage;
}

/**
 * Apply a discount code to a purchase and record usage
 */
export const processDiscountCode = async (
  discountCode: string,
  itemType: 'class' | 'workshop' | 'package',
  itemId: string,
  itemName: string,
  originalAmount: number,
  userId?: string,
  userEmail?: string,
  userName?: string,
  appliedBy?: string,
  appliedByName?: string
): Promise<DiscountApplicationResult> => {
  try {
    // Validate the discount code
    const validation = await validateDiscountCode(
      discountCode,
      itemType,
      itemId,
      originalAmount,
      userId
    );

    if (!validation.isValid) {
      return {
        success: false,
        message: validation.error || 'Invalid discount code',
        originalAmount,
        discountAmount: 0,
        finalAmount: originalAmount,
      };
    }

    if (!validation.discount || validation.discountAmount === undefined || validation.finalAmount === undefined) {
      return {
        success: false,
        message: 'Error calculating discount amount',
        originalAmount,
        discountAmount: 0,
        finalAmount: originalAmount,
      };
    }

    // Apply the discount code to database
    const usageRecord = await applyDiscountToDatabase(validation.discount.id, {
      discountId: validation.discount.id,
      discountCode: validation.discount.code,
      userId,
      userEmail,
      userName,
      itemType,
      itemId,
      itemName,
      originalAmount,
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
      usedBy: appliedBy || 'system',
      usedByName: appliedByName || 'System',
    });

    return {
      success: true,
      message: `Discount applied: ${validation.discount.type === 'percentage' 
        ? `${validation.discount.value}% off` 
        : `$${validation.discount.value} off`}`,
      originalAmount,
      discountAmount: validation.discountAmount,
      finalAmount: validation.finalAmount,
      usageRecord,
    };

  } catch (error: any) {
    console.error('Error applying discount code:', error);
    return {
      success: false,
      message: error.message || 'Failed to apply discount code',
      originalAmount,
      discountAmount: 0,
      finalAmount: originalAmount,
    };
  }
};

/**
 * Preview discount without applying it
 */
export const previewDiscountCode = async (
  discountCode: string,
  itemType: 'class' | 'workshop' | 'package',
  itemId: string,
  originalAmount: number,
  userId?: string
): Promise<DiscountValidation> => {
  try {
    return await validateDiscountCode(
      discountCode,
      itemType,
      itemId,
      originalAmount,
      userId
    );
  } catch (error: any) {
    console.error('Error previewing discount code:', error);
    return {
      isValid: false,
      error: error.message || 'Failed to validate discount code',
    };
  }
};

/**
 * Format discount amount for display
 */
export const formatDiscountDisplay = (
  type: 'percentage' | 'fixed_amount',
  value: number
): string => {
  if (type === 'percentage') {
    return `${value}% OFF`;
  } else {
    return `$${value} OFF`;
  }
};

/**
 * Calculate savings percentage
 */
export const calculateSavingsPercentage = (
  originalAmount: number,
  finalAmount: number
): number => {
  if (originalAmount <= 0) return 0;
  return Math.round(((originalAmount - finalAmount) / originalAmount) * 100);
};

/**
 * Format discount code for display (uppercase, trim)
 */
export const formatDiscountCode = (code: string): string => {
  return code.toUpperCase().trim();
};

/**
 * Validate discount code format
 */
export const isValidDiscountCodeFormat = (code: string): boolean => {
  const trimmedCode = code.trim();
  
  // Must be at least 3 characters
  if (trimmedCode.length < 3) return false;
  
  // Must be alphanumeric (can include hyphens and underscores)
  const validPattern = /^[A-Za-z0-9\-_]+$/;
  return validPattern.test(trimmedCode);
};

export default {
  processDiscountCode,
  previewDiscountCode,
  formatDiscountDisplay,
  calculateSavingsPercentage,
  formatDiscountCode,
  isValidDiscountCodeFormat,
};