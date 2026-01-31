'use client';

import React from 'react';
import { Preset, Phase } from '@/lib/presets';
import { TimerStatus } from '@/contexts/TimerContext';
import './TimerSubtext.scss';

interface TimerSubtextProps {
  preset: Preset | null;
  currentPhase: Phase | null;
  currentPhaseIndex: number;
  totalPhases: number;
  status: TimerStatus;
  isRunning: boolean;
}

export const TimerSubtext: React.FC<TimerSubtextProps> = ({
  preset,
  currentPhase,
  currentPhaseIndex,
  totalPhases,
  status,
  isRunning,
}) => {
  if (!preset) {
    return (
      <div className="timer-subtext">
        <span className="no-preset">No preset selected</span>
      </div>
    );
  }

  const getStatusLabel = () => {
    switch (status) {
      case 'completed':
        return 'Complete';
      case 'paused':
        return 'Paused';
      case 'running':
        return '';
      default:
        return 'Ready';
    }
  };

  const getPhaseClass = () => {
    switch (status) {
      case 'completed':
        return 'phase-completed';
      case 'running':
        return 'phase-running';
      case 'paused':
        return 'phase-paused';
      default:
        return 'phase-idle';
    }
  };

  const phaseName = currentPhase?.name || 'No phase';
  const statusLabel = getStatusLabel();

  return (
    <div className={`timer-subtext ${getPhaseClass()}`}>
      <span className="preset-name">{preset.name}</span>
      <span className="separator">•</span>
      <span className={`phase-label ${isRunning ? 'running' : ''}`}>
        {phaseName}
      </span>
      {totalPhases > 1 && (
        <>
          <span className="separator">•</span>
          <span className="phase-progress">
            {currentPhaseIndex + 1}/{totalPhases}
          </span>
        </>
      )}
      {statusLabel && (
        <>
          <span className="separator">•</span>
          <span className="status-label">{statusLabel}</span>
        </>
      )}
    </div>
  );
};

export default TimerSubtext;
