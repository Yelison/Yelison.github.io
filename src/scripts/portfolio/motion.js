import { t } from './i18n.js';
import { onLanguageChange } from './language.js';
import { reducedMotion } from './media.js';
import { MOTION_EVENT } from '../shared/storage.js';

let paused = reducedMotion.matches;
const heldAnimations = new Set();

export const isMotionPaused = () => paused;

/** Freezes every running animation in place, or resumes the ones it froze. */
function holdAnimations(hold) {
  if (hold) {
    for (const animation of document.getAnimations()) {
      if (animation.playState === 'running') {
        heldAnimations.add(animation);
        animation.pause();
      }
    }
    return;
  }
  for (const animation of heldAnimations) if (animation.playState === 'paused') animation.play();
  heldAnimations.clear();
}

function syncMotionLabel() {
  const button = document.querySelector('.motion-toggle');
  button.setAttribute('aria-label', t(paused ? 'motionResume' : 'motionPause'));
  button.setAttribute('aria-pressed', String(paused));
  button.textContent = paused ? '▷' : 'Ⅱ';
}

function applyMotion() {
  holdAnimations(paused);
  document.documentElement.classList.toggle('motion-paused', paused);
  syncMotionLabel();
  window.dispatchEvent(new CustomEvent(MOTION_EVENT, { detail: { paused } }));
}

export function initMotion() {
  document.querySelector('.motion-toggle').addEventListener('click', () => {
    paused = !paused;
    applyMotion();
  });
  applyMotion();
  reducedMotion.addEventListener('change', (event) => {
    paused = event.matches;
    applyMotion();
  });
  onLanguageChange(syncMotionLabel);
}
