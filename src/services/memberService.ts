// src/services/memberService.ts - Enhanced with Firebase Auth

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
  setDoc,
} from 'firebase/firestore';

import {
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth,
  signOut,
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';

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

// Secondary Firebase App for member authentication
let secondaryApp: any = null;
let secondaryAuth: any = null;

const initializeSecondaryApp = () => {
  if (!secondaryApp) {
    const firebaseConfig = {
      apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
      authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
      storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.REACT_APP_FIREBASE_APP_ID,
      measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID,
    };
    
    try {
      secondaryApp = initializeApp(firebaseConfig, 'MemberSecondaryApp');
      secondaryAuth = getAuth(secondaryApp);
      console.log('Secondary Firebase app for members initialized successfully');
    } catch (error) {
      console.error('Error initializing secondary app for members:', error);
      throw new Error('Could not initialize secondary authentication for members');
    }
  }
  return secondaryAuth;
};

// HELPER FUNCTION TO CLEAN DATA
const cleanMemberData = (data: any): any => {
  const cleaned: any = {};
  
  Object.keys(data).forEach(key => {
    const value = data[key];
    if (value !== undefined) {
      if (value && typeof value === 'object' && !(value instanceof Date) && !(value instanceof Timestamp)) {
        cleaned[key] = cleanMemberData(value);
      } else {
        cleaned[key] = value;
      }
    }
  });
  
  return cleaned;
};

// GENERATE SECURE PASSWORD FOR MEMBER
const generateMemberPassword = (): string => {
  // Generate a secure 8-character password with mixed case, numbers
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// CREATE MEMBER WITH FIREBASE AUTH
export const createMember = async (
  formData: MemberFormData,
  createdBy: string
): Promise<{ memberRecord: MemberRecord; password: string }> => {
  try {
    console.log('Creating new member with Firebase Auth:', formData.firstName, formData.lastName);

    // Generate secure password for member
    const memberPassword = generateMemberPassword();
    
    // Get current admin auth state
    const { auth: adminAuth } = await import('./firebase');
    const currentAdmin = adminAuth.currentUser;
    if (!currentAdmin) {
      throw new Error('No authenticated admin user found');
    }

    console.log('Current admin user:', currentAdmin.uid, currentAdmin.email);

    // Initialize secondary auth for member creation
    const secondAuth = initializeSecondaryApp();
    
    console.log('Creating Firebase Auth user for member...');
    
    // Create Firebase Auth user for member
    const userCredential = await createUserWithEmailAndPassword(
      secondAuth,
      formData.email,
      memberPassword
    );
    
    const newUser = userCredential.user;
    console.log('Member Firebase Auth user created:', newUser.uid, newUser.email);

    // Update member's display name
    await updateProfile(newUser, {
      displayName: `${formData.firstName} ${formData.lastName}`,
    });

    // Convert form data to member data
    const memberData: MemberData = {
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      phone: formData.phone,
      emergencyContact: cleanMemberData(formData.emergencyContact),
      dateOfBirth: formData.dateOfBirth ? Timestamp.fromDate(formData.dateOfBirth) : undefined,
      address: formData.address ? cleanMemberData(formData.address) : undefined,
      membership: cleanMemberData({
        type: formData.membershipType,
        status: 'No Membership' as MemberStatus,
        monthlyAmount: formData.monthlyAmount || undefined,
        totalAmount: formData.totalAmount || undefined,
        totalCredits: formData.totalCredits || undefined,
        remainingCredits: formData.totalCredits || undefined,
        paymentMethod: formData.paymentMethod || undefined,
        autoRenew: formData.autoRenew || false,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      }),
      waiverSigned: formData.waiverSigned,
      waiverDate: formData.waiverSigned ? Timestamp.now() : undefined,
      medicalNotes: formData.medicalNotes || undefined,
      joinDate: Timestamp.now(),
      totalVisits: 0,
      isActive: true,
      notes: formData.notes || undefined,
      tags: formData.tags || [],
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
      // Firebase Auth integration
      authUid: newUser.uid, // Link to Firebase Auth user
    };

    const cleanedMemberData = cleanMemberData(memberData);

    // Store member data in Firestore users collection with Auth UID as document ID
    await setDoc(doc(db, 'users', newUser.uid), cleanedMemberData);
    
    // Create member profile for customer app access control
    await setDoc(doc(db, 'memberProfiles', newUser.uid), {
      type: 'member', // This distinguishes from staff
      role: 'customer',
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
    });

    // Sign out from secondary auth to preserve admin session
    await signOut(secondAuth);
    console.log('Signed out from secondary auth, admin session preserved');

    // Verify admin session is still intact
    const stillLoggedIn = adminAuth.currentUser;
    if (!stillLoggedIn || stillLoggedIn.uid !== currentAdmin.uid) {
      console.error('Admin session was lost during member creation!');
      throw new Error('Admin session was compromised during member creation');
    }

    // Log activity
    await logMemberActivity({
      memberId: newUser.uid,
      type: 'membership_change',
      description: `Member created with Firebase Auth: ${formData.firstName} ${formData.lastName}`,
      performedBy: createdBy,
      performedByName: 'Admin',
    });

    console.log('Member created successfully with ID:', newUser.uid);
    
    return {
      memberRecord: {
        id: newUser.uid,
        ...cleanedMemberData,
      },
      password: memberPassword
    };
  } catch (error: any) {
    console.error('Error creating member:', error);
    
    // Clean up secondary auth session if error occurs
    if (secondaryAuth) {
      try {
        await signOut(secondaryAuth);
      } catch (signOutError) {
        console.error('Error signing out from secondary auth:', signOutError);
      }
    }
    
    // Convert Firebase errors to user-friendly messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already registered. Please use a different email.');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Generated password is too weak. Please try again.');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address format.');
    }
    
    throw new Error('Failed to create member. Please try again.');
  }
};

// Enhanced member update that can update Firebase Auth profile
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
    if (formData.membershipType || formData.monthlyAmount !== undefined || formData.totalAmount !== undefined) {
      const currentMember = await getMemberById(memberId);
      if (currentMember) {
        updateData.membership = cleanMemberData({
          ...currentMember.membership,
          type: formData.membershipType || currentMember.membership.type,
          monthlyAmount: formData.monthlyAmount ?? currentMember.membership.monthlyAmount,
          totalAmount: formData.totalAmount ?? currentMember.membership.totalAmount,
          totalCredits: formData.totalCredits ?? currentMember.membership.totalCredits,
          paymentMethod: formData.paymentMethod || currentMember.membership.paymentMethod,
          autoRenew: formData.autoRenew ?? currentMember.membership.autoRenew,
          updatedAt: Timestamp.now(),
        });
      }
    }

    // Update member profile if name changed
    if (formData.firstName || formData.lastName) {
      const memberProfileRef = doc(db, 'memberProfiles', memberId);
      const memberProfileUpdate: any = {
        updatedAt: Timestamp.now(),
      };
      
      if (formData.firstName) memberProfileUpdate.firstName = formData.firstName;
      if (formData.lastName) memberProfileUpdate.lastName = formData.lastName;
      
      await updateDoc(memberProfileRef, memberProfileUpdate);
    }

    const cleanedUpdateData = cleanMemberData(updateData);
    await updateDoc(memberRef, cleanedUpdateData);

    // Log activity
    await logMemberActivity({
      memberId,
      type: 'membership_change',
      description: 'Member information updated',
      performedBy: updatedBy,
      performedByName: 'Admin',
    });

    console.log('Member updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating member:', error);
    throw new Error('Failed to update member. Please try again.');
  }
};

