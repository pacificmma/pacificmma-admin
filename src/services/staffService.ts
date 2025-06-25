import { db, auth } from './firebase'; // firebase.ts dosyanızın yolu
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
  uid: string; // Authentication UID'si
}

// Yeni staff ve kullanıcı hesabı oluştur
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

    // 3. Firestore'da staff kaydını oluştur (kullanıcı UID'si ile)
    const staffData = {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      createdAt: Timestamp.now(),
      uid: user.uid, // Authentication UID'si ile bağlantı
    };

    // Kullanıcı UID'si ile document oluştur
    await setDoc(doc(db, 'staff', user.uid), staffData);

    return {
      id: user.uid,
      ...staffData,
    };
  } catch (error) {
    console.error('Error creating staff:', error);
    throw error; // Hatayı yukarı ilet
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

// Delete staff user (Authentication + Firestore)
export const deleteStaff = async (staffId: string, userEmail: string, userPassword: string) => {
  try {
    // 1. Verify admin user password
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('You must be logged in to delete users');
    }

    // 2. Delete staff record from Firestore
    await deleteDoc(doc(db, 'staff', staffId));

    // Note: Deleting users from Firebase Authentication is only possible
    // when that user is currently signed in. For admin panel, you need to use 
    // Firebase Admin SDK or Cloud Functions.
    
    console.log('Staff successfully deleted');
    return true;
  } catch (error) {
    console.error('Error deleting staff:', error);
    throw error;
  }
};

// Alternative: Delete using Cloud Functions (recommended method)
export const deleteStaffSecure = async (staffId: string) => {
  try {
    // This function works with Cloud Functions
    // Users can be deleted with Firebase Admin SDK in Cloud Functions
    
    const response = await fetch('/api/deleteStaff', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ staffId }),
    });

    if (!response.ok) {
      throw new Error('Could not delete user');
    }

    return true;
  } catch (error) {
    console.error('Error deleting staff:', error);
    throw error;
  }
};