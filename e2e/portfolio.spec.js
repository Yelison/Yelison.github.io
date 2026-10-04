import { expect, test } from './fixtures.js';

test.describe('portfolio page', () => {
  test('switches language and remembers it @mobile', async ({ page }) => {
    await page.goto('/portfolio.html');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en');
    await expect(page.locator('nav a').first()).toHaveText('Selected work');

    await page.getByRole('button', { name: 'ES', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('lang', 'es');
    await expect(page.locator('nav a').first()).toHaveText('Proyectos');
    await expect(page).toHaveTitle('Yelisson Ortiz — Desarrollador Full-Stack');
    await expect(page.locator('nav')).toHaveAttribute('aria-label', 'Navegación principal');
    await expect(page.locator('#timeline .role').first()).toHaveText(
      'Frontend Developer · SaaS educativo · Remoto',
    );

    await page.reload();
    await expect(page.locator('nav a').first()).toHaveText('Proyectos');
    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.locator('.contact h2')).toHaveText('Let’s talk.');
    await expect(page.locator('.contact h2 em')).toHaveText('talk.');
  });

  test('expands the career timeline', async ({ page }) => {
    await page.goto('/portfolio.html');
    await page.getByText('Explore my experience').click();
    await expect(page.locator('#timeline .timeline-row')).toHaveCount(5);
    await expect(page.locator('#timeline .timeline-row').first()).toBeVisible();
  });
});
