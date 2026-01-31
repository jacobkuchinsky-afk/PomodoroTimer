'use client';

import React from 'react';
import { GridBackground } from '@/components/GridBackground';
import { useTimeTracker } from '@/hooks/useTimeTracker';

interface ClientLayoutProps {
  children: React.ReactNode;
}

export const ClientLayout: React.FC<ClientLayoutProps> = ({ children }) => {
  // Track time spent on the website for logged-in users
  useTimeTracker();

  return (
    <>
      <GridBackground />
      {children}
    </>
  );
};

export default ClientLayout;
