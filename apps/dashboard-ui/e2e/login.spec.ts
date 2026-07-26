import { expect, test } from '@playwright/test';

test('shows validation errors on empty submit', async ({ page }) => {
  await page.goto('/login');

  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByText(/email is required/i)).toBeVisible();
  await expect(
    page.getByText(/password must be at least 8 characters/i),
  ).toBeVisible();
});

test('signs in and lands on the dashboard', async ({ page }) => {
  await page.goto('/login');

  await page.getByLabel(/email/i).fill('rancher@herdlink.io');
  await page.getByLabel(/password/i).fill('longenoughpassword');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
