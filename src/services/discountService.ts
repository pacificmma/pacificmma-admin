// src/services/discountService.ts

import { db } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  Timestamp,
  DocumentData,
  query,
  orderBy,
  where,
  writeBatch,
  increment,
  limit,
} from 'firebase/firestore';

import {
  DiscountData,
  DiscountRecord,
  DiscountFormData,
  DiscountUsage,
  DiscountValidation,
  DiscountStats,
  DiscountStatus,
} from '../types/discount';

// CREATE DISCOUNT
export const createDiscount = async (
  formData: DiscountFormData,
  createdBy: string,
  createdByName: string
): Promise<DiscountRecord> => {
  try {
    console.log('Creating discount code:', formData.code);

    // Check if discount code already exists
    const existingDiscount = await getDiscountByCode(formData.code);
    if (existingDiscount) {
      throw new Error('Discount code already exists. Please choose a different code.');
    }

    // Convert form data to discount data
    const discountData: DiscountData = {
      code: formData.code.toUpperCase().trim(),
      name: formData.name.trim(),
      description: formData.description?.trim(),
      type: formData.type,
      value: formData.value,
      maxUses: formData.maxUses,
      maxUsesPerUser: formData.maxUsesPerUser,
      currentUses: 0,
      startDate: Timestamp.fromDate(formData.startDate),
      endDate: formData.endDate ? Timestamp.fromDate(formData.endDate) : undefined,
      appliesTo: formData.appliesTo,
      specificItemIds: formData.specificItemIds,
      minimumAmount: formData.minimumAmount,
      status: 'Active',
      isActive: formData.isActive,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
      createdByName,
    };

    // Validate data
    const validation = validateDiscountData(discountData);
    if (!validation.isValid) {
      throw new Error(validation.error);
    }

    const docRef = await addDoc(collection(db, 'discounts'), discountData);
    
    console.log('Discount created successfully with ID:', docRef.id);
    
    return {
      id: docRef.id,
      ...discountData,
    };
  } catch (error) {
    console.error('Error creating discount:', error);
    throw error;
  }
};

// GET ALL DISCOUNTS
export const getAllDiscounts = async (): Promise<DiscountRecord[]> => {
  try {
    console.log('Fetching all discounts...');
    const discountsRef = collection(db, 'discounts');
    const q = query(discountsRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const discountList: DiscountRecord[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data() as DocumentData;
      
      // Update status based on current date and usage
      const currentStatus = calculateDiscountStatus(docData);
      
      discountList.push({
        id: doc.id,
        code: docData.code,
        name: docData.name,
        description: docData.description,
        type: docData.type,
        value: docData.value,
        maxUses: docData.maxUses,
        maxUsesPerUser: docData.maxUsesPerUser,
        currentUses: docData.currentUses || 0,
        startDate: docData.startDate,
        endDate: docData.endDate,
        appliesTo: docData.appliesTo,
        specificItemIds: docData.specificItemIds,
        minimumAmount: docData.minimumAmount,
        status: currentStatus,
        isActive: docData.isActive ?? true,
        createdAt: docData.createdAt,
        updatedAt: docData.updatedAt,
        createdBy: docData.createdBy,
        createdByName: docData.createdByName,
      });
    });

    console.log(`Found ${discountList.length} discounts`);
    return discountList;
  } catch (error) {
    console.error('Error fetching discounts:', error);
    throw new Error('Failed to load discounts. Please try again.');
  }
};

// GET DISCOUNT BY CODE
export const getDiscountByCode = async (code: string): Promise<DiscountRecord | null> => {
  try {
    const discountsRef = collection(db, 'discounts');
    const q = query(discountsRef, where('code', '==', code.toUpperCase().trim()));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const doc = snapshot.docs[0];
    const docData = doc.data() as DocumentData;
    
    return {
      id: doc.id,
      ...docData,
    } as DiscountRecord;
  } catch (error) {
    console.error('Error fetching discount by code:', error);
    return null;
  }
};

// UPDATE DISCOUNT
export const updateDiscount = async (
  discountId: string,
  formData: Partial<DiscountFormData>,
  updatedBy: string
): Promise<boolean> => {
  try {
    console.log(`Updating discount ${discountId}`);
    
    const updateData: any = {
      ...formData,
      updatedAt: Timestamp.now(),
    };

    // Handle date conversions
    if (formData.startDate) {
      updateData.startDate = Timestamp.fromDate(formData.startDate);
    }
    if (formData.endDate) {
      updateData.endDate = Timestamp.fromDate(formData.endDate);
    }

    // Uppercase the code if provided
    if (formData.code) {
      updateData.code = formData.code.toUpperCase().trim();
      
      // Check if new code conflicts with existing codes (excluding current discount)
      const existingDiscount = await getDiscountByCode(updateData.code);
      if (existingDiscount && existingDiscount.id !== discountId) {
        throw new Error('Discount code already exists. Please choose a different code.');
      }
    }

    await updateDoc(doc(db, 'discounts', discountId), updateData);

    console.log('Discount updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating discount:', error);
    throw error;
  }
};

