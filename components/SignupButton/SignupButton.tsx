'use client';

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { signOut } from '@/lib/auth';
import './SignupButton.scss';

export const SignupButton: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  if (user) {
    return (
      <button 
        className="signup-button" 
        onClick={() => signOut()}
      >
        Sign Out
      </button>
    );
  }

  return (
    <Link href="/auth" className="signup-button">
      Sign Up
    </Link>
  );
};

export default SignupButton;
