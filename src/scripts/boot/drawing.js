import liveBuildStyles from '../../styles/live-build.css';
import { reduceMotion, state } from './state.js';

const SVG = 'http://www.w3.org/2000/svg';
/** Text runs waiting or revealing at once; further ones simply appear. */
const MAX_GLOWING_RUNS = 400;
/** The reveal front moves this many ms per character, and never takes longer than the maximum. */
const REVEAL_PER_CHARACTER = 50;
const REVEAL_MAX = 800;
const REVEAL_MIN = 10;
/** Backlog (ms) at which the reveal runs at half speed, so it never falls far behind the code. */
const REVEAL_LAG = 150;
const GLOW_COLOR = '8,232,222';
/** How long each band of the glow trail lasts, and the whole trail. */
const GLOW_STEP = 160;
/** [% of the glow color mixed into the text, glow blur in px, glow alpha], freshest first. */
const GLOW_BANDS = [
  [100, 8, 0.65],
  [65, 6, 0.45],
  [35, 3, 0.25],
  [12, 0, 0],
];
const GLOW_TRAIL = GLOW_STEP * GLOW_BANDS.length;

/** Overlay in the launcher where element borders are traced while the page is written. */
export const traceLayer = document.createElement('div');
traceLayer.id = 'build-traces';
traceLayer.setAttribute('aria-hidden', 'true');

export function initTraceLayer() {
  document.body.append(traceLayer);
}

/**
 * True when the element is actually rendered (not in a closed details/dialog, not hidden).
 * checkVisibility() answers in one native call; walking the ancestors with getComputedStyle
 * forced a style recalculation after every node written into the iframe. Browsers without
 * it (Safari before 17.4, for example) fall back to the walk, since the build effects
 * would otherwise never run.
 */
function isBuildVisible(el) {
  if (!el) return false;
  if (typeof el.checkVisibility === 'function') {
    return el.checkVisibility({ contentVisibilityAuto: true, visibilityProperty: true });
  }
  if (el.closest('[hidden]')) return false;
  for (let parent = el; parent; parent = parent.parentElement) {
    if (parent.tagName === 'DETAILS' && !parent.open && parent !== el) {
      const summary = parent.querySelector(':scope > summary');
      if (!summary?.contains(el)) return false;
    }
    if (parent.tagName === 'DIALOG' && !parent.open) return false;
    const style = state.frame.contentWindow.getComputedStyle(parent);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.contentVisibility === 'hidden'
    )
      return false;
  }
  return true;
}

function visibleBorders(style) {
  return ['Top', 'Right', 'Bottom', 'Left'].map((side) => {
    const color = style[`border${side}Color`];
    return (
      parseFloat(style[`border${side}Width`]) > 0 &&
      !['none', 'hidden'].includes(style[`border${side}Style`]) &&
      color !== 'transparent' &&
      !/rgba\([^)]*,\s*0\s*\)/.test(color)
    );
  });
}

/** Clips a trace to the visible part of a marquee row of the toolkit. */
function clipToToolkitRow(svg, row, box) {
  const left = Math.max(0, row.left);
  const right = Math.min(state.frame.contentWindow.innerWidth, row.right);
  svg.style.clipPath = `inset(${Math.max(0, row.top - box.top)}px ${Math.max(0, box.right - right)}px ${Math.max(0, box.bottom - row.bottom)}px ${Math.max(0, left - box.left)}px)`;
  svg.style.maskImage = 'linear-gradient(to right,transparent,#000 7%,#000 93%,transparent)';
  svg.style.maskSize = `${row.width}px ${row.height}px`;
  svg.style.maskPosition = `${row.left - box.left}px ${row.top - box.top}px`;
  svg.style.maskRepeat = 'no-repeat';
}

/** Containers big enough for a one-frame flash of their real border to be noticed. */
const BIG_CONTAINERS = '.project,.project-visual,.code-window,details';

