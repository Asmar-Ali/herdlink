import { expect, test, type Page } from '@playwright/test';

/**
 * Live device CRUD against device-service (Vite proxies /api → :3002).
 * Requires device-service up — `docker compose up` in this repo.
 */

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
}

async function expectRegisteredCount(page: Page, count: number) {
  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page).toHaveURL('/');
  await expect(
    page.getByText(new RegExp(`of ${count} registered`, 'i')),
  ).toBeVisible();
}

test('device CRUD round-trips through the dashboard', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const serial = `HL-E2E-${suffix}`.slice(0, 64);
  const name = `E2E Collar ${suffix}`;
  const renamed = `E2E Collar ${suffix} renamed`;

  await signIn(page);

  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page.getByText(/of \d+ registered/i)).toBeVisible();
  const beforeText = await page.getByText(/of \d+ registered/i).textContent();
  const before = Number(beforeText!.match(/of (\d+) registered/i)![1]);

  // ── Create ──────────────────────────────────────────────────────────────
  await page.getByRole('link', { name: /devices/i }).click();
  await expect(page).toHaveURL('/devices');

  await page.getByRole('button', { name: /register device/i }).first().click();
  await expect(
    page.getByRole('heading', { name: /register device/i }),
  ).toBeVisible();

  await page.getByLabel(/serial number/i).fill(serial);
  await page.getByLabel(/^name$/i).fill(name);
  await page.getByLabel(/^status$/i).selectOption('ACTIVE');
  await page.getByLabel(/herd id/i).fill('herd-e2e');
  await page.getByLabel(/battery %/i).fill('88');

  await page
    .getByRole('button', { name: /^register device$/i })
    .last()
    .click();

  await expect(page.getByText(/device registered/i)).toBeVisible();
  await page.getByPlaceholder(/search name, serial, herd/i).fill(serial);
  const createdRow = page.getByRole('row').filter({ hasText: serial });
  await expect(createdRow.getByText(name, { exact: true })).toBeVisible();

  // Dashboard KPI total should include the new collar (wait for refetch).
  await expectRegisteredCount(page, before + 1);

  // ── Update ──────────────────────────────────────────────────────────────
  await page.getByRole('link', { name: /devices/i }).click();
  await page.getByPlaceholder(/search name, serial, herd/i).fill(serial);
  await page.getByRole('button', { name: `Edit ${name}` }).click();
  await expect(
    page.getByRole('heading', { name: /edit device/i }),
  ).toBeVisible();

  await page.getByLabel(/^name$/i).fill(renamed);
  // device-service blocks ACTIVE → DECOMMISSIONED and ACTIVE deletes;
  // park the collar as INACTIVE first, then remove it.
  await page.getByLabel(/^status$/i).selectOption('INACTIVE');
  await page.getByLabel(/battery %/i).fill('42');
  await page.getByRole('button', { name: /save changes/i }).click();

  await expect(page.getByText(/device updated/i)).toBeVisible();
  await page.getByPlaceholder(/search name, serial, herd/i).fill(serial);
  const updatedRow = page.getByRole('row').filter({ hasText: serial });
  await expect(updatedRow.getByText(renamed, { exact: true })).toBeVisible();

  // ── Delete (device-service rejects deleting ACTIVE collars) ─────────────
  await page.getByRole('button', { name: `Delete ${renamed}` }).click();
  const deleteDialog = page.getByRole('dialog', { name: /delete device/i });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: /^delete$/i }).click();

  await expect(page.getByText(/device removed/i)).toBeVisible();
  await expect(deleteDialog).toBeHidden();
  await page.getByPlaceholder(/search name, serial, herd/i).fill(serial);
  await expect(page.getByRole('row').filter({ hasText: serial })).toHaveCount(0);

  await expectRegisteredCount(page, before);
});
