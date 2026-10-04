import { expect, setPreferences, test } from './fixtures.js';

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

  test('types the hero code and renders the live preview', async ({ page }) => {
    await page.goto('/portfolio.html');
    const code = page.locator('#typed-code');
    await expect(code).toContainText('<article class="live-card">', { timeout: 10_000 });
    await expect(page.locator('#code-language')).toHaveText('HTML · Live preview');
    await expect(page.locator('.live-card')).toBeVisible();
    await page.locator('[data-code="1"]').click();
    await expect(page.locator('#code-language')).toHaveText('CSS · Live preview');
  });

  test('simulates the backend request', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/portfolio.html');
    await page.getByRole('button', { name: 'Backend' }).click();
    await expect(page.locator('#code-language')).toHaveText('Node.js · API simulation');
    await page.getByRole('button', { name: 'Send GET' }).click();
    await expect(page.locator('.api-status')).toHaveText('200 OK');
    await expect(page.locator('.api-response')).toContainText('"developer": "Yelisson Ortiz"');
    await page.getByRole('button', { name: 'Frontend' }).click();
    await expect(page.locator('.api-preview')).toBeHidden();
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

  test('copies the email address', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await setPreferences(page, { 'portfolio-language': 'es' });
    await page.goto('/portfolio.html');
    await page.getByRole('button', { name: 'Copiar correo' }).click();
    await expect(page.locator('.copy-status')).toHaveText('Correo copiado.');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      'ortizyelison@gmail.com',
    );
  });
});
