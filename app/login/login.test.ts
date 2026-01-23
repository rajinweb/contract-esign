import { test, expect } from '@playwright/test';

test.describe('Auth pages', () => {
  test('login page shows heading', async ({ page }) => {
    await page.goto('/login');
    const h1 = page.locator('h3', { hasText: 'Login to DocYouSign' });
    await expect(h1).toHaveText(/Login to DocYouSign/i);
  });

  test('should display error message on invalid login', async ({ page }) => {
    await page.goto('/login');

    await page.fill('input[type="email"]', 'invalid@example.com');
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    const errorMessage = page.locator('text=Invalid credentials');
    await expect(errorMessage).toBeVisible();
  });
});