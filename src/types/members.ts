// src/types/member.ts

import { Timestamp } from 'firebase/firestore';

// Member status types
export type MemberStatus = 'No Membership' | 'Active' | 'Paused' | 'Overdue';

// Membership types
export type MembershipType = 'Recurring' | 'Prepaid';

// Payment methods
export type PaymentMethod = 'ACH' | 'Credit Card' | 'Cash' | 'Check';

// Belt and rank system
export interface BeltLevel {
  id: string;
  name: string; // e.g., "White Belt", "Blue Belt", etc.
  style: string; // e.g., "BJJ", "Muay Thai", etc.
  order: number; // For sorting
  color?: string; // Hex color for display
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentLevel {
  id: string;
  name: string; // e.g., "Beginner", "Intermediate", "Advanced"
  description?: string;
  order: number; // For sorting
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Member's belt/rank history
export interface MemberBeltAward {
  id: string;
  memberId: string;
  beltLevelId: string;
  beltLevelName: string;
  style: string;
  dateAwarded: Timestamp;
  awardedBy: string; // Staff member ID who awarded it
  awardedByName: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface MemberStudentLevelAward {
  id: string;
  memberId: string;
  studentLevelId: string;
  studentLevelName: string;
  dateAwarded: Timestamp;
  awardedBy: string;
  awardedByName: string;
  notes?: string;
  createdAt: Timestamp;
}

// Emergency contact
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// Membership details
export interface MembershipDetails {
  type: MembershipType;
  status: MemberStatus;
  startDate?: Timestamp;
  endDate?: Timestamp; // For prepaid memberships
  monthlyAmount?: number; // For recurring memberships
  totalAmount?: number; // For prepaid memberships
  paymentMethod?: PaymentMethod;
  autoRenew: boolean;
  
  // For credit-based memberships
  totalCredits?: number; // Original credits purchased
  remainingCredits?: number; // Credits left
  
  // Payment tracking
  lastPaymentDate?: Timestamp;
  nextPaymentDate?: Timestamp; // For recurring
  
  // Status tracking
  pausedDate?: Timestamp;
  pauseReason?: string;
  overdueDate?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Base member data for creation
export interface MemberData {
  // Basic info (required)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: EmergencyContact;
  
  // Optional info
  dateOfBirth?: Timestamp;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Membership info
  membership: MembershipDetails;
  
  // Health/waiver info
  waiverSigned: boolean;
  waiverDate?: Timestamp;
  medicalNotes?: string;
  
  // Tracking
  joinDate: Timestamp;
  lastVisit?: Timestamp;
  totalVisits: number;
  
  // Current belt/level info (for quick access)
  currentBeltLevel?: {
    id: string;
    name: string;
    style: string;
    dateAwarded: Timestamp;
  };
  currentStudentLevel?: {
    id: string;
    name: string;
    dateAwarded: Timestamp;
  };
  
  // System fields
  isActive: boolean;
  notes?: string;
  tags?: string[]; // For categorization
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Staff member who created this record
}

// Full member record (includes ID)
export interface MemberRecord extends MemberData {
  id: string;
}

// Member form data (for creating/editing)
export interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: EmergencyContact;
  dateOfBirth?: Date;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  membershipType: MembershipType;
  monthlyAmount?: number;
  totalAmount?: number;
  totalCredits?: number;
  paymentMethod?: PaymentMethod;
  autoRenew: boolean;
  waiverSigned: boolean;
  medicalNotes?: string;
  notes?: string;
  tags?: string[];
}

// Member statistics for dashboard
export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  pausedMembers: number;
  overdueMembers: number;
  noMembershipCount: number;
  newThisMonth: number;
  recurringRevenue: number;
  prepaidRevenue: number;
}

// Member activity log
export interface MemberActivity {
  id: string;
  memberId: string;
  type: 'check_in' | 'payment' | 'membership_change' | 'belt_award' | 'level_award' | 'note_added';
  description: string;
  details?: any;
  performedBy: string;
  performedByName: string;
  timestamp: Timestamp;
}

// Check-in record
export interface MemberCheckIn {
  id: string;
  memberId: string;
  memberName: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  classId?: string; // If checking in for a specific class
  className?: string;
  creditsUsed?: number; // For credit-based memberships
  notes?: string;
  createdBy: string;
  createdByName: string;
}

// Payment record
export interface MemberPayment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Timestamp;
  description: string;
  membershipType?: MembershipType;
  creditsAdded?: number; // If buying credits
  processedBy: string;
  processedByName: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: Timestamp;
}
export interface BeltLevel {
  id: string;
  name: string; // e.g., "White Belt", "Blue Belt", etc.
  style: string; // e.g., "BJJ", "Muay Thai", etc.
  order: number; // For sorting
  color?: string; // Hex color for display
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface StudentLevel {
  id: string;
  name: string; // e.g., "Beginner", "Intermediate", "Advanced"
  description?: string;
  order: number; // For sorting
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Member's belt/rank history
export interface MemberBeltAward {
  id: string;
  memberId: string;
  beltLevelId: string;
  beltLevelName: string;
  style: string;
  dateAwarded: Timestamp;
  awardedBy: string; // Staff member ID who awarded it
  awardedByName: string;
  notes?: string;
  createdAt: Timestamp;
}

export interface MemberStudentLevelAward {
  id: string;
  memberId: string;
  studentLevelId: string;
  studentLevelName: string;
  dateAwarded: Timestamp;
  awardedBy: string;
  awardedByName: string;
  notes?: string;
  createdAt: Timestamp;
}

// Emergency contact
export interface EmergencyContact {
  name: string;
  relationship: string;
  phone: string;
  email?: string;
}

// Membership details
export interface MembershipDetails {
  type: MembershipType;
  status: MemberStatus;
  startDate?: Timestamp;
  endDate?: Timestamp; // For prepaid memberships
  monthlyAmount?: number; // For recurring memberships
  totalAmount?: number; // For prepaid memberships
  paymentMethod?: PaymentMethod;
  autoRenew: boolean;
  
  // For credit-based memberships
  totalCredits?: number; // Original credits purchased
  remainingCredits?: number; // Credits left
  
  // Payment tracking
  lastPaymentDate?: Timestamp;
  nextPaymentDate?: Timestamp; // For recurring
  
  // Status tracking
  pausedDate?: Timestamp;
  pauseReason?: string;
  overdueDate?: Timestamp;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// Base member data for creation
export interface MemberData {
  // Basic info (required)
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: EmergencyContact;
  
  // Optional info
  dateOfBirth?: Timestamp;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  
  // Membership info
  membership: MembershipDetails;
  
  // Health/waiver info
  waiverSigned: boolean;
  waiverDate?: Timestamp;
  medicalNotes?: string;
  
  // Tracking
  joinDate: Timestamp;
  lastVisit?: Timestamp;
  totalVisits: number;
  
  // Current belt/level info (for quick access)
  currentBeltLevel?: {
    id: string;
    name: string;
    style: string;
    dateAwarded: Timestamp;
  };
  currentStudentLevel?: {
    id: string;
    name: string;
    dateAwarded: Timestamp;
  };
  
  // System fields
  isActive: boolean;
  notes?: string;
  tags?: string[]; // For categorization
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy: string; // Staff member who created this record
}

// Full member record (includes ID)
export interface MemberRecord extends MemberData {
  id: string;
}

// Member form data (for creating/editing)
export interface MemberFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  emergencyContact: EmergencyContact;
  dateOfBirth?: Date;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  membershipType: MembershipType;
  monthlyAmount?: number;
  totalAmount?: number;
  totalCredits?: number;
  paymentMethod?: PaymentMethod;
  autoRenew: boolean;
  waiverSigned: boolean;
  medicalNotes?: string;
  notes?: string;
  tags?: string[];
}

// Member statistics for dashboard
export interface MemberStats {
  totalMembers: number;
  activeMembers: number;
  pausedMembers: number;
  overdueMembers: number;
  noMembershipCount: number;
  newThisMonth: number;
  recurringRevenue: number;
  prepaidRevenue: number;
}

// Member activity log
export interface MemberActivity {
  id: string;
  memberId: string;
  type: 'check_in' | 'payment' | 'membership_change' | 'belt_award' | 'level_award' | 'note_added';
  description: string;
  details?: any;
  performedBy: string;
  performedByName: string;
  timestamp: Timestamp;
}

// Check-in record
export interface MemberCheckIn {
  id: string;
  memberId: string;
  memberName: string;
  checkInTime: Timestamp;
  checkOutTime?: Timestamp;
  classId?: string; // If checking in for a specific class
  className?: string;
  creditsUsed?: number; // For credit-based memberships
  notes?: string;
  createdBy: string;
  createdByName: string;
}

// Payment record
export interface MemberPayment {
  id: string;
  memberId: string;
  memberName: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentDate: Timestamp;
  description: string;
  membershipType?: MembershipType;
  creditsAdded?: number; // If buying credits
  processedBy: string;
  processedByName: string;
  receiptNumber?: string;
  notes?: string;
  createdAt: Timestamp;
}

export default MemberData;