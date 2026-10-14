import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('ADHD1X end-to-end and WCAG 2.2 AA accessibility (P16)', () => {
  test('first visit: disclaimer, 18+ gate, skip quiz, skip major, skip courses, then Today', async ({ page }) => {
    await page.goto('/welcome');
    await expect(page.locator('h1')).toContainText('Before we start');

    await page.getByRole('button', { name: 'Continue' }).click();
    await expect(page.locator('h1')).toContainText('Confirm your age');

    const continueBtn = page.getByRole('button', { name: 'Continue' });
    await expect(continueBtn).toBeDisabled();

    await page.getByLabel("I'm 18 or older (required)").check();
    await expect(continueBtn).toBeEnabled();
    await continueBtn.click();

    await expect(page.locator('h1')).toContainText('Question 1 of 5');
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();

    await expect(page.locator('h1')).toContainText('Your major (optional)');
    await page.getByRole('button', { name: 'Skip for now' }).click();

    await expect(page.locator('h1')).toContainText('Add a course');
    await page.getByRole('button', { name: 'Skip to Today' }).click();

    await expect(page.locator('h1')).toContainText('Today');
  });

  test('main pages pass axe-core WCAG 2.2 AA checks in regular and Space style', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    for (const spaceOn of [false, true]) {
      const toggle = page.getByRole('button', { name: /Space mode:/ });
      if ((await toggle.getAttribute('aria-pressed')) !== String(spaceOn)) await toggle.click();
      const pages: [string, string][] = [
        ['/today', 'Today'],
        ['/assignments', 'Assignments'],
        ['/calendar', 'Calendar'],
        ['/voyage', spaceOn ? 'Voyage' : 'Progress'],
        ['/catch-up', spaceOn ? 'Hyperdrive (Catch Up)' : 'Catch-up mode'],
        ['/settings/display', 'Settings'],
      ];
      for (const [path, title] of pages) {
        // Use the menu, not page.goto, so saved data stays in this browser session.
        await page.evaluate((p) => {
          window.history.pushState({}, '', p);
          window.dispatchEvent(new PopStateEvent('popstate'));
        }, path);
        await expect(page.locator('h1')).toContainText(title);
        const results = await new AxeBuilder({ page })
          .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
          .analyze();
        expect(results.violations, `${path} (space=${spaceOn})`).toEqual([]);
      }
    }
  });

  test('Catch Up is never offered on Today, and shows only after the person switches it on', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    // Off by default: no bar and no invitation on Today (A39).
    await expect(page.getByText(/Catch-up mode is on|Hyperdrive is on|Engage Hyperdrive/)).toHaveCount(0);

    await page.getByRole('link', { name: 'Settings' }).click();
    await page.getByRole('link', { name: 'Catch Up' }).click();
    await page.getByRole('link', { name: /calculator and switch/ }).click();
    await page.getByRole('button', { name: 'Turn on Catch-up mode' }).click();
    await expect(page.getByRole('button', { name: 'Turn off Catch-up mode' })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('link', { name: 'Today' }).click();
    await expect(page.getByRole('region', { name: 'Catch-up mode status' })).toBeVisible();
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(results.violations).toEqual([]);
  });

  test('catalog page passes axe-core WCAG 2.2 AA checks in all 4 palettes', async ({ page }) => {
    await page.goto('/catalog');
    const palettes = ['Space Palette', 'Low (Light) Palette', 'Low (Dim) Palette', 'Standard (Light) Palette'];

    for (const label of palettes) {
      await page.getByRole('button', { name: label }).click();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(results.violations).toEqual([]);
    }
  });
});
