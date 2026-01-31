'use client';

import { Timer3D } from '@/components/Timer3D';
import { SignupButton } from '@/components/SignupButton';
import { SettingsButton } from '@/components/SettingsButton';
import { AnalyticsButton } from '@/components/AnalyticsButton';
import { TimerSubtext } from '@/components/TimerSubtext';
import { TimerControls } from '@/components/TimerControls';
import { useTimerContext } from '@/contexts/TimerContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTimer } from '@/hooks/useTimer';
import { DEFAULT_TIMER_COLOR } from '@/lib/presets';
import './home.scss';

export default function Home() {
  const { user } = useAuth();
  const timerContext = useTimerContext();
  
  // Use clock mode for non-logged-in users
  const clockTimer = useTimer({ mode: 'clock' });
  
  // Determine which digits to display
  const isLoggedInWithPreset = user && timerContext.activePreset;
  const digits = isLoggedInWithPreset ? timerContext.digits : clockTimer.digits;
  
  // Get timer color from active preset
  const timerColor = isLoggedInWithPreset 
    ? (timerContext.activePreset?.color || DEFAULT_TIMER_COLOR)
    : DEFAULT_TIMER_COLOR;

  return (
    <main className="home-page">
      <SignupButton />
      <SettingsButton />
      <AnalyticsButton />
      
      <div className="timer-wrapper">
        {user && (
          <TimerSubtext
            preset={timerContext.activePreset}
            currentPhase={timerContext.currentPhase}
            currentPhaseIndex={timerContext.currentPhaseIndex}
            totalPhases={timerContext.totalPhases}
            status={timerContext.timerState.status}
            isRunning={timerContext.timerState.isRunning}
          />
        )}
        
        <Timer3D digits={digits} color={timerColor} />
        
        {user && timerContext.activePreset && (
          <TimerControls
            isRunning={timerContext.timerState.isRunning}
            status={timerContext.timerState.status}
            onStart={timerContext.start}
            onPause={timerContext.pause}
            onReset={timerContext.reset}
          />
        )}
      </div>
    </main>
  );
}
