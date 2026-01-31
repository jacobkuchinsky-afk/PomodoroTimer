import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  deleteUser,
  User,
} from 'firebase/auth';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const googleProvider = new GoogleAuthProvider();

export interface UserProfile {
  email: string | null;
  displayName: string | null;
  createdAt: Date;
  lastLogin: Date;
}

// Create or update user profile in Firestore
async function saveUserProfile(user: User, isNewUser: boolean = false) {
  const userRef = doc(db, 'users', user.uid);
  const userSnap = await getDoc(userRef);

  if (!userSnap.exists() || isNewUser) {
    // Create new user profile
    await setDoc(userRef, {
      email: user.email,
      displayName: user.displayName,
      createdAt: serverTimestamp(),
      lastLogin: serverTimestamp(),
    });
  } else {
    // Update last login
    await setDoc(userRef, {
      lastLogin: serverTimestamp(),
    }, { merge: true });
  }
}

// Sign up with email and password
export async function signUpWithEmail(email: string, password: string) {
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await saveUserProfile(userCredential.user, true);
  return userCredential.user;
}

// Sign in with email and password
export async function signInWithEmail(email: string, password: string) {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await saveUserProfile(userCredential.user);
  return userCredential.user;
}

// Sign in with Google
export async function signInWithGoogle() {
  const userCredential = await signInWithPopup(auth, googleProvider);
  await saveUserProfile(userCredential.user);
  return userCredential.user;
}

// Sign out
export async function signOut() {
  await firebaseSignOut(auth);
}

// Delete account and all associated data
export async function deleteAccount(user: User) {
  const userId = user.uid;
  
  // Delete all user's presets
  const presetsRef = collection(db, 'users', userId, 'presets');
  const presetsSnapshot = await getDocs(presetsRef);
  const deletePromises = presetsSnapshot.docs.map((doc) => deleteDoc(doc.ref));
  await Promise.all(deletePromises);
  
  // Delete user document from Firestore
  const userRef = doc(db, 'users', userId);
  await deleteDoc(userRef);
  
  // Delete Firebase auth user
  await deleteUser(user);
}
