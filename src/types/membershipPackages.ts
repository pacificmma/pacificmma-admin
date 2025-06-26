// src/types/membershipPackages.ts

export type DurationType = 'months' | 'weeks' | 'days';
export type MembershipPackageStatus = 'Active' | 'Inactive' | 'Archived';
export type SportCategory = string; // Sport category IDs

// Base form data interface for creating/updating packages
export interface MembershipPackageFormData {
  name: string;
  description?: string;
  duration: number;
  durationType: DurationType;
  price: number;
  
  // Access control
  sportCategories: SportCategory[];
  isFullAccess: boolean;
  
  // Usage limits
  isUnlimited: boolean;
  classLimitPerWeek?: number;
  classLimitPerMonth?: number;
  
  // Policies
  allowFreeze: boolean;
  maxFreezeMonths?: number;
  minFreezeWeeks?: number;
  guestPassesIncluded?: number;
  
  // Renewal and commitment
  autoRenewal: boolean;
  renewalDiscountPercent?: number;
  earlyTerminationFee?: number;
  minimumCommitmentMonths?: number;
  
  // Status and display
  status: MembershipPackageStatus;
  isPopular: boolean;
  displayOrder: number;
}

// Full record interface (includes Firebase metadata)
export interface MembershipPackageRecord extends MembershipPackageFormData {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
  lastModifiedBy?: string;
  lastModifiedByName?: string;
}

// Package usage statistics
export interface PackageUsageStats {
  packageId: string;
  totalSubscriptions: number;
  activeSubscriptions: number;
  pausedSubscriptions: number;
  cancelledSubscriptions: number;
  totalRevenue: number;
  averageRating?: number;
  totalReviews?: number;
  conversionRate?: number; // percentage of inquiries that convert to purchases
  churnRate?: number; // percentage of subscribers who cancel
  averageLifetimeValue?: number;
  popularityRank?: number;
}

// Sport category definition
export interface SportCategoryDefinition {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  isActive: boolean;
  displayOrder: number;
}

// Subscription record (when a user purchases a package)
export interface MembershipSubscription {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  packageId: string;
  packageName: string;
  
  // Subscription details
  startDate: Date;
  endDate: Date;
  status: 'Active' | 'Paused' | 'Cancelled' | 'Expired';
  
  // Payment info
  amountPaid: number;
  paymentMethod?: string;
  paymentDate: Date;
  paymentId?: string;
  
  // Usage tracking
  classesAttended: number;
  classesRemaining?: number; // for limited packages
  guestPassesUsed: number;
  guestPassesRemaining: number;
  
  // Freeze/pause info
  pausedAt?: Date;
  pauseReason?: string;
  pauseDuration?: number; // in days
  
  // Renewal info
  isAutoRenewal: boolean;
  nextRenewalDate?: Date;
  renewalNotificationSent?: boolean;
  
  // Cancellation info
  cancelledAt?: Date;
  cancellationReason?: string;
  refundAmount?: number;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  notes?: string;
}

// Package inquiry/lead tracking
export interface PackageInquiry {
  id: string;
  packageId: string;
  packageName: string;
  
  // User info
  userId?: string; // if logged in user
  name: string;
  email: string;
  phone?: string;
  
  // Inquiry details
  inquiryDate: Date;
  source: 'website' | 'phone' | 'email' | 'walkin' | 'referral' | 'social';
  status: 'New' | 'Contacted' | 'Scheduled' | 'Converted' | 'Lost';
  
  // Follow-up info
  followUpDate?: Date;
  assignedTo?: string;
  assignedToName?: string;
  notes?: string;
  
  // Conversion tracking
  convertedAt?: Date;
  subscriptionId?: string;
  lostReason?: string;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
}

// Package review/feedback
export interface PackageReview {
  id: string;
  packageId: string;
  subscriptionId: string;
  userId: string;
  userName: string;
  
  // Review content
  rating: number; // 1-5 stars
  title?: string;
  comment?: string;
  
