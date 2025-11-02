import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// YOUR FIREBASE CONFIG - PASTE YOUR CONFIG HERE
// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBUb-be4Wu4BwCTGOGhN0kc40Cnl3G7Ez4",
  authDomain: "clientflow-7acff.firebaseapp.com",
  projectId: "clientflow-7acff",
  storageBucket: "clientflow-7acff.firebasestorage.app",
  messagingSenderId: "16972939119",
  appId: "1:16972939119:web:e4ea8cff095afa4f24329a"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
