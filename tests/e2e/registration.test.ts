import { test, expect } from '@playwright/test';

test.describe('Registration', () => {
  test('should register a new user successfully', async ({ page }) => {
    await page.goto('/register');

    const randomId = Math.floor(Math.random() * 10000);
    const username = `testuser_${randomId}`;
    const email = `test_${randomId}@example.com`;
    const password = 'Password123!';

    // Fill in the registration form
    // Note: Placeholders are based on en.json auth.username, auth.email, etc.
    await page.getByPlaceholder('Username').fill(username);
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password', { exact: true }).fill(password);
    await page.getByPlaceholder('Confirm Password').fill(password);

    // Click register button
    await page.getByRole('button', { name: 'Register', exact: true }).click();

    // After registration, it should redirect to login
    await expect(page).toHaveURL(/.*\/login/);
    
    // Optional: verify login with new credentials
    await page.getByPlaceholder('Email').fill(email);
    await page.getByPlaceholder('Password').fill(password);
    await page.getByRole('button', { name: 'Login', exact: true }).click();

    // After login, it should redirect to home page (which redirects to / if authenticated)
    // Application.tsx shows "/" as Home
    await expect(page).toHaveURL(/\/$/);
  });
});
