import { test, expect } from '@playwright/test';

test('home page renders hero content', async ({ page }) => {
  await page.goto('/');
  await expect(
    page.getByRole('heading', { name: /Secure\s+Digital\s+Signatures/i })
  ).toBeVisible();
  await expect(page.getByText(/Transform your document signing process/i)).toBeVisible();
});
