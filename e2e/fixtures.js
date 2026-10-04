import { test as base, expect } from '@playwright/test';

/**
 * - External requests (Google Fonts, the embedded project demos) are blocked so the
 *   tests are fast and do not depend on other sites.
 * - Any uncaught error or console error fails the test.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource')) {
        errors.push(message.text());
      }
    });
    await page.context().route(/^https?:\/\/(?!localhost)/, (route) => route.abort());
    await use(page);
    expect(errors, 'console errors').toEqual([]);
  },
});

/** Stores preferences before any page script runs. */
export async function setPreferences(page, preferences) {
  await page.addInitScript((values) => {
    // Only the top page, and only once: reloads must keep what the site saved.
    if (window !== window.top || sessionStorage.getItem('preferences-set')) return;
    sessionStorage.setItem('preferences-set', '1');
    for (const [key, value] of Object.entries(values)) localStorage.setItem(key, value);
  }, preferences);
}

export { expect };
