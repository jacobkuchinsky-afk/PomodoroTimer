'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export type TimerMode = 'clock' | 'countdown';

export interface TimerConfig {
  mode: TimerMode;
  initialSeconds?: number; // For countdown mode (default: 25 minutes = 1500 seconds)
  onComplete?: () => void; // Callback when countdown reaches 0
}

export interface TimerState {
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isRunning: boolean;
  mode: TimerMode;
}

export interface TimerControls {
  start: () => void;
  pause: () => void;
  reset: () => void;
  setTime: (seconds: number) => void;
}

export interface UseTimerReturn extends TimerState, TimerControls {
  formattedTime: string;
  digits: string[];
}

const DEFAULT_POMODORO_SECONDS = 25 * 60; // 25 minutes

function formatTimeDigits(hours: number, minutes: number, seconds: number): string[] {
  const h = hours.toString().padStart(2, '0');
  const m = minutes.toString().padStart(2, '0');
  const s = seconds.toString().padStart(2, '0');
  return `${h}${m}${s}`.split('');
}

function secondsToTime(totalSeconds: number): { hours: number; minutes: number; seconds: number } {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { hours, minutes, seconds };
}

export function useTimer(config: TimerConfig = { mode: 'clock' }): UseTimerReturn {
  const { mode, initialSeconds = DEFAULT_POMODORO_SECONDS, onComplete } = config;
  
  const [totalSeconds, setTotalSeconds] = useState<number>(() => {
    if (mode === 'clock') {
      const now = new Date();
      return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    }
    return initialSeconds;
  });
  
  const [isRunning, setIsRunning] = useState<boolean>(mode === 'clock');
  const initialSecondsRef = useRef(initialSeconds);
  const onCompleteRef = useRef(onComplete);
  
  // Keep refs updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);
  
  useEffect(() => {
    initialSecondsRef.current = initialSeconds;
  }, [initialSeconds]);

  // Clock mode: sync with real time
  useEffect(() => {
    if (mode !== 'clock' || !isRunning) return;

    const updateClock = () => {
      const now = new Date();
      setTotalSeconds(now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds());
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [mode, isRunning]);

  // Countdown mode: decrement timer
  useEffect(() => {
    if (mode !== 'countdown' || !isRunning) return;

    const interval = setInterval(() => {
      setTotalSeconds((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          onCompleteRef.current?.();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, isRunning]);

  const { hours, minutes, seconds } = secondsToTime(totalSeconds);

  const start = useCallback(() => {
    if (mode === 'countdown' && totalSeconds === 0) {
      setTotalSeconds(initialSecondsRef.current);
    }
    setIsRunning(true);
  }, [mode, totalSeconds]);

  const pause = useCallback(() => {
    if (mode === 'countdown') {
      setIsRunning(false);
    }
  }, [mode]);

  const reset = useCallback(() => {
    if (mode === 'countdown') {
      setIsRunning(false);
      setTotalSeconds(initialSecondsRef.current);
    }
  }, [mode]);

  const setTime = useCallback((newSeconds: number) => {
    if (mode === 'countdown') {
      initialSecondsRef.current = newSeconds;
      setTotalSeconds(newSeconds);
      setIsRunning(false);
    }
  }, [mode]);

  const digits = formatTimeDigits(hours, minutes, seconds);
  const formattedTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  return {
    hours,
    minutes,
    seconds,
    totalSeconds,
    isRunning,
    mode,
    formattedTime,
    digits,
    start,
    pause,
    reset,
    setTime,
  };
}
