import { traceLayer } from './drawing.js';
import {
  requiredDestroyWord,
  restoreSavedLanguage,
  showLaunchHint,
  syncBootTheme,
  text,
} from './language.js';
import { reduceMotion, state, ui } from './state.js';
import { MOTION_EVENT, STORAGE_KEYS, readStorage, removeStorage } from '../shared/storage.js';

const DURATION = 4800;
const PIECES =
  'header,.hero-top,.hero-content,.code-window,.hero-note,.tech-row,.section-heading,.project,.all-projects,.experience-top,.career-details,.contact,footer';

const random = (min, max) => min + Math.random() * (max - min);

const inViewport = (rect, win) =>
  rect.width && rect.height && rect.bottom > 0 && rect.top < win.innerHeight;

/** Visible blocks of the page, top-level only, the header last. */
function collectPieces(doc, win) {
  const candidates = [...doc.querySelectorAll(PIECES)];
  // Include visible text anywhere in the page, including labels and standalone links.
  const allText = doc.createTreeWalker(doc.body, win.NodeFilter.SHOW_TEXT);
  let node;
  while ((node = allText.nextNode())) {
    const parent = node.parentElement;
    if (
      !node.textContent.trim() ||
      parent.closest('script,style,[hidden],.sr-only,.skip,dialog:not([open])') ||
      candidates.some((el) => el.contains(parent))
    )
      continue;
    const range = doc.createRange();
    range.selectNodeContents(node);
    if (inViewport(range.getBoundingClientRect(), win)) candidates.push(parent);
  }
  return candidates
    .filter((el) => {
      const rect = el.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < win.innerHeight;
    })
    .filter((el, i, all) => !all.some((other) => other !== el && other.contains(el)))
    .sort((a, b) =>
      a.matches('header')
        ? 1
        : b.matches('header')
          ? -1
          : b.getBoundingClientRect().top - a.getBoundingClientRect().top,
    );
}

/** Text runs erased from the end, one piece after another. */
function collectTextRuns(pieces, doc, win) {
  const runs = [];
  pieces.forEach((el, i) => {
    const walker = doc.createTreeWalker(el, win.NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      if (!node.textContent.trim() || node.parentElement.closest('script,style,[hidden]')) continue;
      const range = doc.createRange();
      range.selectNodeContents(node);
      if (inViewport(range.getBoundingClientRect(), win)) {
        runs.push({
          text: node,
          length: node.length,
          start: el.matches('header')
            ? 3200
            : 400 + (i / Math.max(1, pieces.length - 1)) * 1600 + random(0, 200),
        });
      }
    }
  });
  return runs;
}

/** Each piece dissolves cell by cell through an SVG mask, from its edges inwards. */
function createDissolveTracks(pieces) {
  return pieces.map((el, i) => {
    const rect = el.getBoundingClientRect();
    const delay = el.matches('header') ? 3500 : 1400 + (i / Math.max(1, pieces.length - 1)) * 1400;
    const columns = Math.min(36, Math.max(6, Math.ceil(rect.width / 24)));
    const rows = Math.min(18, Math.max(3, Math.ceil(rect.height / 24)));
    const cellWidth = rect.width / columns;
    const cellHeight = rect.height / rows;
    const cells = [];
    for (let y = 0; y < rows; y++)
      for (let x = 0; x < columns; x++) {
        const edgeDistance = Math.min(
          x / (columns / 2),
          y / (rows / 2),
          (columns - 1 - x) / (columns / 2),
          (rows - 1 - y) / (rows / 2),
        );
        cells.push({
          x: x * cellWidth,
          y: y * cellHeight,
          start: delay + edgeDistance * 450 + random(0, 500),
        });
      }
    el.style.maskRepeat = 'no-repeat';
    el.style.webkitMaskRepeat = 'no-repeat';
    return { el, rect, cellWidth, cellHeight, cells, lastStep: -1 };
  });
}

function paintDissolve(track, elapsed) {
  const step = Math.floor(elapsed / 40);
  if (step === track.lastStep) return;
  track.lastStep = step;
  if (elapsed < Math.min(...track.cells.map((cell) => cell.start))) return;
  const rects = track.cells
    .map((cell) => {
      const opacity = 1 - Math.min(1, Math.max(0, (elapsed - cell.start) / 280));
      return opacity > 0
        ? `<rect x="${cell.x}" y="${cell.y}" width="${track.cellWidth + 1}" height="${track.cellHeight + 1}" fill="white" opacity="${opacity.toFixed(2)}"/>`
        : '';
    })
    .join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${track.rect.width}" height="${track.rect.height}" viewBox="0 0 ${track.rect.width} ${track.rect.height}">${rects}</svg>`;
  const mask = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
  track.el.style.maskImage = mask;
  track.el.style.webkitMaskImage = mask;
}

const SCROLL_KEYS = new Set([
  ' ',
  'PageUp',
  'PageDown',
  'Home',
  'End',
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
]);

