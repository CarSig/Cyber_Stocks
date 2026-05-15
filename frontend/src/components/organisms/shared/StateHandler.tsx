import React from 'react';

type StateHandlerProps = {
  isPending: boolean;
  error?: Error | null;
  empty?: boolean;
  emptyMessage?: string;
  loadingMessage?: string;
  children: React.ReactNode;
};

export default function StateHandler({
  isPending,
  error,
  empty,
  emptyMessage,
  loadingMessage,
  children,
}: StateHandlerProps) {
  if (isPending) {
    return <p className="ti-loading">{loadingMessage ?? 'Loading…'}</p>;
  }

  if (error) {
    return <p className="ti-error">{error.message}</p>;
  }

  if (empty) {
    return <p className="ti-empty">{emptyMessage ?? 'No data'}</p>;
  }

  return children;
}