// Enhanced delete that deactivates both member and auth
export const deleteMember = async (memberId: string, deletedBy: string): Promise<boolean> => {
  try {
    console.log(`Deactivating member ${memberId}`);
    
    // Deactivate member record
    await updateDoc(doc(db, 'users', memberId), {
      isActive: false,
      deactivatedAt: Timestamp.now(),
      deactivatedBy: deletedBy,
      updatedAt: Timestamp.now(),
    });

    // Deactivate member profile
    await updateDoc(doc(db, 'memberProfiles', memberId), {
      isActive: false,
      deactivatedAt: Timestamp.now(),
      deactivatedBy: deletedBy,
      updatedAt: Timestamp.now(),
    });

    // Note: We don't delete the Firebase Auth user as they might still need
    // to access the customer app to view their account history

    // Log activity
    await logMemberActivity({
      memberId,
      type: 'membership_change',
      description: 'Member account deactivated',
      performedBy: deletedBy,
      performedByName: 'Admin',
    });

    console.log('Member deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating member:', error);
    throw new Error('Failed to deactivate member. Please try again.');
  }
};

// Get all members (existing function remains mostly the same)
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
        authUid: docData.authUid,
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

// Helper function to reset member password
export const resetMemberPassword = async (
  memberId: string,
  resetBy: string
): Promise<string> => {
  try {
    console.log(`Resetting password for member ${memberId}`);
    
    const member = await getMemberById(memberId);
    if (!member) {
      throw new Error('Member not found');
    }

    // For password reset, you would typically:
    // 1. Generate new password
    // 2. Update it in Firebase Auth (requires admin SDK)
    // 3. Send email to member with new password
    
    const newPassword = generateMemberPassword();
    
    // Note: This would require Firebase Admin SDK to update user password
    // For now, we'll log the activity and return the password
    // In production, you'd implement this with Cloud Functions
    
    await logMemberActivity({
      memberId,
      type: 'membership_change',
      description: 'Password reset requested',
      performedBy: resetBy,
      performedByName: 'Admin',
    });

    return newPassword;
  } catch (error) {
    console.error('Error resetting member password:', error);
    throw new Error('Failed to reset member password.');
  }
};

