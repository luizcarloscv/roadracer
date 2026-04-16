import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, User, GoogleAuthProvider, signInWithPopup, createUserWithEmailAndPassword, signOut, updatePassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp, limit } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Firebase configuration (Persistent for ZIP export)
const firebaseConfig = {
  projectId: "ai-studio-applet-webapp-b1e44",
  appId: "1:683269265814:web:e8a57f9abbef7a8a5365b7",
  apiKey: "AIzaSyDYN3gvcSsQqm1NmLPw2bhq5HIpGwFNDfY",
  authDomain: "ai-studio-applet-webapp-b1e44.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-39ba9f98-0228-483e-9e90-efedb5f73770",
  storageBucket: "ai-studio-applet-webapp-b1e44.firebasestorage.app",
  messagingSenderId: "683269265814"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
// @ts-ignore - firestoreDatabaseId is a custom field in our config
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId || '(default)');
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

export { 
  collection, doc, setDoc, getDoc, getDocs, onSnapshot, query, where, orderBy, addDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, Timestamp, limit,
  signInWithEmailAndPassword, onAuthStateChanged, signInWithPopup, createUserWithEmailAndPassword, signOut, updatePassword, sendPasswordResetEmail,
  ref, uploadBytes, getDownloadURL,
  firebaseConfig, initializeApp, deleteApp, getAuth
};
export type { User };
