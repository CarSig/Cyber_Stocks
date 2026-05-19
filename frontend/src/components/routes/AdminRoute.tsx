import React from 'react';
import { Navigate } from 'react-router-dom';
import { SignInButton, useUser } from '@clerk/react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';

type AdminRouteProps = {
  children: React.ReactNode;
};

export default function AdminRoute({ children }: AdminRouteProps) {
  const { isSignedIn, isLoaded: clerkLoaded } = useUser();
  const { user, ready } = useAuth();

  if (!clerkLoaded || !ready) return null;

  if (!isSignedIn) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <h1 className="auth-title">Sign in</h1>
          <SignInButton mode="modal" fallbackRedirectUrl="/admin">
            <Button className="auth-submit w-full">Sign in</Button>
          </SignInButton>
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') return <Navigate to="/" replace />;
  return <>{children}</>;
}
