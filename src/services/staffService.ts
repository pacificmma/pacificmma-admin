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
  isActive: boolean; // Yeni alan
  deletedAt?: Timestamp; // Yeni alan
}

// Staff oluşturma
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
      isActive: true, // Varsayılan olarak aktif
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

// Tüm aktif staff'ları getir
export const getAllStaff = async (): Promise<StaffRecord[]> => {
  const staffRef = collection(db, 'staff');
  const snapshot = await getDocs(staffRef);

  const staffList: StaffRecord[] = [];
  snapshot.forEach((doc) => {
    const docData = doc.data() as DocumentData;
    
    // Sadece aktif staff'ları göster
    if (docData.isActive !== false) {
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
    }
  });

  return staffList;
};

// Staff'ı devre dışı bırak (soft delete)
export const deleteStaff = async (staffId: string) => {
  try {
    // Sadece Firestore'da isActive = false yap
    await updateDoc(doc(db, 'staff', staffId), {
      isActive: false,
      deletedAt: Timestamp.now(),
    });

    console.log('Staff deactivated successfully');
    return true;
  } catch (error) {
    console.error('Error deactivating staff:', error);
    throw error;
  }
};

// Giriş kontrolü için yardımcı fonksiyon
export const checkUserStatus = async (uid: string) => {
  try {
    const userDocRef = doc(db, 'staff', uid);
    const userDoc = await getDoc(userDocRef);
    const userData = userDoc.data();
    
    if (!userData || userData.isActive === false) {
      throw new Error('User account has been deactivated');
    }
    
    return userData;
  } catch (error) {
    throw error;
  }
};

// Cloud Functions kullanarak tam silme (eğer Cloud Functions kuruluysa)
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
    console.error('Cloud Functions not available, using fallback:', error);
    // Fallback: Normal staff oluşturma
    return await createStaff(data);
  }
};

export const deleteStaffSecure = async (staffId: string) => {
  try {
    const deleteStaffFunc = httpsCallable(functions, 'deleteStaff');
    const result = await deleteStaffFunc({ staffId });
    return result.data;
  } catch (error: any) {
    console.error('Cloud Functions not available, using soft delete:', error);
    // Fallback: Soft delete
    return await deleteStaff(staffId);
  }
};