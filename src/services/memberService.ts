// src/services/memberService.ts - Optimized with caching and request batching

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
  onSnapshot,
  Unsubscribe,
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

// Cache system for optimized requests
interface CacheItem<T> {
  data: T;
  timestamp: number;
  subscribers: Set<(data: T) => void>;
}

class MemberServiceCache {
  private cache = new Map<string, CacheItem<any>>();
  private listeners = new Map<string, Unsubscribe>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly MAX_CACHE_SIZE = 100;

  // Get cached data or fetch if expired
  async get<T>(
    key: string,
    fetcher: () => Promise<T>,
    useRealtime = false
  ): Promise<T> {
    const cached = this.cache.get(key);
    const now = Date.now();

    // Return cached data if valid
    if (cached && (now - cached.timestamp) < this.CACHE_DURATION) {
      return cached.data;
    }

    // Fetch fresh data
    try {
      const data = await fetcher();
      this.set(key, data);

      // Set up real-time listener if requested
      if (useRealtime && !this.listeners.has(key)) {
        this.setupRealtimeListener(key, fetcher);
      }

      return data;
    } catch (error) {
      // Return stale data if fetch fails
      if (cached) {
        console.warn(`Using stale cache for ${key} due to fetch error:`, error);
        return cached.data;
      }
      throw error;
    }
  }

  // Set cache data
  set<T>(key: string, data: T): void {
    // Clear old entries if cache is full
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = Array.from(this.cache.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
      this.delete(oldestKey);
    }

    const existing = this.cache.get(key);
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      subscribers: existing?.subscribers || new Set(),
    });

    // Notify subscribers
    existing?.subscribers.forEach(callback => {
      try {
        callback(data);
      } catch (error) {
        console.error('Error in cache subscriber:', error);
      }
    });
  }

  // Subscribe to cache updates
  subscribe<T>(key: string, callback: (data: T) => void): () => void {
    let cached = this.cache.get(key);
    if (!cached) {
      cached = {
        data: null,
        timestamp: 0,
        subscribers: new Set(),
      };
      this.cache.set(key, cached);
    }

    cached.subscribers.add(callback);

    // Return unsubscribe function
    return () => {
      cached?.subscribers.delete(callback);
    };
  }

  // Set up real-time Firestore listener
  private setupRealtimeListener<T>(key: string, fetcher: () => Promise<T>): void {
    // This would be implemented based on specific query needs
    // For now, we'll use periodic refresh
    const interval = window.setInterval(async () => {
      try {
        const data = await fetcher();
        this.set(key, data);
      } catch (error) {
        console.warn(`Error refreshing cache for ${key}:`, error);
      }
    }, 60000); // Refresh every minute

    this.listeners.set(key, () => clearInterval(interval));
  }

  // Delete cache entry
  delete(key: string): void {
    const listener = this.listeners.get(key);
    if (listener) {
      listener();
      this.listeners.delete(key);
    }
    this.cache.delete(key);
  }

  // Clear all cache
  clear(): void {
    this.listeners.forEach(unsubscribe => unsubscribe());
    this.listeners.clear();
    this.cache.clear();
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      activeListeners: this.listeners.size,
    };
  }
}

// Global cache instance
const memberCache = new MemberServiceCache();

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

// HELPER FUNCTIONS
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

const generateMemberPassword = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 8; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
};

// REQUEST BATCHING SYSTEM
class RequestBatcher {
  private batches = new Map<string, {
    requests: Array<{ resolve: Function; reject: Function; args: any[] }>;
    timeout: number;
  }>();
  
  private readonly BATCH_DELAY = 100; // 100ms batching window

