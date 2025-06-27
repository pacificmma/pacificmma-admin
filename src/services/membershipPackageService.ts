// src/services/membershipPackageService.ts
import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  MembershipPackageFormData,
  MembershipPackageRecord,
  PackageUsageStats,
  SportCategoryDefinition,
  MembershipSubscription,
  PackageFilterOptions,
  PackageSortOptions,
  PackageSearchParams,
  PackageListResponse,
} from '../types/membershipPackages';

// Collection names
const PACKAGES_COLLECTION = 'membershipPackages';
const SUBSCRIPTIONS_COLLECTION = 'membershipSubscriptions';
const SPORT_CATEGORIES_COLLECTION = 'sportCategories';

// Default sport categories
export const SPORT_CATEGORIES: SportCategoryDefinition[] = [
  {
    id: 'all',
    name: 'All Sports',
    description: 'Full access to all sports and activities',
    icon: '🏆',
    color: '#1976d2',
    isActive: true,
    displayOrder: 0,
  },
  {
    id: 'bjj',
    name: 'Brazilian Jiu-Jitsu',
    description: 'BJJ classes and open mats',
    icon: '🥋',
    color: '#7b1fa2',
    isActive: true,
    displayOrder: 1,
  },
  {
    id: 'muay_thai',
    name: 'Muay Thai',
    description: 'Traditional Thai boxing',
    icon: '🥊',
    color: '#d32f2f',
    isActive: true,
    displayOrder: 2,
  },
  {
    id: 'boxing',
    name: 'Boxing',
    description: 'Boxing training and sparring',
    icon: '🥊',
    color: '#f57c00',
    isActive: true,
    displayOrder: 3,
  },
  {
    id: 'mma',
    name: 'Mixed Martial Arts',
    description: 'MMA training and technique',
    icon: '🥇',
    color: '#388e3c',
    isActive: true,
    displayOrder: 4,
  },
  {
    id: 'kickboxing',
    name: 'Kickboxing',
    description: 'Cardio kickboxing classes',
    icon: '🦵',
    color: '#e91e63',
    isActive: true,
    displayOrder: 5,
  },
  {
    id: 'wrestling',
    name: 'Wrestling',
    description: 'Wrestling technique and conditioning',
    icon: '🤼',
    color: '#795548',
    isActive: true,
    displayOrder: 6,
  },
  {
    id: 'fitness',
    name: 'Fitness & Conditioning',
    description: 'General fitness and strength training',
    icon: '💪',
    color: '#607d8b',
    isActive: true,
    displayOrder: 7,
  },
];

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp?.toDate) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date(timestamp);
};

// Helper function to convert Firestore document to MembershipPackageRecord
const convertDocToPackageRecord = (doc: any): MembershipPackageRecord => {
  const data = doc.data();
  return {
    id: doc.id,
    name: data.name,
    description: data.description || '',
    duration: data.duration,
    durationType: data.durationType,
    price: data.price,
    sportCategories: data.sportCategories || [],
    isFullAccess: data.isFullAccess || false,
    isUnlimited: data.isUnlimited || true,
    classLimitPerWeek: data.classLimitPerWeek,
    classLimitPerMonth: data.classLimitPerMonth,
    allowFreeze: data.allowFreeze ?? true,
    maxFreezeMonths: data.maxFreezeMonths,
    minFreezeWeeks: data.minFreezeWeeks,
    guestPassesIncluded: data.guestPassesIncluded || 0,
    autoRenewal: data.autoRenewal || false,
    renewalDiscountPercent: data.renewalDiscountPercent,
    earlyTerminationFee: data.earlyTerminationFee,
    minimumCommitmentMonths: data.minimumCommitmentMonths,
    status: data.status || 'Active',
    isPopular: data.isPopular || false,
    displayOrder: data.displayOrder || 1,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    lastModifiedBy: data.lastModifiedBy,
    lastModifiedByName: data.lastModifiedByName,
  };
};

/**
 * Create a new membership package
 */
export const createMembershipPackage = async (
  packageData: MembershipPackageFormData,
  userId: string,
  userName: string
): Promise<string> => {
  try {
    const now = Timestamp.now();
    
    const docData = {
      ...packageData,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      createdByName: userName,
    };

    const docRef = await addDoc(collection(db, PACKAGES_COLLECTION), docData);
    return docRef.id;
  } catch (error) {
    console.error('Error creating membership package:', error);
    throw new Error('Failed to create membership package');
  }
};

