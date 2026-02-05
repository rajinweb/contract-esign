import { test, expect } from '@playwright/test';

test('invalid signing link shows error', async ({ page }) => {
  await page.route('**/api/sign-document**', async (route) => {
    await route.fulfill({
      status: 404,
      contentType: 'application/json',
      body: JSON.stringify({ success: false, message: 'Invalid or expired signing link' }),
    });
  });

  await page.goto('/sign/invalid-token');
  await expect(page.getByText(/Invalid or expired signing link/i)).toBeVisible();
});
