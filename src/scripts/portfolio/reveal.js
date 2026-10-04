import { reducedMotion } from './media.js';

let observer;

/** Sections fade in the first time they scroll into view. */
export function initReveal() {
  if (!('IntersectionObserver' in window) || reducedMotion.matches) return;
  document.documentElement.classList.add('js-motion');
  observer = new IntersectionObserver(
    (entries) =>
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      }),
    { threshold: 0.06 },
  );
}

/** Starts watching elements added since the last call. */
export function observeReveals() {
  if (observer)
    document.querySelectorAll('.reveal:not(.visible)').forEach((el) => observer.observe(el));
}