function createTracer() {
  const traced = new WeakSet();

  /**
   * Draws the element's border as an SVG stroke, then fades its background in. `delay` holds
   * the drawing back until the text inside is about to be revealed, so box and text appear together.
   */
  return function trace(el, delay = 0) {
    if (state.skipped || reduceMotion.matches || traced.has(el)) return;
    // The parts of a preview panel (bar, screen, footer) appear together with the panel.
    if (el.parentElement?.closest('.project-visual')) return;
    const small = el.matches('header,.letter-tiles span,.button,.tech-badge');
    const duration = small ? 180 : 360;
    // The real border and background are only hidden from the next frame on, which let a big
    // container flash for one frame before it was drawn. These are hidden at once instead,
    // and shown again below if it turns out there is nothing to draw.
    const hiddenAtOnce = el.matches(BIG_CONTAINERS);
    if (hiddenAtOnce) el.classList.add('trace-building');
    // A container is written empty, so its size is not known yet: keep trying for a while.
    let attempts = 0;
    const attempt = () => {
      // An element can be traced twice (as part of its parent and on its own): the second call
      // finds it already in progress and must not show the border the first one is hiding.
      const result = drawTrace();
      if (result === true || traced.has(el)) return;
      if (result === 'retry' && attempts++ < 90 && el.isConnected && !state.skipped) {
        requestAnimationFrame(attempt);
        return;
      }
      if (hiddenAtOnce) {
        el.classList.remove('trace-building');
        requestAnimationFrame(() => (el.style.transition = ''));
      }
    };
    requestAnimationFrame(attempt);
    const drawTrace = () => {
      if (!el.isConnected || state.skipped) return false;
      // Not rendered yet (a <details> without its <summary>, for example): try again shortly.
      if (!isBuildVisible(el)) return hiddenAtOnce ? 'retry' : false;
      if (traced.has(el)) return false;
      // The border has to be measured as the page styles it, not as hidden by the class
      // added above; the class goes back on below, within the same frame.
      if (hiddenAtOnce) {
        el.style.transition = 'none';
        el.classList.remove('trace-building');
      }
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) {
        if (!hiddenAtOnce) return false;
        el.classList.add('trace-building');
        el.style.transition = '';
        return 'retry';
      }
      const toolkitRow = el.closest('.tech-row');
      if (toolkitRow) {
        const row = toolkitRow.getBoundingClientRect();
        const left = Math.max(0, row.left);
        const right = Math.min(state.frame.contentWindow.innerWidth, row.right);
        if (box.right <= left || box.left >= right) return;
      }
      const style = state.frame.contentWindow.getComputedStyle(el);
      const sides = visibleBorders(style);
      if (!sides.some(Boolean) || traced.has(el)) return;
      traced.add(el);

      const fullBorder = sides.every(Boolean);
      const background = style.backgroundColor;
      const svg = document.createElementNS(SVG, 'svg');
      const path = document.createElementNS(SVG, fullBorder ? 'rect' : 'path');
      svg.setAttribute('viewBox', `0 0 ${box.width} ${box.height}`);
      const setGeometry = (width, height) => {
        const w = Math.max(1, width - 2);
        const h = Math.max(1, height - 2);
        if (fullBorder) {
          path.setAttribute('x', '1');
          path.setAttribute('y', '1');
          path.setAttribute('width', String(w));
          path.setAttribute('height', String(h));
          path.setAttribute('rx', String(parseFloat(style.borderRadius) || 0));
        } else {
          const lines = [
            `M1 1 H${w + 1}`,
            `M${w + 1} 1 V${h + 1}`,
            `M${w + 1} ${h + 1} H1`,
            `M1 ${h + 1} V1`,
          ];
          path.setAttribute('d', lines.filter((line, i) => sides[i]).join(' '));
        }
      };
      setGeometry(box.width, box.height);
      path.setAttribute('pathLength', '1');
      svg.append(path);
      traceLayer.append(svg);
      el.classList.add('trace-building');
      el.style.transition = '';
      state.holdUntil = Math.max(state.holdUntil, performance.now() + (small ? 0 : 50));

      // Keep the overlay glued to the element while the iframe scrolls.
      const update = () => {
        if (!el.isConnected) return;
        const current = el.getBoundingClientRect();
        svg.style.left = current.left + 'px';
        svg.style.top = current.top + 'px';
        svg.style.width = current.width + 'px';
        svg.style.height = current.height + 'px';
        svg.setAttribute('viewBox', `0 0 ${current.width} ${current.height}`);
        setGeometry(current.width, current.height);
        if (toolkitRow) clipToToolkitRow(svg, toolkitRow.getBoundingClientRect(), current);
      };
      let tracking;
      const track = () => {
        update();
        tracking = requestAnimationFrame(track);
      };
      const stopTracking = () => {
        cancelAnimationFrame(tracking);
        state.frame.contentWindow.removeEventListener('scroll', update);
      };
      state.frame.contentWindow.addEventListener('scroll', update, { passive: true });
      track();

      const animation = path.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], {
        duration,
        delay,
        easing: 'cubic-bezier(.25,.1,.25,1)',
        fill: 'both',
      });
      animation.finished
        .then(() => {
          el.classList.remove('trace-building');
          el.animate([{ backgroundColor: 'transparent' }, { backgroundColor: background }], {
            duration: 450,
            easing: 'ease-out',
          });
          const fade = svg.animate([{ opacity: 1 }, { opacity: 0 }], {
            duration: 350,
            fill: 'forwards',
          });
          const finish = () => {
            stopTracking();
            svg.remove();
          };
          fade.finished.then(finish).catch(finish);
        })
        .catch(() => {
          stopTracking();
          el.classList.remove('trace-building');
          svg.remove();
        });
      return true;
    };
  };
}