// REST OF THE FUNCTIONS REMAIN THE SAME...
// (keeping existing functions for backwards compatibility)

export const updateMembershipStatus = async (
  memberId: string,
  newStatus: MemberStatus,
  updatedBy: string,
  reason?: string
): Promise<boolean> => {
  try {
    console.log(`Updating membership status for ${memberId} to ${newStatus}`);
    
    const updateData: any = {
      'membership.status': newStatus,
      'membership.updatedAt': Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

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

    await logMemberActivity({
      memberId,
      type: 'membership_change',
      description: `Membership status changed to ${newStatus}${reason ? `: ${reason}` : ''}`,
      performedBy: updatedBy,
      performedByName: 'Admin',
    });

    return true;
  } catch (error) {
    console.error('Error updating membership status:', error);
    throw new Error('Failed to update membership status.');
  }
};

// ... (include all other existing functions like getMemberStats, belt/level management, etc.)

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
    return '';
  }
};

// Belt and level functions remain the same...
export const createBeltLevel = async (beltData: Omit<BeltLevel, 'id' | 'createdAt' | 'updatedAt'>): Promise<BeltLevel> => {
  try {
    console.log('Creating belt level:', beltData);
    
    if (!beltData.name || !beltData.style) {
      throw new Error('Belt name and style are required');
    }

    const data = {
      name: beltData.name.trim(),
      style: beltData.style.trim(),
      order: beltData.order || 0,
      color: beltData.color?.trim() || '',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'beltLevels'), data);
    
    console.log('Belt level created successfully:', docRef.id);
    
    return {
      id: docRef.id,
      ...data,
    };
  } catch (error) {
    console.error('Error creating belt level:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create belt level.');
  }
};

