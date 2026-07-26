import { expect, test, type Page } from '@playwright/test';

// See login.spec.ts — the e2e run has no backend, so stub the login endpoint.
async function stubLogin(page: Page) {
  await page.route('**/api/v1/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          token: 'e2e.jwt.token',
          user: {
            id: 'user-rancher',
            email: 'rancher@herdlink.io',
            name: 'Rancher',
            role: 'Ranch operator',
          },
        },
        meta: {},
      }),
    });
  });
}

test('redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto('/');

  await expect(page).toHaveURL('/login');
});

test('navigates between dashboard sections after signing in', async ({
  page,
}) => {
  await stubLogin(page);
  await page.goto('/login');
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
