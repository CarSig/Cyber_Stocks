import { test as base } from '@playwright/test';
import { mockUser, mockAdminUser, mockCompanies, mockAuthResponse, mockAdminAuthResponse } from './mockData';

type Fixtures = {
  authenticatedPage: import('@playwright/test').Page;
  adminPage: import('@playwright/test').Page;
};

function setupApiMocks(page: import('@playwright/test').Page, authResponse: typeof mockAuthResponse) {
  // Pre-set auth state in localStorage before any navigation
  page.addInitScript(
    ({ token, user }) => {
      localStorage.setItem('auth_token', token);
      localStorage.setItem('auth_user', JSON.stringify(user));
    },
    { token: authResponse.token, user: authResponse.user },
  );

  // Mock the backend auth exchange endpoint
  page.route('**/api/v1/auth/clerk', (route) => route.fulfill({ json: authResponse }));

  // Mock the companies (ticker list) endpoint
  page.route('**/api/v1/stocks', (route) =>
    route.fulfill({
      json: mockCompanies,
      headers: { 'content-type': 'application/json' },
    }),
  );

  // Mock sparklines
  page.route('**/api/v1/stocks/sparklines**', (route) => route.fulfill({ json: {} }));

  // Silence Clerk FAPI calls — Clerk will fail gracefully when FAPI is unreachable
  // Our AuthContext reads from localStorage, so the auth state is already set above
  page.route('**clerk**', (route) => route.abort());
  page.route('**__clerk**', (route) => route.abort());
}

export const test = base.extend<Fixtures>({
  authenticatedPage: async ({ page }, use) => {
    setupApiMocks(page, mockAuthResponse);
    await use(page);
  },

  adminPage: async ({ page }, use) => {
    setupApiMocks(page, mockAdminAuthResponse);
    await use(page);
  },
});

export { expect } from '@playwright/test';
