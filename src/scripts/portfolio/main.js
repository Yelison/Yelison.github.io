import { initLanguage } from './language.js';
import { initReveal } from './reveal.js';

// Order matters: language renders the timeline that reveal observes.
initReveal();
initLanguage();
