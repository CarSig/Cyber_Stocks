import { test, expect } from '@playwright/test';

test.describe('unauthenticated access', () => {
  test('shows sign in button when not logged in', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('protected routes all redirect to sign in', async ({ page }) => {
    const protectedRoutes = ['/threat-intel', '/socials', '/intelligence', '/cyber-news', '/alpaca'];

    for (const route of protectedRoutes) {
      await page.goto(route);
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    }
  });
});
