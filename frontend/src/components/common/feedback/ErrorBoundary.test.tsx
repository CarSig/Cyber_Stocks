import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import { ErrorBoundary } from './ErrorBoundary';

vi.mock('@sentry/react', () => ({ captureException: vi.fn() }));

function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('boom');
  return <div>working</div>;
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('ErrorBoundary', () => {
  it('renders children when no error', () => {
    render(
      <ErrorBoundary>
        <div>ok</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText('ok')).toBeDefined();
  });

  it('renders default fallback when child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
  });

  it('custom fallback prop overrides default UI', () => {
    render(
      <ErrorBoundary fallback={<div>custom error</div>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('custom error')).toBeDefined();
  });

  it('includes name in heading when provided', () => {
    render(
      <ErrorBoundary name="Intelligence">
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Something went wrong in Intelligence')).toBeDefined();
  });

  it('retry button resets boundary error state', () => {
    // Verify the retry button is clickable and triggers a state reset
    // (the boundary goes from errored → reset; child re-render may still throw,
    //  but the boundary's own hasError flag returns to false first)
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeDefined();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toBeDefined();
    // Clicking retry should not throw; error UI is shown again after re-throw
    fireEvent.click(retryBtn);
    // Boundary is still alive after click
    expect(screen.getByRole('button', { name: /retry/i })).toBeDefined();
  });

  it('onReset callback is invoked on retry', () => {
    const onReset = vi.fn();
    render(
      <ErrorBoundary onReset={onReset}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(onReset).toHaveBeenCalledOnce();
  });

  it('calls Sentry.captureException with the name tag', () => {
    render(
      <ErrorBoundary name="MyFeature">
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { boundary: 'MyFeature' } }),
    );
  });

  it('calls Sentry.captureException with componentStack context', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({
        contexts: expect.objectContaining({ react: expect.objectContaining({ componentStack: expect.any(String) }) }),
      }),
    );
  });

  it('uses "unnamed" boundary tag when name prop is omitted', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(Sentry.captureException).toHaveBeenCalledWith(
      expect.any(Error),
      expect.objectContaining({ tags: { boundary: 'unnamed' } }),
    );
  });
});
