# E2E Test Template (Playwright)

## Page Object Model

```typescript
// e2e/pages/{PageName}Page.ts

import { Page, Locator, expect } from '@playwright/test';

export class {PageName}Page {
  readonly page: Page;

  // Locators
  readonly heading: Locator;
  readonly submitButton: Locator;
  readonly nameInput: Locator;
  readonly emailInput: Locator;
  readonly errorMessage: Locator;
  readonly successMessage: Locator;

  constructor(page: Page) {
    this.page = page;

    // Initialize locators
    this.heading = page.getByRole('heading', { level: 1 });
    this.submitButton = page.getByRole('button', { name: /submit/i });
    this.nameInput = page.getByLabel(/name/i);
    this.emailInput = page.getByLabel(/email/i);
    this.errorMessage = page.getByTestId('error-message');
    this.successMessage = page.getByTestId('success-message');
  }

  // Navigation
  async goto() {
    await this.page.goto('/{page-path}');
  }

  // Actions
  async fillForm(name: string, email: string) {
    await this.nameInput.fill(name);
    await this.emailInput.fill(email);
  }

  async submit() {
    await this.submitButton.click();
  }

  // Assertions
  async expectHeading(text: string) {
    await expect(this.heading).toContainText(text);
  }

  async expectError(message: string) {
    await expect(this.errorMessage).toBeVisible();
    await expect(this.errorMessage).toContainText(message);
  }

  async expectSuccess(message: string) {
    await expect(this.successMessage).toBeVisible();
    await expect(this.successMessage).toContainText(message);
  }

  async expectUrl(path: string) {
    await expect(this.page).toHaveURL(path);
  }
}
```

## Auth Test

```typescript
// e2e/auth.spec.ts

import { test, expect } from '@playwright/test';
import { LoginPage } from './pages/LoginPage';

test.describe('Authentication', () => {
  let loginPage: LoginPage;

  test.beforeEach(async ({ page }) => {
    loginPage = new LoginPage(page);
    await loginPage.goto();
  });

  test('should display login form', async () => {
    await loginPage.expectHeading('Sign In');
    await expect(loginPage.emailInput).toBeVisible();
    await expect(loginPage.passwordInput).toBeVisible();
    await expect(loginPage.submitButton).toBeEnabled();
  });

  test('should login with valid credentials', async ({ page }) => {
    await loginPage.fillForm('user@example.com', 'password123');
    await loginPage.submit();

    await expect(page).toHaveURL('/dashboard');
    await expect(page.getByText('Welcome')).toBeVisible();
  });

  test('should show error with invalid credentials', async () => {
    await loginPage.fillForm('wrong@example.com', 'wrongpassword');
    await loginPage.submit();

    await loginPage.expectError('Invalid email or password');
    await loginPage.expectUrl('/login');
  });

  test('should validate email format', async () => {
    await loginPage.fillForm('not-an-email', 'password123');
    await loginPage.submit();

    await loginPage.expectError('Invalid email');
  });

  test('should require password', async () => {
    await loginPage.fillForm('user@example.com', '');
    await loginPage.submit();

    await loginPage.expectError('Password is required');
  });
});
```

## CRUD Test

