import { dictionaries, t } from './i18n.js';
import { renderTimeline } from './experience.js';
import { observeReveals } from './reveal.js';
import {
  LANGUAGE_MESSAGE,
  STORAGE_KEYS,
  isLanguage,
  readStorage,
  writeStorage,
} from '../shared/storage.js';

const listeners = [];

/** Registers a callback that runs after every language change. */
export function onLanguageChange(listener) {
  listeners.push(listener);
}

/** Runs every language listener again, e.g. once all modules have been initialized. */
export function refreshLanguage() {
  listeners.forEach((listener) => listener(document.documentElement.lang));
}

function translateMarkup(language) {
  const spanish = language === 'es' ? dictionaries.es : {};
  const english = dictionaries.en;
  document.querySelectorAll('[data-i]').forEach((el) => {
    const key = el.dataset.i;
    if (spanish[key]) el.textContent = spanish[key];
    else el.innerHTML = english[key];
  });
  document.querySelectorAll('[data-i-aria-label]').forEach((el) => {
    const key = el.dataset.iAriaLabel;
    el.setAttribute('aria-label', spanish[key] || english[key]);
  });
}

export function setLanguage(requested) {
  const language = isLanguage(requested) ? requested : 'en';
  document.documentElement.lang = language;
  translateMarkup(language);
  document
    .querySelectorAll('[data-lang]')
    .forEach((button) =>
      button.setAttribute('aria-pressed', String(button.dataset.lang === language)),
    );
  document.title = t('pageTitle');
  document.querySelector('meta[name="description"]').content = t('pageDescription');
  renderTimeline(language);
  writeStorage(STORAGE_KEYS.language, language);
  observeReveals();
  // When the page runs inside the launcher, keep the launcher in the same language.
  if (window.parent !== window) {
    window.parent.postMessage({ type: LANGUAGE_MESSAGE, lang: language }, location.origin);
  }
  refreshLanguage();
}

export function initLanguage() {
  document
    .querySelectorAll('[data-lang]')
    .forEach((button) => button.addEventListener('click', () => setLanguage(button.dataset.lang)));
  // Follow language changes made in another tab.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.language && isLanguage(event.newValue))
      setLanguage(event.newValue);
  });
  setLanguage(readStorage(STORAGE_KEYS.language) || 'en');
}
