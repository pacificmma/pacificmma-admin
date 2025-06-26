// src/types/discounts.ts

import { Timestamp } from 'firebase/firestore';

// Discount code status
export type DiscountStatus = 'Active' | 'Expired' | 'Disabled' | 'Used Up';

// Discount type
export type DiscountType = 'percentage' | 'fixed_amount';

// What the discount applies to
export type DiscountAppliesTo = 'all' | 'classes' | 'workshops' | 'packages' | 'specific_items';

// Base discount data
export interface DiscountData {
  code: string; // The actual discount code (e.g., "SAVE20")
  name: string; // Display name (e.g., "20% Off Summer Classes")
  description?: string;
  
  // Discount details
  type: DiscountType;
  value: number; // Percentage (0-100) or fixed amount
  
  // Usage limits
  maxUses?: number; // Total number of uses allowed (undefined = unlimited)
  maxUsesPerUser?: number; // Max uses per user (undefined = unlimited)
  currentUses: number; // Track current usage
  
  // Date restrictions
  startDate: Timestamp;
  endDate?: Timestamp; // If undefined, doesn't expire by date
  
  // What it applies to
  appliesTo: DiscountAppliesTo;
  specificItemIds?: string[]; // If appliesTo is 'specific_items'
  
  // Minimum requirements
  minimumAmount?: number; // Minimum purchase amount
  
  // Status
  status: DiscountStatus;
  isActive: boolean;
  
  // System fields
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Admin who created this
  createdByName: string;
}

// Full discount record with ID
export interface DiscountRecord extends DiscountData {
  id: string;
}

// Form data for creating/editing discounts
export interface DiscountFormData {
  code: string;
  name: string;
  description?: string;
  type: DiscountType;
  value: number;
  maxUses?: number;
  maxUsesPerUser?: number;
  startDate: Date;
  endDate?: Date;
  appliesTo: DiscountAppliesTo;
  specificItemIds?: string[];
  minimumAmount?: number;
  isActive: boolean;
}

// Discount usage record
export interface DiscountUsage {
  id: string;
  discountId: string;
  discountCode: string;
  userId?: string; // Member who used it (if applicable)
  userEmail?: string;
  userName?: string;
  
  // What was purchased
  itemType: 'class' | 'workshop' | 'package';
  itemId: string;
  itemName: string;
  
  // Financial details
  originalAmount: number;
  discountAmount: number;
  finalAmount: number;
  
  // Metadata
  usedAt: Timestamp;
  usedBy: string; // Staff member who processed the sale
  usedByName: string;
  notes?: string;
}

// Discount validation result
export interface DiscountValidation {
  isValid: boolean;
  discount?: DiscountRecord;
  error?: string;
  discountAmount?: number;
  finalAmount?: number;
}

// Discount statistics
export interface DiscountStats {
  totalDiscounts: number;
  activeDiscounts: number;
  expiredDiscounts: number;
  disabledDiscounts: number;
  totalUsages: number;
  totalDiscountAmount: number;
  mostUsedDiscount?: {
    code: string;
    name: string;
    uses: number;
  };
}

export default DiscountData;