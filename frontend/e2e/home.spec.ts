import { test, expect } from '@playwright/test';

// To run authenticated tests, set up a storageState with a valid Clerk session.
// See: https://playwright.dev/docs/auth
// For now these tests cover the public shell of the app.

test.describe('app shell', () => {
  test('page title is set', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/.+/);
  });

  test('navbar is rendered', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav')).toBeVisible();
  });

  test('unknown route redirects to root', async ({ page }) => {
    await page.goto('/this-route-does-not-exist-xyz');
    // ProtectedRoute renders sign-in (not a 404 page) — root behaviour
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });
});
