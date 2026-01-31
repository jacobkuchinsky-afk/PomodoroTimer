import {
  collection,
  doc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  Timestamp,
  orderBy,
} from 'firebase/firestore';
import { db } from './firebase';

export interface Session {
  id?: string;
  startTime: Timestamp;
  duration: number; // in seconds
  date: string; // YYYY-MM-DD format for daily aggregation
}

// Get the analytics collection reference for a user
const getAnalyticsCollection = (userId: string) =>
  collection(db, 'users', userId, 'analytics');

// Format date as YYYY-MM-DD
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Get start of day
export function getStartOfDay(date: Date): Date {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Get start of week (Monday)
export function getStartOfWeek(date: Date): Date {
  const start = new Date(date);
  const day = start.getDay();
  const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

// Record a new session
export async function recordSession(
  userId: string,
  startTime: Date,
  duration: number // in seconds
): Promise<string> {
  const analyticsRef = getAnalyticsCollection(userId);
  const sessionData: Omit<Session, 'id'> = {
    startTime: Timestamp.fromDate(startTime),
    duration,
    date: formatDate(startTime),
  };
  const docRef = await addDoc(analyticsRef, sessionData);
  return docRef.id;
}

// Update an existing session's duration
export async function updateSessionDuration(
  userId: string,
  sessionId: string,
  duration: number
): Promise<void> {
  const sessionRef = doc(db, 'users', userId, 'analytics', sessionId);
  await updateDoc(sessionRef, { duration });
}

// Get total time for all sessions
export async function getTotalTime(userId: string): Promise<number> {
  const analyticsRef = getAnalyticsCollection(userId);
  const snapshot = await getDocs(analyticsRef);
  
  let totalSeconds = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as Session;
    totalSeconds += data.duration || 0;
  });
  
  return totalSeconds;
}

// Get time for a specific date range
export async function getTimeByDateRange(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const analyticsRef = getAnalyticsCollection(userId);
  const startStr = formatDate(startDate);
  const endStr = formatDate(endDate);
  
  const q = query(
    analyticsRef,
    where('date', '>=', startStr),
    where('date', '<=', endStr)
  );
  
  const snapshot = await getDocs(q);
  
  let totalSeconds = 0;
  snapshot.docs.forEach((doc) => {
    const data = doc.data() as Session;
    totalSeconds += data.duration || 0;
  });
  
  return totalSeconds;
}

// Get today's total time
export async function getTodayTime(userId: string): Promise<number> {
  const today = new Date();
  return getTimeByDateRange(userId, getStartOfDay(today), today);
}

// Get this week's total time
export async function getWeekTime(userId: string): Promise<number> {
  const today = new Date();
  return getTimeByDateRange(userId, getStartOfWeek(today), today);
}

// Get all sessions for analytics display
export async function getAllSessions(userId: string): Promise<Session[]> {
  const analyticsRef = getAnalyticsCollection(userId);
  const q = query(analyticsRef, orderBy('startTime', 'desc'));
  const snapshot = await getDocs(q);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as Session[];
}

// Format seconds to human-readable string
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours === 0) {
    return `${minutes}m`;
  }
  
  return `${hours}h ${minutes}m`;
}

// Format seconds to detailed string
export function formatDurationDetailed(seconds: number): { hours: number; minutes: number; seconds: number } {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  return { hours, minutes, seconds: secs };
}
