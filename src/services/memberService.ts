// src/services/memberService.ts

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
  limit,
  startAfter,
  QueryDocumentSnapshot,
} from 'firebase/firestore';

import {
  MemberData,
  MemberRecord,
  MemberFormData,
  MemberStats,
  MemberActivity,
  MemberCheckIn,
  MemberPayment,
  BeltLevel,
  StudentLevel,
  MemberBeltAward,
  MemberStudentLevelAward,
  MembershipType,
  MemberStatus,
  PaymentMethod,
} from '../types/members';

// MEMBER CRUD OPERATIONS

export const createMember = async (
  formData: MemberFormData,
  createdBy: string
): Promise<MemberRecord> => {
  try {
    console.log('Creating new member:', formData.firstName, formData.lastName);

    // Convert form data to member data
    const memberData: MemberData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      emergencyContact: formData.emergencyContact,
      dateOfBirth: formData.dateOfBirth ? Timestamp.fromDate(formData.dateOfBirth) : undefined,
      address: formData.address,
      membership: {
        type: formData.membershipType,
        status: 'No Membership' as MemberStatus,
        monthlyAmount: formData.monthlyAmount,
        totalAmount: formData.totalAmount,
        totalCredits: formData.totalCredits,
        remainingCredits: formData.totalCredits,
        paymentMethod: formData.paymentMethod,
        autoRenew: formData.autoRenew,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      },
      waiverSigned: formData.waiverSigned,
      waiverDate: formData.waiverSigned ? Timestamp.now() : undefined,
      medicalNotes: formData.medicalNotes,
      joinDate: Timestamp.now(),
      totalVisits: 0,
      isActive: true,
      notes: formData.notes,
      tags: formData.tags || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
    };

    const docRef = await addDoc(collection(db, 'users'), memberData);
    
    // Log activity
    await logMemberActivity({
      memberId: docRef.id,
      type: 'membership_change',
      description: `Member created: ${formData.firstName} ${formData.lastName}`,
      performedBy: createdBy,
      performedByName: 'Admin', // TODO: Get actual staff name
    });

    console.log('Member created successfully with ID:', docRef.id);
    
    return {
      id: docRef.id,
      ...memberData,
    };
  } catch (error) {
    console.error('Error creating member:', error);
    throw new Error('Failed to create member. Please try again.');
  }
};

export const getAllMembers = async (): Promise<MemberRecord[]> => {
  try {
    console.log('Fetching all members...');
    const membersRef = collection(db, 'users');
    const q = query(membersRef, orderBy('createdAt', 'desc'));
    const snapshot = await getDocs(q);

    const memberList: MemberRecord[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data() as DocumentData;
      
      memberList.push({
        id: doc.id,
        firstName: docData.firstName,
        lastName: docData.lastName,
        email: docData.email,
        phone: docData.phone,
        emergencyContact: docData.emergencyContact,
        dateOfBirth: docData.dateOfBirth,
        address: docData.address,
        membership: docData.membership,
        waiverSigned: docData.waiverSigned || false,
        waiverDate: docData.waiverDate,
        medicalNotes: docData.medicalNotes,
        joinDate: docData.joinDate,
        lastVisit: docData.lastVisit,
        totalVisits: docData.totalVisits || 0,
        currentBeltLevel: docData.currentBeltLevel,
        currentStudentLevel: docData.currentStudentLevel,
        isActive: docData.isActive ?? true,
        notes: docData.notes,
        tags: docData.tags || [],
        createdAt: docData.createdAt,
        updatedAt: docData.updatedAt,
        createdBy: docData.createdBy,
      });
    });

    console.log(`Found ${memberList.length} members`);
    return memberList;
  } catch (error) {
    console.error('Error fetching members:', error);
    throw new Error('Failed to load members. Please try again.');
  }
};

export const getMemberById = async (memberId: string): Promise<MemberRecord | null> => {
  try {
    const memberDoc = await getDoc(doc(db, 'users', memberId));
    if (!memberDoc.exists()) {
      return null;
    }

    const docData = memberDoc.data() as DocumentData;
    return {
      id: memberDoc.id,
      ...docData,
    } as MemberRecord;
  } catch (error) {
    console.error('Error fetching member:', error);
    throw new Error('Failed to load member details.');
  }
};

