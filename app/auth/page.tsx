'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AuthForm } from '@/components/AuthForm';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import './auth.scss';

export default function AuthPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      router.push('/');
    }
  }, [user, loading, router]);

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="loader" />
      </div>
    );
  }

  // Don't render form if user is already logged in (will redirect)
  if (user) {
    return null;
  }

  return (
    <div className="auth-page">
      <Link href="/" className="back-link">
        ← Back to Timer
      </Link>
      <AuthForm />
    </div>
  );
}
