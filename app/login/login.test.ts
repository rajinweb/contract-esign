import { test, expect } from '@playwright/test';

test.describe('Auth pages', () => {
  test('login page shows heading', async ({ page }) => {
    await page.goto('/login');
    const h1 = page.locator('h3',  { hasText: 'Login to SecureSign' });
    await expect(h1).toHaveText(/Login to SecureSign/i);
  });
});