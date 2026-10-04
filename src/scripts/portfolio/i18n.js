// Generated at build time from the English markup, src/i18n/*.json and content/.
import dictionaries from 'virtual:i18n';

export const currentLanguage = () => (document.documentElement.lang === 'es' ? 'es' : 'en');

/** Translates a message key, replacing `{name}` style placeholders. */
export function t(key, params = {}, language = currentLanguage()) {
  const message = dictionaries[language][key] ?? dictionaries.en[key];
  if (message === undefined) throw new Error(`Missing translation: ${key}`);
  return message.replace(/\{(\w+)\}/g, (match, name) => params[name] ?? match);
}

export { dictionaries };
