import { expect, test, type Page } from '@playwright/test';

// The e2e run starts only the Vite dev server, so stub device-service's login
// endpoint. This keeps the browser flow hermetic; the real request/response
// shape is covered by device-service's own tests.
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

test('shows validation errors on empty submit', async ({ page }) => {
  await page.goto('/login');

  // The form is pre-filled with the demo credentials — clear them first.
  await page.getByLabel(/email/i).clear();
  await page.getByLabel(/password/i).clear();
  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page.getByText(/email is required/i)).toBeVisible();
  await expect(
    page.getByText(/password must be at least 8 characters/i),
  ).toBeVisible();
});

test('signs in with the pre-filled credentials and lands on the dashboard', async ({
  page,
}) => {
  await stubLogin(page);
  await page.goto('/login');

  await page.getByRole('button', { name: /sign in/i }).click();

  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
});
