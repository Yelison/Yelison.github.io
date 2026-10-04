import { messages } from './messages.js';
import { state, ui } from './state.js';
import {
  LANGUAGE_MESSAGE,
  STORAGE_KEYS,
  isLanguage,
  storedTheme,
  writeStorage,
} from '../shared/storage.js';

export const text = (key) => messages[state.lang][key];

export const requiredDestroyWord = () => text('destroyWord');

export function syncBootTheme() {
  document.documentElement.dataset.theme = storedTheme();
}

let hintTimer;
let hintHideTimer;

/** After a few idle seconds on the launch screen, briefly show what the button does. */
export function showLaunchHint() {
  clearTimeout(hintTimer);
  clearTimeout(hintHideTimer);
  ui.launchScreen.classList.remove('hint-visible');
  hintTimer = setTimeout(() => {
    if (ui.launchScreen.hidden) return;
    ui.launchScreen.classList.add('hint-visible');
    hintHideTimer = setTimeout(() => ui.launchScreen.classList.remove('hint-visible'), 3000);
  }, 3000);
}

export function setLanguage(value) {
  state.lang = value;
  document.documentElement.lang = value;
  document
    .querySelectorAll('[data-boot]')
    .forEach((el) => (el.textContent = text(el.dataset.boot)));
  ui.launch.setAttribute('aria-label', text('launchLabel'));
  ui.consoleBox.setAttribute('aria-label', text('consoleLabel'));
  document.querySelector('.console-tabs').setAttribute('aria-label', text('tabsLabel'));
  document.title = text('pageTitle');
  document.querySelector('meta[name="description"]').content = text('pageDescription');
  if (state.frame) state.frame.title = text('frameTitle');
  writeStorage(STORAGE_KEYS.language, value);
  ui.destroyConfirm.disabled = ui.destroyInput.value.trim().toLowerCase() !== requiredDestroyWord();
  showLaunchHint();
}

/** Re-applies the language saved by the portfolio (it may have changed inside the iframe). */
export function restoreSavedLanguage(saved) {
  if (isLanguage(saved)) setLanguage(saved);
}

export function initLanguage() {
  syncBootTheme();
  // Theme and language can change in another tab or inside the portfolio iframe.
  window.addEventListener('storage', (event) => {
    if (event.key === STORAGE_KEYS.theme) syncBootTheme();
    if (event.key === STORAGE_KEYS.language && isLanguage(event.newValue))
      setLanguage(event.newValue);
  });
  window.addEventListener('message', (event) => {
    if (
      event.source === state.frame?.contentWindow &&
      event.origin === location.origin &&
      event.data?.type === LANGUAGE_MESSAGE &&
      isLanguage(event.data.lang)
    )
      setLanguage(event.data.lang);
  });
  setLanguage(state.lang);
}