  // Review metadata
  isVerifiedPurchase: boolean;
  isPublic: boolean;
  helpfulVotes: number;
  reportCount: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  
  // Moderation
  isModerated: boolean;
  moderatedBy?: string;
  moderationNotes?: string;
}

// Package comparison data
export interface PackageComparison {
  packageIds: string[];
  comparisonDate: Date;
  metrics: {
    [packageId: string]: {
      subscriptions: number;
      revenue: number;
      rating: number;
      churnRate: number;
    };
  };
}

// Package promotion/discount
export interface PackagePromotion {
  id: string;
  packageIds: string[]; // packages this promotion applies to
  
  // Promotion details
  name: string;
  description?: string;
  discountType: 'percentage' | 'fixed' | 'freeDays';
  discountValue: number;
  
  // Validity
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  
  // Usage limits
  maxUses?: number;
  usesCount: number;
  maxUsesPerUser?: number;
  
  // Conditions
  requiresCode: boolean;
  promoCode?: string;
  minPurchaseAmount?: number;
  newUsersOnly?: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  createdByName: string;
}

// Package analytics data
export interface PackageAnalytics {
  packageId: string;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: Date;
  endDate: Date;
  
  metrics: {
    views: number;
    inquiries: number;
    conversions: number;
    revenue: number;
    newSubscriptions: number;
    renewals: number;
    cancellations: number;
    activeSubscriptions: number;
    averageRating: number;
    totalReviews: number;
  };
  
  trends: {
    viewsChange: number; // percentage change from previous period
    conversionsChange: number;
    revenueChange: number;
    ratingsChange: number;
  };
}

// Form validation rules
export interface PackageValidationRules {
  name: {
    required: boolean;
    minLength: number;
    maxLength: number;
  };
  price: {
    required: boolean;
    min: number;
    max: number;
  };
  duration: {
    required: boolean;
    min: number;
    max: number;
  };
  classLimits: {
    weeklyMax: number;
    monthlyMax: number;
  };
  freezeLimits: {
    maxMonths: number;
    minWeeks: number;
  };
}

// Export default validation rules
export const DEFAULT_VALIDATION_RULES: PackageValidationRules = {
  name: {
    required: true,
    minLength: 3,
    maxLength: 100,
  },
  price: {
    required: true,
    min: 0,
    max: 10000,
  },
  duration: {
    required: true,
    min: 1,
    max: 24, // months
  },
  classLimits: {
    weeklyMax: 20,
    monthlyMax: 100,
  },
  freezeLimits: {
    maxMonths: 12,
    minWeeks: 1,
  },
};

// Helper type for form field errors
export interface PackageFormErrors {
  name?: string;
  description?: string;
  duration?: string;
  price?: string;
  sportCategories?: string;
  classLimitPerWeek?: string;
  classLimitPerMonth?: string;
  maxFreezeMonths?: string;
  minFreezeWeeks?: string;
  renewalDiscountPercent?: string;
  earlyTerminationFee?: string;
  minimumCommitmentMonths?: string;
  guestPassesIncluded?: string;
  displayOrder?: string;
}

// API response types
export interface PackageListResponse {
  packages: MembershipPackageRecord[];
  total: number;
  page: number;
  limit: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface PackageStatsResponse {
  stats: PackageUsageStats;
  analytics: PackageAnalytics[];
  recentSubscriptions: MembershipSubscription[];
  recentReviews: PackageReview[];
}

// Filter and sort options
export interface PackageFilterOptions {
  status?: MembershipPackageStatus[];
  priceRange?: {
    min: number;
    max: number;
  };
  durationRange?: {
    min: number;
    max: number;
    type: DurationType;
  };
  sportCategories?: string[];
  isPopular?: boolean;
  isFullAccess?: boolean;
  isUnlimited?: boolean;
}

export interface PackageSortOptions {
  field: 'name' | 'price' | 'duration' | 'createdAt' | 'displayOrder' | 'popularity';
  direction: 'asc' | 'desc';
}

// Search and pagination
export interface PackageSearchParams {
  query?: string;
  filters?: PackageFilterOptions;
  sort?: PackageSortOptions;
  page?: number;
  limit?: number;
}