  async batch<T>(
    key: string,
    executor: (...args: any[]) => Promise<T>,
    ...args: any[]
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batches.get(key);
      
      if (!batch) {
        batch = {
          requests: [],
          timeout: window.setTimeout(() => this.executeBatch(key, executor), this.BATCH_DELAY),
        };
        this.batches.set(key, batch);
      }
      
      batch.requests.push({ resolve, reject, args });
    });
  }

  private async executeBatch(key: string, executor: Function) {
    const batch = this.batches.get(key);
    if (!batch) return;

    this.batches.delete(key);
    
    try {
      // For member operations, we typically want to execute each request individually
      // but we can optimize by reducing duplicate requests
      const uniqueRequests = new Map();
      
      batch.requests.forEach((request, index) => {
        const requestKey = JSON.stringify(request.args);
        if (!uniqueRequests.has(requestKey)) {
          uniqueRequests.set(requestKey, []);
        }
        uniqueRequests.get(requestKey).push({ ...request, index });
      });

      // Execute unique requests
      const results = await Promise.allSettled(
        Array.from(uniqueRequests.entries()).map(async ([argsKey, requests]) => {
          const args = JSON.parse(argsKey);
          try {
            const result = await executor(...args);
            return { result, requests };
          } catch (error) {
            return { error, requests };
          }
        })
      );

      // Distribute results to original requesters
      results.forEach((outcome) => {
        if (outcome.status === 'fulfilled') {
          const { result, error, requests } = outcome.value;
          requests.forEach(({ resolve, reject }: any) => {
            if (error) {
              reject(error);
            } else {
              resolve(result);
            }
          });
        } else {
          batch.requests.forEach(({ reject }) => reject(outcome.reason));
        }
      });
      
    } catch (error) {
      batch.requests.forEach(({ reject }) => reject(error));
    }
  }
}

const requestBatcher = new RequestBatcher();

// OPTIMIZED MEMBER FUNCTIONS

