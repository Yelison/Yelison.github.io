import { expect, setPreferences, test } from './fixtures.js';

const BUILD_TIMEOUT = 60_000;
const portfolio = (page) => page.frameLocator('#build-stage iframe');

test.describe('live build', () => {
  test('builds the portfolio in front of the visitor @mobile', async ({ page }) => {
    test.slow();
    await setPreferences(page, { 'portfolio-language': 'en' });
    await page.goto('/');
    await expect(page.getByText('Watch my portfolio build itself.')).toBeAttached();
    await page.locator('#launch').click();
    await expect(page.locator('#build-console')).toBeVisible();
    await expect(page.locator('#source-text')).toContainText('<header>', { timeout: 15_000 });

    await expect(page.locator('#replay')).toBeVisible({ timeout: BUILD_TIMEOUT });
    await expect(page.locator('#build-console')).toBeHidden();
    await expect(portfolio(page).locator('nav a').first()).toHaveText('Selected work');
    await expect(portfolio(page).locator('#typed-code')).not.toBeEmpty();
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
