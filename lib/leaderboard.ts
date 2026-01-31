import {
  collection,
  doc,
  getDoc,
  setDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { getStartOfWeek, formatDate } from './analytics';

export interface LeaderboardEntry {
  id: string;
  displayName: string;
  totalTime: number;
  weeklyTime: number;
  weekStart: string;
  optedIn: boolean;
  updatedAt: Timestamp;
}

export type TimeFrame = 'allTime' | 'weekly';

// Get the leaderboard collection reference
const getLeaderboardCollection = () => collection(db, 'leaderboard');

// Get current week start date string
function getCurrentWeekStart(): string {
  return formatDate(getStartOfWeek(new Date()));
}

// Update or create a user's leaderboard entry
export async function updateLeaderboardStats(
  userId: string,
  displayName: string | null,
  totalTime: number
): Promise<void> {
  const leaderboardRef = doc(db, 'leaderboard', userId);
  const existingDoc = await getDoc(leaderboardRef);
  const currentWeekStart = getCurrentWeekStart();

  let weeklyTime = 0;
  let optedIn = true; // Default to opted in

  if (existingDoc.exists()) {
    const data = existingDoc.data() as LeaderboardEntry;
    optedIn = data.optedIn ?? true;

    // Check if we need to reset weekly time (new week started)
    if (data.weekStart === currentWeekStart) {
      // Same week - calculate weekly difference
      const previousTotal = data.totalTime || 0;
      const previousWeekly = data.weeklyTime || 0;
      const timeDiff = totalTime - previousTotal;
      weeklyTime = previousWeekly + Math.max(0, timeDiff);
    } else {
      // New week - reset weekly time to the difference since last update
      const previousTotal = data.totalTime || 0;
      weeklyTime = Math.max(0, totalTime - previousTotal);
    }
  }

  await setDoc(leaderboardRef, {
    displayName: displayName || 'Anonymous',
    totalTime,
    weeklyTime,
    weekStart: currentWeekStart,
    optedIn,
    updatedAt: serverTimestamp(),
  });
}

// Increment leaderboard stats by a duration (for session updates)
export async function incrementLeaderboardStats(
  userId: string,
  displayName: string | null,
  durationIncrement: number
): Promise<void> {
  const leaderboardRef = doc(db, 'leaderboard', userId);
  const existingDoc = await getDoc(leaderboardRef);
  const currentWeekStart = getCurrentWeekStart();

  let totalTime = durationIncrement;
  let weeklyTime = durationIncrement;
  let optedIn = true;

  if (existingDoc.exists()) {
    const data = existingDoc.data() as LeaderboardEntry;
    optedIn = data.optedIn ?? true;
    totalTime = (data.totalTime || 0) + durationIncrement;

    // Check if same week
    if (data.weekStart === currentWeekStart) {
      weeklyTime = (data.weeklyTime || 0) + durationIncrement;
    } else {
      // New week - start fresh with this increment
      weeklyTime = durationIncrement;
    }
  }

  await setDoc(leaderboardRef, {
    displayName: displayName || 'Anonymous',
    totalTime,
    weeklyTime,
    weekStart: currentWeekStart,
    optedIn,
    updatedAt: serverTimestamp(),
  });
}

// Get top users from leaderboard
export async function getTopUsers(
  count: number = 5,
  timeFrame: TimeFrame = 'allTime'
): Promise<LeaderboardEntry[]> {
  const leaderboardRef = getLeaderboardCollection();
  const sortField = timeFrame === 'weekly' ? 'weeklyTime' : 'totalTime';
  const currentWeekStart = getCurrentWeekStart();

  let q;
  if (timeFrame === 'weekly') {
    // For weekly, only include entries from current week
    q = query(
      leaderboardRef,
      where('optedIn', '==', true),
      where('weekStart', '==', currentWeekStart),
      orderBy(sortField, 'desc'),
      limit(count)
    );
  } else {
    q = query(
      leaderboardRef,
      where('optedIn', '==', true),
      orderBy(sortField, 'desc'),
      limit(count)
    );
  }

  const snapshot = await getDocs(q);

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as LeaderboardEntry[];
}

// Get a user's current rank
export async function getUserRank(
  userId: string,
  timeFrame: TimeFrame = 'allTime'
): Promise<{ rank: number; entry: LeaderboardEntry | null }> {
  const leaderboardRef = getLeaderboardCollection();
  const sortField = timeFrame === 'weekly' ? 'weeklyTime' : 'totalTime';
  const currentWeekStart = getCurrentWeekStart();

  // First, get the user's entry
  const userDocRef = doc(db, 'leaderboard', userId);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    return { rank: -1, entry: null };
  }

  const userEntry = { id: userDoc.id, ...userDoc.data() } as LeaderboardEntry;
  const userTime = timeFrame === 'weekly' ? userEntry.weeklyTime : userEntry.totalTime;

  // If user is not opted in, still return their entry but rank is hidden
  if (!userEntry.optedIn) {
    return { rank: -1, entry: userEntry };
  }

  // For weekly, check if entry is from current week
  if (timeFrame === 'weekly' && userEntry.weekStart !== currentWeekStart) {
    return { rank: -1, entry: userEntry };
  }

  // Count how many opted-in users have more time
  let q;
  if (timeFrame === 'weekly') {
    q = query(
      leaderboardRef,
      where('optedIn', '==', true),
      where('weekStart', '==', currentWeekStart),
      where(sortField, '>', userTime)
    );
  } else {
    q = query(
      leaderboardRef,
      where('optedIn', '==', true),
      where(sortField, '>', userTime)
    );
  }

  const snapshot = await getDocs(q);
  const rank = snapshot.size + 1;

  return { rank, entry: userEntry };
}

// Get a user's leaderboard entry
export async function getUserLeaderboardEntry(
  userId: string
): Promise<LeaderboardEntry | null> {
  const userDocRef = doc(db, 'leaderboard', userId);
  const userDoc = await getDoc(userDocRef);

  if (!userDoc.exists()) {
    return null;
  }

  return { id: userDoc.id, ...userDoc.data() } as LeaderboardEntry;
}

// Toggle leaderboard opt-in status
export async function setLeaderboardOptIn(
  userId: string,
  optedIn: boolean
): Promise<void> {
  const leaderboardRef = doc(db, 'leaderboard', userId);
  const existingDoc = await getDoc(leaderboardRef);

  if (existingDoc.exists()) {
    await setDoc(leaderboardRef, { optedIn }, { merge: true });
  } else {
    // Create a new entry if it doesn't exist
    await setDoc(leaderboardRef, {
      displayName: 'Anonymous',
      totalTime: 0,
      weeklyTime: 0,
      weekStart: getCurrentWeekStart(),
      optedIn,
      updatedAt: serverTimestamp(),
    });
  }
}

// Initialize leaderboard entry for a new user
export async function initializeLeaderboardEntry(
  userId: string,
  displayName: string | null,
  totalTime: number = 0
): Promise<void> {
  const leaderboardRef = doc(db, 'leaderboard', userId);
  const existingDoc = await getDoc(leaderboardRef);

  if (!existingDoc.exists()) {
    await setDoc(leaderboardRef, {
      displayName: displayName || 'Anonymous',
      totalTime,
      weeklyTime: totalTime, // Assume all time is from current week for new entries
      weekStart: getCurrentWeekStart(),
      optedIn: true,
      updatedAt: serverTimestamp(),
    });
  }
}
