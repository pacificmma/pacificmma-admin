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
  where,
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

// Helper function to upload image
const uploadImageIfProvided = async (imageFile?: File, folder: string = 'classes'): Promise<string> => {
  if (!imageFile) return '';
  
  const imageRef = ref(storage, `${folder}/${Date.now()}_${imageFile.name}`);
  const snapshot = await uploadBytes(imageRef, imageFile);
  return await getDownloadURL(snapshot.ref);
};

// Helper function to delete image
const deleteImageIfExists = async (imageUrl?: string): Promise<void> => {
  if (!imageUrl) return;
  
  try {
    const imageRef = ref(storage, imageUrl);
    await deleteObject(imageRef);
  } catch (error) {
    console.warn('Could not delete image:', error);
  }
};

// Create new single class
export const createClass = async (data: ClassData, imageFile?: File): Promise<ClassRecord> => {
  try {
    const imageUrl = await uploadImageIfProvided(imageFile, 'classes');

    const classData = {
      ...data,
      date: Timestamp.fromDate(data.date),
      imageUrl,
      currentEnrollment: 0,
      isPackage: false,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    console.log('Creating single class:', classData.title);
    const docRef = await addDoc(collection(db, 'classes'), classData);
    
    return {
      id: docRef.id,
      ...classData,
    } as ClassRecord;
  } catch (error) {
    console.error('Error creating class:', error);
    throw new Error('Failed to create class. Please try again.');
  }
};

// Create package with multiple classes - OPTIMIZED
export const createPackage = async (
  packageData: PackageData, 
  classDates: Date[], 
  imageFile?: File
): Promise<{ packageId: string; totalClasses: number }> => {
  try {
    console.log(`Creating package "${packageData.title}" with ${classDates.length} sessions`);
    
    const imageUrl = await uploadImageIfProvided(imageFile, 'packages');
    
    // Use a single batch operation for better performance
    const batch = writeBatch(db);
    
    // Create package document
    const packageRef = doc(collection(db, 'packages'));
    const packageDocData = {
      ...packageData,
      startDate: Timestamp.fromDate(packageData.startDate),
      endDate: Timestamp.fromDate(packageData.endDate),
      imageUrl,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    };

    batch.set(packageRef, packageDocData);
    console.log('Package document prepared');

    // Create individual class sessions in batch
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
        price: 0, // Individual sessions are free, package is paid
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

    console.log(`Committing batch with ${classDates.length + 1} operations`);
    await batch.commit();
    console.log('Package and sessions created successfully');
    
    return {
      packageId: packageRef.id,
      totalClasses: classDates.length
    };
  } catch (error) {
    console.error('Error creating package:', error);
    throw new Error('Failed to create package. Please try again.');
  }
};

// Get all classes/workshops (including package sessions) - OPTIMIZED
export const getAllClasses = async (): Promise<ClassRecord[]> => {
  try {
    console.log('Fetching all classes...');
    const classesRef = collection(db, 'classes');
    const q = query(classesRef, orderBy('date', 'asc'));
    const snapshot = await getDocs(q);

    const classList: ClassRecord[] = [];
    snapshot.forEach((doc) => {
      const docData = doc.data() as DocumentData;
      
      // Only include individual classes (not package sessions for main list)
      if (!docData.isPackage) {
        classList.push({
          id: doc.id,
          title: docData.title,
          description: docData.description || '',
          type: docData.type,
          date: docData.date,
          startTime: docData.startTime,
          endTime: docData.endTime,
          location: docData.location,
          capacity: docData.capacity,
          instructorId: docData.instructorId,
          instructorName: docData.instructorName,
          price: docData.price || 0,
          imageUrl: docData.imageUrl || '',
          isActive: docData.isActive ?? true,
          currentEnrollment: docData.currentEnrollment || 0,
          createdAt: docData.createdAt,
          updatedAt: docData.updatedAt,
          // Package fields
          isPackage: false,
        });
      }
    });

    console.log(`Found ${classList.length} individual classes`);
    return classList;
  } catch (error) {
    console.error('Error fetching classes:', error);
    throw new Error('Failed to load classes. Please try again.');
  }
};

// Get all packages with their sessions - OPTIMIZED
export const getAllPackages = async (): Promise<PackageRecord[]> => {
  try {
    console.log('Fetching all packages...');
    
    // First get all packages
    const packagesRef = collection(db, 'packages');
    const packagesQuery = query(packagesRef, orderBy('startDate', 'asc'));
    const packagesSnapshot = await getDocs(packagesQuery);

    if (packagesSnapshot.empty) {
      console.log('No packages found');
      return [];
    }

    // Get all package sessions in a single query (without orderBy to avoid index requirement)
    const classesRef = collection(db, 'classes');
    const sessionsQuery = query(
      classesRef, 
      where('isPackage', '==', true)
    );
    const sessionsSnapshot = await getDocs(sessionsQuery);

    // Group sessions by packageId
    const sessionsByPackage: Record<string, ClassRecord[]> = {};
    sessionsSnapshot.forEach((sessionDoc) => {
      const sessionData = sessionDoc.data() as DocumentData;
      const packageId = sessionData.packageId;
      
      if (!sessionsByPackage[packageId]) {
        sessionsByPackage[packageId] = [];
      }
      
      sessionsByPackage[packageId].push({
        id: sessionDoc.id,
        title: sessionData.title,
        description: sessionData.description || '',
        type: sessionData.type,
        date: sessionData.date,
        startTime: sessionData.startTime,
        endTime: sessionData.endTime,
        location: sessionData.location,
        capacity: sessionData.capacity,
        instructorId: sessionData.instructorId,
        instructorName: sessionData.instructorName,
        price: sessionData.price || 0,
        imageUrl: sessionData.imageUrl || '',
        isActive: sessionData.isActive ?? true,
        currentEnrollment: sessionData.currentEnrollment || 0,
        createdAt: sessionData.createdAt,
        updatedAt: sessionData.updatedAt,
        isPackage: true,
        packageId: sessionData.packageId,
        packagePrice: sessionData.packagePrice,
        totalSessions: sessionData.totalSessions,
        sessionNumber: sessionData.sessionNumber,
        packageTitle: sessionData.packageTitle,
      });
    });

    // Build package records
    const packageList: PackageRecord[] = [];
    packagesSnapshot.forEach((packageDoc) => {
      const packageData = packageDoc.data() as DocumentData;
      const sessions = sessionsByPackage[packageDoc.id] || [];
      
      packageList.push({
        id: packageDoc.id,
        title: packageData.title,
        description: packageData.description || '',
        type: packageData.type,
        startTime: packageData.startTime,
        endTime: packageData.endTime,
        location: packageData.location,
        capacity: packageData.capacity,
        instructorId: packageData.instructorId,
        instructorName: packageData.instructorName,
        packagePrice: packageData.packagePrice,
        totalSessions: packageData.totalSessions,
        imageUrl: packageData.imageUrl || '',
        isActive: packageData.isActive ?? true,
        daysOfWeek: packageData.daysOfWeek || [],
        startDate: packageData.startDate,
        endDate: packageData.endDate,
        createdAt: packageData.createdAt,
        updatedAt: packageData.updatedAt,
        sessions: sessions.sort((a, b) => a.date.toMillis() - b.date.toMillis()),
      });
    });

    console.log(`Found ${packageList.length} packages with ${Object.keys(sessionsByPackage).length} session groups`);
    return packageList;
  } catch (error) {
    console.error('Error fetching packages:', error);
    throw new Error('Failed to load packages. Please try again.');
  }
};

// Update class/workshop
export const updateClass = async (id: string, data: Partial<ClassData>, imageFile?: File): Promise<boolean> => {
  try {
    console.log(`Updating class ${id}`);
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
      updateData.imageUrl = await uploadImageIfProvided(imageFile, 'classes');
    }

    await updateDoc(classRef, updateData);
    console.log('Class updated successfully');
    return true;
  } catch (error) {
    console.error('Error updating class:', error);
    throw new Error('Failed to update class. Please try again.');
  }
};