/**
 * Update an existing membership package
 */
export const updateMembershipPackage = async (
  packageId: string,
  updates: Partial<MembershipPackageFormData>,
  userId?: string,
  userName?: string
): Promise<void> => {
  try {
    const packageRef = doc(db, PACKAGES_COLLECTION, packageId);
    
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now(),
    };

    if (userId && userName) {
      updateData.lastModifiedBy = userId;
      updateData.lastModifiedByName = userName;
    }

    await updateDoc(packageRef, updateData);
  } catch (error) {
    console.error('Error updating membership package:', error);
    throw new Error('Failed to update membership package');
  }
};

/**
 * Delete a membership package
 */
export const deleteMembershipPackage = async (packageId: string): Promise<void> => {
  try {
    // Check if package has active subscriptions
    const subscriptionsQuery = query(
      collection(db, SUBSCRIPTIONS_COLLECTION),
      where('packageId', '==', packageId),
      where('status', 'in', ['Active', 'Paused'])
    );
    
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    
    if (!subscriptionsSnapshot.empty) {
      throw new Error('Cannot delete package with active subscriptions. Please cancel all subscriptions first.');
    }

    const packageRef = doc(db, PACKAGES_COLLECTION, packageId);
    await deleteDoc(packageRef);
  } catch (error) {
    console.error('Error deleting membership package:', error);
    throw error;
  }
};

/**
 * Get a single membership package by ID
 */
export const getMembershipPackage = async (packageId: string): Promise<MembershipPackageRecord | null> => {
  try {
    const packageRef = doc(db, PACKAGES_COLLECTION, packageId);
    const packageSnap = await getDoc(packageRef);
    
    if (!packageSnap.exists()) {
      return null;
    }

    return convertDocToPackageRecord(packageSnap);
  } catch (error) {
    console.error('Error getting membership package:', error);
    throw new Error('Failed to get membership package');
  }
};

/**
 * Get all membership packages - Updated to avoid index issues
 */
export const getAllMembershipPackages = async (): Promise<MembershipPackageRecord[]> => {
  try {
    // Basit sorgu - sadece tek bir orderBy kullan
    const packagesQuery = query(
      collection(db, PACKAGES_COLLECTION),
      orderBy('displayOrder', 'asc')
    );
    
    const snapshot = await getDocs(packagesQuery);
    
    const packages = snapshot.docs.map(convertDocToPackageRecord);
    
    // Client-side sorting için createdAt'a göre sıralama
    return packages.sort((a, b) => {
      // Önce displayOrder'a göre sırala
      if (a.displayOrder !== b.displayOrder) {
        return a.displayOrder - b.displayOrder;
      }
      // Sonra createdAt'a göre (yeni olanlar önce)
      return b.createdAt.getTime() - a.createdAt.getTime();
    });
  } catch (error) {
    console.error('Error getting membership packages:', error);
    throw new Error('Failed to get membership packages');
  }
};

/**
 * Get active membership packages only - Updated
 */
export const getActiveMembershipPackages = async (): Promise<MembershipPackageRecord[]> => {
  try {
    // Sadece status filtresi ve tek orderBy
    const packagesQuery = query(
      collection(db, PACKAGES_COLLECTION),
      where('status', '==', 'Active'),
      orderBy('displayOrder', 'asc')
    );
    
    const snapshot = await getDocs(packagesQuery);
    
    return snapshot.docs.map(convertDocToPackageRecord);
  } catch (error) {
    console.error('Error getting active membership packages:', error);
    
    // Fallback: Tüm paketleri al ve client-side filtrele
    try {
      const allPackages = await getAllMembershipPackages();
      return allPackages.filter(pkg => pkg.status === 'Active');
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      throw new Error('Failed to get active membership packages');
    }
  }
};

/**
 * Search and filter membership packages
 */
