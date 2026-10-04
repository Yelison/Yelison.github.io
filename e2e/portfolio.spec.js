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

  test('toggles the theme and remembers it', async ({ page }) => {
    await page.goto('/portfolio.html');
    const toggle = page.locator('#theme-toggle');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await toggle.click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(toggle).toHaveAttribute('aria-label', 'Switch to dark mode');
    await expect(toggle.locator('.theme-label')).toHaveText('Dark');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('pauses and resumes animations', async ({ page }) => {
    await page.goto('/portfolio.html');
    const toggle = page.locator('.motion-toggle');
    await toggle.click();
    await expect(page.locator('html')).toHaveClass(/motion-paused/);
    await expect(toggle).toHaveAttribute('aria-label', 'Enable animations');
    await toggle.click();
    await expect(page.locator('html')).not.toHaveClass(/motion-paused/);
  });

  test('expands the career timeline', async ({ page }) => {
    await page.goto('/portfolio.html');
    await page.getByText('Explore my experience').click();
    await expect(page.locator('#timeline .timeline-row')).toHaveCount(5);
    await expect(page.locator('#timeline .timeline-row').first()).toBeVisible();
  });

  test('opens and closes a project demo', async ({ page }) => {
    await page.goto('/portfolio.html');
    await page.getByRole('button', { name: 'Try project' }).first().click();
    const dialog = page.locator('#silabin-demo');
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('iframe')).toHaveAttribute('src', /^https:\/\//);
    await dialog.getByRole('button', { name: 'Expand' }).click();
    await expect(dialog).toHaveClass(/expanded/);
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toBeHidden();
    await expect(dialog.locator('iframe')).toHaveCount(0);
  });
});
