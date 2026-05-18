import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { ClerkProvider } from '@clerk/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';
import App from './App';

import { initFeedbackButton } from './inspect-dom-capture';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

const queryClient = new QueryClient();

initFeedbackButton({ endpoint: 'http://localhost:3000/api/v1/inspect-dom-capture/feedback' });

createRoot(document.getElementById('root')!).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY ?? ''} afterSignOutUrl="/">
      <StrictMode>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <App />
          </TooltipProvider>
        </QueryClientProvider>
      </StrictMode>
    </ClerkProvider>
  </Sentry.ErrorBoundary>,
);
