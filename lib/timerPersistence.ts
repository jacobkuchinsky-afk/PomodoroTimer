import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from './firebase';
import { TimerStatus } from '@/contexts/TimerContext';

const LOCAL_STORAGE_KEY = 'pomodoro_timer_state';

export interface PersistedTimerState {
  totalSeconds: number;
  currentPhaseIndex: number;
  status: TimerStatus;
  activePresetId: string | null;
  savedAt: number; // Unix timestamp in milliseconds
  isRunning: boolean;
}

// ============ LocalStorage Functions ============

export function saveTimerStateLocal(state: PersistedTimerState): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save timer state to localStorage:', error);
  }
}

export function loadTimerStateLocal(): PersistedTimerState | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!saved) return null;
    
    return JSON.parse(saved) as PersistedTimerState;
  } catch (error) {
    console.error('Failed to load timer state from localStorage:', error);
    return null;
  }
}

export function clearTimerStateLocal(): void {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear timer state from localStorage:', error);
  }
}

// ============ Firebase Functions ============

const getTimerStateDoc = (userId: string) => doc(db, 'users', userId, 'timerState', 'current');

export async function saveTimerStateFirebase(
  userId: string,
  state: PersistedTimerState
): Promise<void> {
  try {
    const timerStateRef = getTimerStateDoc(userId);
    await setDoc(timerStateRef, state);
  } catch (error) {
    console.error('Failed to save timer state to Firebase:', error);
  }
}

export async function loadTimerStateFirebase(
  userId: string
): Promise<PersistedTimerState | null> {
  try {
    const timerStateRef = getTimerStateDoc(userId);
    const snapshot = await getDoc(timerStateRef);
    
    if (snapshot.exists()) {
      return snapshot.data() as PersistedTimerState;
    }
    return null;
  } catch (error) {
    console.error('Failed to load timer state from Firebase:', error);
    return null;
  }
}

export function subscribeToTimerState(
  userId: string,
  callback: (state: PersistedTimerState | null) => void
): () => void {
  const timerStateRef = getTimerStateDoc(userId);
  
  return onSnapshot(timerStateRef, (snapshot) => {
    if (snapshot.exists()) {
      callback(snapshot.data() as PersistedTimerState);
    } else {
      callback(null);
    }
  }, (error) => {
    console.error('Error subscribing to timer state:', error);
    callback(null);
  });
}

// ============ Utility Functions ============

/**
 * Calculate the adjusted timer state accounting for elapsed time since save.
 * If the timer was running when saved, subtract the elapsed time from totalSeconds.
 */
export function calculateRestoredState(
  savedState: PersistedTimerState
): PersistedTimerState {
  // If the timer wasn't running, return as-is
  if (!savedState.isRunning || savedState.status !== 'running') {
    return savedState;
  }
  
  const now = Date.now();
  const elapsedSeconds = Math.floor((now - savedState.savedAt) / 1000);
  const adjustedSeconds = Math.max(0, savedState.totalSeconds - elapsedSeconds);
  
  // If time has run out while away, mark as completed
  if (adjustedSeconds === 0) {
    return {
      ...savedState,
      totalSeconds: 0,
      isRunning: false,
      status: 'paused', // Set to paused so user can decide what to do
      savedAt: now,
    };
  }
  
  return {
    ...savedState,
    totalSeconds: adjustedSeconds,
    savedAt: now,
  };
}

/**
 * Create a PersistedTimerState from current timer values
 */
export function createPersistedState(
  totalSeconds: number,
  currentPhaseIndex: number,
  status: TimerStatus,
  activePresetId: string | null,
  isRunning: boolean
): PersistedTimerState {
  return {
    totalSeconds,
    currentPhaseIndex,
    status,
    activePresetId,
    isRunning,
    savedAt: Date.now(),
  };
}
