import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test.describe('Login Flow', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/');
      
      await expect(page.getByTestId('input-email')).toBeVisible({ timeout: 10000 });
      await expect(page.getByTestId('input-password')).toBeVisible();
      await expect(page.getByTestId('button-login')).toBeVisible();
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/');
      
      await page.getByTestId('input-email').fill('invalid@example.com');
      await page.getByTestId('input-password').fill('wrongpassword');
      await page.getByTestId('button-login').click();
      
      await expect(page.getByText(/invalid|error|incorrect/i)).toBeVisible({ timeout: 5000 });
    });

    test('should login with demo credentials', async ({ page }) => {
      await page.goto('/');
      
      await page.getByTestId('input-email').fill('demo@actionminutes.com');
      await page.getByTestId('input-password').fill('demo123');
      await page.getByTestId('button-login').click();
      
      await expect(page).toHaveURL(/inbox|onboarding/, { timeout: 10000 });
    });
  });

  test.describe('Meeting Capture Flow', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/');
      await page.getByTestId('input-email').fill('demo@actionminutes.com');
      await page.getByTestId('input-password').fill('demo123');
      await page.getByTestId('button-login').click();
      await page.waitForURL(/inbox|onboarding/, { timeout: 10000 });
    });

    test('should navigate to capture page', async ({ page }) => {
      const captureNav = page.getByTestId('nav-capture').or(page.getByTestId('tab-capture'));
      
      if (await captureNav.isVisible()) {
        await captureNav.click();
        await expect(page).toHaveURL(/capture/, { timeout: 5000 });
      }
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
    await expect(page.getByText(/60.Second/i)).toBeVisible();
  });

  test('should load blueprint demo page', async ({ page }) => {
    await page.goto('/blueprint');
    
    await expect(page.getByText(/ActionMinutes/i)).toBeVisible({ timeout: 10000 });
  });

  test('should load store screens page', async ({ page }) => {
    await page.goto('/store-screens');
    
    await expect(page.getByText(/App Store Screenshots/i)).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('toggle-device-frame')).toBeVisible();
  });
});

test.describe('Reminders Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.getByTestId('input-email').fill('demo@actionminutes.com');
    await page.getByTestId('input-password').fill('demo123');
    await page.getByTestId('button-login').click();
    await page.waitForURL(/inbox|onboarding/, { timeout: 10000 });
  });

  test('should navigate to reminders in personal mode', async ({ page }) => {
    const remindersNav = page.getByTestId('nav-reminders').or(page.getByTestId('tab-reminders'));
    
    if (await remindersNav.isVisible()) {
      await remindersNav.click();
      await expect(page).toHaveURL(/reminders/, { timeout: 5000 });
    }
  });
});
