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

/** Expanding a <details> slides its content in. */
function initDetailsReveal() {
  document.querySelectorAll('details').forEach((details) => {
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
