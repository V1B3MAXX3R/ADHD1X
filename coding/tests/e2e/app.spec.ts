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
        ['/settings/privacy', 'Settings'],
        ['/setup/major', 'Your major (optional)'],
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

  test('memory: session goal, "Where was I?" note, and it shows up again', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    // Put one made-up course and assignment straight into the browser's saved data.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('adhd1x');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(['courses', 'assignments'], 'readwrite');
            tx.objectStore('courses').put({ id: 'c1', name: 'ENG 1A', isMajor: false, createdAt: '2026-10-13T00:00:00Z' });
            tx.objectStore('assignments').put({
              id: 'a1', courseId: 'c1', name: 'Essay 1 outline', type: 'essay', dueDate: '2099-01-01',
              estimateMinutes: 60, estimateSource: 'default', minutesLogged: 0, status: 'todo', notNow: false,
              addedLate: false, source: 'manual', createdAt: '2026-10-13T00:00:00Z',
            });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );

    await page.goto('/start/a1');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: /Continue \(Uses Gemini\)/ }).click();
    await page.getByRole('button', { name: /Get my first move/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click(); // Gemini notice dialog
    await expect(page.getByRole('heading', { name: /Your first move/ })).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByLabel('Optional: what will you do this session?').fill('Write the thesis sentence');
    await page.getByRole('button', { name: /Start now/ }).click();
    await expect(page.locator('h1')).toContainText('Today');

    await page.getByRole('button', { name: 'Done for now' }).click();
    const dialog = page.getByRole('dialog', { name: /Done for now/ });
    await expect(dialog).toContainText('Write the thesis sentence');
    const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(axe.violations).toEqual([]);

    await dialog.getByLabel('Partly').check();
    await dialog.getByLabel(/Where was I/).fill('Thesis done, start paragraph 1');
    await dialog.getByRole('button', { name: 'Save and stop' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole('complementary', { name: 'Study timer' })).toHaveCount(0);

    // The note comes back on Today and on Help me start, and can be cleared.
    await page.reload();
    const card = page.getByRole('region', { name: 'Where you left off' });
    await expect(card).toContainText('Thesis done, start paragraph 1');
    await page.goto('/start/a1');
    await expect(page.getByText('Where you left off:')).toBeVisible();
    await page.getByRole('button', { name: 'Clear note' }).click();
    await expect(page.getByText('Where you left off:')).toHaveCount(0);
  });

  test('Gemini tools: work without a key, fall back calmly, and pass accessibility checks', async ({ page }) => {
    const axeScan = async (label: string) => {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations, label).toEqual([]);
    };

    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('adhd1x');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(['courses', 'assignments'], 'readwrite');
            tx.objectStore('courses').put({ id: 'c1', name: 'ENG 1A', isMajor: false, createdAt: '2026-10-13T00:00:00Z' });
            tx.objectStore('assignments').put({
              id: 'a1', courseId: 'c1', name: 'Essay 1 outline', type: 'essay', dueDate: '2099-01-01',
              detailsText: 'Write a 2 page outline. Submit as a PDF.',
              estimateMinutes: 60, estimateSource: 'default', minutesLogged: 0, status: 'todo', notNow: false,
              addedLate: false, source: 'manual', createdAt: '2026-10-13T00:00:00Z',
            });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );

    // Move around inside the app (no reload), so settings that are still being saved are not lost.
    const goInApp = (path: string) =>
      page.evaluate((p) => {
        window.history.pushState({}, '', p);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, path);
    // Assignment tools
    await page.goto('/assignments/a1');
    const tools = page.getByRole('group', { name: 'Gemini tools for this assignment' });
    await expect(tools).toBeVisible();
    await tools.getByRole('button', { name: 'Message my professor' }).click();
    await page.getByRole('button', { name: 'Use a built-in draft' }).click();
    await expect(page.getByLabel('Subject')).toHaveValue(/Essay 1 outline/);
    await axeScan('professor email tool');

    await tools.getByRole('button', { name: 'Ask about this assignment' }).click();
    await page.getByLabel(/Ask a question/).fill('Is it a PDF?');
    await page.getByRole('button', { name: /Ask \(Uses Gemini\)/ }).click();
    await page.getByRole('button', { name: 'Continue' }).click(); // first-use Gemini notice
    // No access code is set in the test setup, so the calm "access code" message must appear.
    await expect(page.getByText(/access code/i)).toBeVisible();
    await axeScan('ask tool with notice');

    // Turning AI Mode off hides the tools and nothing is sent.
    await goInApp('/settings/privacy');
    await page.getByRole('button', { name: 'Turn AI Mode off' }).click();
    await expect(page.getByRole('button', { name: 'Turn AI Mode on' })).toHaveAttribute('aria-pressed', 'false');
    await goInApp('/assignments/a1');
    await expect(page.getByText('AI Mode is off. Turn it on in Settings')).toBeVisible();

    // Brain dump works with the built-in splitter even with AI Mode off.
    await page.getByText('Sort my brain dump', { exact: true }).first().click();
    await page.getByLabel('Your list').fill('Read chapter 4\nLab 2 report');
    await page.getByRole('button', { name: 'Split into a list (built-in)' }).click();
    await axeScan('brain dump review');
    await page.getByRole('button', { name: 'Add selected tasks' }).click();
    await expect(page.getByText('Added 2 tasks to your assignments.')).toBeVisible();
    await expect(page.getByText('Lab 2 report').first()).toBeVisible();

    // Today planning helpers (hidden while AI Mode is off, shown after turning it back on).
    await goInApp('/settings/privacy');
    await page.getByRole('button', { name: 'Turn AI Mode on' }).click();
    await goInApp('/today');
    await page.getByRole('button', { name: 'Show my day plan' }).click();
    await page.getByText('Planning helpers (Uses Gemini)').click();
    for (const tab of ["Tune today's plan", 'Split time across classes', 'Break up a big project']) {
      await page.getByRole('button', { name: tab }).click();
      await expect(page.getByRole('button', { name: tab })).toHaveAttribute('aria-pressed', 'true');
      await axeScan(`planning helper: ${tab}`);
    }

    // Settings, Display shows the personalizer, and a made-up palette is checked before it can be used.
    await goInApp('/settings/display');
    await expect(page.getByRole('heading', { name: 'Describe how you work' })).toBeVisible();
    await page.getByLabel(/Bright screens hurt my eyes/).fill('Bright screens hurt my eyes. Keep messages short.');
    await page.getByRole('button', { name: 'Suggest settings (built-in)' }).click();
    await expect(page.getByText('Dim mode:')).toBeVisible();
    await expect(page.getByText('Tone of messages:')).toBeVisible();
    await page.getByRole('button', { name: 'Apply these settings' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-dim', 'on');
    await axeScan('personalizer after applying');
  });

  test('study helpers: details tools, parking lot, time check, settings tools, logbook, tips', async ({ page }) => {
    const axeScan = async (label: string) => {
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations, label).toEqual([]);
    };
    const goInApp = async (path: string) => {
      await page.evaluate((p) => {
        window.history.pushState({}, '', p);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, path);
    };

    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('adhd1x');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(['courses', 'assignments'], 'readwrite');
            tx.objectStore('courses').put({ id: 'c1', name: 'ENG 1A', isMajor: false, createdAt: '2026-10-13T00:00:00Z' });
            for (const [id, name, type] of [['a1', 'Essay 1 outline', 'essay'], ['a2', 'Read chapter 4', 'reading']]) {
              tx.objectStore('assignments').put({
                id, courseId: 'c1', name, type, dueDate: '2099-01-01',
                estimateMinutes: 60, estimateSource: 'default', minutesLogged: 0, status: 'todo', notNow: false,
                addedLate: false, source: 'manual', createdAt: '2026-10-13T00:00:00Z',
              });
            }
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    await page.reload();

    // Assignment details: done-list, reading calculator, 15-minute rescue with a timer.
    await goInApp('/assignments/a2');
    await expect(page.getByText('How to know you are done')).toBeVisible();
    await page.getByLabel('Pages').fill('20');
    await page.getByRole('button', { name: /^Use \d+ minutes$/ }).click();
    await goInApp('/assignments/a1');
    await page.getByRole('button', { name: /Turn in something in 15 minutes/ }).click();
    await axeScan('assignment details');
    await page.getByRole('button', { name: 'Start 15-minute timer' }).click();

    // Timer bar: park a thought, then finish with a corrected time.
    await page.getByRole('button', { name: 'Park a thought' }).click();
    await page.getByLabel('Write it down, then get back to work').fill('Email the TA about the quiz');
    await page.getByRole('button', { name: 'Park it' }).click();
    await expect(page.getByText('Email the TA about the quiz')).toBeVisible();
    await axeScan('parking lot');
    await page.getByRole('button', { name: /Park a thought/ }).click();
    await page.getByRole('button', { name: 'Done for now' }).click();
    const dialog = page.getByRole('dialog', { name: /Done for now/ });
    await dialog.getByLabel(/how many minutes/).fill('20');
    await dialog.getByRole('button', { name: 'Save and stop' }).click();
    await expect(dialog).toHaveCount(0);

    // Today: energy check only suggests; the burnout question is not shown on a fresh start.
    await goInApp('/today');
    await page.getByRole('button', { name: 'Show my day plan' }).click().catch(() => {});
    await expect(page.getByText('How is your energy? (optional)')).toBeVisible();
    await page.getByRole('button', { name: 'Low energy' }).click();
    await expect(page.getByText(/A lighter day: just/)).toBeVisible();
    await expect(page.getByText(/Yesterday was a long day/)).toHaveCount(0);
    await axeScan('today helpers');

    // Settings tools.
    await goInApp('/settings/planning');
    await page.getByLabel('Class or event name').fill('Biology lecture');
    await page.getByRole('button', { name: 'Add recovery gap' }).click();
    await expect(page.getByText('Biology lecture').first()).toBeVisible();
    await axeScan('settings planning');

    await goInApp('/settings/help-tone');
    await page.getByLabel('Routine name').fill('Lab routine');
    await page.getByLabel(/Steps, one per line/).fill('Open the lab file\nDo step 1\nSave');
    await page.getByRole('button', { name: 'Save routine' }).click();
    await expect(page.getByText('Lab routine').first()).toBeVisible();
    await axeScan('settings routines');

    await goInApp('/settings/answers');
    await expect(page.getByText(/All [0-9]+ questions/)).toBeVisible();
    await page.getByRole('button', { name: 'Standard', exact: true }).click();
    await axeScan('settings answers');

    await goInApp('/settings/display');
    await page.getByRole('button', { name: /Turn on calm mode/ }).click();
    await expect(page.getByRole('button', { name: 'Put my settings back' })).toBeVisible();
    await page.getByRole('button', { name: 'Put my settings back' }).click();
    await axeScan('settings display');

    // Logbook and tips.
    await goInApp('/voyage');
    await page.getByRole('button', { name: 'Save to logbook' }).click();
    await expect(page.getByText('Saved to the logbook.')).toBeVisible();
    await axeScan('progress logbook');

    await goInApp('/help');
    await page.getByLabel('Search phrases').fill('synthes');
    await expect(page.getByText(/Synthesize the sources/)).toBeVisible();
    await page.getByRole('button', { name: 'Sensory load' }).click();
    await expect(page.getByText('Turn down brightness and motion')).toBeVisible();
    await axeScan('help');
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