// DELETE DISCOUNT
export const deleteDiscount = async (discountId: string): Promise<boolean> => {
  try {
    console.log(`Deleting discount ${discountId}`);
    
    // Check if discount has been used
    const usages = await getDiscountUsages(discountId, 1);
    if (usages.length > 0) {
      // Don't delete if it has been used, just disable it
      await updateDoc(doc(db, 'discounts', discountId), {
        isActive: false,
        status: 'Disabled',
        updatedAt: Timestamp.now(),
      });
      console.log('Discount disabled instead of deleted (has usage history)');
    } else {
      // Safe to delete if never used
      await deleteDoc(doc(db, 'discounts', discountId));
      console.log('Discount deleted successfully');
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting discount:', error);
    throw new Error('Failed to delete discount. Please try again.');
  }
};

// VALIDATE DISCOUNT FOR USE
export const validateDiscountCode = async (
  code: string,
  itemType: 'class' | 'workshop' | 'package',
  itemId: string,
  amount: number,
  userId?: string
): Promise<DiscountValidation> => {
  try {
    const discount = await getDiscountByCode(code);
    
    if (!discount) {
      return {
        isValid: false,
        error: 'Invalid discount code',
      };
    }

    // Check if discount is active
    if (!discount.isActive) {
      return {
        isValid: false,
        error: 'This discount code is no longer active',
      };
    }

    // Check start date
    const now = new Date();
    const startDate = discount.startDate.toDate();
    if (now < startDate) {
      return {
        isValid: false,
        error: 'This discount code is not yet active',
      };
    }

    // Check end date
    if (discount.endDate && now > discount.endDate.toDate()) {
      return {
        isValid: false,
        error: 'This discount code has expired',
      };
    }

    // Check usage limits
    if (discount.maxUses && discount.currentUses >= discount.maxUses) {
      return {
        isValid: false,
        error: 'This discount code has reached its usage limit',
      };
    }

    // Check per-user usage limits
    if (discount.maxUsesPerUser && userId) {
      const userUsages = await getUserDiscountUsages(userId, discount.id);
      if (userUsages >= discount.maxUsesPerUser) {
        return {
          isValid: false,
          error: 'You have reached the maximum number of uses for this discount code',
        };
      }
    }

    // Check minimum amount
    if (discount.minimumAmount && amount < discount.minimumAmount) {
      return {
        isValid: false,
        error: `Minimum purchase amount of $${discount.minimumAmount} required for this discount`,
      };
    }

    // Check what discount applies to
    if (discount.appliesTo !== 'all') {
      if (discount.appliesTo === 'specific_items') {
        if (!discount.specificItemIds?.includes(itemId)) {
          return {
            isValid: false,
            error: 'This discount code does not apply to the selected item',
          };
        }
      } else {
        // Map itemType to discount applies format
        const itemTypeToApplies = {
          'class': 'classes',
          'workshop': 'workshops', 
          'package': 'packages'
        } as const;
        
        const mappedItemType = itemTypeToApplies[itemType];
        
        if (discount.appliesTo !== mappedItemType && 
            !(discount.appliesTo === 'classes' && itemType === 'workshop')) {
          // Allow 'classes' discount to work on workshops too
          return {
            isValid: false,
            error: `This discount code only applies to ${discount.appliesTo}`,
          };
        }
      }
    }

    // Calculate discount amount
    let discountAmount = 0;
    if (discount.type === 'percentage') {
      discountAmount = Math.round((amount * (discount.value / 100)) * 100) / 100;
    } else {
      discountAmount = Math.min(discount.value, amount); // Can't discount more than the total
    }

    const finalAmount = Math.max(0, amount - discountAmount);

    return {
      isValid: true,
      discount,
      discountAmount,
      finalAmount,
    };
  } catch (error) {
    console.error('Error validating discount code:', error);
    return {
      isValid: false,
      error: 'Error validating discount code',
    };
  }
};

// APPLY DISCOUNT CODE
export const applyDiscountCode = async (
  discountId: string,
  usage: Omit<DiscountUsage, 'id' | 'usedAt'>
): Promise<DiscountUsage> => {
  try {
    console.log(`Using discount code: ${usage.discountCode}`);
    
    const batch = writeBatch(db);
    
    // Add usage record
    const usageRef = doc(collection(db, 'discountUsages'));
    const usageData = {
      ...usage,
      usedAt: Timestamp.now(),
    };
    batch.set(usageRef, usageData);
    
    // Increment usage count on discount
    const discountRef = doc(db, 'discounts', discountId);
    batch.update(discountRef, {
      currentUses: increment(1),
      updatedAt: Timestamp.now(),
    });
    
    await batch.commit();
    
    console.log('Discount code used successfully');
    
    return {
      id: usageRef.id,
      ...usageData,
    };
  } catch (error) {
    console.error('Error using discount code:', error);
    throw new Error('Failed to apply discount code');
  }
};

// GET DISCOUNT USAGES
export const getDiscountUsages = async (
  discountId: string,
  limitCount?: number
): Promise<DiscountUsage[]> => {
  try {
    const usagesRef = collection(db, 'discountUsages');
    let q = query(
      usagesRef,
      where('discountId', '==', discountId),
      orderBy('usedAt', 'desc')
    );
    
    if (limitCount) {
      q = query(q, limit(limitCount));
    }
    
    const snapshot = await getDocs(q);
    const usages: DiscountUsage[] = [];
    
    snapshot.forEach((doc) => {
      usages.push({
        id: doc.id,
        ...doc.data(),
      } as DiscountUsage);
    });
    
    return usages;
  } catch (error) {
    console.error('Error fetching discount usages:', error);
    return [];
  }
};

// GET USER DISCOUNT USAGE COUNT
export const getUserDiscountUsages = async (
  userId: string,
  discountId: string
): Promise<number> => {
  try {
    const usagesRef = collection(db, 'discountUsages');
    const q = query(
      usagesRef,
      where('userId', '==', userId),
      where('discountId', '==', discountId)
    );
    
    const snapshot = await getDocs(q);
    return snapshot.size;
  } catch (error) {
    console.error('Error fetching user discount usages:', error);
    return 0;
  }
};

// GET DISCOUNT STATISTICS
export const getDiscountStats = async (): Promise<DiscountStats> => {
  try {
    console.log('Calculating discount statistics...');
    
    const discounts = await getAllDiscounts();
    const usagesRef = collection(db, 'discountUsages');
    const usagesSnapshot = await getDocs(usagesRef);
    
    const stats: DiscountStats = {
      totalDiscounts: discounts.length,
      activeDiscounts: 0,
      expiredDiscounts: 0,
      disabledDiscounts: 0,
      totalUsages: usagesSnapshot.size,
      totalDiscountAmount: 0,
    };
    
    // Count discount statuses
    discounts.forEach(discount => {
      switch (discount.status) {
        case 'Active':
          stats.activeDiscounts++;
          break;
        case 'Expired':
          stats.expiredDiscounts++;
          break;
        case 'Disabled':
          stats.disabledDiscounts++;
          break;
      }
    });
    
    // Calculate total discount amount and find most used
    const usageCounts: Record<string, { count: number; code: string; name: string }> = {};
    
    usagesSnapshot.forEach((doc) => {
      const usage = doc.data() as DiscountUsage;
      stats.totalDiscountAmount += usage.discountAmount;
      
      if (usageCounts[usage.discountId]) {
        usageCounts[usage.discountId].count++;
      } else {
        usageCounts[usage.discountId] = {
          count: 1,
          code: usage.discountCode,
          name: usage.discountCode, // Fallback to code if name not available
        };
      }
    });
    
    // Find most used discount
    let maxUses = 0;
    Object.values(usageCounts).forEach(usage => {
      if (usage.count > maxUses) {
        maxUses = usage.count;
        stats.mostUsedDiscount = {
          code: usage.code,
          name: usage.name,
          uses: usage.count,
        };
      }
    });
    
    console.log('Discount statistics calculated:', stats);
    return stats;
  } catch (error) {
    console.error('Error calculating discount stats:', error);
    throw new Error('Failed to calculate discount statistics.');
  }
};

// HELPER FUNCTIONS

// Calculate discount status based on current date and usage
const calculateDiscountStatus = (discountData: DocumentData): DiscountStatus => {
  if (!discountData.isActive) return 'Disabled';
  
  const now = new Date();
  const startDate = discountData.startDate.toDate();
  const endDate = discountData.endDate?.toDate();
  
  // Check if not started yet
  if (now < startDate) return 'Active'; // Still considered active, just not usable yet
  
  // Check if expired by date
  if (endDate && now > endDate) return 'Expired';
  
  // Check if used up
  if (discountData.maxUses && 
      discountData.currentUses >= discountData.maxUses) {
    return 'Used Up';
  }
  
  return 'Active';
};

// Validate discount data
const validateDiscountData = (data: DiscountData): { isValid: boolean; error?: string } => {
  if (!data.code || data.code.length < 3) {
    return { isValid: false, error: 'Discount code must be at least 3 characters long' };
  }
  
  if (!data.name.trim()) {
    return { isValid: false, error: 'Discount name is required' };
  }
  
  if (data.type === 'percentage' && (data.value < 1 || data.value > 100)) {
    return { isValid: false, error: 'Percentage must be between 1 and 100' };
  }
  
  if (data.type === 'fixed_amount' && data.value <= 0) {
    return { isValid: false, error: 'Fixed amount must be greater than 0' };
  }
  
  if (data.maxUses && data.maxUses < 1) {
    return { isValid: false, error: 'Maximum uses must be at least 1' };
  }
  
  if (data.maxUsesPerUser && data.maxUsesPerUser < 1) {
    return { isValid: false, error: 'Maximum uses per user must be at least 1' };
  }
  
  if (data.endDate && data.endDate.toMillis() <= data.startDate.toMillis()) {
    return { isValid: false, error: 'End date must be after start date' };
  }
  
  return { isValid: true };
};

export default {
  createDiscount,
  getAllDiscounts,
  getDiscountByCode,
  updateDiscount,
  deleteDiscount,
  validateDiscountCode,
  applyDiscountCode,
  getDiscountUsages,
  getUserDiscountUsages,
  getDiscountStats,
};