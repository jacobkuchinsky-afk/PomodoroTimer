'use client';

import React from 'react';
import { useTimerContext } from '@/contexts/TimerContext';
import { useAuth } from '@/contexts/AuthContext';
import { DEFAULT_TIMER_COLOR } from '@/lib/presets';

export const GridBackground: React.FC = () => {
  const { user } = useAuth();
  const { activePreset } = useTimerContext();
  
  // Only use preset color if user is logged in and has an active preset
  const color = user && activePreset?.color ? activePreset.color : DEFAULT_TIMER_COLOR;
  
  return (
    <div
      className="grid-background"
      style={{ '--grid-color': color } as React.CSSProperties}
    />
  );
};

export default GridBackground;
