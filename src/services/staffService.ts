import { db, auth } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  Timestamp,
  DocumentData,
  doc,
  setDoc,
  deleteDoc,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { httpsCallable } from 'firebase/functions';
import { functions } from './firebase';

export interface StaffData {
  fullName: string;
  email: string;
  password: string;
  role: 'admin' | 'trainer' | 'staff';
}

export interface StaffRecord {
  id: string;
  fullName: string;
  email: string;
  role: 'admin' | 'trainer' | 'staff';
  createdAt: Timestamp;
  uid: string;
}

// Cloud Functions kullanarak staff oluştur (önerilen)
export const createStaffSecure = async (data: StaffData) => {
  try {
    const createStaff = httpsCallable(functions, 'createStaff');
    const result = await createStaff({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    return result.data;
  } catch (error: any) {
    console.error('Error creating staff with Cloud Functions:', error);
    
    // Cloud Functions hatalarını client-friendly'e çevir
    if (error.code === 'functions/permission-denied') {
      throw new Error('Only administrators can create staff members');
    } else if (error.code === 'functions/unauthenticated') {
      throw new Error('You must be logged in to create staff members');
    } else if (error.message?.includes('email-already-in-use')) {
      throw new Error('This email address is already in use');
    } else if (error.message?.includes('weak-password')) {
      throw new Error('Password is too weak');
    } else if (error.message?.includes('invalid-email')) {
      throw new Error('Invalid email address');
    }
    
    throw new Error(error.message || 'An error occurred while creating staff member');
  }
};

// Fallback: Client-side oluşturma (daha az güvenli)
export const createStaff = async (data: StaffData) => {
  try {
    // 1. Firebase Authentication ile kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      data.email,
      data.password
    );
    
    const user = userCredential.user;

    // 2. Kullanıcının display name'ini güncelle
    await updateProfile(user, {
      displayName: data.fullName,
    });

    // 3. Firestore'da staff kaydını oluştur
    const staffData = {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      createdAt: Timestamp.now(),
      uid: user.uid,
    };

    await setDoc(doc(db, 'staff', user.uid), staffData);

    return {
      id: user.uid,
      ...staffData,
    };
  } catch (error) {
    console.error('Error creating staff:', error);
    throw error;
  }
};

// Tüm staff'ları getir
export const getAllStaff = async (): Promise<StaffRecord[]> => {
  const staffRef = collection(db, 'staff');
  const snapshot = await getDocs(staffRef);

  const staffList: StaffRecord[] = [];
  snapshot.forEach((doc) => {
    const docData = doc.data() as DocumentData;
    staffList.push({
      id: doc.id,
      fullName: docData.fullName,
      email: docData.email,
      role: docData.role,
      createdAt: docData.createdAt,
      uid: docData.uid,
    });
  });

  return staffList;
};

// Cloud Functions kullanarak staff sil (önerilen)
export const deleteStaffSecure = async (staffId: string) => {
  try {
    const deleteStaff = httpsCallable(functions, 'deleteStaff');
    const result = await deleteStaff({ staffId });

    return result.data;
  } catch (error: any) {
    console.error('Error deleting staff with Cloud Functions:', error);
    
    // Cloud Functions hatalarını client-friendly'e çevir
    if (error.code === 'functions/permission-denied') {
      throw new Error('Only administrators can delete staff members');
    } else if (error.code === 'functions/unauthenticated') {
      throw new Error('You must be logged in to delete staff members');
    }
    
    throw new Error(error.message || 'An error occurred while deleting staff member');
  }
};

// Fallback: Client-side silme (sadece Firestore'dan siler, Authentication'dan silmez)
export const deleteStaff = async (staffId: string, userEmail: string, userPassword: string) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to delete users');
    }

    // Sadece Firestore'dan sil
    await deleteDoc(doc(db, 'staff', staffId));

    console.log('Staff successfully deleted from Firestore (Authentication user still exists)');
    return true;
  } catch (error) {
    console.error('Error deleting staff:', error);
    throw error;
  }
};