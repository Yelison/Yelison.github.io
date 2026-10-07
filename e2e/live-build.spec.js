import { expect, setPreferences, test } from './fixtures.js';

const BUILD_TIMEOUT = 60_000;
const portfolio = (page) => page.frameLocator('#build-stage iframe');

test.describe('live build', () => {
  test('opens on a launch screen that covers the viewport @mobile', async ({ page }) => {
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

  test('can be skipped, and returning visitors go straight to the portfolio', async ({ page }) => {
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
