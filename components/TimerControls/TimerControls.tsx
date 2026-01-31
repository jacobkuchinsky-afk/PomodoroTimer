'use client';

import React from 'react';
import { TimerStatus } from '@/contexts/TimerContext';
import './TimerControls.scss';

interface TimerControlsProps {
  isRunning: boolean;
  status: TimerStatus;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
}

export const TimerControls: React.FC<TimerControlsProps> = ({
  isRunning,
  status,
  onStart,
  onPause,
  onReset,
}) => {
  return (
    <div className="timer-controls">
      <div className="main-controls">
        {isRunning ? (
          <button className="control-btn pause-btn" onClick={onPause}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
            Pause
          </button>
        ) : (
          <button className="control-btn start-btn" onClick={onStart}>
            <svg viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            {status === 'completed' ? 'Restart' : 'Start'}
          </button>
        )}
        
        <button className="control-btn reset-btn" onClick={onReset}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="1,4 1,10 7,10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          Reset
        </button>
      </div>
    </div>
  );
};

export default TimerControls;
