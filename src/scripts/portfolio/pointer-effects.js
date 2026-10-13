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

/** Gentle ease in and out: the content grows and settles instead of snapping open. */
const DETAILS_EASING = 'cubic-bezier(.4,0,.2,1)';
/** Roughly one pixel per millisecond, never faster than the base time or slower than the limit. */
const DETAILS_MIN_DURATION = 620;
const DETAILS_MAX_DURATION = 1400;

/**
 * Opens or closes a <details> by growing its content from zero height (and back), so the card
 * gets taller gradually: the preview, which sits in the middle of the card, and everything
 * below move along with it instead of jumping.
 */
function slideDetails(details, content, opening) {
  details.dataset.moving = 'true';
  if (opening) {
    details.open = true;
    // Rows that fade and slide in on their own would trail behind the growing content: the
    // growth itself reveals them.
    content.querySelectorAll('.reveal:not(.visible)').forEach((row) => {
      row.style.transition = 'none';
      row.classList.add('visible');
    });
  }
  const style = getComputedStyle(content);
  content.style.overflow = 'hidden';
  const box =
    style.boxSizing === 'border-box'
      ? 0
      : parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
  const height = content.getBoundingClientRect().height - box;
  const closed = { height: '0px', opacity: 0, paddingTop: '0px', paddingBottom: '0px' };
  const open = {
    height: `${height}px`,
    opacity: 1,
    paddingTop: style.paddingTop,
    paddingBottom: style.paddingBottom,
  };
  const animation = content.animate(opening ? [closed, open] : [open, closed], {
    duration: Math.min(DETAILS_MAX_DURATION, Math.max(DETAILS_MIN_DURATION, height)),
    easing: DETAILS_EASING,
  });
  const done = () => {
    content.querySelectorAll('.reveal').forEach((row) => (row.style.transition = ''));
    content.style.overflow = '';
    if (!opening) details.open = false;
    delete details.dataset.moving;
  };
  animation.finished.then(done, done);
}

/** Expanding a <details> grows its content smoothly. */
function initDetailsReveal() {
  document.querySelectorAll('details').forEach((details) => {
    const summary = details.querySelector(':scope > summary');
    const content = details.querySelector('.case-content,#timeline');
    if (summary && content) {
      summary.addEventListener('click', (event) => {
        if (isMotionPaused()) return;
        event.preventDefault();
        if (details.dataset.moving) return;
        slideDetails(details, content, !details.open);
      });
    }
    details.addEventListener('toggle', () => {
      if (details.open) observeReveals();
    });
  });
}

export function initPointerEffects() {
  initCardTilt();
  initMagneticLinks();
  initDetailsReveal();
}
