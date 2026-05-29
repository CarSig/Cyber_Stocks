import type { ReactNode } from 'react';
import AdminRoute from './AdminRoute';
import { ErrorBoundary } from '@/components/common/feedback/ErrorBoundary';

type Props = { name: string; children: ReactNode };

export default function AdminRouteBoundary({ name, children }: Props) {
  return (
    <AdminRoute>
      <ErrorBoundary name={name}>{children}</ErrorBoundary>
    </AdminRoute>
  );
}
