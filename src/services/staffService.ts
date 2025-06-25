// src/services/staffService.ts
import { db, auth } from './firebase';
import {
  collection,
  getDocs,
  Timestamp,
  DocumentData,
  doc,
  setDoc,
  updateDoc,
  getDoc,
} from 'firebase/firestore';
import {
  createUserWithEmailAndPassword,
  updateProfile,
  getAuth,
  signOut,
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';

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
  isActive: boolean;
  deletedAt?: Timestamp;
}

// İkincil Firebase App instance
let secondaryApp: any = null;
let secondaryAuth: any = null;

const initializeSecondaryApp = () => {
  if (!secondaryApp) {
    // Ana firebase config'inizi buraya kopyalayın
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
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      secondaryAuth = getAuth(secondaryApp);
      console.log('Secondary Firebase app initialized successfully');
    } catch (error) {
      console.error('Error initializing secondary app:', error);
      throw new Error('Could not initialize secondary authentication');
    }
  }
  return secondaryAuth;
};

// Ana staff oluşturma fonksiyonu - Admin oturumunu koruyarak
export const createStaffSecure = async (data: StaffData) => {
  try {
    // Ana kullanıcının bilgilerini sakla
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error('No authenticated admin user found');
    }

    console.log('Starting secure staff creation...');
    console.log('Current admin user:', currentUser.uid, currentUser.email);

    // İkincil auth instance'ını başlat
    const secondAuth = initializeSecondaryApp();
    
    console.log('Creating new user with secondary auth...');
    
    // İkincil auth ile yeni kullanıcı oluştur
    const userCredential = await createUserWithEmailAndPassword(
      secondAuth,
      data.email,
      data.password
    );
    
    const newUser = userCredential.user;
    console.log('New user created:', newUser.uid, newUser.email);

    // Yeni kullanıcının display name'ini güncelle
    await updateProfile(newUser, {
      displayName: data.fullName,
    });

    // Firestore'da staff kaydını oluştur
    const staffData = {
      fullName: data.fullName,
      email: data.email,
      role: data.role,
      createdAt: Timestamp.now(),
      uid: newUser.uid,
      isActive: true,
    };

    await setDoc(doc(db, 'staff', newUser.uid), staffData);
    console.log('Staff record created in Firestore');

    // İkincil auth'dan çıkış yap (çok önemli!)
    await signOut(secondAuth);
    console.log('Signed out from secondary auth');

    // Ana kullanıcının hala oturum açık olduğunu doğrula
    const stillLoggedIn = auth.currentUser;
    if (!stillLoggedIn || stillLoggedIn.uid !== currentUser.uid) {
      console.error('Admin session was lost!');
      throw new Error('Admin session was compromised during staff creation');
    }

    console.log('Admin session preserved successfully');

    return {
      id: newUser.uid,
      ...staffData,
    };
  } catch (error: any) {
    console.error('Error creating staff:', error);
    
    // Hata durumunda da ikincil auth'dan çık
    if (secondaryAuth) {
      try {
        await signOut(secondaryAuth);
      } catch (signOutError) {
        console.error('Error signing out from secondary auth:', signOutError);
      }
    }
    
    // Convert Firebase errors to user-friendly messages
    if (error.code === 'auth/email-already-in-use') {
      throw new Error('This email address is already in use');
    } else if (error.code === 'auth/weak-password') {
      throw new Error('Password is too weak. Must be at least 6 characters');
    } else if (error.code === 'auth/invalid-email') {
      throw new Error('Invalid email address');
    }
    
    throw error;
  }
};

// Other functions
export const getAllStaff = async (): Promise<StaffRecord[]> => {
  try {
    const staffRef = collection(db, 'staff');
    const snapshot = await getDocs(staffRef);

    const staffList: StaffRecord[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data() as DocumentData;
      
      // Only get non-deleted records
      staffList.push({
        id: doc.id,
        fullName: docData.fullName,
        email: docData.email,
        role: docData.role,
        createdAt: docData.createdAt,
        uid: docData.uid,
        isActive: docData.isActive ?? true,
        deletedAt: docData.deletedAt,
      });
    });

    // Sort by creation date - newest first
    return staffList.sort((a, b) => b.createdAt.seconds - a.createdAt.seconds);
  } catch (error) {
    console.error('Error fetching staff:', error);
    throw error;
  }
};

export const setStaffActiveStatus = async (
  staffId: string, 
  isActive: boolean, 
  updatedBy: string
) => {
  try {
    // Prevent users from deactivating their own account
    if (staffId === updatedBy && !isActive) {
      throw new Error('You cannot deactivate your own account');
    }

    const updateData: any = {
      isActive: isActive,
      updatedAt: Timestamp.now(),
      updatedBy: updatedBy,
    };

    if (!isActive) {
      updateData.deactivatedAt = Timestamp.now();
    } else {
      // Clear deactivatedAt when reactivating
      updateData.deactivatedAt = null;
    }

    await updateDoc(doc(db, 'staff', staffId), updateData);

    console.log(`Staff ${isActive ? 'activated' : 'deactivated'} successfully`);
    return true;
  } catch (error) {
    console.error('Error updating staff status:', error);
    throw error;
  }
};

export const checkUserStatus = async (uid: string) => {
  try {
    const userDocRef = doc(db, 'staff', uid);
    const userDoc = await getDoc(userDocRef);
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userDoc.data();
    
    if (userData.isActive === false) {
      throw new Error('Your account has been deactivated. Please contact your administrator');
    }
    
    return userData;
  } catch (error) {
    throw error;
  }
};

export const getActiveStaff = async (): Promise<StaffRecord[]> => {
  try {
    const allStaff = await getAllStaff();
    return allStaff.filter(staff => staff.isActive);
  } catch (error) {
    console.error('Error fetching active staff:', error);
    throw error;
  }
};

// Backward compatibility için
export const createStaff = createStaffSecure;
export const deleteStaff = async (staffId: string) => {
  try {
    await setStaffActiveStatus(staffId, false, 'system');
    return true;
  } catch (error) {
    console.error('Error deactivating staff:', error);
    throw error;
  }
};