export const updateMember = async (
  memberId: string,
  formData: Partial<MemberFormData>,
  updatedBy: string
): Promise<boolean> => {
  try {
    console.log(`Updating member ${memberId}`);
    const memberRef = doc(db, 'users', memberId);
    
    const updateData: any = {
      ...formData,
      updatedAt: Timestamp.now(),
    };

    // Handle date conversion
    if (formData.dateOfBirth) {
      updateData.dateOfBirth = Timestamp.fromDate(formData.dateOfBirth);
    }

    // Update membership details if provided
    if (formData.membershipType || formData.monthlyAmount || formData.totalAmount) {
      const currentMember = await getMemberById(memberId);
      if (currentMember) {
        updateData.membership = {
          ...currentMember.membership,
          type: formData.membershipType || currentMember.membership.type,
          monthlyAmount: formData.monthlyAmount ?? currentMember.membership.monthlyAmount,
          totalAmount: formData.totalAmount ?? currentMember.membership.totalAmount,
          totalCredits: formData.totalCredits ?? currentMember.membership.totalCredits,
          paymentMethod: formData.paymentMethod || currentMember.membership.paymentMethod,
          autoRenew: formData.autoRenew ?? currentMember.membership.autoRenew,
          updatedAt: Timestamp.now(),
        };
      }
    }

    await updateDoc(memberRef, updateData);

    // Log activity
    await logMemberActivity({
      memberId,
      type: 'membership_change',
      description: 'Member information updated',
      performedBy: updatedBy,
      performedByName: 'Admin', // TODO: Get actual staff name
    });

    console.log('Member updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating member:', error);
    throw new Error('Failed to update member. Please try again.');
  }
};

export const deleteMember = async (memberId: string, deletedBy: string): Promise<boolean> => {
  try {
    console.log(`Deactivating member ${memberId}`);
    
    // Instead of deleting, we deactivate
    await updateDoc(doc(db, 'users', memberId), {
      isActive: false,
      deactivatedAt: Timestamp.now(),
      deactivatedBy: deletedBy,
      updatedAt: Timestamp.now(),
    });

    // Log activity
    await logMemberActivity({
      memberId,
      type: 'membership_change',
      description: 'Member deactivated',
      performedBy: deletedBy,
      performedByName: 'Admin', // TODO: Get actual staff name
    });

    console.log('Member deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating member:', error);
    throw new Error('Failed to deactivate member. Please try again.');
  }
};

// MEMBERSHIP STATUS MANAGEMENT

export const updateMembershipStatus = async (
  memberId: string,
  newStatus: MemberStatus,
  updatedBy: string,
  reason?: string
): Promise<boolean> => {
  try {
    console.log(`Updating membership status for ${memberId} to ${newStatus}`);
    
    const updateData: any = {
      'membership?.status': newStatus,
      'membership.updatedAt': Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    // Handle status-specific logic
    switch (newStatus) {
      case 'Active':
        updateData['membership.startDate'] = Timestamp.now();
        break;
      case 'Paused':
        updateData['membership.pausedDate'] = Timestamp.now();
        if (reason) updateData['membership.pauseReason'] = reason;
        break;
      case 'Overdue':
        updateData['membership.overdueDate'] = Timestamp.now();
        break;
    }

    await updateDoc(doc(db, 'users', memberId), updateData);

    // Log activity
    await logMemberActivity({
      memberId,
      type: 'membership_change',
      description: `Membership status changed to ${newStatus}${reason ? `: ${reason}` : ''}`,
      performedBy: updatedBy,
      performedByName: 'Admin', // TODO: Get actual staff name
    });

    return true;
  } catch (error) {
    console.error('Error updating membership status:', error);
    throw new Error('Failed to update membership status.');
  }
};

// MEMBER STATISTICS

export const getMemberStats = async (): Promise<MemberStats> => {
  try {
    console.log('Calculating member statistics...');
    const members = await getAllMembers();
    
    const stats: MemberStats = {
      totalMembers: members.length,
      activeMembers: 0,
      pausedMembers: 0,
      overdueMembers: 0,
      noMembershipCount: 0,
      newThisMonth: 0,
      recurringRevenue: 0,
      prepaidRevenue: 0,
    };

    const currentMonth = new Date();
    currentMonth.setDate(1); // First day of current month

    members.forEach(member => {
      // Count by status
      switch (member.membership?.status) {
        case 'Active':
          stats.activeMembers++;
          break;
        case 'Paused':
          stats.pausedMembers++;
          break;
        case 'Overdue':
          stats.overdueMembers++;
          break;
        case 'No Membership':
          stats.noMembershipCount++;
          break;
      }

      // Count new members this month
      const joinDate = member.joinDate.toDate();
      if (joinDate >= currentMonth) {
        stats.newThisMonth++;
      }

      // Calculate revenue (only for active members)
      if (member.membership?.status === 'Active') {
        if (member.membership.type === 'Recurring' && member.membership.monthlyAmount) {
          stats.recurringRevenue += member.membership.monthlyAmount;
        } else if (member.membership.type === 'Prepaid' && member.membership.totalAmount) {
          stats.prepaidRevenue += member.membership.totalAmount;
        }
      }
    });

    console.log('Member statistics calculated:', stats);
    return stats;
  } catch (error) {
    console.error('Error calculating member stats:', error);
    throw new Error('Failed to calculate member statistics.');
  }
};

// ACTIVITY LOGGING

export const logMemberActivity = async (activity: Omit<MemberActivity, 'id' | 'timestamp'>): Promise<string> => {
  try {
    const activityData = {
      ...activity,
      timestamp: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'memberActivities'), activityData);
    return docRef.id;
  } catch (error) {
    console.error('Error logging member activity:', error);
    // Don't throw error for logging failures
    return '';
  }
};

