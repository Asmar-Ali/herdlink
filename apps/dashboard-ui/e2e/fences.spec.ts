import { expect, test, type Page } from '@playwright/test';

/**
 * Live fence CRUD against device-service (Vite proxies /api → :3002).
 * Requires device-service up — `docker compose up` in this repo.
 */

async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
}

function geofenceTile(page: Page) {
  return page.getByText('Geofences', { exact: true }).locator('../..');
}

async function readFenceCount(page: Page): Promise<number> {
  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page).toHaveURL('/');
  const tile = geofenceTile(page);
  await expect(tile).toBeVisible();
  const value = tile.locator('.text-3xl');
  await expect(value).toBeVisible();
  return Number(await value.textContent());
}

async function expectFenceCount(page: Page, count: number) {
  await page.getByRole('link', { name: /^dashboard$/i }).click();
  await expect(page).toHaveURL('/');
  await expect(geofenceTile(page).locator('.text-3xl')).toHaveText(String(count));
}

test('fence CRUD round-trips through the dashboard', async ({ page }) => {
  const suffix = Date.now().toString(36);
  const name = `E2E Paddock ${suffix}`;
  const renamed = `E2E Paddock ${suffix} renamed`;

  await signIn(page);
  const before = await readFenceCount(page);

  // ── Create ──────────────────────────────────────────────────────────────
  await page.getByRole('link', { name: /fences/i }).click();
  await expect(page).toHaveURL('/fences');
  await page.getByRole('button', { name: /create geofence/i }).first().click();

  const createDialog = page.getByRole('dialog', { name: /create geofence/i });
  await expect(createDialog).toBeVisible();
  await createDialog.getByLabel(/^name$/i).fill(name);
  await createDialog
    .getByLabel(/^description$/i)
    .fill('Created by the live dashboard fence CRUD e2e');
  await createDialog.getByLabel(/^type$/i).selectOption('EXCLUSION');
  await createDialog.getByLabel(/^severity$/i).selectOption('HIGH');
  await createDialog.getByLabel(/breach direction/i).selectOption('ENTER');
  await createDialog.getByLabel(/alert cooldown/i).fill('120');
  await createDialog.getByLabel(/herd ids/i).fill('herd-e2e');
  await createDialog
    .getByRole('button', { name: /^create geofence$/i })
    .click();

  await expect(page.getByText(/geofence created/i)).toBeVisible();
  await page.getByPlaceholder(/search fences/i).fill(name);
  const createdRow = page.getByRole('row').filter({ hasText: name });
  await expect(createdRow.getByText(name, { exact: true })).toBeVisible();
  await expect(createdRow.getByText('Exclusion', { exact: true })).toBeVisible();
  await expect(createdRow.getByText('High', { exact: true })).toBeVisible();
  await expect(createdRow.getByText('herd-e2e', { exact: true })).toBeVisible();

  await expectFenceCount(page, before + 1);

  // ── Update ──────────────────────────────────────────────────────────────
  await page.getByRole('link', { name: /fences/i }).click();
  await page.getByPlaceholder(/search fences/i).fill(name);
  await page.getByRole('button', { name: `Edit ${name}` }).click();

  const editDialog = page.getByRole('dialog', { name: /edit geofence/i });
  await expect(editDialog).toBeVisible();
  await editDialog.getByLabel(/^name$/i).fill(renamed);
  await editDialog.getByLabel(/^severity$/i).selectOption('CRITICAL');
  await editDialog.getByLabel(/active/i).uncheck();
  await editDialog.getByRole('button', { name: /save changes/i }).click();

  await expect(page.getByText(/geofence updated/i)).toBeVisible();
  await page.getByPlaceholder(/search fences/i).fill(renamed);
  const updatedRow = page.getByRole('row').filter({ hasText: renamed });
  await expect(updatedRow.getByText(renamed, { exact: true })).toBeVisible();
  await expect(
    updatedRow.getByText('Critical', { exact: true }),
  ).toBeVisible();
  await expect(updatedRow.getByText('Disabled', { exact: true })).toBeVisible();

  // ── Delete ──────────────────────────────────────────────────────────────
  await page.getByRole('button', { name: `Delete ${renamed}` }).click();
  const deleteDialog = page.getByRole('dialog', { name: /delete geofence/i });
  await expect(deleteDialog).toBeVisible();
  await deleteDialog.getByRole('button', { name: /^delete$/i }).click();

  await expect(page.getByText(/geofence deleted/i)).toBeVisible();
  await expect(deleteDialog).toBeHidden();
  await page.getByPlaceholder(/search fences/i).fill(renamed);
  await expect(page.getByRole('row').filter({ hasText: renamed })).toHaveCount(
    0,
  );

  await expectFenceCount(page, before);
});
