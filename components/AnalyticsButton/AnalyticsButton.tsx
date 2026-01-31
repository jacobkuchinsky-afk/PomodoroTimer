'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import './AnalyticsButton.scss';

export const AnalyticsButton: React.FC = () => {
  const { user, loading } = useAuth();

  // Only show analytics button when user is logged in
  if (loading || !user) {
    return null;
  }

  return (
    <Link href="/analytics" className="analytics-button" title="Analytics">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="analytics-icon"
      >
        {/* Bar chart icon */}
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    </Link>
  );
};

export default AnalyticsButton;
