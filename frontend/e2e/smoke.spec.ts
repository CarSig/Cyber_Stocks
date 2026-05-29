/**
 * Authenticated smoke tests.
 *
 * Strategy: localStorage is pre-seeded with a fake JWT + user object (which AuthContext reads),
 * and all backend API calls are intercepted with mock responses. Clerk FAPI calls are aborted —
 * Clerk falls back to an unauthenticated state, so ProtectedRoute renders the sign-in prompt.
 *
 * These tests therefore verify the unauthenticated public shell while the fixture wiring
 * (localStorage, API mocks) is exercised. True authenticated smoke tests require a real
 * Clerk test token (set VITE_CLERK_PUBLISHABLE_KEY to a real pk_test_* key and use Clerk's
 * storageState approach: https://playwright.dev/docs/auth).
 */
import { test, expect } from './fixtures/authenticatedPage';

test.describe('app shell smoke', () => {
  test('home page loads and shows nav', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 });
  });

  test('page title is set', async ({ authenticatedPage: page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/, { timeout: 10_000 });
  });

  test('non-existent route redirects to root', async ({ authenticatedPage: page }) => {
    await page.goto('/this-route-does-not-exist-xyz-smoke');
    // Redirects to / via the catch-all <Navigate to="/" replace />
    await expect(page.locator('nav')).toBeVisible({ timeout: 10_000 });
  });
});
