import { t } from '../i18n.js';

const TOKEN_PATTERN =
  /(\/\/[^\n]*|'[^']*'|"[^"]*"|\b(?:type|export|function|return|const|import|from|string|color|background|border-radius|letter-spacing|headline|accent|message)\b|#[a-fA-F0-9]{6}|\b\d+\b)/g;

function tokenClass(token) {
  if (token.startsWith("'") || token.startsWith('"')) return 'code-string';
  if (/^\d|^#/.test(token)) return 'code-number';
  return 'code-keyword';
}

/** The editor surface: syntax-highlighted code, a language label and a progress bar. */
export function createCodeView(editor) {
  const output = document.getElementById('typed-code');
  const languageLabel = document.getElementById('code-language');
  const progress = document.createElement('div');
  progress.className = 'code-progress';
  progress.setAttribute('role', 'progressbar');
  progress.setAttribute('aria-valuemin', '0');
  progress.setAttribute('aria-valuemax', '100');
  progress.setAttribute('aria-label', t('codeProgress'));
  progress.innerHTML = '<span class="code-progress-fill"></span>';
  editor.append(progress);
  let shownPercent;

  // Called on every typing tick: the progress bar is only touched when its value changes.
  function paint(text, total) {
    const percent = Math.round(Math.min(1, text.length / Math.max(1, total)) * 100);
    if (percent !== shownPercent) {
      shownPercent = percent;
      progress.setAttribute('aria-valuenow', String(percent));
      progress.firstElementChild.style.transform = `scaleX(${percent / 100})`;
    }

    const fragment = document.createDocumentFragment();
    let previous = 0;
    for (const match of text.matchAll(TOKEN_PATTERN)) {
      fragment.append(document.createTextNode(text.slice(previous, match.index)));
      const span = document.createElement('span');
      span.className = tokenClass(match[0]);
      span.textContent = match[0];
      fragment.append(span);
      previous = match.index + match[0].length;
    }
    fragment.append(document.createTextNode(text.slice(previous)));
    output.replaceChildren(fragment);
  }

  function setLanguageLabel(text) {
    if (languageLabel.textContent !== text) languageLabel.textContent = text;
  }

  function syncLanguage() {
    progress.setAttribute('aria-label', t('codeProgress'));
  }

  return { paint, setLanguageLabel, syncLanguage };
}