export const getMemberActivities = async (memberId: string, limitCount: number = 50): Promise<MemberActivity[]> => {
  try {
    const activitiesRef = collection(db, 'memberActivities');
    const q = query(
      activitiesRef,
      where('memberId', '==', memberId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    const activities: MemberActivity[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      activities.push({
        id: doc.id,
        ...data,
      } as MemberActivity);
    });

    return activities;
  } catch (error) {
    console.error('Error fetching member activities:', error);
    throw new Error('Failed to load member activities.');
  }
};

// CHECK-IN/CHECK-OUT MANAGEMENT

export const checkInMember = async (
  memberId: string,
  classId: string | undefined,
  createdBy: string,
  creditsUsed?: number
): Promise<MemberCheckIn> => {
  try {
    const member = await getMemberById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    // Check if member can check in (has active membership or credits)
    if (member.membership?.status !== 'Active' && 
        (!member.membership.remainingCredits || member.membership.remainingCredits <= 0)) {
      throw new Error('Member does not have an active membership or credits');
    }

    const checkInData: Omit<MemberCheckIn, 'id'> = {
      memberId,
      memberName: `${member.firstName} ${member.lastName}`,
      checkInTime: Timestamp.now(),
      classId,
      creditsUsed: creditsUsed || 0,
      createdBy,
      createdByName: 'Staff', // TODO: Get actual staff name
    };

    const docRef = await addDoc(collection(db, 'memberCheckIns'), checkInData);

    // Update member's last visit and total visits
    const updateData: any = {
      lastVisit: Timestamp.now(),
      totalVisits: member.totalVisits + 1,
      updatedAt: Timestamp.now(),
    };

    // Deduct credits if used
    if (creditsUsed && member.membership.remainingCredits) {
      updateData['membership.remainingCredits'] = member.membership.remainingCredits - creditsUsed;
    }

    await updateDoc(doc(db, 'users', memberId), updateData);

    // Log activity
    await logMemberActivity({
      memberId,
      type: 'check_in',
      description: `Checked in${classId ? ' for class' : ''}${creditsUsed ? ` (${creditsUsed} credits used)` : ''}`,
      performedBy: createdBy,
      performedByName: 'Staff',
    });

    return {
      id: docRef.id,
      ...checkInData,
    };
  } catch (error) {
    console.error('Error checking in member:', error);
    throw error;
  }
};

// BELT AND LEVEL MANAGEMENT

export const createBeltLevel = async (beltData: Omit<BeltLevel, 'id' | 'createdAt' | 'updatedAt'>): Promise<BeltLevel> => {
  try {
    const data = {
      ...beltData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'beltLevels'), data);
    
    return {
      id: docRef.id,
      ...data,
    };
  } catch (error) {
    console.error('Error creating belt level:', error);
    throw new Error('Failed to create belt level.');
  }
};

export const getAllBeltLevels = async (): Promise<BeltLevel[]> => {
  try {
    const beltsRef = collection(db, 'beltLevels');
    const q = query(beltsRef, orderBy('style', 'asc'), orderBy('order', 'asc'));
    const snapshot = await getDocs(q);

    const beltLevels: BeltLevel[] = [];
    snapshot.forEach((doc) => {
      beltLevels.push({
        id: doc.id,
        ...doc.data(),
      } as BeltLevel);
    });

    return beltLevels;
  } catch (error) {
    console.error('Error fetching belt levels:', error);
    throw new Error('Failed to load belt levels.');
  }
};

export const awardBeltToMember = async (
  memberId: string,
  beltLevelId: string,
  awardedBy: string,
  notes?: string
): Promise<MemberBeltAward> => {
  try {
    const member = await getMemberById(memberId);
    const beltDoc = await getDoc(doc(db, 'beltLevels', beltLevelId));
    
    if (!member || !beltDoc.exists()) {
      throw new Error('Member or belt level not found');
    }

    const beltData = beltDoc.data() as BeltLevel;

    const awardData: Omit<MemberBeltAward, 'id'> = {
      memberId,
      beltLevelId,
      beltLevelName: beltData.name,
      style: beltData.style,
      dateAwarded: Timestamp.now(),
      awardedBy,
      awardedByName: 'Admin', // TODO: Get actual staff name
      notes,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'memberBeltAwards'), awardData);

    // Update member's current belt level
    await updateDoc(doc(db, 'users', memberId), {
      currentBeltLevel: {
        id: beltLevelId,
        name: beltData.name,
        style: beltData.style,
        dateAwarded: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    // Log activity
    await logMemberActivity({
      memberId,
      type: 'belt_award',
      description: `Awarded ${beltData.name} in ${beltData.style}`,
      performedBy: awardedBy,
      performedByName: 'Admin',
    });

    return {
      id: docRef.id,
      ...awardData,
    };
  } catch (error) {
    console.error('Error awarding belt:', error);
    throw error;
  }
};

export default {
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  updateMembershipStatus,
  getMemberStats,
  logMemberActivity,
  getMemberActivities,
  checkInMember,
  createBeltLevel,
  getAllBeltLevels,
  awardBeltToMember,
};