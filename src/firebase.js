import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBUb-be4Wu4BwCTGOGhN0kc40Cnl3G7Ez4",
  authDomain: "clientflow-7acff.firebaseapp.com",
  projectId: "clientflow-7acff",
  storageBucket: "clientflow-7acff.firebasestorage.app",
  messagingSenderId: "16972939119",
  appId: "1:16972939119:web:e4ea8cff095afa4f24329a"
};
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
