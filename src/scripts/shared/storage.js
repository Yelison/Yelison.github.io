/**
 * Names shared by the launcher (index.html) and the portfolio page, which talk to
 * each other through localStorage, window events and postMessage.
 */
export const STORAGE_KEYS = {
  language: 'portfolio-language',
  theme: 'portfolio-theme',
  built: 'portfolio-built-v1',
};

/** Dispatched on the portfolio window when animations are paused or resumed. */
export const MOTION_EVENT = 'portfolio-motion';

/** postMessage type the portfolio sends to the launcher when the language changes. */
export const LANGUAGE_MESSAGE = 'portfolio-language';

export const LANGUAGES = ['en', 'es'];

export const isLanguage = (value) => LANGUAGES.includes(value);

// Storage can throw (private mode, disabled cookies); the site must keep working without it.
export function readStorage(key, storage = localStorage) {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key, value, storage = localStorage) {
  try {
    storage.setItem(key, value);
  } catch {
    // Ignore: preferences simply won't persist.
  }
}

export function removeStorage(key, storage = localStorage) {
  try {
    storage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export const storedTheme = () => (readStorage(STORAGE_KEYS.theme) === 'light' ? 'light' : 'dark');
