import { test, expect } from '@playwright/test';

/**
 * Lifecycle smoke: auth gates + labeled login (Phase 1 a11y).
 * Full design→mock→test→CI path: Scripts/demo-lifecycle.sh against a running stack.
 */
test.describe('Lifecycle smoke', () => {
  test('login page has email and password fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByPlaceholder('Email').or(page.getByLabel('Email'))).toBeVisible();
    await expect(page.getByPlaceholder('Password').or(page.getByLabel('Password'))).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  });

  test('unauthenticated project docs route redirects to login', async ({ page }) => {
    await page.goto('/project/000000000000000000000000/docs');
    await expect(page).toHaveURL(/.*\/login/);
  });

  test('unauthenticated project interface route redirects to login', async ({ page }) => {
    await page.goto('/project/000000000000000000000000/interface');
    await expect(page).toHaveURL(/.*\/login/);
  });
});