/** Keeps the page where it is while it is taken apart, so no intact section scrolls into view. */
function lockScroll(win) {
  const top = win.scrollY;
  const left = win.scrollX;
  const block = (event) => event.preventDefault();
  win.addEventListener('wheel', block, { passive: false, capture: true });
  win.addEventListener('touchmove', block, { passive: false, capture: true });
  win.addEventListener('keydown', (event) => SCROLL_KEYS.has(event.key) && event.preventDefault(), {
    capture: true,
  });
  // Anything else that still moves the page (dragging the scrollbar, autoscroll) is undone.
  win.addEventListener('scroll', () => {
    if (win.scrollY !== top || win.scrollX !== left)
      win.scrollTo({ top, left, behavior: 'instant' });
  });
}

const SCROLLBAR_ARROW = 12;
const SCROLLBAR_CELL = { width: 5, height: 10 };

/**
 * The native scrollbar cannot be masked, so it is swapped for an identical replica
 * in the launcher (same size, colors, arrows and thumb position) that dissolves cell
 * by cell from the bottom up, just before the header. Returns null for overlay
 * scrollbars (mobile), which take no space and fade with the page.
 */
function createScrollbarTrack(frame, win, doc) {
  const root = doc.documentElement;
  const width = win.innerWidth - root.clientWidth;
  const colors = win.getComputedStyle(root).scrollbarColor?.match(/rgba?\([^)]*\)/g);
  if (width <= 0 || !colors || colors.length < 2) return null;
  const frameBox = frame.getBoundingClientRect();
  const height = root.clientHeight;
  const trackLength = height - 2 * SCROLLBAR_ARROW;
  const thumbLength = Math.round((trackLength * height) / root.scrollHeight);
  const maxScroll = root.scrollHeight - height;
  const thumbTop =
    SCROLLBAR_ARROW +
    Math.round((trackLength - thumbLength) * (maxScroll > 0 ? win.scrollY / maxScroll : 0));

  const bar = document.createElement('div');
  bar.className = 'destroy-scrollbar';
  bar.setAttribute('aria-hidden', 'true');
  Object.assign(bar.style, {
    left: `${frameBox.left + root.clientWidth}px`,
    top: `${frameBox.top}px`,
    width: `${width}px`,
    height: `${height}px`,
    background: colors[1],
    color: colors[0],
  });
  // Pixel-stepped arrows, like the native ones (a CSS triangle would be antialiased).
  const arrow = (direction, path) =>
    `<svg class="destroy-scrollbar-arrow ${direction}" viewBox="0 0 6 3" shape-rendering="crispEdges"><path d="${path}"/></svg>`;
  bar.innerHTML =
    arrow('up', 'M2 0H4V1H5V2H6V3H0V2H1V1H2Z') +
    '<i class="destroy-scrollbar-thumb"></i>' +
    arrow('down', 'M0 0H6V1H5V2H4V3H2V2H1V1H0Z');
  Object.assign(bar.querySelector('.destroy-scrollbar-thumb').style, {
    top: `${thumbTop}px`,
    height: `${thumbLength}px`,
  });
  document.body.append(bar);
  // The native scrollbar keeps its width (so nothing reflows) but is no longer painted.
  root.style.scrollbarColor = 'transparent transparent';

  const columns = Math.max(1, Math.round(width / SCROLLBAR_CELL.width));
  const rows = Math.ceil(height / SCROLLBAR_CELL.height);
  const cellWidth = width / columns;
  const cellHeight = height / rows;
  const cells = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const fromBottom = 1 - y / Math.max(1, rows - 1);
      cells.push({
        x: x * cellWidth,
        y: y * cellHeight,
        start: 3000 + fromBottom * 700 + random(0, 350),
      });
    }
  bar.style.maskRepeat = 'no-repeat';
  bar.style.webkitMaskRepeat = 'no-repeat';
  return { el: bar, rect: { width, height }, cellWidth, cellHeight, cells, lastStep: -1 };
}

function terminalStep(elapsed) {
  const steps = text('destroySteps');
  if (elapsed < 1100) return steps[0];
  if (elapsed < 3200) return steps[1];
  if (elapsed < 4600) return steps[2];
  return steps[3];
}

