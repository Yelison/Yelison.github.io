import { build, rememberBuild, showExisting, skipBuild } from './builder.js';
import { initDestroy } from './destroy.js';
import { initTraceLayer } from './drawing.js';
import { initLanguage } from './language.js';
import { state, ui } from './state.js';
import { STORAGE_KEYS, readStorage } from '../shared/storage.js';

initTraceLayer();
initLanguage();
ui.launch.addEventListener('click', build);
initDestroy();
ui.skip.addEventListener('click', skipBuild);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && state.running && !ui.consoleBox.hidden) skipBuild();
});
ui.launchScreen.querySelector('.direct-link').addEventListener('click', (event) => {
  event.preventDefault();
  skipBuild();
});

// Returning visitors who already watched the build go straight to the portfolio.
const alreadyBuilt =
  readStorage(STORAGE_KEYS.built) === '1' ||
  readStorage(STORAGE_KEYS.built, sessionStorage) === '1';
if (alreadyBuilt) {
  rememberBuild();
  showExisting();
}
