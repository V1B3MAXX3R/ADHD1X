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
    await expect(page.getByText(/1 not graded yet \(including missing work\) will be added as to do/)).toBeVisible();
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
    await page.getByRole('button', { name: 'Save grades' }).click();
    await expect(page.getByText(/Saved. Updated 0 assignments and added 3 new ones/)).toBeVisible();

    // The grades are now on the assignments, the final exam is a task to do, and Catch Up can do math with them.
    await expect(page.getByText(/You need 51 of the remaining 60 points/)).toBeVisible();
  });

  test('catch up: combine classes into one plan, set late penalties, try what-if scores, reset and save', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    // Three classes: two with work (both past due), one with nothing left.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('adhd1x');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(['courses', 'assignments'], 'readwrite');
            for (const [id, name] of [['c1', 'ENG 1A'], ['c2', 'CIS 101'], ['c3', 'OLD 100']]) {
              tx.objectStore('courses').put({ id, name, isMajor: false, createdAt: '2026-10-01T00:00:00Z' });
            }
            const base = { type: 'homework', estimateSource: 'user', minutesLogged: 0, notNow: false, addedLate: false, source: 'manual', createdAt: '2026-10-01T00:00:00Z' };
            tx.objectStore('assignments').put({ ...base, id: 'a1', courseId: 'c1', name: 'Essay 1', dueDate: '2026-10-10', points: 100, estimateMinutes: 120, status: 'todo' });
            tx.objectStore('assignments').put({ ...base, id: 'a2', courseId: 'c1', name: 'Quiz 1', dueDate: '2026-10-05', points: 20, earnedPoints: 18, estimateMinutes: 30, status: 'done' });
            tx.objectStore('assignments').put({ ...base, id: 'a3', courseId: 'c2', name: 'Lab 1', dueDate: '2026-10-02', points: 50, estimateMinutes: 90, status: 'todo' });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );
    const savedScore = (id: string) =>
      page.evaluate(
        (assignmentId) =>
          new Promise<number | null>((resolve) => {
            const open = indexedDB.open('adhd1x');
            open.onsuccess = () => {
              const req = open.result.transaction(['assignments']).objectStore('assignments').get(assignmentId);
              req.onsuccess = () => { resolve(req.result.earnedPoints ?? null); open.result.close(); };
            };
          }),
        id,
      );

    await page.goto('/catch-up');
    await expect(page.getByRole('heading', { name: '1. Your classes' })).toBeVisible();

    // Every class starts ticked. The plan combines the work from both classes that have some.
    for (const name of ['ENG 1A', 'CIS 101', 'OLD 100']) {
      await expect(page.getByRole('checkbox', { name: new RegExp(`^${name}`) })).toBeChecked();
    }
    const plan = page.getByRole('region', { name: /Your study plan/ });
    await expect(plan).toContainText('Essay 1');
    await expect(plan).toContainText('Lab 1');
    await expect(plan).toContainText('2 tasks');

    // Untick a class and it leaves the plan. Both shortcuts work.
    await page.getByRole('checkbox', { name: /^CIS 101/ }).uncheck();
    await expect(plan).not.toContainText('Lab 1');
    await expect(plan).toContainText('1 task');
    await page.getByRole('button', { name: 'All classes' }).click();
    await expect(plan).toContainText('Lab 1');
    await page.getByRole('button', { name: 'Only classes with work left' }).click();
    await expect(page.getByRole('checkbox', { name: /^OLD 100/ })).not.toBeChecked();
    await page.getByRole('button', { name: 'All classes' }).click();

    // Each class shows its grade now, and each class is worked out on its own.
    await expect(page.getByRole('checkbox', { name: /^ENG 1A/ })).toHaveAccessibleName(/Grade now 90% \(A\)/);
    const cGoal = page.getByRole('region', { name: '4. What each class needs for a C' });
    await expect(cGoal).toContainText('ENG 1A: the 1 task left is needed for a C');
    await expect(cGoal).toContainText('CIS 101: the 1 task left is needed for a C');
    const pace = page.getByRole('region', { name: '6. Your pace' });
    await expect(pace).toContainText('At the Normal pace, class by class:');
    await expect(pace).toContainText('ENG 1A: caught up');
    await expect(pace).toContainText('CIS 101: caught up');

    // The plan can show one class at a time.
    await plan.getByLabel('Show').selectOption({ label: 'CIS 101' });
    await expect(plan).toContainText('CIS 101: 1 task');
    await expect(plan).not.toContainText('Essay 1');
    await plan.getByLabel('Show').selectOption({ label: 'Every class' });
    await expect(plan).toContainText('Essay 1');

    // A grade you type in under Grading is where that class's C math starts.
    const engGrading = page
      .getByRole('region', { name: '2. Grading for each class' })
      .locator('details')
      .filter({ has: page.locator('summary', { hasText: 'ENG 1A' }) });
    await engGrading.locator('summary').click();
    await engGrading.getByLabel('My grade now (%)').fill('75');
    await engGrading.getByLabel('My grade now (%)').press('Enter');
    await expect(cGoal).toContainText('Grade now 75% (C), typed in by you.');
    await engGrading.getByLabel('My grade now (%)').fill('');
    await engGrading.getByLabel('My grade now (%)').press('Enter');
    await expect(cGoal).toContainText('Grade now 90% (A).');

    // Late work, class by class: waived by default; 10% or 50% off, or not accepted.
    const engLate = page.getByRole('group', { name: /^ENG 1A/ });
    const engItem = page.getByRole('listitem').filter({ has: engLate });
    await expect(page.getByRole('heading', { name: '3. Late work' })).toBeVisible();
    await expect(engLate.getByRole('radio', { name: 'Late work waived' })).toBeChecked();
    const grade = page.getByRole('region', { name: /Target grade and score math/ });
    await expect(grade).not.toContainText('Late penalties take away');
    await engLate.getByRole('radio', { name: 'Late work deducted at 50%' }).check();
    await expect(grade).toContainText('Late penalties take away 50 points across 1 task');
    await engLate.getByRole('radio', { name: 'Late work deducted at 10%' }).check();
    await expect(grade).toContainText('Late penalties take away 10 points across 1 task');

    // Every assignment in the class is listed. Late work starts in the plan; graded work (Quiz 1) starts out of it.
    await expect(engItem).toContainText('Assignments in my study plan: 1 of 2');
    await engItem.locator('summary').click();
    await engItem.getByRole('checkbox', { name: /^Essay 1/ }).uncheck();
    await expect(engItem).toContainText('Assignments in my study plan: 0 of 2');
    await expect(plan).not.toContainText('Essay 1');
    await engItem.getByRole('button', { name: 'Add all late work' }).click();
    await expect(engItem.getByRole('checkbox', { name: /^Quiz 1/ })).not.toBeChecked();
    await expect(engItem).toContainText('Scored 18 of 20');
    await expect(plan).toContainText('Essay 1');

    // Late work not accepted: no list, and past-due work in that class leaves the plan.
    await engLate.getByRole('radio', { name: 'Late work not accepted' }).check();
    await expect(engItem.locator('summary')).toHaveCount(0);
    await expect(plan).not.toContainText('Essay 1');
    await engLate.getByRole('radio', { name: 'Late work deducted at 10%' }).check();
    await expect(plan).toContainText('Essay 1');

    // What-if scores change the math only on this page, and Reset puts everything back.
    await expect(page.getByRole('button', { name: 'Reset to my real numbers' })).toBeDisabled();
    await page.locator('summary', { hasText: 'Try what-if scores' }).click();
    await page.getByLabel('Score for Essay 1').fill('90');
    await expect(page.getByText(/Showing 1 what-if score\./)).toBeVisible();
    await expect(page.getByLabel('Score for Essay 1')).toHaveValue('90');
    expect(await savedScore('a1')).toBeNull(); // nothing was saved
    await page.getByRole('button', { name: 'Reset to my real numbers' }).click();
    await expect(page.getByText(/Showing [0-9]+ what-if score/)).toHaveCount(0);
    await expect(page.getByLabel('Score for Essay 1')).toHaveValue('');

    // Saving what-if scores as real needs a second tap.
    await page.getByLabel('Score for Essay 1').fill('72');
    await page.getByRole('button', { name: 'Save what-if scores as my real scores' }).click();
    expect(await savedScore('a1')).toBeNull(); // still not saved
    await page.getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('button', { name: 'Save what-if scores as my real scores' }).click();
    await page.getByRole('button', { name: 'Yes, save them' }).click();
    await expect.poll(() => savedScore('a1')).toBe(72);
    await expect(page.getByText(/Showing [0-9]+ what-if score/)).toHaveCount(0);

    // The page stays accessible with all of this showing.
    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('term: set the last day, a mode and a break, and plan the Aggressive pace in blocks', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    // The last day starts unset and Today says so.
    const termBar = page.getByRole('region', { name: 'School term' });
    await expect(termBar).toContainText('Last day of the term: Not set yet.');
    await expect(termBar).toContainText('Mode: Regular');

    // Settings > Term and breaks
    await page.getByRole('link', { name: 'Term and breaks' }).click();
    await expect(page.getByRole('heading', { name: 'Term and breaks', level: 2 })).toBeVisible();
    await page.getByLabel('Last day of the term').fill('2099-12-18');
    await page.getByLabel('Term mode').selectOption('finals');
    await page.getByLabel('Break name').fill('Winter break');
    await page.getByLabel('First day').fill('2099-12-01');
    await page.getByLabel('Last day (blank for one day)').fill('2099-12-05');
    await page.getByRole('button', { name: 'Add break' }).click();
    await expect(page.getByText('Winter break', { exact: false }).first()).toBeVisible();
    await expect(page.getByText('2099-12-01 to 2099-12-05')).toBeVisible();

    // A last day before the first day is refused with a plain message.
    await page.getByLabel('Break name').fill('Backwards');
    await page.getByLabel('First day').fill('2099-12-10');
    await page.getByLabel('Last day (blank for one day)').fill('2099-12-09');
    await page.getByRole('button', { name: 'Add break' }).click();
    await expect(page.getByRole('alert')).toContainText('not before it');

    // Today now shows all three.
    await page.goto('/today');
    await expect(termBar).toContainText('Last day of the term:');
    await expect(termBar).toContainText('days left');
    await expect(termBar).toContainText('Mode: Finals');
    await expect(termBar).toContainText('Next break: Winter break');

    // Two classes with work already past due, so the plan has something to hold.
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const open = indexedDB.open('adhd1x');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(['courses', 'assignments'], 'readwrite');
            tx.objectStore('courses').put({ id: 'c1', name: 'ENG 1A', isMajor: false, createdAt: '2026-10-01T00:00:00Z' });
            const base = { type: 'homework', estimateSource: 'user', minutesLogged: 0, notNow: false, addedLate: false, source: 'manual', courseId: 'c1', createdAt: '2026-10-01T00:00:00Z', status: 'todo' };
            tx.objectStore('assignments').put({ ...base, id: 'a1', name: 'Essay 1', dueDate: '2026-10-02', estimateMinutes: 120 });
            tx.objectStore('assignments').put({ ...base, id: 'a2', name: 'Final exam', type: 'exam', dueDate: '2026-10-03', estimateMinutes: 150 });
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );

    await page.goto('/catch-up');
    const plan = page.getByRole('region', { name: /Your study plan/ });
    await expect(page.getByRole('region', { name: 'School term' })).toContainText('Mode: Finals');
    await expect(plan).toContainText('Finals mode: exams come before other work');
    await expect(page.getByRole('region', { name: '6. Your pace' })).toContainText('the last day of the term (');

    // Aggressive shows its hours; Normal does not.
    await expect(page.getByLabel('Morning hours')).toHaveCount(0);
    await page.getByRole('button', { name: /^Aggressive/ }).click();
    await expect(page.getByLabel('Morning hours')).toBeVisible();
    await page.getByLabel('Morning hours').selectOption('1');
    await page.getByLabel('Evening hours').selectOption('1');
    await page.getByLabel('Night hours').selectOption('0.5');
    await expect(page.getByText('That is 2.5 hours a day.')).toBeVisible();
    await expect(plan).toContainText('Each day is cut into Morning, Evening and Night');
    await expect(plan.getByRole('heading', { name: /^Morning/ }).first()).toBeVisible();
    await expect(plan.getByRole('heading', { name: /^Evening/ }).first()).toBeVisible();
    await expect(plan.getByRole('heading', { name: /^Night/ }).first()).toBeVisible();
    // 270 minutes of work at 150 a day takes two days, and the exam is planned first.
    await expect(plan).toContainText('2 tasks');
    await expect(plan).toContainText('on 2 study days');
    await expect(plan.getByRole('listitem').filter({ hasText: 'Final exam' }).first()).toBeVisible();

    // A zero block is left out.
    await page.getByLabel('Night hours').selectOption('0');
    await expect(plan.getByRole('heading', { name: /^Night/ })).toHaveCount(0);

    // Back to Normal: no blocks.
    await page.getByRole('button', { name: /^Normal/ }).click();
    await expect(page.getByLabel('Morning hours')).toHaveCount(0);
    await expect(plan.getByRole('heading', { name: /^Morning/ })).toHaveCount(0);

    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('catch up: each pace is checked against the goal date, and the C box and plan agree', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');

    // Ten 100-point tasks of an hour each, all three days overdue. A C needs 9 of them (9 hours of work).
    await page.evaluate(
      () =>
        new Promise<void>((resolve, reject) => {
          const pad = (n: number) => String(n).padStart(2, '0');
          const d = new Date();
          d.setDate(d.getDate() - 3);
          const due = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
          const open = indexedDB.open('adhd1x');
          open.onerror = () => reject(open.error);
          open.onsuccess = () => {
            const db = open.result;
            const tx = db.transaction(['courses', 'assignments'], 'readwrite');
            tx.objectStore('courses').put({ id: 'c1', name: 'ENG 1A', isMajor: false, createdAt: '2026-10-01T00:00:00Z' });
            for (let i = 1; i <= 10; i++) {
              tx.objectStore('assignments').put({
                type: 'homework', estimateSource: 'user', minutesLogged: 0, notNow: false, addedLate: false, source: 'manual',
                createdAt: '2026-10-01T00:00:00Z', status: 'todo', courseId: 'c1',
                id: `t${i}`, name: `Task ${i}`, dueDate: due, points: 100, estimateMinutes: 60,
              });
            }
            tx.oncomplete = () => { db.close(); resolve(); };
            tx.onerror = () => reject(tx.error);
          };
        }),
    );

    await page.goto('/catch-up');
    const plan = page.getByRole('region', { name: /Your study plan/ });
    const pace = page.getByRole('region', { name: '6. Your pace' });
    const cGoal = page.getByRole('region', { name: '4. What each class needs for a C' });
    const card = (name: string) => pace.getByRole('button', { name: new RegExp(`^${name}`) });
    const notice = page.getByRole('alert').filter({ hasText: 'Not possible at this pace' });
    const pad = (n: number) => String(n).padStart(2, '0');
    const inDays = (n: number) => {
      const d = new Date();
      d.setDate(d.getDate() + n);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    };

    // What each class needs comes first, read from the points: 9 of the 10 tasks, not all of them.
    await expect(cGoal).toContainText('ENG 1A: 9 of the 10 tasks left are needed for a C (about 9 hours), all past due.');

    // The pace comes after it. Automatic by default: every pace can be picked and says when it is caught up.
    await expect(pace.getByRole('radio', { name: 'As soon as my pace allows (automatic)' })).toBeChecked();
    for (const name of ['Aggressive', 'Normal', 'Chill']) {
      await expect(card(name)).toContainText('Caught up');
      await expect(card(name)).toBeEnabled();
    }
    await expect(pace).toContainText('ENG 1A: caught up');

    // A goal date with three study days (today counts): 9 hours is 3 hours a day. Chill goes up to only 2, so it is
    // not possible; Normal raises its hours to keep up; Aggressive (4 hours) is fine.
    await pace.getByRole('radio', { name: 'By a date I pick' }).check();
    await expect(pace).toContainText('Pick a date to see what it takes.');
    await pace.getByLabel('My goal date').fill(inDays(2));
    await expect(card('Chill')).toBeDisabled();
    await expect(card('Chill')).toContainText('Not possible');
    await expect(card('Chill')).toContainText('Needs about 3 hours a day.');
    await expect(card('Normal')).toContainText('About 3 hours a day, raised to keep up.');
    await expect(card('Normal')).toContainText('Caught up by');
    await expect(card('Aggressive')).toContainText('Caught up by');
    await expect(notice).toHaveCount(0);

    // Two study days: no pace can do 9 hours of work. The page says which class falls behind and offers the fixes.
    await pace.getByLabel('My goal date').fill(inDays(1));
    await expect(card('Normal')).toContainText('Not possible'); // still enabled because it is the chosen one
    await expect(card('Aggressive')).toContainText('Not possible');
    await expect(notice).toContainText('At Normal, ENG 1A is not on track by your goal date');
    await expect(notice).toContainText('It would take about 4.5 hours a day.');
    await expect(notice.getByRole('button', { name: 'Use Aggressive at 4.5 hours a day' })).toBeVisible();
    await notice.getByRole('button', { name: /^Move my goal date to/ }).click();
    await expect(pace.getByLabel('My goal date')).toHaveValue(inDays(2));
    await expect(notice).toHaveCount(0);

    // The plan holds just enough for a C, or everything when you ask.
    await expect(plan).toContainText('Just the work that gets each ticked class to a C');
    await expect(plan).toContainText('9 tasks');
    await plan.getByLabel('Plan all my work, not just enough for a C').check();
    await expect(plan).toContainText('All the work in your ticked classes');
    await expect(plan).toContainText('10 tasks');

    // Back to automatic.
    await pace.getByRole('radio', { name: 'As soon as my pace allows (automatic)' }).check();
    await expect(card('Chill')).toBeEnabled();

    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
  });

  test('grades: a version 2 file brings in weights, the C cutoff, the late policy, announcements, the syllabus and links', async ({ page }) => {
    await page.goto('/welcome');
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByLabel("I'm 18 or older (required)").check();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: 'Skip remaining questions' }).click();
    await page.getByRole('button', { name: 'Skip for now' }).click();
    await page.getByRole('button', { name: 'Skip to Today' }).click();
    await expect(page.locator('h1')).toContainText('Today');
    await page.goto('/catch-up');

    const item = (id: number, name: string, extra: Record<string, unknown>) => ({
      canvasAssignmentId: id, name, dueAt: '2026-10-05T12:00:00Z', pointsPossible: 20, score: null, state: 'unsubmitted',
      countsInFinalGrade: true, groupId: 501, lockAt: null, unlockAt: null, htmlUrl: null, gradingType: 'points', submissionTypes: [],
      allowedAttempts: null, attempt: null, missing: false, late: false, latePolicyStatus: null, pointsDeducted: null,
      submittedAt: null, redoRequest: false, description: null, rubric: [], ...extra,
    });
    const gradesFile = {
      format: 'ADHD1X-canvas-grades', formatVersion: 2, fetchedAt: '2026-10-14T16:30:00Z', source: 'canvas.example.edu',
      courses: [{
        canvasCourseId: 11, name: 'Introduction to Computer Science', courseCode: 'CIS-101-4827', term: 'Fall 2026',
        currentScore: 85, currentGrade: 'B', finalScore: 40, finalGrade: 'F', weighted: true, hideFinalGrades: false,
        groups: [
          { id: 501, name: 'Homework', weight: 40, dropLowest: 0, dropHighest: 0, neverDrop: [] },
          { id: 502, name: 'Exams', weight: 60, dropLowest: 0, dropHighest: 0, neverDrop: [] },
        ],
        gradingScale: { title: 'College', entries: [{ name: 'A', minPercent: 90 }, { name: 'C', minPercent: 72 }] },
        latePolicy: {
          lateDeductionEnabled: true, lateDeductionPercent: 10, lateInterval: 'day', lateMinimumEnabled: true,
          lateMinimumPercent: 50, missingDeductionEnabled: false, missingDeductionPercent: null,
        },
        unavailable: [],
        syllabusText: 'Week 1: Lab 1 due Friday.\nLate work loses 10% a day.',
        moduleProgress: { completed: 12, total: 30 },
        announcements: [{ id: 1, title: 'Lab 3 moved', postedAt: '2026-10-10T10:00:00Z', text: 'Lab 3 is now due Friday.' }],
        assignments: [
          item(1, 'Quiz 1', { score: 18, state: 'graded', submittedAt: '2026-10-04T10:00:00Z' }),
          item(2, 'Midterm', { pointsPossible: 100, score: 80, state: 'graded', groupId: 502, submittedAt: '2026-10-03T10:00:00Z' }),
          item(3, 'Lab 3', {
            state: 'missing', missing: true, lockAt: '2099-01-01T00:00:00Z', htmlUrl: 'https://canvas.example.edu/courses/11/assignments/3',
            description: 'Write two pages.', rubric: [{ description: 'Clarity', points: 10, details: null }],
          }),
          item(4, 'Old lab', { lockAt: '2026-10-06T00:00:00Z' }),
        ],
      }],
    };

    await page.locator('#grades-file').setInputFiles({ name: 'canvas-grades.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(gradesFile)) });
    await expect(page.getByText(/How 1 class is graded in Canvas/)).toBeVisible();
    await page.getByRole('button', { name: 'Save grades' }).click();
    await expect(page.getByText(/with Canvas details for 1 class/)).toBeVisible();

    // From Canvas, inside Late work.
    const classItem = page.getByRole('listitem').filter({ has: page.getByRole('group', { name: /^CIS-101-4827/ }) });
    await classItem.locator('summary', { hasText: 'From Canvas' }).click();
    await expect(classItem).toContainText('Graded by category weights: Homework 40%, Exams 60%.');
    await expect(classItem).toContainText('A C here starts at 72%');
    await expect(classItem).toContainText('Canvas late policy: 10% off per day late, never below 50%.');
    await expect(classItem).toContainText('Modules: 12 of 30 steps done.');
    await classItem.locator('summary', { hasText: 'Recent announcements (1)' }).click();
    await expect(classItem).toContainText('Lab 3 is now due Friday.');

    // Every assignment, with what Canvas says, a link back, and closed work locked.
    await classItem.locator('summary', { hasText: 'Assignments in my study plan' }).click();
    await expect(classItem).toContainText('missing in Canvas');
    const link = classItem.getByRole('link', { name: /Open in Canvas.*Lab 3/ });
    await expect(link).toHaveAttribute('href', 'https://canvas.example.edu/courses/11/assignments/3');
    await expect(link).not.toHaveAttribute('target', '_blank');
    await expect(classItem.getByRole('checkbox', { name: /^Old lab/ })).toBeDisabled();
    await expect(classItem).toContainText('closed in Canvas on');

    // What each class needs uses the weights, the class's own C, and Canvas's grade now.
    const cGoal = page.getByRole('region', { name: '4. What each class needs for a C' });
    // Homework 18 of 60 counted (30%), exams 80%: 0.4 * 30 + 0.6 * 80 = 60% if nothing else is turned in.
    await expect(cGoal).toContainText('Grade now 85% (B), from Canvas.');
    await expect(cGoal).toContainText('With nothing more turned in: 60');
    await expect(cGoal).toContainText('A C here is 72%');
    await expect(cGoal).toContainText('percentage points');
    await expect(page.getByRole('checkbox', { name: /^CIS-101-4827/ })).toHaveAccessibleName(/Grade now 85% \(B\)/);
    await expect(page.getByRole('region', { name: /Target grade and score math/ })).toContainText('Weighted by category, as in Canvas');
    await expect(page.locator('main')).not.toContainText('undefined');
    await expect(page.locator('main')).not.toContainText('NaN');

    const scan = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
    expect(scan.violations).toEqual([]);
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