/** Takes the page apart piece by piece while a terminal line narrates it. */
async function animateDestruction(frame, doc) {
  doc.documentElement.style.pointerEvents = 'none';
  const win = frame.contentWindow;
  lockScroll(win);
  doc.documentElement.classList.add('motion-paused');
  win.dispatchEvent(new win.CustomEvent(MOTION_EVENT, { detail: { paused: true } }));
  // Bring the page background to the launch screen color during the destruction.
  [doc.documentElement, doc.body].forEach((surface) =>
    surface.animate(
      [
        { backgroundColor: win.getComputedStyle(surface).backgroundColor },
        { backgroundColor: '#050505' },
      ],
      {
        duration: 4400,
        easing: 'ease-in-out',
        fill: 'forwards',
      },
    ),
  );
  doc.querySelectorAll('canvas.interactive-dots,.scroll-progress').forEach((surface) =>
    surface.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 1600,
      delay: 300,
      easing: 'ease-out',
      fill: 'forwards',
    }),
  );

  const pieces = collectPieces(doc, win);
  const terminal = document.createElement('div');
  terminal.className = 'destroy-terminal';
  terminal.setAttribute('role', 'status');
  terminal.textContent = terminalStep(0);
  document.body.append(terminal);

  const highlightStyle = doc.createElement('style');
  highlightStyle.textContent = '::highlight(destroy-erased){color:transparent;text-shadow:none}';
  doc.head.append(highlightStyle);
  const textRuns = collectTextRuns(pieces, doc, win);
  const erased = win.CSS?.highlights && win.Highlight ? new win.Highlight() : null;
  if (erased) win.CSS.highlights.set('destroy-erased', erased);
  const tracks = createDissolveTracks(pieces);
  const scrollbar = createScrollbarTrack(frame, win, doc);
  if (scrollbar) tracks.push(scrollbar);

  const start = performance.now();
  await new Promise((resolve) => {
    function tick(now) {
      const elapsed = now - start;
      tracks.forEach((track) => paintDissolve(track, elapsed));
      if (erased) {
        erased.clear();
        textRuns.forEach(({ text: node, length, start: runStart }) => {
          const progress = Math.min(1, Math.max(0, (elapsed - runStart) / 1000));
          if (!progress) return;
          const range = doc.createRange();
          range.setStart(node, Math.floor(length * (1 - progress)));
          range.setEnd(node, length);
          erased.add(range);
        });
      }
      terminal.textContent = terminalStep(elapsed);
      if (elapsed < DURATION) requestAnimationFrame(tick);
      else resolve();
    }
    requestAnimationFrame(tick);
  });
  await frame.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' })
    .finished;
  terminal.remove();
  scrollbar?.el.remove();
}

/** Returns to the launch screen so the portfolio can be built again. */
async function returnToLaunchScreen() {
  ++state.run;
  state.drawingObserver?.disconnect();
  traceLayer.replaceChildren();
  document.querySelectorAll('.destroy-terminal,.destroy-scrollbar').forEach((el) => el.remove());
  ui.stage.replaceChildren();
  state.frame = null;
  state.doc = null;
  state.data = undefined;
  state.skipped = false;
  removeStorage(STORAGE_KEYS.built);
  removeStorage(STORAGE_KEYS.built, sessionStorage);
  ui.launchScreen.hidden = false;
  syncBootTheme();
  showLaunchHint();
  if (!reduceMotion.matches) {
    const entrance = ui.launchScreen.animate([{ opacity: 0 }, { opacity: 1 }], {
      duration: 650,
      easing: 'ease-out',
    });
    ui.launch.animate(
      [
        { opacity: 0, transform: 'translateY(12px) scale(.95)' },
        { opacity: 1, transform: 'translateY(0) scale(1)' },
      ],
      { duration: 700, delay: 100, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' },
    );
    await entrance.finished.catch(() => {});
  }
  state.running = false;
  ui.launch.focus({ preventScroll: true });
}

async function destroy() {
  if (state.running || !state.frame) return;
  state.running = true;
  ui.replay.hidden = true;
  ui.consoleBox.hidden = true;
  const frame = state.frame;
  const doc = frame.contentDocument;
  restoreSavedLanguage(readStorage(STORAGE_KEYS.language));
  try {
    if (doc && !reduceMotion.matches && !doc.documentElement.classList.contains('motion-paused')) {
      await animateDestruction(frame, doc);
    }
  } finally {
    await returnToLaunchScreen();
  }
}

/** The "Destroy" button asks the visitor to type a confirmation word first. */
export function initDestroy() {
  const { destroyDialog, destroyInput, destroyConfirm } = ui;
  const confirmed = () => destroyInput.value.trim().toLowerCase() === requiredDestroyWord();
  ui.replay.addEventListener('click', () => {
    if (state.running || !state.frame) return;
    restoreSavedLanguage(readStorage(STORAGE_KEYS.language));
    syncBootTheme();
    destroyInput.value = '';
    destroyConfirm.disabled = true;
    destroyDialog.showModal();
    destroyInput.focus();
  });
  destroyInput.addEventListener('input', () => {
    destroyConfirm.disabled = !confirmed();
  });
  ui.destroyCancel.addEventListener('click', () => destroyDialog.close());
  destroyDialog.addEventListener('close', () => {
    if (!state.running) ui.replay.focus({ preventScroll: true });
  });
  ui.destroyForm.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!confirmed()) return;
    destroyDialog.close();
    destroy().catch(() => {});
  });
}
