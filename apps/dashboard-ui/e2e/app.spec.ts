import { expect, test } from '@playwright/test';

test('redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL('/login');
});

test('navigates between dashboard sections after signing in', async ({
  page,
}) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('rancher@herdlink.io');
  await page.getByLabel(/password/i).fill('longenoughpassword');
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL('/');

  await page.getByRole('link', { name: /devices/i }).click();
  await expect(page).toHaveURL('/devices');
  await expect(
    page.getByRole('button', { name: /register device/i }),
  ).toBeVisible();

  await page.getByRole('link', { name: /fences/i }).click();
  await expect(page).toHaveURL('/fences');
  await expect(
    page.getByRole('button', { name: /create geofence/i }),
  ).toBeVisible();
});
