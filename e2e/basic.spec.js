// PEDRRA E2E Tests (#12)
// Run: npx playwright test e2e/
// Requires: npm install -D @playwright/test && npx playwright install chromium

const { test, expect } = require('@playwright/test');

const BASE = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Login Page', () => {
  test('shows login form', async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator('h2')).toContainText('PEDRRA');
    await expect(page.locator('button:has-text("PIN Code")')).toBeVisible();
    await expect(page.locator('button:has-text("Username")')).toBeVisible();
  });

  test('rejects invalid PIN', async ({ page }) => {
    await page.goto(BASE);
    // Enter invalid PIN
    const pinInputs = page.locator('input[inputmode="numeric"]');
    await pinInputs.nth(0).fill('9');
    await pinInputs.nth(1).fill('9');
    await pinInputs.nth(2).fill('9');
    await pinInputs.nth(3).fill('9');
    await page.waitForTimeout(1000);
    await expect(page.locator('text=Invalid PIN')).toBeVisible();
  });

  test('login with admin credentials', async ({ page }) => {
    await page.goto(BASE);
    await page.click('button:has-text("Username")');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin');
    await page.click('button:has-text("Log In")');
    await page.waitForURL('**/trainer');
    await expect(page.locator('text=Trainer Dashboard')).toBeVisible();
  });
});

test.describe('Trainer Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE);
    await page.click('button:has-text("Username")');
    await page.fill('input[placeholder="Username"]', 'admin');
    await page.fill('input[placeholder="Password"]', 'admin');
    await page.click('button:has-text("Log In")');
    await page.waitForURL('**/trainer');
  });

  test('shows all tabs', async ({ page }) => {
    await expect(page.locator('text=Live Presentation')).toBeVisible();
    await expect(page.locator('text=Manage Content')).toBeVisible();
    await expect(page.locator('text=Manage Users')).toBeVisible();
  });

  test('can switch to content tab', async ({ page }) => {
    await page.click('button:has-text("Manage Content")');
    await expect(page.locator('text=Slides Editor')).toBeVisible();
  });

  test('can switch to users tab', async ({ page }) => {
    await page.click('button:has-text("Manage Users")');
    await expect(page.locator('text=User Management')).toBeVisible();
    await expect(page.locator('text=Provision New User')).toBeVisible();
  });

  test('can create a poll slide', async ({ page }) => {
    await page.click('button:has-text("Manage Content")');
    await page.click('button:has-text("+ Poll")');
    // Should have a new poll slide in the list
    await expect(page.locator('text=New Poll')).toBeVisible();
  });

  test('can toggle dark mode', async ({ page }) => {
    await page.click('a[title*="dark mode"], a[title*="light mode"]');
    const theme = await page.locator('html').getAttribute('data-theme');
    expect(theme === 'dark' || theme === 'light').toBeTruthy();
  });
});
