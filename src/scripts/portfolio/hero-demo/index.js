import { onLanguageChange } from '../language.js';
import { MOTION_EVENT } from '../../shared/storage.js';
import { createCodeView } from './code-view.js';
import { createFrontendDemo } from './frontend.js';
import { heroDemo } from './state.js';

const START_DELAY = 1000;

/** The interactive code editor next to the hero headline. */
export function initHeroDemo() {
  const editor = document.querySelector('.code-window');
  const codeView = createCodeView(editor);
  setTimeout(() => {
    heroDemo.ready = true;
    heroDemo.codeDue = performance.now();
  }, START_DELAY);
  const frontend = createFrontendDemo(codeView);

  // Time spent paused does not count towards the next typing step.
  let pausedAt = null;
  window.addEventListener(MOTION_EVENT, (event) => {
    if (event.detail.paused) {
      pausedAt = performance.now();
    } else if (pausedAt !== null) {
      const elapsed = performance.now() - pausedAt;
      heroDemo.codeDue += elapsed;
      pausedAt = null;
    }
  });
  window.addEventListener(MOTION_EVENT, () => {
    if (heroDemo.mode === 'frontend') frontend.refreshPreview();
  });

  onLanguageChange(() => {
    frontend.syncLanguage();
    codeView.syncLanguage();
    codeView.setLanguageLabel(frontend.languageLabel());
  });
}
