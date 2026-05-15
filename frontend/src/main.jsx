import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as Sentry from '@sentry/react';
import { ClerkProvider } from '@clerk/react';
import { TooltipProvider } from '@/components/ui/tooltip';
import './index.css';
import App from './App.jsx';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: !!import.meta.env.VITE_SENTRY_DSN,
});

const queryClient = new QueryClient();

createRoot(document.getElementById('root')).render(
  <Sentry.ErrorBoundary fallback={<p>Something went wrong.</p>}>
    <ClerkProvider afterSignOutUrl="/">
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
