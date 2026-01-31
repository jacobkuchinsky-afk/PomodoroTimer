'use client';

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from 'react';
import { useAuth } from './AuthContext';
import {
  Preset,
  Phase,
  subscribeToPresets,
  subscribeToUserSettings,
  setActivePreset as setActivePresetInDB,
} from '@/lib/presets';
import {
  saveTimerStateLocal,
  loadTimerStateLocal,
  clearTimerStateLocal,
  saveTimerStateFirebase,
  loadTimerStateFirebase,
  calculateRestoredState,
  createPersistedState,
  PersistedTimerState,
} from '@/lib/timerPersistence';

export type TimerStatus = 'idle' | 'running' | 'paused' | 'completed';

interface TimerState {
  totalSeconds: number;
  isRunning: boolean;
  status: TimerStatus;
  currentPhaseIndex: number;
}

interface TimerContextType {
  // Presets
  presets: Preset[];
  activePreset: Preset | null;
  activePresetId: string | null;
  setActivePresetId: (id: string | null) => Promise<void>;
  loadingPresets: boolean;
  
  // Current phase info
  currentPhase: Phase | null;
  currentPhaseIndex: number;
  totalPhases: number;
  
  // Timer state
  timerState: TimerState;
  hours: number;
  minutes: number;
  seconds: number;
  digits: string[];
  formattedTime: string;
  
  // Sync settings
  syncTimerState: boolean;
  
  // Timer controls
  start: () => void;
  pause: () => void;
  reset: () => void;
  skipToNextPhase: () => void;
  skipToPreviousPhase: () => void;
  goToPhase: (index: number) => void;
}

const TimerContext = createContext<TimerContextType | null>(null);

function formatTimeDigits(hours: number, minutes: number, seconds: number): string[] {
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = seconds.toString().padStart(2, '0');
  return `${h}${m}${s}`.split('');
}

