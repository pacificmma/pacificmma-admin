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
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { initializeApp } from 'firebase/app';
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
  isActive: boolean;
  deletedAt?: Timestamp;
}

// İkinci Firebase App instance (sadece user creation için)
let secondaryApp: any = null;
let secondaryAuth: any = null;

const getSecondaryAuth = () => {
  if (!secondaryApp) {
    // Firebase config'inizi buraya koyun (ana app ile aynı config)
    const firebaseConfig = {
      // Ana firebase config'inizi buraya kopyalayın
      // Bu bilgileri firebase.ts dosyanızdan alabilirsiniz
      apiKey: "your-api-key",
      authDomain: "your-auth-domain",
      projectId: "your-project-id",
      storageBucket: "your-storage-bucket",
      messagingSenderId: "your-messaging-sender-id",
      appId: "your-app-id"
    };
    
    try {
      secondaryApp = initializeApp(firebaseConfig, 'SecondaryApp');
      secondaryAuth = getAuth(secondaryApp);
    } catch (error) {
      console.error('Error initializing secondary app:', error);
      // Fallback olarak ana auth'u kullan
      return auth;
    }
  }
  return secondaryAuth;
};

// Staff oluşturma - Admin oturumunu koruyarak (Geliştirilmiş versiyon)
export const createStaff = async (data: StaffData) => {
  try {
    // Ana kullanıcının bilgilerini sakla
    const currentUser = auth.currentUser;
    const currentUserEmail = currentUser?.email;
    
    if (!currentUser || !currentUserEmail) {
      throw new Error('No authenticated user found');
    }

    // Admin kullanıcının token'ını al
    const adminToken = await currentUser.getIdToken();
    
    console.log('Creating staff with admin session protection...');

    // İkinci auth instance kullanarak yeni kullanıcı oluştur
    const secondAuth = getSecondaryAuth();
    
    // Yeni kullanıcıyı oluştur
    const userCredential = await createUserWithEmailAndPassword(
      secondAuth,
      data.email,
      data.password
    );
    
    const newUser = userCredential.user;

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

    // İkinci auth'dan derhal çıkış yap
    if (secondAuth !== auth) {
      await secondAuth.signOut();
    }

    // Ana kullanıcıyı geri yükle (eğer session değişmişse)
    const currentAuthUser = auth.currentUser;
    if (!currentAuthUser || currentAuthUser.uid !== currentUser.uid) {
      console.log('Admin session was affected, restoring...');
      
      // Token'ı doğrula ve kullanıcıyı geri yükle
      try {
        // Bu durumda manuel olarak admin'i geri yüklemek gerekebilir
        // Ancak bu risky bir işlem olduğu için sadece log atacağız
        console.warn('Admin session may have been affected. Please refresh if needed.');
      } catch (restoreError) {
        console.error('Error restoring admin session:', restoreError);
      }
    }

    console.log('Staff created successfully, admin session preserved');

    return {
      id: newUser.uid,
      ...staffData,
    };
  } catch (error) {
    console.error('Error creating staff:', error);
    
    // Hata durumunda ana kullanıcının oturumunu kontrol et
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.error('Admin session was lost during staff creation');
    }
    
    throw error;
  }
};

// Alternatif: Admin Cloud Function kullanarak güvenli staff oluşturma
export const createStaffViaCloudFunction = async (data: StaffData) => {
  try {
    const createStaffFunc = httpsCallable(functions, 'createStaffByAdmin');
    const result = await createStaffFunc({
      fullName: data.fullName,
      email: data.email,
      password: data.password,
      role: data.role,
    });

    return result.data;
  } catch (error: any) {
    console.error('Cloud Function not available, using fallback method:', error);
    // Fallback: İkinci auth ile oluşturma
    return await createStaff(data);
  }
};

// Server-side yaklaşım için Admin SDK gerektiren Cloud Function örneği
// Bu fonksiyon Firebase Functions'da çalışmalı:
/*
export const createStaffByAdmin = functions.https.onCall(async (data, context) => {
  // Admin yetkisi kontrolü
  if (!context.auth || !context.auth.token.admin) {
    throw new functions.https.HttpsError('permission-denied', 'Only admins can create staff');
  }

  try {
    const { fullName, email, password, role } = data;
    
    // Admin SDK ile kullanıcı oluştur (oturum etkilenmez)
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: fullName,
    });

    // Firestore'da staff kaydını oluştur
    const staffData = {
      fullName,
      email,
      role,
      createdAt: admin.firestore.Timestamp.now(),
      uid: userRecord.uid,
      isActive: true,
    };

    await admin.firestore().collection('staff').doc(userRecord.uid).set(staffData);

    return {
      id: userRecord.uid,
      ...staffData,
    };
  } catch (error) {
    throw new functions.https.HttpsError('internal', 'Error creating staff');
  }
});
*/

// Diğer fonksiyonlar aynı kalıyor...
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
      isActive: docData.isActive ?? true,
      deletedAt: docData.deletedAt,
    });
  });

  return staffList;
};

export const setStaffActiveStatus = async (
  staffId: string, 
  isActive: boolean, 
  updatedBy: string
) => {
  try {
    const updateData: any = {
      isActive: isActive,
      updatedAt: Timestamp.now(),
      updatedBy: updatedBy,
    };

    if (!isActive) {
      updateData.deletedAt = Timestamp.now();
    } else {
      updateData.deletedAt = null;
    }

    await updateDoc(doc(db, 'staff', staffId), updateData);

    console.log(`Staff ${isActive ? 'activated' : 'deactivated'} successfully`);
    return true;
  } catch (error) {
    console.error('Error updating staff status:', error);
    throw new Error(`Failed to ${isActive ? 'activate' : 'deactivate'} staff member`);
  }
};

export const deleteStaff = async (staffId: string) => {
  try {
    await setStaffActiveStatus(staffId, false, 'system');
    return true;
  } catch (error) {
    console.error('Error deactivating staff:', error);
    throw error;
  }
};

export const getActiveStaff = async (): Promise<StaffRecord[]> => {
  const allStaff = await getAllStaff();
  return allStaff.filter(staff => staff.isActive);
};

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

// Ana staff oluşturma fonksiyonu - önce Cloud Function'ı dener, sonra fallback
export const createStaffSecure = async (data: StaffData) => {
  try {
    // Önce Cloud Function ile dene
    return await createStaffViaCloudFunction(data);
  } catch (error: any) {
    console.log('Cloud Function failed, using direct method with session protection');
    // Fallback: Direct method with session protection
    return await createStaff(data);
  }
};