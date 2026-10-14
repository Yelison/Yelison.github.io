import { expect, setPreferences, test } from './fixtures.js';

const BUILD_TIMEOUT = 60_000;
const portfolio = (page) => page.frameLocator('#build-stage iframe');

test.describe('live build', () => {
  test('opens on a launch screen that covers the viewport @mobile @webkit', async ({ page }) => {
    // Its scripts must start once the stylesheets apply. While a slow web font stylesheet is
    // pending, Safari runs deferred scripts before any stylesheet has applied.
    await page.route(/fonts\.googleapis\.com/, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({ contentType: 'text/css', body: '' });
    });
    await page.goto('/');
    await expect(page.locator('#launch')).toBeVisible();
    const box = await page.locator('#launch-screen').boundingBox();
    expect(box.height).toBe(page.viewportSize().height);
  });

  test('builds the portfolio in front of the visitor, then destroys it @mobile', async ({
    page,
  }) => {
    test.slow();
    await setPreferences(page, { 'portfolio-language': 'en' });
    await page.goto('/');
    await expect(page.getByText('Watch my portfolio build itself.')).toBeAttached();
    await page.locator('#launch').click();
    await expect(page.locator('#build-console')).toBeVisible();
    await expect(page.locator('#source-text')).toContainText('<header>', { timeout: 15_000 });
    const desktop = test.info().project.name === 'desktop';
    // On desktop the scrollbar glides with the build progress on a replica.
    if (desktop) await expect(page.locator('.scrollbar-replica')).toHaveCount(1);

    await expect(page.locator('#replay')).toBeVisible({ timeout: BUILD_TIMEOUT });
    await expect(page.locator('#build-console')).toBeHidden();
    await expect(portfolio(page).locator('nav a').first()).toHaveText('Selected work');
    await expect(portfolio(page).locator('#typed-code')).not.toBeEmpty();
    // Once the page is back at the top, the native scrollbar takes over again.
    const iframe = page.frames().find((frame) => frame !== page.mainFrame());
    await expect(page.locator('.scrollbar-replica')).toHaveCount(0, { timeout: 10_000 });
    expect(await iframe.evaluate(() => document.documentElement.style.scrollbarColor)).toBe('');

    await page.locator('#replay').click();
    const confirm = page.locator('#destroy-confirm');
    await expect(confirm).toBeDisabled();
    await page.locator('#destroy-input').fill('destroy');
    await expect(confirm).toBeEnabled();
    await confirm.click();
    // The page stays still while it is taken apart.
    const scrollBefore = await iframe.evaluate(() => scrollY);
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, 800);
    await page.waitForTimeout(300);
    expect(await iframe.evaluate(() => scrollY)).toBe(scrollBefore);
    await expect(page.locator('#launch-screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('#build-stage iframe')).toHaveCount(0);
  });

  test('builds in Spanish and can switch back to English', async ({ page }) => {
    test.slow();
    await setPreferences(page, { 'portfolio-language': 'es' });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.locator('#launch')).toHaveAttribute(
      'aria-label',
      'Abrir consola y construir el portafolio',
    );
    await page.locator('#launch').click();
    await expect(page.locator('#replay')).toHaveText('Destruir', { timeout: BUILD_TIMEOUT });
    await expect(page.locator('#replay')).toBeVisible({ timeout: BUILD_TIMEOUT });
    const frame = portfolio(page);
    await expect(frame.locator('nav a').first()).toHaveText('Proyectos');

    await frame.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(frame.locator('nav a').first()).toHaveText('Selected work');
    // The launcher follows the language chosen inside the portfolio.
    await expect(page.locator('#replay')).toHaveText('Destroy');
  });

  test('still builds in browsers without the CSS Custom Highlight API', async ({ page }) => {
    // Safari before 17.2 (older iPads) has no Highlight class or CSS.highlights.
    await page.addInitScript(() => {
      // The portfolio is written into an iframe: strip the APIs from its window as it appears.
      new MutationObserver((records) => {
        for (const { addedNodes } of records) {
          for (const node of addedNodes) {
            const win = node.nodeName === 'IFRAME' ? node.contentWindow : null;
            if (!win) continue;
            delete win.Highlight;
            delete win.CSS.highlights;
          }
        }
      }).observe(document, { childList: true, subtree: true });
    });
    await page.goto('/');
    await page.locator('#launch').click();
    await expect(page.locator('#source-text')).toContainText('<header>', { timeout: 15_000 });
    await expect(page.locator('#build-error')).toBeHidden();
  });

  test('follows the code being written until the visitor scrolls the console', async ({ page }) => {
    test.slow();
    await page.goto('/');
    await page.locator('#launch').click();
    const code = page.locator('.console-code');
    const metrics = () =>
      code.evaluate((el) => ({
        gap: el.scrollHeight - el.clientHeight - el.scrollTop,
        room: el.scrollHeight - el.clientHeight,
      }));
    // The console slides into its corner first: wait until it stops moving.
    await expect(page.locator('#build-console.docked')).toBeVisible();
    let box = await code.boundingBox();
    await expect
      .poll(async () => {
        const next = await code.boundingBox();
        const still = next.x === box.x && next.y === box.y;
        box = next;
        return still;
      })
      .toBe(true);
    // A figure ends by emptying the console, which follows again by design: retry in the next
    // one if that happens in the middle of the check.
    const status = page.locator('#build-status');
    let section = '';
    let paused = false;
    for (let attempt = 0; attempt < 3 && !paused; attempt++) {
      // Each figure starts from an empty console: wait for one with lines to scroll back through.
      await expect
        .poll(async () => (await metrics()).room, { timeout: 30_000 })
        .toBeGreaterThan(80);
      // Left alone, it stays on the line being written.
      expect((await metrics()).gap).toBeLessThan(4);
      section = await status.textContent();
      // Scrolling the console up stops the following, even while code keeps arriving.
      await code.hover();
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(250);
      const now = await status.textContent();
      if (now !== section) {
        // The wheel may have landed in the next figure: let that one end too, so the retry
        // starts from a console nobody has touched.
        await expect(status).not.toHaveText(now, { timeout: 40_000 });
        continue;
      }
      expect((await metrics()).gap).toBeGreaterThan(40);
      paused = true;
    }
    expect(paused).toBe(true);
    // The next figure being written follows again.
    await expect(status).not.toHaveText(section, { timeout: 40_000 });
    await expect.poll(async () => (await metrics()).gap, { timeout: 10_000 }).toBeLessThan(4);
  });

  test('can be skipped, and returning visitors go straight to the portfolio @webkit', async ({
    page,
  }) => {
    await page.goto('/');
    // Spanish is the default language of the launcher, and the portfolio follows it.
    await expect(page.locator('#launch-screen .direct-link')).toHaveText('Saltar construcción');
    await page.locator('#launch').click();
    await page.locator('#skip').click();
    await expect(page.locator('#build-stage iframe')).toHaveAttribute('src', 'portfolio.html');
    await expect(portfolio(page).locator('nav a').first()).toHaveText('Proyectos');

    await page.reload();
    await expect(page.locator('#launch-screen')).toBeHidden();
    await expect(page.locator('#build-stage iframe')).toHaveAttribute('src', 'portfolio.html');
  });
});
