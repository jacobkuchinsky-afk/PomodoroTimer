import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyC2smCObXQbS9Jg3fZVbCP5wUIdlqAf9bQ",
  authDomain: "pomodoro-timer-dd8d9.firebaseapp.com",
  projectId: "pomodoro-timer-dd8d9",
  storageBucket: "pomodoro-timer-dd8d9.firebasestorage.app",
  messagingSenderId: "360671908413",
  appId: "1:360671908413:web:f3b59e0312aff35dec9054",
  measurementId: "G-2JQY8HZQ2P"
};

// Initialize Firebase only if it hasn't been initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
