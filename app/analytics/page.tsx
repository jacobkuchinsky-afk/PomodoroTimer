'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTotalTime,
  getTodayTime,
  getWeekTime,
  formatDurationDetailed,
} from '@/lib/analytics';
import { Leaderboard } from '@/components/Leaderboard';
import { LeaderboardToggle } from '@/components/LeaderboardToggle';
import './analytics.scss';

interface TimeStats {
  total: number;
  today: number;
  week: number;
}

export default function AnalyticsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  
  const [stats, setStats] = useState<TimeStats>({ total: 0, today: 0, week: 0 });
  const [loading, setLoading] = useState(true);
  const [leaderboardKey, setLeaderboardKey] = useState(0);
  const [optedIn, setOptedIn] = useState(true);

  // Refresh leaderboard when opt-in status changes
  const handleOptInChange = useCallback((newOptedIn: boolean) => {
    setOptedIn(newOptedIn);
    setLeaderboardKey((prev) => prev + 1);
  }, []);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/auth');
    }
  }, [user, authLoading, router]);

  // Load analytics data
  useEffect(() => {
    if (!user) return;

    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const [total, today, week] = await Promise.all([
          getTotalTime(user.uid),
          getTodayTime(user.uid),
          getWeekTime(user.uid),
        ]);
        setStats({ total, today, week });
      } catch (error) {
        console.error('Failed to load analytics:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAnalytics();
  }, [user]);

  // Format time for display
  const formatTime = (seconds: number) => {
    const { hours, minutes, seconds: secs } = formatDurationDetailed(seconds);
    return { hours, minutes, seconds: secs };
  };

  // Show loading state while checking auth
  if (authLoading || loading) {
    return (
      <div className="analytics-loading">
        <div className="loader" />
      </div>
    );
  }

  // Don't render if user is not logged in (will redirect)
  if (!user) {
    return null;
  }

  const totalTime = formatTime(stats.total);
  const todayTime = formatTime(stats.today);
  const weekTime = formatTime(stats.week);

  return (
    <div className="analytics-page">
      <Link href="/" className="back-link">
        ← Back to Timer
      </Link>
      
      <div className="analytics-container">
        <h1>Analytics</h1>
        <p className="analytics-description">
          Track your time spent using the Pomodoro Timer.
        </p>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12,6 12,12 16,14" />
              </svg>
            </div>
            <div className="stat-content">
              <h3>Today</h3>
              <div className="stat-value">
                <span className="number">{todayTime.hours}</span>
                <span className="label">h</span>
                <span className="number">{todayTime.minutes}</span>
                <span className="label">m</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
            </div>
            <div className="stat-content">
              <h3>This Week</h3>
              <div className="stat-value">
                <span className="number">{weekTime.hours}</span>
                <span className="label">h</span>
                <span className="number">{weekTime.minutes}</span>
                <span className="label">m</span>
              </div>
            </div>
          </div>
          
          <div className="stat-card total-card">
            <div className="stat-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="20" x2="18" y2="10" />
                <line x1="12" y1="20" x2="12" y2="4" />
                <line x1="6" y1="20" x2="6" y2="14" />
              </svg>
            </div>
            <div className="stat-content">
              <h3>All Time</h3>
              <div className="stat-value">
                <span className="number">{totalTime.hours}</span>
                <span className="label">h</span>
                <span className="number">{totalTime.minutes}</span>
                <span className="label">m</span>
              </div>
            </div>
          </div>
        </div>
        
        <Leaderboard key={leaderboardKey} onOptInChange={setOptedIn} />
        
        <LeaderboardToggle initialOptedIn={optedIn} onToggle={handleOptInChange} />
        
        <div className="analytics-note">
          <p>Time is tracked while you&apos;re on the site and logged in.</p>
        </div>
      </div>
    </div>
  );
}
