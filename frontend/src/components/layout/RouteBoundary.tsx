import type { ReactNode } from 'react';
import ProtectedRoute from './ProtectedRoute';
import { ErrorBoundary } from '@/components/common/feedback/ErrorBoundary';

type Props = { name: string; children: ReactNode };

export default function RouteBoundary({ name, children }: Props) {
  return (
    <ProtectedRoute>
      <ErrorBoundary name={name}>{children}</ErrorBoundary>
    </ProtectedRoute>
  );
}
