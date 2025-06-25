// src/services/firebase.ts - Updated for unified project
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';

// Admin app configuration - Firebase Console'dan aldığın yeni config'i buraya yapıştır
const adminFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID, // Ana pacificmma project ID'si
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_ADMIN_APP_ID, // YENİ - Admin app ID
  measurementId: process.env.REACT_APP_FIREBASE_ADMIN_MEASUREMENT_ID, // YENİ - Admin measurement ID
};

// Initialize Firebase app specifically for admin panel
const adminApp = initializeApp(adminFirebaseConfig, 'admin');

// Initialize services for admin app
export const db = getFirestore(adminApp);
export const auth = getAuth(adminApp);
export const storage = getStorage(adminApp);
export const functions = getFunctions(adminApp);

// Export the config for potential customer app integration
export const sharedFirebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  // Customer app will use different app ID
};

console.log('Admin Firebase app initialized:', adminApp.name);
console.log('Connected to project:', adminFirebaseConfig.projectId);

export default adminApp;