```typescript
// e2e/{entity}.spec.ts

import { test, expect } from '@playwright/test';
import { {Entity}ListPage } from './pages/{Entity}ListPage';
import { {Entity}FormPage } from './pages/{Entity}FormPage';

test.describe('{Entity} Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');
  });

  test('should display {entity} list', async ({ page }) => {
    const listPage = new {Entity}ListPage(page);
    await listPage.goto();

    await listPage.expectHeading('{Entities}');
    await expect(listPage.createButton).toBeVisible();
  });

  test('should create new {entity}', async ({ page }) => {
    const listPage = new {Entity}ListPage(page);
    const formPage = new {Entity}FormPage(page);

    await listPage.goto();
    await listPage.clickCreate();

    await formPage.fillForm({
      name: 'New {Entity}',
      description: 'Test description',
    });
    await formPage.submit();

    await expect(page).toHaveURL(/\/{entities}\/[\w-]+/);
    await expect(page.getByText('New {Entity}')).toBeVisible();
  });

  test('should edit existing {entity}', async ({ page }) => {
    const listPage = new {Entity}ListPage(page);

    await listPage.goto();
    await listPage.clickFirstItem();
    await page.click('[data-testid="edit-button"]');

    await page.fill('[data-testid="name-input"]', 'Updated {Entity}');
    await page.click('[data-testid="save-button"]');

    await expect(page.getByText('{Entity} updated')).toBeVisible();
    await expect(page.getByText('Updated {Entity}')).toBeVisible();
  });

  test('should delete {entity}', async ({ page }) => {
    const listPage = new {Entity}ListPage(page);

    await listPage.goto();
    const initialCount = await listPage.getItemCount();

    await listPage.clickFirstItem();
    await page.click('[data-testid="delete-button"]');
    await page.click('[data-testid="confirm-delete"]');

    await listPage.expectItemCount(initialCount - 1);
  });

  test('should search {entities}', async ({ page }) => {
    const listPage = new {Entity}ListPage(page);

    await listPage.goto();
    await listPage.search('specific term');

    await expect(listPage.searchInput).toHaveValue('specific term');
    // Verify filtered results
  });
});
```

## Authenticated Fixture

```typescript
// e2e/fixtures/auth.fixture.ts

import { test as base, Page } from '@playwright/test';

type AuthFixture = {
  authenticatedPage: Page;
  adminPage: Page;
};

export const test = base.extend<AuthFixture>({
  authenticatedPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'user@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    await use(page);
  },

  adminPage: async ({ page }, use) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'admin@example.com');
    await page.fill('[data-testid="password-input"]', 'adminpassword');
    await page.click('[data-testid="login-button"]');
    await page.waitForURL('/dashboard');

    await use(page);
  },
});

export { expect } from '@playwright/test';
```

```typescript
// e2e/protected-routes.spec.ts

import { test, expect } from './fixtures/auth.fixture';

test.describe('Protected Routes', () => {
  test('user can access profile', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/profile');
    await expect(authenticatedPage.getByRole('heading')).toContainText('Profile');
  });

  test('admin can access admin panel', async ({ adminPage }) => {
    await adminPage.goto('/admin');
    await expect(adminPage.getByRole('heading')).toContainText('Admin Panel');
  });
});
```

## API Mocking

```typescript
// e2e/with-mocks.spec.ts

import { test, expect } from '@playwright/test';

test.describe('With API Mocks', () => {
  test('should handle API error gracefully', async ({ page }) => {
    // Mock API to return error
    await page.route('**/api/users/*', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('/users/123');

    await expect(page.getByText('Something went wrong')).toBeVisible();
  });

  test('should display loading state', async ({ page }) => {
    // Mock slow API
    await page.route('**/api/users', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.goto('/users');

    await expect(page.getByTestId('loading-spinner')).toBeVisible();
    await expect(page.getByTestId('loading-spinner')).not.toBeVisible({ timeout: 2000 });
  });
});
```

## Visual Regression

```typescript
// e2e/visual.spec.ts

import { test, expect } from '@playwright/test';

test.describe('Visual Regression', () => {
  test('homepage matches snapshot', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot('homepage.png');
  });

  test('login page matches snapshot', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveScreenshot('login.png', {
      mask: [page.locator('[data-testid="dynamic-content"]')],
    });
  });
});
```

## Accessibility Test

```typescript
// e2e/a11y.spec.ts

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('homepage should have no accessibility violations', async ({ page }) => {
    await page.goto('/');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('login form should be keyboard navigable', async ({ page }) => {
    await page.goto('/login');

    // Tab through form elements
    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="email-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="password-input"]')).toBeFocused();

    await page.keyboard.press('Tab');
    await expect(page.locator('[data-testid="login-button"]')).toBeFocused();
  });
});
```

---

## Playwright Configuration

```typescript
// playwright.config.ts

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html'],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],

  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
```

## Checklist

- [ ] Page Object Model used
- [ ] Fixtures for common setups
- [ ] Proper locator strategies
- [ ] Error scenarios covered
- [ ] Loading states tested
- [ ] Accessibility tested
- [ ] Mobile viewports tested