export const getAllBeltLevels = async (): Promise<BeltLevel[]> => {
  try {
    console.log('Fetching all belt levels...');
    const beltsRef = collection(db, 'beltLevels');
    const snapshot = await getDocs(beltsRef);
    
    console.log(`Found ${snapshot.size} belt level documents`);

    const beltLevels: BeltLevel[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      beltLevels.push({
        id: doc.id,
        name: data.name || '',
        style: data.style || '',
        order: data.order || 0,
        color: data.color || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as BeltLevel);
    });

    beltLevels.sort((a, b) => {
      if (a.style !== b.style) {
        return a.style.localeCompare(b.style);
      }
      return a.order - b.order;
    });

    console.log(`Successfully loaded ${beltLevels.length} belt levels`);
    return beltLevels;
  } catch (error) {
    console.error('Error fetching belt levels:', error);
    return [];
  }
};

export const createStudentLevel = async (levelData: Omit<StudentLevel, 'id' | 'createdAt' | 'updatedAt'>): Promise<StudentLevel> => {
  try {
    console.log('Creating student level:', levelData);
    
    if (!levelData.name) {
      throw new Error('Student level name is required');
    }

    const data = {
      name: levelData.name.trim(),
      description: levelData.description?.trim() || '',
      order: levelData.order || 0,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'studentLevels'), data);
    
    console.log('Student level created successfully:', docRef.id);
    
    return {
      id: docRef.id,
      ...data,
    };
  } catch (error) {
    console.error('Error creating student level:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to create student level.');
  }
};

export const getAllStudentLevels = async (): Promise<StudentLevel[]> => {
  try {
    console.log('Fetching all student levels...');
    const levelsRef = collection(db, 'studentLevels');
    const snapshot = await getDocs(levelsRef);
    
    console.log(`Found ${snapshot.size} student level documents`);

    const studentLevels: StudentLevel[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      
      studentLevels.push({
        id: doc.id,
        name: data.name || '',
        description: data.description || '',
        order: data.order || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      } as StudentLevel);
    });

    studentLevels.sort((a, b) => a.order - b.order);

    console.log(`Successfully loaded ${studentLevels.length} student levels`);
    return studentLevels;
  } catch (error) {
    console.error('Error fetching student levels:', error);
    return [];
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
      awardedByName: 'Admin',
      notes,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'memberBeltAwards'), awardData);

    await updateDoc(doc(db, 'users', memberId), {
      currentBeltLevel: {
        id: beltLevelId,
        name: beltData.name,
        style: beltData.style,
        dateAwarded: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

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

export const awardStudentLevelToMember = async (
  memberId: string,
  studentLevelId: string,
  awardedBy: string,
  notes?: string
): Promise<MemberStudentLevelAward> => {
  try {
    const member = await getMemberById(memberId);
    const levelDoc = await getDoc(doc(db, 'studentLevels', studentLevelId));
    
    if (!member || !levelDoc.exists()) {
      throw new Error('Member or student level not found');
    }

    const levelData = levelDoc.data() as StudentLevel;

    const awardData: Omit<MemberStudentLevelAward, 'id'> = {
      memberId,
      studentLevelId,
      studentLevelName: levelData.name,
      dateAwarded: Timestamp.now(),
      awardedBy,
      awardedByName: 'Admin',
      notes,
      createdAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'memberStudentLevelAwards'), awardData);

    await updateDoc(doc(db, 'users', memberId), {
      currentStudentLevel: {
        id: studentLevelId,
        name: levelData.name,
        dateAwarded: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    await logMemberActivity({
      memberId,
      type: 'level_award',
      description: `Awarded student level: ${levelData.name}`,
      performedBy: awardedBy,
      performedByName: 'Admin',
    });

    return {
      id: docRef.id,
      ...awardData,
    };
  } catch (error) {
    console.error('Error awarding student level:', error);
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
  resetMemberPassword,
  logMemberActivity,
  createBeltLevel,
  getAllBeltLevels,
  createStudentLevel,
  getAllStudentLevels,
  awardBeltToMember,
  awardStudentLevelToMember,
};