/**
 * Newly written text is revealed from left to right while a cyan glow trails behind the
 * reveal front and fades out (CSS Custom Highlight API). Every frame only moves the
 * boundaries of a few ranges: the rules below are written once, so the iframe is not
 * restyled each frame.
 */
function createGlow() {
  const { doc, frame } = state;
  const letterLengths = new WeakMap();
  const highlights = frame.contentWindow.CSS?.highlights;
  const HighlightClass = frame.contentWindow.Highlight;
  const glowStyle = doc.createElement('style');
  doc.head.append(glowStyle);
  // The text under the reveal is hidden by one shared highlight. The trail behind it needs
  // the text's own color to fade into (currentcolor does not resolve inside a highlight),
  // so each distinct color gets its own set of bands, created the first time it is seen.
  const hiddenLayer = new HighlightClass();
  highlights.set('build-hidden', hiddenLayer);
  glowStyle.textContent = '::highlight(build-hidden){color:transparent;text-shadow:none}';
  const trails = new Map();
  const trailFor = (color) => {
    let trail = trails.get(color);
    if (!trail) {
      const id = trails.size;
      trail = GLOW_BANDS.map(([mix, blur, alpha], i) => {
        const name = `build-trail-${id}-${i}`;
        const highlight = new HighlightClass();
        highlights.set(name, highlight);
        glowStyle.append(
          `::highlight(${name}){color:color-mix(in srgb,rgb(${GLOW_COLOR}) ${mix}%,${color});text-shadow:0 0 ${blur}px rgba(${GLOW_COLOR},${alpha})}`,
        );
        return highlight;
      });
      trails.set(color, trail);
    }
    return trail;
  };
  const colors = new WeakMap();
  const colorOf = (element) => {
    let color = colors.get(element);
    if (!color) {
      color = frame.contentWindow.getComputedStyle(element).color;
      colors.set(element, color);
    }
    return color;
  };
  const runs = new Set();
  // One reveal front walks the page in reading order: each run starts when the previous ends.
  let revealCursor = 0;
  let animationFrame;

  const finish = (run) => {
    run.layers.forEach((layer, i) => layer.delete(run.ranges[i]));
    runs.delete(run);
  };

  const paint = () => {
    const now = performance.now();
    for (const run of runs) {
      const elapsed = now - run.started;
      if (!run.node.isConnected || state.skipped || elapsed >= run.duration + GLOW_TRAIL) {
        finish(run);
        continue;
      }
      if (elapsed < 0) continue;
      // First character that has not been revealed yet, `age` ms ago.
      const front = (age) =>
        run.start +
        Math.floor(Math.min(1, Math.max(0, (elapsed - age) / run.duration)) * run.length);
      const edges = [front(0), ...GLOW_BANDS.map((band, i) => front((i + 1) * GLOW_STEP))];
      run.ranges[0].setStart(run.node, edges[0]);
      run.ranges[0].setEnd(run.node, run.end);
      GLOW_BANDS.forEach((band, i) => {
        run.ranges[i + 1].setStart(run.node, edges[i + 1]);
        run.ranges[i + 1].setEnd(run.node, edges[i]);
      });
    }
    animationFrame = runs.size ? requestAnimationFrame(paint) : null;
  };

  function glowText(node) {
    if (
      !highlights ||
      !HighlightClass ||
      state.skipped ||
      reduceMotion.matches ||
      node.nodeType !== Node.TEXT_NODE ||
      !node.parentElement ||
      node.parentElement.closest('script,style,head')
    )
      return;
    if (!isBuildVisible(node.parentElement)) return;
    const text = node.textContent;
    const previous = letterLengths.get(node) || 0;
    letterLengths.set(node, text.length);
    if (text.length <= previous || !text.slice(previous).trim() || runs.size >= MAX_GLOWING_RUNS)
      return;
    const length = text.length - previous;
    const layers = [hiddenLayer, ...trailFor(colorOf(node.parentElement))];
    const ranges = layers.map(() => doc.createRange());
    // Hidden at once, before the browser paints, so the text never flashes in whole.
    ranges[0].setStart(node, previous);
    ranges[0].setEnd(node, text.length);
    ranges.slice(1).forEach((range) => {
      range.setStart(node, previous);
      range.setEnd(node, previous);
    });
    ranges.forEach((range, i) => layers[i].add(range));
    const now = performance.now();
    const started = Math.max(now, revealCursor);
    // The longer the queue, the faster the front moves, so the text keeps up with the code.
    const speed = 1 / (1 + (started - now) / REVEAL_LAG);
    const duration = Math.max(
      REVEAL_MIN,
      Math.min(REVEAL_MAX, length * REVEAL_PER_CHARACTER * speed),
    );
    revealCursor = started + duration;
    runs.add({
      node,
      start: previous,
      end: text.length,
      length,
      layers,
      ranges,
      started,
      duration,
    });
    if (!animationFrame) animationFrame = requestAnimationFrame(paint);
  }

  /** How long (ms) until the reveal front gets to text queued from now on. */
  glowText.wait = () => Math.max(0, revealCursor - performance.now());
  return glowText;
}

