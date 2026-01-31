'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getUserLeaderboardEntry,
  setLeaderboardOptIn,
  initializeLeaderboardEntry,
} from '@/lib/leaderboard';
import './LeaderboardToggle.scss';

interface LeaderboardToggleProps {
  initialOptedIn?: boolean;
  onToggle?: (optedIn: boolean) => void;
}

export function LeaderboardToggle({ initialOptedIn, onToggle }: LeaderboardToggleProps) {
  const { user } = useAuth();
  const [optedIn, setOptedIn] = useState(initialOptedIn ?? true);
  const [loading, setLoading] = useState(initialOptedIn === undefined);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialOptedIn !== undefined) {
      setOptedIn(initialOptedIn);
      setLoading(false);
      return;
    }

    const fetchOptInStatus = async () => {
      if (!user) return;

      try {
        const entry = await getUserLeaderboardEntry(user.uid);
        if (entry) {
          setOptedIn(entry.optedIn);
        } else {
          // Initialize entry for new users
          await initializeLeaderboardEntry(user.uid, user.displayName);
          setOptedIn(true);
        }
      } catch (error) {
        console.error('Failed to fetch opt-in status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchOptInStatus();
  }, [user, initialOptedIn]);

  const handleToggle = async () => {
    if (!user || saving) return;

    const newValue = !optedIn;
    setSaving(true);

    try {
      await setLeaderboardOptIn(user.uid, newValue);
      setOptedIn(newValue);
      onToggle?.(newValue);
    } catch (error) {
      console.error('Failed to update opt-in status:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="leaderboard-toggle loading">
        <div className="toggle-skeleton" />
      </div>
    );
  }

  return (
    <div className="leaderboard-toggle">
      <label className="toggle-label">
        <span className="toggle-text">Show me on leaderboard</span>
        <button
          type="button"
          role="switch"
          aria-checked={optedIn}
          className={`toggle-switch ${optedIn ? 'active' : ''} ${saving ? 'saving' : ''}`}
          onClick={handleToggle}
          disabled={saving}
        >
          <span className="toggle-thumb" />
        </button>
      </label>
      <p className="toggle-description">
        {optedIn
          ? 'Your time is visible to other users on the leaderboard.'
          : 'Your time is hidden from the leaderboard.'}
      </p>
    </div>
  );
}
