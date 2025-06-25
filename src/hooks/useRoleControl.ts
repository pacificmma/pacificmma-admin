// src/hooks/useRoleControl.ts
import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';

export type UserRole = 'admin' | 'trainer' | 'staff';

interface UserData {
  fullName: string;
  email: string;
  role: UserRole;
  uid: string;
}

export const useRoleControl = () => {
  const { user } = useAuth();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserData(null);
        setLoading(false);
        return;
      }

      try {
        const userDoc = await getDoc(doc(db, 'staff', user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          setUserData({
            fullName: data.fullName,
            email: data.email,
            role: data.role,
            uid: data.uid,
          });
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  const isAdmin = userData?.role === 'admin';
  const isTrainer = userData?.role === 'trainer';
  const isStaff = userData?.role === 'staff';
  const canCreateClasses = isAdmin; // Sadece admin class oluşturabilir
  const canCreateDiscounts = isAdmin; // Sadece admin discount oluşturabilir
  const canManageStaff = isAdmin; // Sadece admin staff yönetebilir

  return {
    userData,
    loading,
    isAdmin,
    isTrainer,
    isStaff,
    canCreateClasses,
    canCreateDiscounts,
    canManageStaff,
  };
};