// Get all members with caching and pagination
export const getAllMembers = async (useCache = true, useRealtime = false): Promise<MemberRecord[]> => {
  const cacheKey = 'all-members';
  
  const fetcher = async (): Promise<MemberRecord[]> => {
    console.log('Fetching members from Firestore...');
    
    try {
      const membersRef = collection(db, 'users');
      const q = query(membersRef, orderBy('createdAt', 'desc'));
      const snapshot = await getDocs(q);

      const memberList: MemberRecord[] = [];
      snapshot.forEach((doc) => {
        const docData = doc.data() as DocumentData;
        
        // Only include active members or recently deactivated ones
        if (docData.isActive !== false || 
            (docData.deactivatedAt && 
             (Date.now() - docData.deactivatedAt.toMillis()) < 30 * 24 * 60 * 60 * 1000)) {
          memberList.push({
            id: doc.id,
            firstName: docData.firstName,
            lastName: docData.lastName,
            email: docData.email,
            phone: docData.phone,
            emergencyContact: docData.emergencyContact,
            dateOfBirth: docData.dateOfBirth,
            address: docData.address,
            membership: docData.membership || {
              type: 'Recurring',
              status: 'No Membership',
              autoRenew: false,
              createdAt: Timestamp.now(),
              updatedAt: Timestamp.now(),
            },
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
        }
      });

      console.log(`Successfully loaded ${memberList.length} members`);
      return memberList;
    } catch (error) {
      console.error('Error fetching members:', error);
      throw new Error('Failed to load members. Please try again.');
    }
  };

  if (useCache) {
    return memberCache.get(cacheKey, fetcher, useRealtime);
  } else {
    const result = await fetcher();
    memberCache.set(cacheKey, result);
    return result;
  }
};

// Get paginated members
export const getMembersPaginated = async (
  pageSize = 20,
  lastDoc?: QueryDocumentSnapshot
): Promise<{
  members: MemberRecord[];
  lastDoc?: QueryDocumentSnapshot;
  hasMore: boolean;
}> => {
  try {
    const membersRef = collection(db, 'users');
    let q = query(
      membersRef,
      orderBy('createdAt', 'desc'),
      limit(pageSize + 1) // Get one extra to check if there's more
    );

    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }

    const snapshot = await getDocs(q);
    const members: MemberRecord[] = [];
    let newLastDoc: QueryDocumentSnapshot | undefined;
    
    snapshot.docs.forEach((doc, index) => {
      if (index < pageSize) {
        const docData = doc.data() as DocumentData;
        members.push({
          id: doc.id,
          ...docData,
        } as MemberRecord);
        newLastDoc = doc;
      }
    });

    return {
      members,
      lastDoc: newLastDoc,
      hasMore: snapshot.docs.length > pageSize,
    };
  } catch (error) {
    console.error('Error fetching paginated members:', error);
    throw new Error('Failed to load members');
  }
};

// Get single member with caching
export const getMemberById = async (memberId: string, useCache = true): Promise<MemberRecord | null> => {
  const cacheKey = `member-${memberId}`;
  
  const fetcher = async (): Promise<MemberRecord | null> => {
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

  if (useCache) {
    return memberCache.get(cacheKey, fetcher);
  } else {
    const result = await fetcher();
    if (result) {
      memberCache.set(cacheKey, result);
    }
    return result;
  }
};

// Subscribe to member updates
export const subscribeMemberUpdates = (
  callback: (members: MemberRecord[]) => void
): () => void => {
  return memberCache.subscribe('all-members', callback);
};

// Subscribe to single member updates
export const subscribeMemberById = (
  memberId: string,
  callback: (member: MemberRecord | null) => void
): () => void => {
  return memberCache.subscribe(`member-${memberId}`, callback);
};

// CREATE MEMBER - Optimized with better error handling
export const createMember = async (
  formData: MemberFormData,
  createdBy: string
): Promise<{ memberRecord: MemberRecord; password: string }> => {
  try {
    console.log('Creating new member with Firebase Auth:', formData.firstName, formData.lastName);

    const memberPassword = generateMemberPassword();
    
    const { auth: adminAuth } = await import('./firebase');
    const currentAdmin = adminAuth.currentUser;
    if (!currentAdmin) {
      throw new Error('No authenticated admin user found');
    }

    const secondAuth = initializeSecondaryApp();
    
    // Create Firebase Auth user for member
    const userCredential = await createUserWithEmailAndPassword(
      secondAuth,
      formData.email,
      memberPassword
    );
    
    const newUser = userCredential.user;
    console.log('Member Firebase Auth user created:', newUser.uid);

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
      authUid: newUser.uid,
    };

    const cleanedMemberData = cleanMemberData(memberData);

    // Use batch write for atomicity
    const batch = writeBatch(db);
    
    batch.set(doc(db, 'users', newUser.uid), cleanedMemberData);
    batch.set(doc(db, 'memberProfiles', newUser.uid), {
      type: 'member',
      role: 'customer',
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      isActive: true,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
      createdBy,
    });

    await batch.commit();

    // Sign out from secondary auth
    await signOut(secondAuth);

    // Verify admin session
    const stillLoggedIn = adminAuth.currentUser;
    if (!stillLoggedIn || stillLoggedIn.uid !== currentAdmin.uid) {
      console.error('Admin session was lost during member creation!');
      throw new Error('Admin session was compromised during member creation');
    }

    // Clear cache to force refresh
    memberCache.delete('all-members');
    memberCache.delete(`member-${newUser.uid}`);

    const memberRecord = {
      id: newUser.uid,
      ...cleanedMemberData,
    };

    // Update cache with new member
    memberCache.set(`member-${newUser.uid}`, memberRecord);

    console.log('Member created successfully with ID:', newUser.uid);
    
    return {
      memberRecord,
      password: memberPassword
    };
  } catch (error: any) {
    console.error('Error creating member:', error);
    
    if (secondaryAuth) {
      try {
        await signOut(secondaryAuth);
      } catch (signOutError) {
        console.error('Error signing out from secondary auth:', signOutError);
      }
    }
    
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

// UPDATE MEMBER - Optimized with cache invalidation
export const updateMember = async (
  memberId: string,
  formData: Partial<MemberFormData>,
  updatedBy: string
): Promise<boolean> => {
  return requestBatcher.batch(
    `update-member-${memberId}`,
    async (id: string, data: Partial<MemberFormData>, by: string) => {
      try {
        console.log(`Updating member ${id}`);
        const memberRef = doc(db, 'users', id);
        
        const updateData: any = {
          ...data,
          updatedAt: Timestamp.now(),
        };

        if (data.dateOfBirth) {
          updateData.dateOfBirth = Timestamp.fromDate(data.dateOfBirth);
        }

        if (data.membershipType || data.monthlyAmount !== undefined || data.totalAmount !== undefined) {
          const currentMember = await getMemberById(id, false); // Don't use cache for current data
          if (currentMember) {
            updateData.membership = cleanMemberData({
              ...currentMember.membership,
              type: data.membershipType || currentMember.membership.type,
              monthlyAmount: data.monthlyAmount ?? currentMember.membership.monthlyAmount,
              totalAmount: data.totalAmount ?? currentMember.membership.totalAmount,
              totalCredits: data.totalCredits ?? currentMember.membership.totalCredits,
              paymentMethod: data.paymentMethod || currentMember.membership.paymentMethod,
              autoRenew: data.autoRenew ?? currentMember.membership.autoRenew,
              updatedAt: Timestamp.now(),
            });
          }
        }

        // Update member profile if name changed
        if (data.firstName || data.lastName) {
          const memberProfileRef = doc(db, 'memberProfiles', id);
          const memberProfileUpdate: any = {
            updatedAt: Timestamp.now(),
          };
          
          if (data.firstName) memberProfileUpdate.firstName = data.firstName;
          if (data.lastName) memberProfileUpdate.lastName = data.lastName;
          
          await updateDoc(memberProfileRef, memberProfileUpdate);
        }

        const cleanedUpdateData = cleanMemberData(updateData);
        await updateDoc(memberRef, cleanedUpdateData);

        // Invalidate cache
        memberCache.delete(`member-${id}`);
        memberCache.delete('all-members');

        console.log('Member updated successfully');
        return true;
      } catch (error) {
        console.error('Error updating member:', error);
        throw new Error('Failed to update member. Please try again.');
      }
    },
    memberId,
    formData,
    updatedBy
  );
};

// DELETE MEMBER - Optimized with cache invalidation
export const deleteMember = async (memberId: string, deletedBy: string): Promise<boolean> => {
  try {
    console.log(`Deactivating member ${memberId}`);
    
    const batch = writeBatch(db);
    
    // Deactivate member record
    batch.update(doc(db, 'users', memberId), {
      isActive: false,
      deactivatedAt: Timestamp.now(),
      deactivatedBy: deletedBy,
      updatedAt: Timestamp.now(),
    });

    // Deactivate member profile
    batch.update(doc(db, 'memberProfiles', memberId), {
      isActive: false,
      deactivatedAt: Timestamp.now(),
      deactivatedBy: deletedBy,
      updatedAt: Timestamp.now(),
    });

    await batch.commit();

    // Invalidate cache
    memberCache.delete(`member-${memberId}`);
    memberCache.delete('all-members');

    console.log('Member deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating member:', error);
    throw new Error('Failed to deactivate member. Please try again.');
  }
};

// UPDATE MEMBERSHIP STATUS - Optimized
export const updateMembershipStatus = async (
  memberId: string,
  newStatus: MemberStatus,
  updatedBy: string,
  reason?: string
): Promise<boolean> => {
  return requestBatcher.batch(
    `update-status-${memberId}`,
    async (id: string, status: MemberStatus, by: string, statusReason?: string) => {
      try {
        console.log(`Updating membership status for ${id} to ${status}`);
        
        const updateData: any = {
          'membership.status': status,
          'membership.updatedAt': Timestamp.now(),
          updatedAt: Timestamp.now(),
        };

        switch (status) {
          case 'Active':
            updateData['membership.startDate'] = Timestamp.now();
            break;
          case 'Paused':
            updateData['membership.pausedDate'] = Timestamp.now();
            if (statusReason) updateData['membership.pauseReason'] = statusReason;
            break;
          case 'Overdue':
            updateData['membership.overdueDate'] = Timestamp.now();
            break;
        }

        await updateDoc(doc(db, 'users', id), updateData);

        // Invalidate cache
        memberCache.delete(`member-${id}`);
        memberCache.delete('all-members');

        return true;
      } catch (error) {
        console.error('Error updating membership status:', error);
        throw new Error('Failed to update membership status.');
      }
    },
    memberId,
    newStatus,
    updatedBy,
    reason
  );
};

// BELT AND LEVEL FUNCTIONS - Cached
export const getAllBeltLevels = async (useCache = true): Promise<BeltLevel[]> => {
  const cacheKey = 'belt-levels';
  
  const fetcher = async (): Promise<BeltLevel[]> => {
    try {
      console.log('Fetching belt levels from Firestore...');
      const beltsRef = collection(db, 'beltLevels');
      const snapshot = await getDocs(beltsRef);
      
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

  if (useCache) {
    return memberCache.get(cacheKey, fetcher);
  } else {
    const result = await fetcher();
    memberCache.set(cacheKey, result);
    return result;
  }
};

export const getAllStudentLevels = async (useCache = true): Promise<StudentLevel[]> => {
  const cacheKey = 'student-levels';
  
  const fetcher = async (): Promise<StudentLevel[]> => {
    try {
      console.log('Fetching student levels from Firestore...');
      const levelsRef = collection(db, 'studentLevels');
      const snapshot = await getDocs(levelsRef);
      
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

  if (useCache) {
    return memberCache.get(cacheKey, fetcher);
  } else {
    const result = await fetcher();
    memberCache.set(cacheKey, result);
    return result;
  }
};

// CREATE BELT LEVEL
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
    
    // Invalidate cache
    memberCache.delete('belt-levels');
    
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

// CREATE STUDENT LEVEL
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
    
    // Invalidate cache
    memberCache.delete('student-levels');
    
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

// AWARD BELT TO MEMBER
export const awardBeltToMember = async (
  memberId: string,
  beltLevelId: string,
  awardedBy: string,
  notes?: string
): Promise<MemberBeltAward> => {
  try {
    const member = await getMemberById(memberId, false);
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

    const batch = writeBatch(db);
    
    const awardRef = doc(collection(db, 'memberBeltAwards'));
    batch.set(awardRef, awardData);

    batch.update(doc(db, 'users', memberId), {
      currentBeltLevel: {
        id: beltLevelId,
        name: beltData.name,
        style: beltData.style,
        dateAwarded: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    await batch.commit();

    // Invalidate cache
    memberCache.delete(`member-${memberId}`);
    memberCache.delete('all-members');

    return {
      id: awardRef.id,
      ...awardData,
    };
  } catch (error) {
    console.error('Error awarding belt:', error);
    throw error;
  }
};

// AWARD STUDENT LEVEL TO MEMBER
export const awardStudentLevelToMember = async (
  memberId: string,
  studentLevelId: string,
  awardedBy: string,
  notes?: string
): Promise<MemberStudentLevelAward> => {
  try {
    const member = await getMemberById(memberId, false);
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

    const batch = writeBatch(db);
    
    const awardRef = doc(collection(db, 'memberStudentLevelAwards'));
    batch.set(awardRef, awardData);

    batch.update(doc(db, 'users', memberId), {
      currentStudentLevel: {
        id: studentLevelId,
        name: levelData.name,
        dateAwarded: Timestamp.now(),
      },
      updatedAt: Timestamp.now(),
    });

    await batch.commit();

    // Invalidate cache
    memberCache.delete(`member-${memberId}`);
    memberCache.delete('all-members');

    return {
      id: awardRef.id,
      ...awardData,
    };
  } catch (error) {
    console.error('Error awarding student level:', error);
    throw error;
  }
};

// LOG MEMBER ACTIVITY
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

// GET MEMBER STATISTICS - Optimized
export const getMemberStats = async (useCache = true): Promise<MemberStats> => {
  const cacheKey = 'member-stats';
  
  const fetcher = async (): Promise<MemberStats> => {
    try {
      const members = await getAllMembers(false); // Don't double-cache
      
      const currentMonth = new Date();
      currentMonth.setDate(1);

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

      members.forEach(member => {
        const membershipStatus = member?.membership?.status || 'No Membership';
        switch (membershipStatus) {
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
        if (member.joinDate && member.joinDate.toDate() >= currentMonth) {
          stats.newThisMonth++;
        }

        // Calculate revenue (only for active members)
        if (member?.membership?.status === 'Active') {
          if (member.membership.type === 'Recurring' && member.membership.monthlyAmount) {
            stats.recurringRevenue += member.membership.monthlyAmount;
          }
        }
      });

      return stats;
    } catch (error) {
      console.error('Error calculating member stats:', error);
      throw new Error('Failed to calculate member statistics');
    }
  };

  if (useCache) {
    return memberCache.get(cacheKey, fetcher);
  } else {
    const result = await fetcher();
    memberCache.set(cacheKey, result);
    return result;
  }
};

// CACHE MANAGEMENT FUNCTIONS
export const clearMemberCache = (): void => {
  memberCache.clear();
  console.log('Member cache cleared');
};

export const getCacheStats = () => {
  return memberCache.getStats();
};

export const invalidateMemberCache = (memberId?: string): void => {
  if (memberId) {
    memberCache.delete(`member-${memberId}`);
  }
  memberCache.delete('all-members');
  memberCache.delete('member-stats');
  console.log('Member cache invalidated');
};

// SEARCH MEMBERS - Optimized with caching
export const searchMembers = async (
  searchTerm: string,
  filters?: {
    status?: MemberStatus;
    membershipType?: MembershipType;
    tags?: string[];
  }
): Promise<MemberRecord[]> => {
  try {
    // Get all members from cache
    const allMembers = await getAllMembers(true);
    
    if (!searchTerm.trim() && !filters) {
      return allMembers;
    }

    let filtered = allMembers;

    // Apply search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(member => {
        const searchFields = [
          member?.firstName || '',
          member?.lastName || '',
          member?.email || '',
          member?.phone || '',
          `${member?.firstName || ''} ${member?.lastName || ''}`.trim(),
        ];
        
        return searchFields.some(field => 
          field.toLowerCase().includes(term)
        );
      });
    }

    // Apply filters
    if (filters) {
      if (filters.status) {
        filtered = filtered.filter(member => 
          member?.membership?.status === filters.status
        );
      }

      if (filters.membershipType) {
        filtered = filtered.filter(member => 
          member?.membership?.type === filters.membershipType
        );
      }

      if (filters.tags && filters.tags.length > 0) {
        filtered = filtered.filter(member => 
          member?.tags?.some(tag => filters.tags!.includes(tag))
        );
      }
    }

    return filtered;
  } catch (error) {
    console.error('Error searching members:', error);
    throw new Error('Failed to search members');
  }
};

// BULK OPERATIONS
export const bulkUpdateMemberStatus = async (
  memberIds: string[],
  newStatus: MemberStatus,
  updatedBy: string,
  reason?: string
): Promise<{ successful: string[]; failed: { id: string; error: string }[] }> => {
  const results = {
    successful: [] as string[],
    failed: [] as { id: string; error: string }[],
  };

  // Process in batches of 10 to avoid Firestore limits
  const batchSize = 10;
  for (let i = 0; i < memberIds.length; i += batchSize) {
    const batch = memberIds.slice(i, i + batchSize);
    
    await Promise.allSettled(
      batch.map(async (memberId) => {
        try {
          await updateMembershipStatus(memberId, newStatus, updatedBy, reason);
          results.successful.push(memberId);
        } catch (error: any) {
          results.failed.push({
            id: memberId,
            error: error.message || 'Unknown error',
          });
        }
      })
    );
  }

  return results;
};

// EXPORT MEMBERS DATA
export const exportMembersData = async (format: 'json' | 'csv' = 'json'): Promise<string> => {
  try {
    const members = await getAllMembers(true);
    
    if (format === 'json') {
      return JSON.stringify(members, null, 2);
    } else {
      // CSV format
      const headers = [
        'ID', 'First Name', 'Last Name', 'Email', 'Phone',
        'Membership Type', 'Membership Status', 'Join Date',
        'Monthly Amount', 'Total Visits', 'Is Active'
      ];
      
      const rows = members.map(member => [
        member.id,
        member.firstName,
        member.lastName,
        member.email,
        member.phone,
        member.membership?.type || '',
        member.membership?.status || '',
        member.joinDate ? member.joinDate.toDate().toISOString().split('T')[0] : '',
        member.membership?.monthlyAmount || '',
        member.totalVisits,
        member.isActive
      ]);
      
      const csvContent = [headers, ...rows]
        .map(row => row.map(cell => `"${cell}"`).join(','))
        .join('\n');
      
      return csvContent;
    }
  } catch (error) {
    console.error('Error exporting members data:', error);
    throw new Error('Failed to export members data');
  }
};

// DEFAULT EXPORT
export default {
  // Core member functions
  createMember,
  getAllMembers,
  getMemberById,
  updateMember,
  deleteMember,
  updateMembershipStatus,
  
  // Search and pagination
  searchMembers,
  getMembersPaginated,
  
  // Belt and level management
  getAllBeltLevels,
  getAllStudentLevels,
  createBeltLevel,
  createStudentLevel,
  awardBeltToMember,
  awardStudentLevelToMember,
  
  // Statistics and analytics
  getMemberStats,
  
  // Subscriptions
  subscribeMemberUpdates,
  subscribeMemberById,
  
  // Bulk operations
  bulkUpdateMemberStatus,
  exportMembersData,
  
  // Cache management
  clearMemberCache,
  invalidateMemberCache,
  getCacheStats,
  
  // Activity logging
  logMemberActivity,
};