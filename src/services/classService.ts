import { db, storage } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  DocumentData,
  query,
  orderBy,
  writeBatch,
} from 'firebase/firestore';
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from 'firebase/storage';

export interface ClassData {
  title: string;
  description: string;
  type: 'class' | 'workshop';
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  instructorId: string;
  instructorName: string;
  price: number;
  imageUrl?: string;
  isActive: boolean;
  // Package fields
  isPackage?: boolean;
  packageId?: string;
  packagePrice?: number;
  totalSessions?: number;
  sessionNumber?: number;
  packageTitle?: string;
}

export interface PackageData {
  title: string;
  description: string;
  type: 'class' | 'workshop';
  startTime: string;
  endTime: string;
  location: string;
  capacity: number;
  instructorId: string;
  instructorName: string;
  packagePrice: number;
  totalSessions: number;
  imageUrl?: string;
  isActive: boolean;
  daysOfWeek: number[];
  startDate: Date;
  endDate: Date;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ClassRecord extends Omit<ClassData, 'date'> {
  id: string;
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  currentEnrollment: number;
}

export interface PackageRecord extends Omit<PackageData, 'startDate' | 'endDate'> {
  id: string;
  startDate: Timestamp;
  endDate: Timestamp;
  sessions: ClassRecord[];
}

// Create new single class
export const createClass = async (data: ClassData, imageFile?: File) => {
  try {
    let imageUrl = '';
    
    // Upload image if provided
    if (imageFile) {
      const imageRef = ref(storage, `classes/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    const classData = {
      ...data,
      date: Timestamp.fromDate(data.date),
      imageUrl,
      currentEnrollment: 0,
      isPackage: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const docRef = await addDoc(collection(db, 'classes'), classData);
    return {
      id: docRef.id,
      ...classData,
    };
  } catch (error) {
    console.error('Error creating class:', error);
    throw error;
  }
};

// Create package with multiple classes
export const createPackage = async (packageData: PackageData, classDates: Date[], imageFile?: File) => {
  try {
    let imageUrl = '';
    
    // Upload image if provided
    if (imageFile) {
      const imageRef = ref(storage, `packages/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(snapshot.ref);
    }

    const batch = writeBatch(db);
    
    // Create package document
    const packageDocData = {
      ...packageData,
      startDate: Timestamp.fromDate(packageData.startDate),
      endDate: Timestamp.fromDate(packageData.endDate),
      imageUrl,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    const packageRef = doc(collection(db, 'packages'));
    batch.set(packageRef, packageDocData);

    // Create individual class sessions
    const sessionPrice = 0; // Individual sessions are free, package is paid
    
    classDates.forEach((date, index) => {
      const classRef = doc(collection(db, 'classes'));
      const classData = {
        title: `${packageData.title} - Session ${index + 1}`,
        description: packageData.description,
        type: packageData.type,
        date: Timestamp.fromDate(date),
        startTime: packageData.startTime,
        endTime: packageData.endTime,
        location: packageData.location,
        capacity: packageData.capacity,
        instructorId: packageData.instructorId,
        instructorName: packageData.instructorName,
        price: sessionPrice,
        imageUrl,
        isActive: packageData.isActive,
        currentEnrollment: 0,
        // Package relation fields
        isPackage: true,
        packageId: packageRef.id,
        packagePrice: packageData.packagePrice,
        totalSessions: packageData.totalSessions,
        sessionNumber: index + 1,
        packageTitle: packageData.title,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };
      
      batch.set(classRef, classData);
    });

    await batch.commit();
    
    return {
      packageId: packageRef.id,
      ...packageDocData,
      totalClasses: classDates.length
    };
  } catch (error) {
    console.error('Error creating package:', error);
    throw error;
  }
};

// Get all classes/workshops (including package sessions)
export const getAllClasses = async (): Promise<ClassRecord[]> => {
  try {
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

    const classList: ClassRecord[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data() as DocumentData;
      classList.push({
        id: doc.id,
        title: docData.title,
        description: docData.description,
        type: docData.type,
        date: docData.date,
        startTime: docData.startTime,
        endTime: docData.endTime,
        location: docData.location,
        capacity: docData.capacity,
        instructorId: docData.instructorId,
        instructorName: docData.instructorName,
        price: docData.price,
        imageUrl: docData.imageUrl,
        isActive: docData.isActive,
        currentEnrollment: docData.currentEnrollment || 0,
        createdAt: docData.createdAt,
        updatedAt: docData.updatedAt,
        // Package fields
        isPackage: docData.isPackage || false,
        packageId: docData.packageId,
        packagePrice: docData.packagePrice,
        totalSessions: docData.totalSessions,
        sessionNumber: docData.sessionNumber,
        packageTitle: docData.packageTitle,
      });
    });

    return classList;
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw error;
  }
};

// Get all packages
export const getAllPackages = async (): Promise<PackageRecord[]> => {
  try {
    const packagesRef = collection(db, 'packages');
    const q = query(packagesRef, orderBy('startDate', 'asc'));
    const snapshot = await getDocs(q);

    const packageList: PackageRecord[] = [];
    
    for (const packageDoc of snapshot.docs) {
      const packageData = packageDoc.data() as DocumentData;
      
      // Get all sessions for this package
      const classesRef = collection(db, 'classes');
      const sessionsQuery = query(classesRef, orderBy('date', 'asc'));
      const sessionsSnapshot = await getDocs(sessionsQuery);
      
      const sessions: ClassRecord[] = [];
      sessionsSnapshot.forEach((sessionDoc) => {
        const sessionData = sessionDoc.data() as DocumentData;
        if (sessionData.packageId === packageDoc.id) {
          sessions.push({
            id: sessionDoc.id,
            ...sessionData,
          } as ClassRecord);
        }
      });
      
      packageList.push({
        id: packageDoc.id,
        title: packageData.title,
        description: packageData.description,
        type: packageData.type,
        startTime: packageData.startTime,
        endTime: packageData.endTime,
        location: packageData.location,
        capacity: packageData.capacity,
        instructorId: packageData.instructorId,
        instructorName: packageData.instructorName,
        packagePrice: packageData.packagePrice,
        totalSessions: packageData.totalSessions,
        imageUrl: packageData.imageUrl,
        isActive: packageData.isActive,
        daysOfWeek: packageData.daysOfWeek,
        startDate: packageData.startDate,
        endDate: packageData.endDate,
        createdAt: packageData.createdAt,
        updatedAt: packageData.updatedAt,
        sessions: sessions,
      });
    }

    return packageList;
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw error;
  }
};

// Update class/workshop
export const updateClass = async (id: string, data: Partial<ClassData>, imageFile?: File) => {
  try {
    const classRef = doc(db, 'classes', id);
    let updateData: any = {
      ...data,
      updatedAt: Timestamp.now(),
    };

    // Handle date conversion if provided
    if (data.date) {
      updateData.date = Timestamp.fromDate(data.date);
    }

    // Upload new image if provided
    if (imageFile) {
      const imageRef = ref(storage, `classes/${Date.now()}_${imageFile.name}`);
      const snapshot = await uploadBytes(imageRef, imageFile);
      updateData.imageUrl = await getDownloadURL(snapshot.ref);
    }

    await updateDoc(classRef, updateData);
    return true;
  } catch (error) {
    console.error('Error updating class:', error);
    throw error;
  }
};

// Delete class/workshop
export const deleteClass = async (id: string, imageUrl?: string) => {
  try {
    // Delete image from storage if exists
    if (imageUrl) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (imgError) {
        console.warn('Could not delete image:', imgError);
      }
    }

    // Delete class document
    await deleteDoc(doc(db, 'classes', id));
    return true;
  } catch (error) {
    console.error('Error deleting class:', error);
    throw error;
  }
};

// Delete entire package and all its sessions
export const deletePackage = async (packageId: string, imageUrl?: string) => {
  try {
    const batch = writeBatch(db);
    
    // Get all sessions for this package
    const classesRef = collection(db, 'classes');
    const q = query(classesRef);
    const snapshot = await getDocs(q);
    
    // Delete all sessions
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.packageId === packageId) {
        batch.delete(doc.ref);
      }
    });
    
    // Delete package
    const packageRef = doc(db, 'packages', packageId);
    batch.delete(packageRef);
    
    await batch.commit();
    
    // Delete image from storage if exists
    if (imageUrl) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (imgError) {
        console.warn('Could not delete image:', imgError);
      }
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting package:', error);
    throw error;
  }
};

// Get instructors for dropdown
export const getInstructors = async () => {
  try {
    const staffRef = collection(db, 'staff');
    const snapshot = await getDocs(staffRef);
    
    const instructors: { id: string; name: string }[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.role === 'trainer' || data.role === 'admin') {
        instructors.push({
          id: doc.id,
          name: data.fullName,
        });
      }
    });

    return instructors;
  } catch (error) {
    console.error('Error fetching instructors:', error);
    throw error;
  }
};