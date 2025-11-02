import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyDFCaraph7uBPnuAoPy7ujBfNaLP",
  authDomain: "clientflow-2ec7f.firebaseapp.com",
  projectId: "clientflow-2ec7f",
  storageBucket: "clientflow-2ec7f.firebasestorage.app",
  messagingSenderId: "1897293119",
  appId: "1:1897293119:web:54a6e4fdf0afaf2e423a"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
