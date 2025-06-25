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
}

export interface ClassRecord extends Omit<ClassData, 'date'> {
  id: string;
  date: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  currentEnrollment: number;
}

// Create new class/workshop
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

// Get all classes/workshops
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
      });
    });

    return classList;
  } catch (error) {
    console.error('Error fetching classes:', error);
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