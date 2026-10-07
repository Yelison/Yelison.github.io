import { t } from '../i18n.js';
import { onLanguageChange } from '../language.js';
import { MOTION_EVENT } from '../../shared/storage.js';
import { createBackendDemo } from './backend.js';
import { createCodeView } from './code-view.js';
import { createFrontendDemo } from './frontend.js';
import { heroDemo } from './state.js';

const START_DELAY = 1000;

/** The interactive code editor next to the hero headline. */
export function initHeroDemo() {
  const editor = document.querySelector('.code-window');
  new IntersectionObserver(([entry]) => {
    heroDemo.onScreen = entry.isIntersecting;
  }).observe(document.querySelector('.hero'));
  const codeView = createCodeView(editor);
  setTimeout(() => {
    heroDemo.ready = true;
    heroDemo.codeDue = performance.now();
  }, START_DELAY);
  const frontend = createFrontendDemo(codeView);
  const backend = createBackendDemo({ editor, codeView, frontend });

  // Time spent paused does not count towards the next typing step.
  let pausedAt = null;
  window.addEventListener(MOTION_EVENT, (event) => {
    if (event.detail.paused) {
      pausedAt = performance.now();
    } else if (pausedAt !== null) {
      const elapsed = performance.now() - pausedAt;
      heroDemo.codeDue += elapsed;
      heroDemo.apiDue += elapsed;
      pausedAt = null;
      backend.resume();
    }
  });
  window.addEventListener(MOTION_EVENT, () => {
    if (heroDemo.mode === 'frontend') frontend.refreshPreview();
  });

  onLanguageChange(() => {
    frontend.syncLanguage();
    codeView.syncLanguage();
    codeView.setLanguageLabel(
      heroDemo.mode === 'backend' ? t('codeLanguageApi') : frontend.languageLabel(),
    );
    backend.syncLanguage();
  });
}
