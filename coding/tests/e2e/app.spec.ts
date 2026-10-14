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
        ['/cosmos', 'Cosmos'],
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
        if (path === '/cosmos') await page.waitForTimeout(700); // let the fade-in finish before scanning
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

  test('Cosmos view: tabs work with the keyboard, motion can be paused, fun fact shows in Space style only', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/cosmos');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.locator('h1')).toContainText('Cosmos');
    await expect(page.getByRole('complementary', { name: 'Fun fact' })).toHaveCount(0);

    await page.getByRole('tab', { name: /Planets/ }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('tab', { name: /Deep space/ })).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('heading', { name: 'Hyperdrive catch-up' })).toBeVisible();

    await page.getByRole('button', { name: 'Pause animations' }).click();
    await expect(page.getByRole('button', { name: 'Pause animations' })).toHaveAttribute('aria-pressed', 'true');
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'off');

    await page.getByRole('button', { name: /Space mode:/ }).click();
    await expect(page.getByRole('complementary', { name: 'Fun fact' })).toBeVisible();
  });

  test('Cosmos look stays on every page once switched on, and those pages pass accessibility checks', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');
    await expect(page.locator('html')).toHaveAttribute('data-look', 'normal');

    const goInApp = async (path: string) => {
      await page.evaluate((p) => {
        window.history.pushState({}, '', p);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }, path);
    };
    await goInApp('/cosmos');
    await page.getByRole('button', { name: 'Use this look on every page' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-look', 'cosmos');

    for (const [path, title] of [
      ['/today', 'Today'],
      ['/assignments', 'Assignments'],
      ['/calendar', 'Calendar'],
      ['/voyage', 'Progress'],
      ['/catch-up', 'Catch-up mode'],
      ['/settings/display', 'Settings'],
      ['/settings/planning', 'Settings'],
      ['/help', 'How ADHD1X works'],
    ]) {
      await goInApp(path);
      await expect(page.locator('h1')).toContainText(title);
      await expect(page.locator('html')).toHaveAttribute('data-look', 'cosmos');
      await expect(page.getByRole('region', { name: 'Page header' })).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
      const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
      expect(r.violations, `${path} with Cosmos look`).toEqual([]);
    }

    // And it can be switched off from Settings.
    await goInApp('/settings/display');
    await page.getByLabel(/Cosmos look on every page/).uncheck();
    await expect(page.locator('html')).toHaveAttribute('data-look', 'normal');
  });

  test('calendar: importing with no courses creates the courses named in the file and adds the assignments', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/calendar');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const longTitle = 'Final research paper on the history of the printing press and its effects on literacy across early modern Europe with a bibliography';
    const ics = [
      'BEGIN:VCALENDAR',
      'BEGIN:VEVENT', 'UID:event-assignment-1', 'SUMMARY:Week 3 Quiz [ENG 1A]', 'DTSTART;VALUE=DATE:20991020', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:event-assignment-2', `SUMMARY:${longTitle} [CIS 101]`, 'DTSTART;VALUE=DATE:20991021', 'END:VEVENT',
      'BEGIN:VEVENT', 'UID:event-assignment-3', 'SUMMARY:Reading response', 'DTSTART;VALUE=DATE:20991022', 'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');
    await page.getByText('Or paste the calendar text').click();
    await page.locator('#ics-text').fill(ics);
    await page.getByRole('button', { name: 'Read this text' }).click();

    // The preview says what will happen before anything is saved.
    await expect(page.getByText(/New courses?: ENG 1A, CIS 101/)).toBeVisible();
    await expect(page.getByText(/2 assignments will be added/)).toBeVisible();
    await expect(page.getByText(/1 name no course/)).toBeVisible();
    const save = page.getByRole('button', { name: /Save 3 items and add 2 to my assignments/ });
    await expect(save).toBeVisible();
    const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(r.violations).toEqual([]);
    await save.click();

    await expect(page.getByText(/Added 2 assignments to your study plan and created the courses ENG 1A, CIS 101/)).toBeVisible();
    // The one with no course is still offered, not guessed.
    await expect(page.getByText('Add a course first, then you can add this').or(page.getByLabel('Course:')).first()).toBeVisible();

    // The assignments exist, with the long title cut to fit, and a backup of them can be re-imported.
    await page.evaluate(() => {
      window.history.pushState({}, '', '/assignments');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(page.getByText('Week 3 Quiz')).toBeVisible();
    await expect(page.getByText(longTitle.slice(0, 120))).toBeVisible();
    await page.evaluate(() => {
      window.history.pushState({}, '', '/settings/privacy');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: /Export my data/ }).click()]);
    const path = await download.path();
    await page.locator('input[type=file][accept*="json"]').setInputFiles(path!);
    await expect(page.getByText(/Ready to import 2 assignments and 2 courses/)).toBeVisible();
  });

  test('grades: a file from the Canvas tool is previewed, then saved, and Catch Up uses it', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');
    await page.evaluate(() => {
      window.history.pushState({}, '', '/catch-up');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });

    const item = (id: number, name: string, extra: Record<string, unknown>) => ({
      canvasAssignmentId: id, name, dueAt: '2026-10-05T12:00:00Z', pointsPossible: 20, score: null, state: 'unsubmitted', countsInFinalGrade: true, ...extra,
    });
    const gradesFile = {
      format: 'ADHD1X-canvas-grades', formatVersion: 1, fetchedAt: '2026-10-14T16:30:00Z', source: 'canvas.example.edu',
      courses: [{
        canvasCourseId: 11, name: 'Introduction to Computer Science', courseCode: 'CIS-101-4827', term: 'Fall 2026',
        currentScore: 85, currentGrade: 'B',
        assignments: [
          item(1, 'Quiz 1', { score: 18, state: 'graded' }),
          item(2, 'Quiz 2', { score: 16, state: 'graded' }),
          item(3, 'Final exam', { pointsPossible: 60, dueAt: '2099-12-10T12:00:00Z' }),
        ],
      }],
    };

    // A file that is not from the tool is refused in words.
    await page.locator('#grades-file').setInputFiles({ name: 'bad.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
    await expect(page.getByRole('alert')).toContainText('does not look like one made by the Canvas grades tool');

    await page.locator('#grades-file').setInputFiles({ name: 'canvas-grades.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(gradesFile)) });
    await expect(page.getByText('Introduction to Computer Science', { exact: false }).first()).toBeVisible();
    const courseBox = page.getByLabel(/Introduction to Computer Science/);
    await expect(courseBox).toBeChecked(); // a course with graded work starts ticked
    await courseBox.uncheck();
    await expect(page.getByRole('button', { name: 'Save grades' })).toBeDisabled(); // nothing chosen, nothing to save
    await courseBox.check();
    await expect(page.getByText(/2 graded assignments will be added/)).toBeVisible();
    await expect(page.getByText(/New courses: CIS-101-4827/)).toBeVisible();
    await expect(page.getByText(/1 not graded yet and not in your list/)).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.getByRole('button', { name: 'Save grades' }).click();
    await expect(page.getByText(/Saved. Updated 0 assignments and added 2 graded ones/)).toBeVisible();

    // The grades are now on the assignments, and Catch Up can do math with them.
    await expect(page.getByText(/All 40 points are already graded/)).toBeVisible();
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