// Delete class/workshop
export const deleteClass = async (id: string, imageUrl?: string): Promise<boolean> => {
  try {
    console.log(`Deleting class ${id}`);
    
    // Delete image from storage if exists
    await deleteImageIfExists(imageUrl);

    // Delete class document
    await deleteDoc(doc(db, 'classes', id));
    console.log('Class deleted successfully');
    return true;
  } catch (error) {
    console.error('Error deleting class:', error);
    throw new Error('Failed to delete class. Please try again.');
  }
};

// Delete entire package and all its sessions - OPTIMIZED
export const deletePackage = async (packageId: string, imageUrl?: string): Promise<boolean> => {
  try {
    console.log(`Deleting package ${packageId} and all its sessions`);
    
    const batch = writeBatch(db);
    
    // Get all sessions for this package
    const classesRef = collection(db, 'classes');
    const sessionsQuery = query(classesRef, where('packageId', '==', packageId));
    const sessionsSnapshot = await getDocs(sessionsQuery);
    
    console.log(`Found ${sessionsSnapshot.size} sessions to delete`);
    
    // Delete all sessions in batch
    sessionsSnapshot.forEach((sessionDoc) => {
      batch.delete(sessionDoc.ref);
    });
    
    // Delete package
    const packageRef = doc(db, 'packages', packageId);
    batch.delete(packageRef);
    
    await batch.commit();
    console.log('Package and sessions deleted from database');
    
    // Delete image from storage if exists
    await deleteImageIfExists(imageUrl);
    
    console.log('Package deletion completed successfully');
    return true;
  } catch (error) {
    console.error('Error deleting package:', error);
    throw new Error('Failed to delete package. Please try again.');
  }
};

