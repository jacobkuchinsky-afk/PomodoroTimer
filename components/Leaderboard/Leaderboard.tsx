'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTopUsers,
  getUserRank,
  initializeLeaderboardEntry,
  LeaderboardEntry,
  TimeFrame,
} from '@/lib/leaderboard';
import { formatDuration, getTotalTime } from '@/lib/analytics';
import './Leaderboard.scss';

interface LeaderboardProps {
  onOptInChange?: (optedIn: boolean) => void;
}

export function Leaderboard({ onOptInChange }: LeaderboardProps) {
  const { user } = useAuth();
  const [timeFrame, setTimeFrame] = useState<TimeFrame>('allTime');
  const [topUsers, setTopUsers] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<{ rank: number; entry: LeaderboardEntry | null }>({
    rank: -1,
    entry: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // First, ensure user has a leaderboard entry
        let rank = await getUserRank(user.uid, timeFrame);
        
        // If no entry exists, initialize one with current total time
        if (!rank.entry) {
          const totalTime = await getTotalTime(user.uid);
          await initializeLeaderboardEntry(user.uid, user.displayName, totalTime);
          // Fetch rank again after initialization
          rank = await getUserRank(user.uid, timeFrame);
        }

        // Fetch top users
        let top = await getTopUsers(5, timeFrame);
        
        // Ensure current user appears in the list if they're opted in
        // This handles potential Firestore consistency delays
        if (rank.entry && rank.entry.optedIn) {
          const userInList = top.some((entry) => entry.id === user.uid);
          if (!userInList) {
            // Add user to appropriate position based on their time
            const userTime = timeFrame === 'weekly' ? rank.entry.weeklyTime : rank.entry.totalTime;
            const insertIndex = top.findIndex((entry) => {
              const entryTime = timeFrame === 'weekly' ? entry.weeklyTime : entry.totalTime;
              return userTime > entryTime;
            });
            
            if (insertIndex === -1 && top.length < 5) {
              // User has less time than everyone, add at end if list isn't full
              top = [...top, rank.entry];
            } else if (insertIndex >= 0) {
              // Insert user at correct position
              top = [...top.slice(0, insertIndex), rank.entry, ...top.slice(insertIndex)].slice(0, 5);
            }
          }
        }

        setTopUsers(top);
        setUserRank(rank);
      } catch (error) {
        console.error('Failed to fetch leaderboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [timeFrame, user]);

  // Notify parent of opt-in status when it changes
  useEffect(() => {
    if (userRank.entry && onOptInChange) {
      onOptInChange(userRank.entry.optedIn);
    }
  }, [userRank.entry, onOptInChange]);

  const getRankBadgeClass = (rank: number) => {
    if (rank === 1) return 'gold';
    if (rank === 2) return 'silver';
    if (rank === 3) return 'bronze';
    return '';
  };

  const getTimeValue = (entry: LeaderboardEntry) => {
    return timeFrame === 'weekly' ? entry.weeklyTime : entry.totalTime;
  };

  const isCurrentUser = (entryId: string) => user?.uid === entryId;

  const userInTop5 = topUsers.some((entry) => isCurrentUser(entry.id));

  return (
    <div className="leaderboard">
      <div className="leaderboard-header">
        <h2>Leaderboard</h2>
        <div className="tab-switcher">
          <button
            className={`tab ${timeFrame === 'allTime' ? 'active' : ''}`}
            onClick={() => setTimeFrame('allTime')}
          >
            All Time
          </button>
          <button
            className={`tab ${timeFrame === 'weekly' ? 'active' : ''}`}
            onClick={() => setTimeFrame('weekly')}
          >
            This Week
          </button>
        </div>
      </div>

      {loading ? (
        <div className="leaderboard-loading">
          <div className="loader" />
        </div>
      ) : (
        <>
          {/* Show top users list if there are any */}
          {topUsers.length > 0 && (
            <div className="leaderboard-list">
              {topUsers.map((entry, index) => {
                const rank = index + 1;
                const isCurrent = isCurrentUser(entry.id);

                return (
                  <div
                    key={entry.id}
                    className={`leaderboard-row ${isCurrent ? 'current-user' : ''}`}
                  >
                    <div className={`rank-badge ${getRankBadgeClass(rank)}`}>
                      {rank}
                    </div>
                    <div className="user-info">
                      <span className="display-name">
                        {entry.displayName}
                        {isCurrent && <span className="you-tag">(You)</span>}
                      </span>
                    </div>
                    <div className="time-value">
                      {formatDuration(getTimeValue(entry))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Show user's rank if not in top 5 but has an entry */}
          {!userInTop5 && userRank.entry && userRank.entry.optedIn && (
            <div className="user-rank-section">
              {topUsers.length > 0 && (
                <div className="rank-divider">
                  <span>•••</span>
                </div>
              )}
              <div className="leaderboard-list">
                <div className="leaderboard-row current-user">
                  <div className={`rank-badge ${getRankBadgeClass(userRank.rank)}`}>
                    {userRank.rank > 0 ? userRank.rank : 1}
                  </div>
                  <div className="user-info">
                    <span className="display-name">
                      {userRank.entry.displayName}
                      <span className="you-tag">(You)</span>
                    </span>
                  </div>
                  <div className="time-value">
                    {formatDuration(getTimeValue(userRank.entry))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Show message if user has opted out */}
          {!userInTop5 && userRank.entry?.optedIn === false && (
            <div className="user-rank-section">
              <p className="opted-out-message">
                You&apos;re not visible on the leaderboard. Toggle the setting below to appear.
              </p>
            </div>
          )}

          {/* Show empty message only if no data at all */}
          {topUsers.length === 0 && !userRank.entry && (
            <div className="leaderboard-empty">
              <p>No data yet. Start tracking time to appear on the leaderboard!</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
