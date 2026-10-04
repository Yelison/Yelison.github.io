import { initLanguage, refreshLanguage } from './language.js';
import { initReveal } from './reveal.js';
import { initTheme } from './theme.js';

// Order matters: language first (it renders the timeline that reveal observes),
// then the modules that subscribe to language changes.
initReveal();
initLanguage();
initTheme();
refreshLanguage();
