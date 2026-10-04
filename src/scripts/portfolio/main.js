import { initLanguage, refreshLanguage } from './language.js';
import { initMotion } from './motion.js';
import { initPointerEffects } from './pointer-effects.js';
import { initProjectDemo } from './project-demo.js';
import { initReveal } from './reveal.js';
import { initScrollProgress } from './scroll-progress.js';
import { initTheme } from './theme.js';

// Order matters: language first (it renders the timeline that reveal observes),
// then the modules that subscribe to language changes.
initReveal();
initLanguage();
initScrollProgress();
initMotion();
initPointerEffects();
initProjectDemo();
initTheme();
refreshLanguage();
