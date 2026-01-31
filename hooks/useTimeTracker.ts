'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { recordSession, updateSessionDuration } from '@/lib/analytics';
import { incrementLeaderboardStats } from '@/lib/leaderboard';

const SAVE_INTERVAL = 30000; // Save every 30 seconds

export function useTimeTracker() {
  const { user } = useAuth();
  const sessionIdRef = useRef<string | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  const elapsedSecondsRef = useRef<number>(0);
  const lastSavedSecondsRef = useRef<number>(0); // Track last saved for leaderboard increments
  const isActiveRef = useRef<boolean>(true);
  const lastTickRef = useRef<number>(Date.now());

  // Save current session duration to Firebase
  const saveSession = useCallback(async () => {
    if (!user || !sessionIdRef.current || elapsedSecondsRef.current === 0) return;
    
    try {
      await updateSessionDuration(
        user.uid,
        sessionIdRef.current,
        elapsedSecondsRef.current
      );
      
      // Update leaderboard with the increment since last save
      const increment = elapsedSecondsRef.current - lastSavedSecondsRef.current;
      if (increment > 0) {
        await incrementLeaderboardStats(
          user.uid,
          user.displayName,
          increment
        );
        lastSavedSecondsRef.current = elapsedSecondsRef.current;
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
  }, [user]);

  // Start a new session
  const startSession = useCallback(async () => {
    if (!user) return;
    
    const now = new Date();
    startTimeRef.current = now;
    elapsedSecondsRef.current = 0;
    lastSavedSecondsRef.current = 0;
    lastTickRef.current = Date.now();
    isActiveRef.current = true;
    
    try {
      const sessionId = await recordSession(user.uid, now, 0);
      sessionIdRef.current = sessionId;
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }, [user]);

  // Update elapsed time
  const tick = useCallback(() => {
    if (!isActiveRef.current) return;
    
    const now = Date.now();
    const delta = Math.floor((now - lastTickRef.current) / 1000);
    if (delta > 0) {
      elapsedSecondsRef.current += delta;
      lastTickRef.current = now;
    }
  }, []);

  // Handle visibility change
  const handleVisibilityChange = useCallback(() => {
    if (document.hidden) {
      // Tab is hidden - pause tracking and save
      tick();
      isActiveRef.current = false;
      saveSession();
    } else {
      // Tab is visible - resume tracking
      isActiveRef.current = true;
      lastTickRef.current = Date.now();
    }
  }, [tick, saveSession]);

  // Handle page unload
  const handleBeforeUnload = useCallback(() => {
    tick();
    // Use sendBeacon for reliable unload saves
    if (user && sessionIdRef.current && elapsedSecondsRef.current > 0) {
      // We can't use async here, but we've been saving periodically
      // The final save might not complete, but we have periodic saves
      saveSession();
    }
  }, [tick, saveSession, user]);

  useEffect(() => {
    if (!user) {
      // Clear session if user logs out
      sessionIdRef.current = null;
      startTimeRef.current = null;
      elapsedSecondsRef.current = 0;
      return;
    }

    // Start a new session when user is available
    startSession();

    // Set up periodic save interval
    const saveIntervalId = setInterval(() => {
      tick();
      saveSession();
    }, SAVE_INTERVAL);

    // Set up second ticker
    const tickIntervalId = setInterval(tick, 1000);

    // Add event listeners
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      // Clean up and save final duration
      tick();
      saveSession();
      
      clearInterval(saveIntervalId);
      clearInterval(tickIntervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [user, startSession, saveSession, tick, handleVisibilityChange, handleBeforeUnload]);

  return {
    elapsedSeconds: elapsedSecondsRef.current,
    isTracking: !!user && !!sessionIdRef.current,
  };
}
