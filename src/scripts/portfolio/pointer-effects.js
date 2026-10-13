import { finePointer } from './media.js';
import { isMotionPaused } from './motion.js';
import { observeReveals } from './reveal.js';

const canFollowPointer = () => !isMotionPaused() && finePointer.matches;

/** Project cards tilt slightly towards the pointer. */
function initCardTilt() {
  document.querySelectorAll('.project:not(.project-feature)').forEach((card) => {
    let frame;
    card.addEventListener('pointermove', (event) => {
      if (!canFollowPointer()) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const box = card.getBoundingClientRect();
        const x = (event.clientX - box.left) / box.width - 0.5;
        const y = (event.clientY - box.top) / box.height - 0.5;
        card.style.setProperty('--rx', -y * 5 + 'deg');
        card.style.setProperty('--ry', x * 6 + 'deg');
        card.style.setProperty('--px', x * 14 + 'px');
        card.style.setProperty('--py', y * 14 + 'px');
      });
    });
    card.addEventListener('pointerleave', () => {
      cancelAnimationFrame(frame);
      ['--rx', '--ry', '--px', '--py'].forEach((property) => card.style.setProperty(property, '0'));
    });
  });
}

/** Hero links are pulled a few pixels towards the pointer. */
function initMagneticLinks() {
  document.querySelectorAll('.hero-links a').forEach((link) => {
    link.addEventListener('pointermove', (event) => {
      if (!canFollowPointer()) return;
      const box = link.getBoundingClientRect();
      const x = (event.clientX - box.left - box.width / 2) * 0.12;
      const y = (event.clientY - box.top - box.height / 2) * 0.2;
      link.style.transform = `translate(${x}px,${y}px)`;
    });
    link.addEventListener('pointerleave', () => (link.style.transform = ''));
  });
}

/**
 * The preview of a project sits in the vertical middle of its card, so opening or closing the
 * text under the description moves it. It slides from where it was instead of jumping.
 */
function initPreviewSlide(details) {
  const visual = details.closest('.project')?.querySelector('.project-visual');
  const summary = details.querySelector(':scope > summary');
  if (!visual || !summary) return;
  summary.addEventListener('click', () => {
    if (isMotionPaused()) return;
    const before = visual.getBoundingClientRect().top;
    // The attribute changes right after the click; measure on the next frame, before it paints.
    requestAnimationFrame(() => {
      const shift = before - visual.getBoundingClientRect().top;
      if (Math.abs(shift) < 1) return;
      visual.animate([{ transform: `translateY(${shift}px)` }, { transform: 'translateY(0)' }], {
        duration: 420,
        easing: 'cubic-bezier(.22,1,.36,1)',
      });
    });
  });
}

/** Expanding a <details> slides its content in. */
function initDetailsReveal() {
  document.querySelectorAll('details').forEach((details) => {
    initPreviewSlide(details);
    details.addEventListener('toggle', () => {
      if (!details.open || isMotionPaused()) return;
      const content = details.querySelector('.case-content,#timeline');
      if (content) {
        content.animate(
          [
            { opacity: 0, transform: 'translateY(-8px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ],
          { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' },
        );
      }
      observeReveals();
    });
  });
}

export function initPointerEffects() {
  initCardTilt();
  initMagneticLinks();
  initDetailsReveal();
}