export const searchMembershipPackages = async (
  searchParams: PackageSearchParams
): Promise<PackageListResponse> => {
  try {
    let packagesQuery = collection(db, PACKAGES_COLLECTION);
    let constraints: any[] = [];

    // Apply filters
    if (searchParams.filters) {
      const { status, priceRange, sportCategories, isPopular, isFullAccess, isUnlimited } = searchParams.filters;
      
      if (status && status.length > 0) {
        constraints.push(where('status', 'in', status));
      }
      
      if (priceRange) {
        if (priceRange.min !== undefined) {
          constraints.push(where('price', '>=', priceRange.min));
        }
        if (priceRange.max !== undefined) {
          constraints.push(where('price', '<=', priceRange.max));
        }
      }
      
      if (sportCategories && sportCategories.length > 0) {
        constraints.push(where('sportCategories', 'array-contains-any', sportCategories));
      }
      
      if (isPopular !== undefined) {
        constraints.push(where('isPopular', '==', isPopular));
      }
      
      if (isFullAccess !== undefined) {
        constraints.push(where('isFullAccess', '==', isFullAccess));
      }
      
      if (isUnlimited !== undefined) {
        constraints.push(where('isUnlimited', '==', isUnlimited));
      }
    }

    // Apply sorting
    if (searchParams.sort) {
      const { field, direction } = searchParams.sort;
      constraints.push(orderBy(field, direction));
    } else {
      constraints.push(orderBy('displayOrder', 'asc'));
    }

    // Apply pagination
    const pageLimit = searchParams.limit || 20;
    constraints.push(limit(pageLimit));

    const q = query(packagesQuery, ...constraints);
    const snapshot = await getDocs(q);
    
    const packages = snapshot.docs.map(convertDocToPackageRecord);
    
    // Filter by search query if provided (client-side filtering for text search)
    let filteredPackages = packages;
    if (searchParams.query) {
      const searchLower = searchParams.query.toLowerCase();
      filteredPackages = packages.filter(pkg => 
        pkg.name.toLowerCase().includes(searchLower) ||
        (pkg.description && pkg.description.toLowerCase().includes(searchLower))
      );
    }

    return {
      packages: filteredPackages,
      total: filteredPackages.length,
      page: searchParams.page || 1,
      limit: pageLimit,
      hasNext: filteredPackages.length === pageLimit,
      hasPrev: (searchParams.page || 1) > 1,
    };
  } catch (error) {
    console.error('Error searching membership packages:', error);
    throw new Error('Failed to search membership packages');
  }
};

/**
 * Get package usage statistics
 */
export const getPackageUsageStats = async (packageId: string): Promise<PackageUsageStats> => {
  try {
    // Get all subscriptions for this package
    const subscriptionsQuery = query(
      collection(db, SUBSCRIPTIONS_COLLECTION),
      where('packageId', '==', packageId)
    );
    
    const subscriptionsSnapshot = await getDocs(subscriptionsQuery);
    const subscriptions = subscriptionsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as MembershipSubscription[];

    // Calculate statistics
    const totalSubscriptions = subscriptions.length;
    const activeSubscriptions = subscriptions.filter(sub => sub.status === 'Active').length;
    const pausedSubscriptions = subscriptions.filter(sub => sub.status === 'Paused').length;
    const cancelledSubscriptions = subscriptions.filter(sub => sub.status === 'Cancelled').length;
    
    const totalRevenue = subscriptions.reduce((sum, sub) => sum + (sub.amountPaid || 0), 0);
    
    // Mock data for ratings and reviews (would come from a reviews collection)
    const averageRating = 4.2 + Math.random() * 0.6; // Mock: 4.2-4.8
    const totalReviews = Math.floor(totalSubscriptions * 0.3); // Mock: 30% review rate
    
    const stats: PackageUsageStats = {
      packageId,
      totalSubscriptions,
      activeSubscriptions,
      pausedSubscriptions,
      cancelledSubscriptions,
      totalRevenue,
      averageRating: parseFloat(averageRating.toFixed(1)),
      totalReviews,
      conversionRate: totalSubscriptions > 0 ? 65 + Math.random() * 20 : 0, // Mock: 65-85%
      churnRate: totalSubscriptions > 0 ? Math.random() * 15 : 0, // Mock: 0-15%
      averageLifetimeValue: totalSubscriptions > 0 ? totalRevenue / totalSubscriptions : 0,
    };

    return stats;
  } catch (error) {
    console.error('Error getting package usage stats:', error);
    return {
      packageId,
      totalSubscriptions: 0,
      activeSubscriptions: 0,
      pausedSubscriptions: 0,
      cancelledSubscriptions: 0,
      totalRevenue: 0,
    };
  }
};

/**
 * Get popular packages (based on subscription count)
 */
