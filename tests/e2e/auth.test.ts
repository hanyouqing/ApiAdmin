import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should redirect unauthenticated user to login page', async ({ page }) => {
    await page.goto('/');
    // Check if redirected to /login
    await expect(page).toHaveURL(/.*\/login/);
    // Check for login text (based on en.json auth.login)
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
  });

  test('should show email and password fields', async ({ page }) => {
    await page.goto('/login');
    // Check for Email input (using placeholder or label)
    await expect(page.getByPlaceholder('Email')).toBeVisible();
    // Check for Password input
    await expect(page.getByPlaceholder('Password')).toBeVisible();
  });
});
