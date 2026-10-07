import { t } from '../i18n.js';
import { highlight, sharedPieces } from './highlight.js';

function toNode(piece) {
  if (!piece.className) return document.createTextNode(piece.text);
  const span = document.createElement('span');
  span.className = piece.className;
  span.textContent = piece.text;
  return span;
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
  let shownPieces = [];

  // Called on every typing tick: the progress bar is only touched when its value changes.
  function paint(text, total) {
    const percent = Math.round(Math.min(1, text.length / Math.max(1, total)) * 100);
    if (percent !== shownPercent) {
      shownPercent = percent;
      progress.setAttribute('aria-valuenow', String(percent));
      progress.firstElementChild.style.transform = `scaleX(${percent / 100})`;
    }

    // Typing adds or removes a few characters at the end: keep the nodes that did not change.
    const pieces = highlight(text);
    const kept = sharedPieces(shownPieces, pieces);
    while (output.childNodes.length > kept) output.lastChild.remove();
    output.append(...pieces.slice(kept).map(toNode));
    shownPieces = pieces;
  }

  function setLanguageLabel(text) {
    if (languageLabel.textContent !== text) languageLabel.textContent = text;
  }

  function syncLanguage() {
    progress.setAttribute('aria-label', t('codeProgress'));
  }

  return { paint, setLanguageLabel, syncLanguage };
}