export const getPopularPackages = async (limitCount: number = 5): Promise<MembershipPackageRecord[]> => {
  try {
    const packages = await getAllMembershipPackages();
    
    // Get stats for each package and sort by popularity
    const packagesWithStats = await Promise.all(
      packages.map(async (pkg) => {
        const stats = await getPackageUsageStats(pkg.id);
        return { package: pkg, stats };
      })
    );

    // Sort by total subscriptions and take top N
    const sortedPackages = packagesWithStats
      .sort((a, b) => b.stats.totalSubscriptions - a.stats.totalSubscriptions)
      .slice(0, limitCount)
      .map(item => item.package);

    return sortedPackages;
  } catch (error) {
    console.error('Error getting popular packages:', error);
    throw new Error('Failed to get popular packages');
  }
};

/**
 * Bulk update package display orders
 */
export const updatePackageDisplayOrders = async (
  updates: Array<{ packageId: string; displayOrder: number }>
): Promise<void> => {
  try {
    const batch = writeBatch(db);
    
    updates.forEach(({ packageId, displayOrder }) => {
      const packageRef = doc(db, PACKAGES_COLLECTION, packageId);
      batch.update(packageRef, { 
        displayOrder, 
        updatedAt: Timestamp.now() 
      });
    });

    await batch.commit();
  } catch (error) {
    console.error('Error updating package display orders:', error);
    throw new Error('Failed to update package display orders');
  }
};

/**
 * Clone/duplicate a package
 */
export const cloneMembershipPackage = async (
  packageId: string,
  newName: string,
  userId: string,
  userName: string
): Promise<string> => {
  try {
    const originalPackage = await getMembershipPackage(packageId);
    if (!originalPackage) {
      throw new Error('Original package not found');
    }

    const clonedData: MembershipPackageFormData = {
      ...originalPackage,
      name: newName,
      status: 'Inactive', // Start cloned packages as inactive
      isPopular: false, // Don't copy popular status
      displayOrder: originalPackage.displayOrder + 1,
    };

    return await createMembershipPackage(clonedData, userId, userName);
  } catch (error) {
    console.error('Error cloning membership package:', error);
    throw new Error('Failed to clone membership package');
  }
};

/**
 * Get packages by sport category
 */
export const getPackagesBySportCategory = async (categoryId: string): Promise<MembershipPackageRecord[]> => {
  try {
    let packagesQuery;
    
    if (categoryId === 'all') {
      packagesQuery = query(
        collection(db, PACKAGES_COLLECTION),
        where('isFullAccess', '==', true),
        where('status', '==', 'Active'),
        orderBy('displayOrder', 'asc')
      );
    } else {
      packagesQuery = query(
        collection(db, PACKAGES_COLLECTION),
        where('sportCategories', 'array-contains', categoryId),
        where('status', '==', 'Active'),
        orderBy('displayOrder', 'asc')
      );
    }
    
    const snapshot = await getDocs(packagesQuery);
    return snapshot.docs.map(convertDocToPackageRecord);
  } catch (error) {
    console.error('Error getting packages by sport category:', error);
    throw new Error('Failed to get packages by sport category');
  }
};

/**
 * Validate package data
 */
export const validatePackageData = (data: MembershipPackageFormData): string[] => {
  const errors: string[] = [];
  
  if (!data.name || data.name.trim().length < 3) {
    errors.push('Package name must be at least 3 characters long');
  }
  
  if (data.duration <= 0) {
    errors.push('Duration must be greater than 0');
  }
  
  if (data.price < 0) {
    errors.push('Price cannot be negative');
  }
  
  if (!data.isFullAccess && data.sportCategories.length === 0) {
    errors.push('Must select at least one sport category or enable full access');
  }
  
  if (!data.isUnlimited) {
    if (!data.classLimitPerWeek && !data.classLimitPerMonth) {
      errors.push('Must specify either weekly or monthly class limit for limited packages');
    }
  }
  
  if (data.renewalDiscountPercent && (data.renewalDiscountPercent < 0 || data.renewalDiscountPercent > 100)) {
    errors.push('Renewal discount must be between 0 and 100 percent');
  }
  
  if (data.maxFreezeMonths && data.maxFreezeMonths < 1) {
    errors.push('Maximum freeze months must be at least 1');
  }
  
  if (data.minFreezeWeeks && data.minFreezeWeeks < 1) {
    errors.push('Minimum freeze weeks must be at least 1');
  }
  
  return errors;
};