import { test, expect } from '@playwright/test';

test.describe('ActionMinutes Happy Path', () => {
  const testUser = {
    email: `e2e-test-${Date.now()}@test.com`,
    password: 'TestPassword123!',
    name: 'E2E Test User',
  };

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display login page', async ({ page }) => {
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 10000 });
    await expect(page.getByTestId('input-email')).toBeVisible();
    await expect(page.getByTestId('input-password')).toBeVisible();
  });

  test('should register a new user', async ({ page }) => {
    await page.getByTestId('button-toggle-signup').click();
    await expect(page.locator('text=Create your account')).toBeVisible();

    await page.getByTestId('input-name').fill(testUser.name);
    await page.getByTestId('input-email').fill(testUser.email);
    await page.getByTestId('input-password').fill(testUser.password);
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });
  });

  test('should complete onboarding flow', async ({ page }) => {
    await page.getByTestId('button-toggle-signup').click();
    await page.getByTestId('input-name').fill(testUser.name);
    await page.getByTestId('input-email').fill(`onboard-${Date.now()}@test.com`);
    await page.getByTestId('input-password').fill(testUser.password);
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15000 });

    await page.getByTestId('button-continue').click();
    await expect(page.locator('text=Your writing style')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('button-continue').click();
    await expect(page.locator('text=AI Features')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('button-continue').click();
    await expect(page.locator('text=Personal Mode')).toBeVisible({ timeout: 5000 });

    await page.getByTestId('button-finish').click();
    await expect(page).toHaveURL(/\/inbox/, { timeout: 15000 });
  });

  test('should login with existing user', async ({ page }) => {
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });
  });

  test('should navigate to capture page and create meeting', async ({ page }) => {
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });

    if (page.url().includes('/onboarding')) {
      await page.goto('/inbox');
    }

    const captureLink = page.getByTestId('nav-capture').or(page.locator('a[href="/capture"]'));
    await captureLink.click();

    await expect(page).toHaveURL(/\/capture/, { timeout: 10000 });

    await expect(page.getByTestId('input-title')).toBeVisible();
    await page.getByTestId('input-title').fill('E2E Test Meeting');
    
    const notesField = page.getByTestId('textarea-notes').or(page.locator('textarea'));
    await notesField.fill('Test notes for E2E meeting.\n- Action: Review the test results\n- Decision: Use Playwright for testing');

    const saveDraftButton = page.getByTestId('button-save-draft').or(page.locator('button:has-text("Save Draft")'));
    await saveDraftButton.click();

    await expect(page).toHaveURL(/\/meetings/, { timeout: 15000 });
  });

  test('should view meetings list', async ({ page }) => {
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });

    await page.goto('/meetings');
    await expect(page).toHaveURL(/\/meetings/, { timeout: 10000 });

    await expect(page.locator('text=Meetings')).toBeVisible({ timeout: 5000 });
  });

  test('should access inbox', async ({ page }) => {
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });

    await page.goto('/inbox');
    await expect(page).toHaveURL(/\/inbox/, { timeout: 10000 });

    await expect(page.locator('text=Inbox')).toBeVisible({ timeout: 5000 });
  });

  test('should access settings', async ({ page }) => {
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });

    await page.goto('/settings');
    await expect(page).toHaveURL(/\/settings/, { timeout: 10000 });

    await expect(page.locator('text=Settings')).toBeVisible({ timeout: 5000 });
  });

  test('should access agenda view', async ({ page }) => {
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });

    await page.goto('/agenda');
    await expect(page).toHaveURL(/\/agenda/, { timeout: 10000 });

    await expect(page.locator('text=Agenda')).toBeVisible({ timeout: 5000 });
  });

  test('should logout successfully', async ({ page }) => {
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });

    await page.goto('/settings');

    const logoutButton = page.getByTestId('button-logout').or(page.locator('button:has-text("Sign Out")'));
    await logoutButton.click();

    await expect(page).toHaveURL('/', { timeout: 10000 });
    await expect(page.locator('text=Welcome back')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Responsive Design', () => {
  test('should display mobile navigation', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    
    await page.getByTestId('input-email').fill('test@actionminutes.com');
    await page.getByTestId('input-password').fill('testpass123');
    await page.getByTestId('button-submit').click();

    await expect(page).toHaveURL(/\/(inbox|onboarding)/, { timeout: 15000 });

    await page.goto('/inbox');
    
    const bottomNav = page.locator('[class*="fixed"][class*="bottom"]').or(page.locator('nav'));
    await expect(bottomNav).toBeVisible({ timeout: 5000 });
  });
});
