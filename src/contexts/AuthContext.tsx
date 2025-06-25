import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { User, onAuthStateChanged, signOut, signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../services/firebase';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  logout: () => Promise<void>;
  protectSession: () => void;
  unprotectSession: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [sessionProtected, setSessionProtected] = useState(false);
  const protectedUserRef = useRef<User | null>(null);
  const protectedUserTokenRef = useRef<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      // Eğer session korunuyorsa ve beklenmeyen user değişikliği varsa
      if (sessionProtected && protectedUserRef.current) {
        // Eğer gelen user null ise veya farklı bir user ise
        if (!firebaseUser || firebaseUser.uid !== protectedUserRef.current.uid) {
          console.log('Session protection active - unauthorized auth state change detected');
          
          // Korunan kullanıcıyı geri yükle
          try {
            if (protectedUserTokenRef.current) {
              // Eğer token varsa, kullanıcıyı geri yükle
              await restoreProtectedUser();
            }
          } catch (error) {
            console.error('Error restoring protected user:', error);
            // Hata durumunda session protection'ı kapat
            setSessionProtected(false);
            protectedUserRef.current = null;
            protectedUserTokenRef.current = null;
            setUser(firebaseUser);
          }
          return;
        }
      }

      // Normal auth state değişikliği
      if (!sessionProtected) {
        setUser(firebaseUser);
      }
      
      setLoading(false);
    });

    return () => unsubscribe();
  }, [sessionProtected]);

  const restoreProtectedUser = async () => {
    if (protectedUserRef.current && protectedUserTokenRef.current) {
      try {
        // Korunan kullanıcıyı state'e geri yükle
        setUser(protectedUserRef.current);
        console.log('Protected user restored successfully');
      } catch (error) {
        console.error('Failed to restore protected user:', error);
        throw error;
      }
    }
  };

  const protectSession = async () => {
    if (user) {
      console.log('Session protection activated for user:', user.uid);
      protectedUserRef.current = user;
      
      // Kullanıcının token'ını sakla
      try {
        const token = await user.getIdToken();
        protectedUserTokenRef.current = token;
      } catch (error) {
        console.error('Error getting user token:', error);
      }
      
      setSessionProtected(true);
    }
  };

  const unprotectSession = () => {
    console.log('Session protection deactivated');
    setSessionProtected(false);
    protectedUserRef.current = null;
    protectedUserTokenRef.current = null;
    
    // Gerçek auth state'i tekrar kontrol et
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
    }
  };

  const logout = async () => {
    // Logout sırasında session protection'ı kapat
    setSessionProtected(false);
    protectedUserRef.current = null;
    protectedUserTokenRef.current = null;
    
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      logout, 
      protectSession, 
      unprotectSession 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};