function secondsToTime(totalSeconds: number): {
  hours: number;
  minutes: number;
  seconds: number;
} {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

// Load initial state from localStorage synchronously
function getInitialTimerState(): { state: TimerState; restored: boolean; savedPresetId: string | null } {
  if (typeof window === 'undefined') {
    return {
      state: { totalSeconds: 0, isRunning: false, status: 'idle', currentPhaseIndex: 0 },
      restored: false,
      savedPresetId: null,
    };
  }
  
  const savedState = loadTimerStateLocal();
  if (savedState) {
    const restoredState = calculateRestoredState(savedState);
    return {
      state: {
        totalSeconds: restoredState.totalSeconds,
        isRunning: restoredState.isRunning,
        status: restoredState.status,
        currentPhaseIndex: restoredState.currentPhaseIndex,
      },
      restored: true,
      savedPresetId: restoredState.activePresetId,
    };
  }
  
  return {
    state: { totalSeconds: 0, isRunning: false, status: 'idle', currentPhaseIndex: 0 },
    restored: false,
    savedPresetId: null,
  };
}

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  
  // Presets state
  const [presets, setPresets] = useState<Preset[]>([]);
  const [activePresetId, setActivePresetIdState] = useState<string | null>(null);
  const [loadingPresets, setLoadingPresets] = useState(true);
  
  // Sync settings
  const [syncTimerState, setSyncTimerState] = useState(false);
  
  // Load initial state synchronously from localStorage
  const initialData = useRef(getInitialTimerState());
  
  // Timer state
  const [timerState, setTimerState] = useState<TimerState>(initialData.current.state);
  
  // Track if we've restored from persistence and the preset ID it was for
  const [hasRestoredState, setHasRestoredState] = useState(initialData.current.restored);
  const restoredPresetIdRef = useRef<string | null>(initialData.current.savedPresetId);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const syncTimerStateRef = useRef(syncTimerState);
  
  // Derive active preset from ID
  const activePreset = presets.find((p) => p.id === activePresetId) || null;
  
  // Derive current phase
  const currentPhase = activePreset?.phases?.[timerState.currentPhaseIndex] || null;
  const totalPhases = activePreset?.phases?.length || 0;
  
  // Keep ref in sync with state
  useEffect(() => {
    syncTimerStateRef.current = syncTimerState;
  }, [syncTimerState]);
  
  // Subscribe to presets when user is logged in
  useEffect(() => {
    if (!user) {
      setPresets([]);
      setActivePresetIdState(null);
      setLoadingPresets(false);
      setSyncTimerState(false);
      return;
    }
    
    setLoadingPresets(true);
    
    const unsubPresets = subscribeToPresets(user.uid, (newPresets) => {
      setPresets(newPresets);
      setLoadingPresets(false);
    });
    
    const unsubSettings = subscribeToUserSettings(user.uid, (settings) => {
      setActivePresetIdState(settings.activePresetId);
      setSyncTimerState(settings.syncTimerState);
    });
    
    return () => {
      unsubPresets();
      unsubSettings();
    };
  }, [user]);
  
  // Load persisted timer state from Firebase (localStorage already loaded synchronously)
  useEffect(() => {
    const loadFirebaseState = async () => {
      // Only check Firebase if user is logged in and sync is enabled
      if (!user || !syncTimerStateRef.current) return;
      
      const firebaseState = await loadTimerStateFirebase(user.uid);
      const localState = loadTimerStateLocal();
      
      // Firebase takes precedence if it's newer
      if (firebaseState && (!localState || firebaseState.savedAt > localState.savedAt)) {
        const restoredState = calculateRestoredState(firebaseState);
        
        setTimerState({
          totalSeconds: restoredState.totalSeconds,
          isRunning: restoredState.isRunning,
          status: restoredState.status,
          currentPhaseIndex: restoredState.currentPhaseIndex,
        });
        setHasRestoredState(true);
        restoredPresetIdRef.current = restoredState.activePresetId;
        
        // Sync localStorage with the restored state
        saveTimerStateLocal(restoredState);
      }
    };
    
    loadFirebaseState();
  }, [user]); // Run when user changes (logs in)
  
  // Initialize timer when active preset changes (but not if we just restored state for this preset)
  useEffect(() => {
    // Skip if we've restored state and the preset matches
    if (hasRestoredState && restoredPresetIdRef.current === activePresetId) {
      // Already restored for this preset, don't reset
      // Clear the restored flag so future preset changes work normally
      setHasRestoredState(false);
      return;
    }
    
    if (activePreset && activePreset.phases && activePreset.phases.length > 0) {
      const firstPhase = activePreset.phases[0];
      setTimerState({
        totalSeconds: firstPhase.durationMinutes * 60,
        isRunning: false,
        status: 'idle',
        currentPhaseIndex: 0,
      });
    } else {
      setTimerState({
        totalSeconds: 0,
        isRunning: false,
        status: 'idle',
        currentPhaseIndex: 0,
      });
    }
  }, [activePreset, activePresetId, hasRestoredState]);
  
  // Save timer state to localStorage and optionally Firebase
  useEffect(() => {
    // Skip if timer hasn't been initialized yet
    if (timerState.status === 'idle' && timerState.totalSeconds === 0 && !activePresetId) {
      return;
    }
    
    const persistedState = createPersistedState(
      timerState.totalSeconds,
      timerState.currentPhaseIndex,
      timerState.status,
      activePresetId,
      timerState.isRunning
    );
    
    // Always save to localStorage
    saveTimerStateLocal(persistedState);
    
    // Save to Firebase if sync is enabled and user is logged in
    if (syncTimerStateRef.current && user) {
      saveTimerStateFirebase(user.uid, persistedState);
    }
  }, [timerState, activePresetId, user]);
  
  // Save state before page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      const persistedState = createPersistedState(
        timerState.totalSeconds,
        timerState.currentPhaseIndex,
        timerState.status,
        activePresetId,
        timerState.isRunning
      );
      
      saveTimerStateLocal(persistedState);
      
      // Note: Firebase save may not complete during unload, but localStorage will
    };
    
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [timerState, activePresetId]);
  
  // Timer countdown logic
  useEffect(() => {
    if (!timerState.isRunning) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    
    intervalRef.current = setInterval(() => {
      setTimerState((prev) => {
        if (prev.totalSeconds <= 1) {
          // Current phase completed
          if (activePreset && activePreset.phases) {
            const nextPhaseIndex = prev.currentPhaseIndex + 1;
            
            // Check if there are more phases
            if (nextPhaseIndex < activePreset.phases.length) {
              // Move to next phase
              const nextPhase = activePreset.phases[nextPhaseIndex];
              return {
                totalSeconds: nextPhase.durationMinutes * 60,
                isRunning: true,
                status: 'running',
                currentPhaseIndex: nextPhaseIndex,
              };
            } else if (activePreset.loopPhases) {
              // Loop back to first phase
              const firstPhase = activePreset.phases[0];
              return {
                totalSeconds: firstPhase.durationMinutes * 60,
                isRunning: true,
                status: 'running',
                currentPhaseIndex: 0,
              };
            } else {
              // All phases completed, stop timer
              return {
                ...prev,
                totalSeconds: 0,
                isRunning: false,
                status: 'completed',
              };
            }
          }
          return { ...prev, totalSeconds: 0, isRunning: false, status: 'completed' };
        }
        return { ...prev, totalSeconds: prev.totalSeconds - 1 };
      });
    }, 1000);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [timerState.isRunning, activePreset]);
  
  // Set active preset (updates Firestore)
  const setActivePresetIdHandler = useCallback(
    async (id: string | null) => {
      if (user) {
        await setActivePresetInDB(user.uid, id);
      }
    },
    [user]
  );
  
  // Timer controls
  const start = useCallback(() => {
    if (!activePreset || !activePreset.phases || activePreset.phases.length === 0) return;
    
    setTimerState((prev) => {
      // If completed or idle, reset to first phase
      if (prev.status === 'completed' || prev.status === 'idle') {
        const firstPhase = activePreset.phases[0];
        return {
          totalSeconds: firstPhase.durationMinutes * 60,
          isRunning: true,
          status: 'running',
          currentPhaseIndex: 0,
        };
      }
      // If timer is at 0, reset current phase
      if (prev.totalSeconds === 0) {
        const currentPhaseData = activePreset.phases[prev.currentPhaseIndex];
        if (currentPhaseData) {
          return {
            ...prev,
            totalSeconds: currentPhaseData.durationMinutes * 60,
            isRunning: true,
            status: 'running',
          };
        }
      }
      return { ...prev, isRunning: true, status: 'running' };
    });
  }, [activePreset]);
  
  const pause = useCallback(() => {
    setTimerState((prev) => ({ ...prev, isRunning: false, status: 'paused' }));
  }, []);
  
  const reset = useCallback(() => {
    if (!activePreset || !activePreset.phases || activePreset.phases.length === 0) return;
    const firstPhase = activePreset.phases[0];
    setTimerState({
      totalSeconds: firstPhase.durationMinutes * 60,
      isRunning: false,
      status: 'idle',
      currentPhaseIndex: 0,
    });
  }, [activePreset]);
  
  const skipToNextPhase = useCallback(() => {
    if (!activePreset || !activePreset.phases || activePreset.phases.length === 0) return;
    
    setTimerState((prev) => {
      const nextIndex = prev.currentPhaseIndex + 1;
      
      if (nextIndex < activePreset.phases.length) {
        const nextPhase = activePreset.phases[nextIndex];
        return {
          totalSeconds: nextPhase.durationMinutes * 60,
          isRunning: false,
          status: 'paused',
          currentPhaseIndex: nextIndex,
        };
      } else if (activePreset.loopPhases) {
        const firstPhase = activePreset.phases[0];
        return {
          totalSeconds: firstPhase.durationMinutes * 60,
          isRunning: false,
          status: 'paused',
          currentPhaseIndex: 0,
        };
      }
      
      return prev;
    });
  }, [activePreset]);
  
  const skipToPreviousPhase = useCallback(() => {
    if (!activePreset || !activePreset.phases || activePreset.phases.length === 0) return;
    
    setTimerState((prev) => {
      const prevIndex = prev.currentPhaseIndex - 1;
      
      if (prevIndex >= 0) {
        const prevPhase = activePreset.phases[prevIndex];
        return {
          totalSeconds: prevPhase.durationMinutes * 60,
          isRunning: false,
          status: 'paused',
          currentPhaseIndex: prevIndex,
        };
      } else if (activePreset.loopPhases) {
        const lastPhase = activePreset.phases[activePreset.phases.length - 1];
        return {
          totalSeconds: lastPhase.durationMinutes * 60,
          isRunning: false,
          status: 'paused',
          currentPhaseIndex: activePreset.phases.length - 1,
        };
      }
      
      return prev;
    });
  }, [activePreset]);
  
  const goToPhase = useCallback((index: number) => {
    if (!activePreset || !activePreset.phases || index < 0 || index >= activePreset.phases.length) return;
    
    const targetPhase = activePreset.phases[index];
    setTimerState({
      totalSeconds: targetPhase.durationMinutes * 60,
      isRunning: false,
      status: 'paused',
      currentPhaseIndex: index,
    });
  }, [activePreset]);
  
  // Computed values
  const { hours, minutes, seconds } = secondsToTime(timerState.totalSeconds);
  const digits = formatTimeDigits(hours, minutes, seconds);
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes
    .toString()
    .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  
  const value: TimerContextType = {
    presets,
    activePreset,
    activePresetId,
    setActivePresetId: setActivePresetIdHandler,
    loadingPresets,
    currentPhase,
    currentPhaseIndex: timerState.currentPhaseIndex,
    totalPhases,
    timerState,
    hours,
    minutes,
    seconds,
    digits,
    formattedTime,
    syncTimerState,
    start,
    pause,
    reset,
    skipToNextPhase,
    skipToPreviousPhase,
    goToPhase,
  };
  
  return (
    <TimerContext.Provider value={value}>{children}</TimerContext.Provider>
  );
}

export function useTimerContext() {
  const context = useContext(TimerContext);
  if (!context) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  return context;
}