// Get instructors for dropdown - CACHED
let instructorsCache: { id: string; name: string }[] | null = null;
let instructorsCacheTime = 0;
const INSTRUCTORS_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const getInstructors = async (): Promise<{ id: string; name: string }[]> => {
  try {
    // Check cache first
    const now = Date.now();
    if (instructorsCache && (now - instructorsCacheTime) < INSTRUCTORS_CACHE_DURATION) {
      console.log('Using cached instructors');
      return instructorsCache;
    }

    console.log('Fetching instructors from database');
    const staffRef = collection(db, 'staff');
    const staffQuery = query(
      staffRef,
      where('isActive', '==', true)
    );
    const snapshot = await getDocs(staffQuery);
    
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

    // Update cache
    instructorsCache = instructors;
    instructorsCacheTime = now;
    
    console.log(`Found ${instructors.length} active instructors`);
    return instructors;
  } catch (error) {
    console.error('Error fetching instructors:', error);
    // Return cached data if available, otherwise throw
    if (instructorsCache) {
      console.log('Returning cached instructors due to error');
      return instructorsCache;
    }
    throw new Error('Failed to load instructors. Please try again.');
  }
};

// Clear instructors cache (useful when staff is updated)
export const clearInstructorsCache = (): void => {
  instructorsCache = null;
  instructorsCacheTime = 0;
  console.log('Instructors cache cleared');
};

// Get package sessions by package ID
export const getPackageSessions = async (packageId: string): Promise<ClassRecord[]> => {
  try {
    console.log(`Fetching sessions for package ${packageId}`);
    
    const classesRef = collection(db, 'classes');
    const sessionsQuery = query(
      classesRef,
      where('packageId', '==', packageId),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(sessionsQuery);

    const sessions: ClassRecord[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data() as DocumentData;
      sessions.push({
        id: doc.id,
        title: data.title,
        description: data.description || '',
        type: data.type,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        location: data.location,
        capacity: data.capacity,
        instructorId: data.instructorId,
        instructorName: data.instructorName,
        price: data.price || 0,
        imageUrl: data.imageUrl || '',
        isActive: data.isActive ?? true,
        currentEnrollment: data.currentEnrollment || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
        isPackage: true,
        packageId: data.packageId,
        packagePrice: data.packagePrice,
        totalSessions: data.totalSessions,
        sessionNumber: data.sessionNumber,
        packageTitle: data.packageTitle,
      });
    });

    console.log(`Found ${sessions.length} sessions for package`);
    
    // Sort sessions by date in memory
    sessions.sort((a, b) => a.date.toMillis() - b.date.toMillis());
    
    return sessions;
  } catch (error) {
    console.error('Error fetching package sessions:', error);
    throw new Error('Failed to load package sessions. Please try again.');
  }
};