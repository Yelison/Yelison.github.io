import { t } from './i18n.js';
import { onLanguageChange } from './language.js';
import { STORAGE_KEYS, writeStorage } from '../shared/storage.js';

function syncThemeLabel() {
  const light = document.documentElement.dataset.theme === 'light';
  const button = document.getElementById('theme-toggle');
  button.setAttribute('aria-pressed', String(light));
  button.querySelector('.theme-icon').textContent = light ? '☾' : '☀';
  button.querySelector('.theme-label').textContent = t(light ? 'themeDark' : 'themeLight');
  button.setAttribute('aria-label', t(light ? 'themeSwitchToDark' : 'themeSwitchToLight'));
  document.querySelector('meta[name="theme-color"]').content = light ? '#f6f5f2' : '#111216';
}

export function initTheme() {
  document.getElementById('theme-toggle').addEventListener('click', () => {
    const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    document.documentElement.dataset.theme = theme;
    writeStorage(STORAGE_KEYS.theme, theme);
    syncThemeLabel();
  });
  syncThemeLabel();
  onLanguageChange(syncThemeLabel);
}