/** Watches the iframe document and animates every node as it is written. */
export function installDrawing() {
  const { doc } = state;
  doc.documentElement.classList.add('live-drawing', 'build-scroll-room');
  const reserved = doc.createElement('style');
  reserved.textContent = liveBuildStyles;
  doc.head.append(reserved);
  state.focusNode = null;

  const trace = createTracer();
  const glowText = createGlow();
  // A live preview starts loading as soon as its iframe is written, which would show it
  // before the card around it exists. It stays hidden until the code has finished the whole
  // card and the text revealed so far has caught up, and then fades in.
  const previewed = new WeakSet();
  const pendingPreviews = new Set();
  const showPreview = (preview, delay) => {
    pendingPreviews.delete(preview);
    setTimeout(() => preview.fade.play(), delay);
  };
  state.releasePreviews = () => [...pendingPreviews].forEach((preview) => showPreview(preview, 0));
  state.drawingObserver = new MutationObserver((entries) => {
    for (const entry of entries)
      for (const node of entry.type === 'characterData' ? [entry.target] : entry.addedNodes) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        // Whitespace between tags is not something the visitor can follow.
        const blank = node.nodeType === Node.TEXT_NODE && !node.textContent.trim();
        if (
          !blank &&
          element &&
          !element.closest('style,script,head') &&
          isBuildVisible(element) &&
          element.getClientRects().length
        )
          state.focusNode = node;
        // Once the code leaves a card, its preview can appear after the text queued so far.
        const owner = element?.closest('.project');
        for (const preview of pendingPreviews) {
          if (preview.card !== owner) showPreview(preview, glowText.wait());
        }
        if (!state.skipped && !reduceMotion.matches && node.nodeType === Node.ELEMENT_NODE) {
          // Only the contents of a preview panel wait; its frame is drawn like any other box.
          const screens = [node, ...node.querySelectorAll('.project-visual > *')].filter((el) =>
            el.parentElement?.matches('.project-visual'),
          );
          for (const screen of screens) {
            const card = screen.closest('.project');
            if (!card || previewed.has(screen)) continue;
            previewed.add(screen);
            const fade = screen.animate([{ opacity: 0 }, { opacity: 1 }], {
              duration: 450,
              easing: 'ease-out',
              fill: 'both',
            });
            fade.pause();
            fade.finished.then(() => fade.cancel()).catch(() => {});
            pendingPreviews.add({ card, fade });
          }
        }
        // Measured before this node's own text is queued: its box waits for the same moment.
        const wait = glowText.wait();
        if (node.nodeType === Node.TEXT_NODE) glowText(node);
        if (
          node.nodeType !== Node.ELEMENT_NODE ||
          node.tagName === 'STYLE' ||
          node.tagName === 'SCRIPT'
        )
          continue;
        const textWalker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        while (textWalker.nextNode()) glowText(textWalker.currentNode);
        // A summary brings its own marker, which would show before its text does: it appears
        // when the reveal front gets to it, like the boxes.
        if (!state.skipped && !reduceMotion.matches) {
          for (const summary of [node, ...node.querySelectorAll('summary')]) {
            if (summary.tagName !== 'SUMMARY' || previewed.has(summary)) continue;
            previewed.add(summary);
            const appear = summary.animate([{ opacity: 0 }, { opacity: 1 }], {
              delay: wait,
              duration: 250,
              easing: 'ease-out',
              fill: 'both',
            });
            appear.finished.then(() => appear.cancel()).catch(() => {});
            // The "+" is generated content, which the text highlights cannot reach: it gets
            // the same cyan glow through an animation of its own.
            const plus = state.frame.contentWindow.getComputedStyle(summary, '::after').color;
            const glow = summary.animate(
              [
                { color: `rgb(${GLOW_COLOR})`, textShadow: `0 0 10px rgba(${GLOW_COLOR},.8)` },
                { color: plus, textShadow: `0 0 0 rgba(${GLOW_COLOR},0)` },
              ],
              {
                pseudoElement: '::after',
                delay: wait,
                duration: GLOW_TRAIL,
                easing: 'ease-out',
                fill: 'backwards',
              },
            );
            glow.finished.then(() => glow.cancel()).catch(() => {});
          }
        }
        trace(node, wait);
        node.querySelectorAll('*').forEach((child) => trace(child, wait));
        if (
          !state.skipped &&
          !reduceMotion.matches &&
          node.matches('h1,h2,h3,p,button,a,summary,.tech-badge')
        ) {
          node.animate(
            [
              { opacity: 0, transform: 'translateY(5px)' },
              { opacity: 1, transform: 'translateY(0)' },
            ],
            { duration: 400, delay: wait, easing: 'ease-out', fill: 'backwards' },
          );
        }
      }
  });
  state.drawingObserver.observe(doc.body, { childList: true, characterData: true, subtree: true });
}
