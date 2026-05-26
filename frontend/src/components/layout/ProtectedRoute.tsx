import React from 'react';
import { SignInButton, useUser } from '@clerk/react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';

type ProtectedRouteProps = {
  children: React.ReactNode;
};

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { ready } = useAuth();

  if (!clerkLoaded || !ready) return null;

  if (!isSignedIn) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Sign in</h1>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            Sign in to access the dashboard
          </p>
          <SignInButton mode="modal" fallbackRedirectUrl="/">
            <Button className="auth-submit w-full">Sign in</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
