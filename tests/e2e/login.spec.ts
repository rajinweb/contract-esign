import { test, expect } from '@playwright/test';

test('login shows client-side validation errors when fields are empty', async ({ page }) => {
  await page.goto('/login');
  await page.click('button[type="submit"]');

  const modal = page.getByTestId('login-modal');
  await expect(modal.getByText('Email required')).toBeVisible();
  await expect(modal.getByText('Password required')).toBeVisible();
});
