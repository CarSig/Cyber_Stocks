import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './api/queryClient';
import * as Sentry from '@sentry/react';
import { ClerkProvider } from '@clerk/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';
import App from './App';
import { initFeedbackButton } from './lib/inspect-dom-capture';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
  release: import.meta.env.VITE_APP_VERSION,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({ maskAllText: false, blockAllMedia: false }),
  ],
  tracesSampleRate: import.meta.env.PROD ? 0.1 : 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
  beforeSend(event) {
    if (event.request?.url?.includes('localhost')) return null;
    return event;
  },
});

initFeedbackButton({ endpoint: 'http://localhost:3000/api/v1/inspect-dom-capture/feedback' });

createRoot(document.getElementById('root')!).render(
  <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''} afterSignOutUrl="/">
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <App />
        </TooltipProvider>
      </QueryClientProvider>
    </StrictMode>
  </ClerkProvider>,
);
