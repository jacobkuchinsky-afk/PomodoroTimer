import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp,
  onSnapshot,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

// Phase interface for custom timer phases
export interface Phase {
  id: string;
  name: string;           // Custom name like "Lock in time"
  durationMinutes: number;
  startTime?: string;     // Optional "HH:MM" clock time
  order: number;
}

export interface Preset {
  id: string;
  name: string;
  phases: Phase[];        // Array of custom phases
  loopPhases: boolean;    // Whether to loop or stop after completion
  color?: string;         // Hex color for timer display
  createdAt: Timestamp;
  order: number;
  // Legacy fields for migration (optional)
  workMinutes?: number;
  breakMinutes?: number;
  scheduledStart?: string;
  scheduledEnd?: string;
}

export interface UserSettings {
  activePresetId: string | null;
  syncTimerState: boolean;
}

// Generate a unique ID for phases
export function generatePhaseId(): string {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Create default phases for a new preset
export function createDefaultPhases(): Phase[] {
  return [
    { id: generatePhaseId(), name: 'Work', durationMinutes: 25, order: 0 },
    { id: generatePhaseId(), name: 'Break', durationMinutes: 5, order: 1 },
  ];
}

// Migrate legacy preset to new format (converts workMinutes/breakMinutes to phases)
export function migratePreset(preset: Preset): Preset {
  // If preset already has phases, return as is
  if (preset.phases && preset.phases.length > 0) {
    return preset;
  }

  // Convert legacy workMinutes/breakMinutes to phases
  const phases: Phase[] = [];
  
  if (preset.workMinutes !== undefined) {
    phases.push({
      id: generatePhaseId(),
      name: 'Work',
      durationMinutes: preset.workMinutes,
      startTime: preset.scheduledStart,
      order: 0,
    });
  }
  
  if (preset.breakMinutes !== undefined) {
    phases.push({
      id: generatePhaseId(),
      name: 'Break',
      durationMinutes: preset.breakMinutes,
      order: 1,
    });
  }

  // If no phases were created, use defaults
  if (phases.length === 0) {
    return {
      ...preset,
      phases: createDefaultPhases(),
      loopPhases: false,
    };
  }

  return {
    ...preset,
    phases,
    loopPhases: false,
  };
}

// Get the presets collection reference for a user
const getPresetsCollection = (userId: string) =>
  collection(db, 'users', userId, 'presets');

// Get the user document reference
const getUserDoc = (userId: string) => doc(db, 'users', userId);

// Fetch all presets for a user
export async function getPresets(userId: string): Promise<Preset[]> {
  const presetsRef = getPresetsCollection(userId);
  const q = query(presetsRef, orderBy('order', 'asc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((docSnap) => {
    const preset = {
      id: docSnap.id,
      ...docSnap.data(),
    } as Preset;
    return migratePreset(preset);
  });
}

// Subscribe to presets changes (real-time)
export function subscribeToPresets(
  userId: string,
  callback: (presets: Preset[]) => void
): () => void {
  const presetsRef = getPresetsCollection(userId);
  const q = query(presetsRef, orderBy('order', 'asc'));
  
  return onSnapshot(q, (snapshot) => {
    const presets = snapshot.docs.map((docSnap) => {
      const preset = {
        id: docSnap.id,
        ...docSnap.data(),
      } as Preset;
      return migratePreset(preset);
    });
    callback(presets);
  });
}

// Helper to deeply remove undefined values from objects (Firestore doesn't accept undefined)
function removeUndefined<T>(obj: T): T {
  if (Array.isArray(obj)) {
    return obj.map(removeUndefined) as T;
  }
  if (obj !== null && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, value]) => value !== undefined)
        .map(([key, value]) => [key, removeUndefined(value)])
    ) as T;
  }
  return obj;
}

// Create a new preset
export async function createPreset(
  userId: string,
  preset: Omit<Preset, 'id' | 'createdAt'>
): Promise<string> {
  // Deep filter to remove undefined values - Firestore doesn't accept undefined
  const cleanedPreset = removeUndefined(preset);
  const docData = { ...cleanedPreset, createdAt: Timestamp.now() };
  const presetsRef = getPresetsCollection(userId);
  const docRef = await addDoc(presetsRef, docData);
  return docRef.id;
}

// Update an existing preset
export async function updatePreset(
  userId: string,
  presetId: string,
  updates: Partial<Omit<Preset, 'id' | 'createdAt'>>
): Promise<void> {
  // Deep filter to remove undefined values - Firestore doesn't accept undefined
  const cleanedUpdates = removeUndefined(updates);
  const presetRef = doc(db, 'users', userId, 'presets', presetId);
  await updateDoc(presetRef, cleanedUpdates);
}

// Delete a preset
export async function deletePreset(
  userId: string,
  presetId: string
): Promise<void> {
  const presetRef = doc(db, 'users', userId, 'presets', presetId);
  await deleteDoc(presetRef);
}

// Get user settings (including active preset)
export async function getUserSettings(userId: string): Promise<UserSettings> {
  const userRef = getUserDoc(userId);
  const snapshot = await getDoc(userRef);
  
  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      activePresetId: data.activePresetId || null,
      syncTimerState: data.syncTimerState ?? false,
    };
  }
  
  return { activePresetId: null, syncTimerState: false };
}

// Subscribe to user settings changes (real-time)
export function subscribeToUserSettings(
  userId: string,
  callback: (settings: UserSettings) => void
): () => void {
  const userRef = getUserDoc(userId);
  
  return onSnapshot(userRef, (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      callback({
        activePresetId: data.activePresetId || null,
        syncTimerState: data.syncTimerState ?? false,
      });
    } else {
      callback({ activePresetId: null, syncTimerState: false });
    }
  });
}

// Set the active preset
export async function setActivePreset(
  userId: string,
  presetId: string | null
): Promise<void> {
  const userRef = getUserDoc(userId);
  await setDoc(userRef, { activePresetId: presetId }, { merge: true });
}

// Set the sync timer state preference
export async function setSyncTimerState(
  userId: string,
  syncEnabled: boolean
): Promise<void> {
  const userRef = getUserDoc(userId);
  await setDoc(userRef, { syncTimerState: syncEnabled }, { merge: true });
}

// Get a single preset by ID
export async function getPreset(
  userId: string,
  presetId: string
): Promise<Preset | null> {
  const presetRef = doc(db, 'users', userId, 'presets', presetId);
  const snapshot = await getDoc(presetRef);
  
  if (snapshot.exists()) {
    const preset = {
      id: snapshot.id,
      ...snapshot.data(),
    } as Preset;
    return migratePreset(preset);
  }
  
  return null;
}

// Default timer color
export const DEFAULT_TIMER_COLOR = '#74d447';

// Create a default preset for new users
export async function createDefaultPreset(userId: string): Promise<string> {
  return createPreset(userId, {
    name: 'Focus Session',
    phases: createDefaultPhases(),
    loopPhases: false,
    color: DEFAULT_TIMER_COLOR,
    order: 0,
  });
}
