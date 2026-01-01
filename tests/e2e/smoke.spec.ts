import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test.describe('Login Flow', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/');
      
      await expect(page.getByTestId('input-email')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('button-signin')).toBeVisible();
    });

    test('should login with demo email', async ({ page }) => {
      await page.goto('/');
      
      await page.getByTestId('input-email').fill('demo@actionminutes.com');
      await page.getByTestId('button-signin').click();
      
      await expect(page).toHaveURL(/inbox|onboarding/, { timeout: 15000 });
    });
  });

  test.describe('Theme Persistence', () => {
    test('should persist theme after reload', async ({ page }) => {
      await page.goto('/');
      
      const initialTheme = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });
      
      await page.reload();
      
      const themeAfterReload = await page.evaluate(() => {
        return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
      });
      
      expect(themeAfterReload).toBe(initialTheme);
    });
  });
});

test.describe('Marketing Pages', () => {
  test('should load marketing page', async ({ page }) => {
    await page.goto('/marketing');
    
    await expect(page.getByText(/Turn messy notes/i)).toBeVisible({ timeout: 10000 });
  });

  test('should load blueprint demo page', async ({ page }) => {
    await page.goto('/blueprint');
    
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('should load store screens page', async ({ page }) => {
    await page.goto('/store-screens');
    
    await expect(page.getByText(/App Store Screenshots/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Authenticated User Flow', () => {
  test('should access inbox after login', async ({ page }) => {
    await page.goto('/');
    
    await page.getByTestId('input-email').fill('demo@actionminutes.com');
    await page.getByTestId('button-signin').click();
    
    await page.waitForURL(/inbox|onboarding/, { timeout: 15000 });
    
    const url = page.url();
    expect(url).toMatch(/inbox|onboarding/);
  });
});
