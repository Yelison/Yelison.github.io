import liveBuildStyles from '../../styles/live-build.css';
import { reduceMotion, state } from './state.js';

const SVG = 'http://www.w3.org/2000/svg';
const GLOW_DURATION = 550;
const MAX_GLOWING_RUNS = 40;
const GLOW_COLOR = [8, 232, 222];

/** Overlay in the launcher where element borders are traced while the page is written. */
export const traceLayer = document.createElement('div');
traceLayer.id = 'build-traces';
traceLayer.setAttribute('aria-hidden', 'true');

export function initTraceLayer() {
  document.body.append(traceLayer);
}

/** True when the element is actually rendered (not in a closed details/dialog, not hidden). */
function isBuildVisible(el) {
  if (!el || el.closest('[hidden]')) return false;
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

function createTracer() {
  const traced = new WeakSet();

  /** Draws the element's border as an SVG stroke, then fades its background in. */
  return function trace(el) {
    if (state.skipped || reduceMotion.matches || traced.has(el)) return;
    const small = el.matches('header,.letter-tiles span,.button,.tech-badge');
    const duration = small ? 180 : 360;
    requestAnimationFrame(() => {
      if (!el.isConnected || state.skipped || !isBuildVisible(el)) return;
      const box = el.getBoundingClientRect();
      if (box.width < 2 || box.height < 2) return;
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
        easing: 'cubic-bezier(.25,.1,.25,1)',
        fill: 'forwards',
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
    });
  };
}

/** Newly written letters glow cyan and fade to their final color (CSS Custom Highlight API). */
function createGlow() {
  const { doc, frame } = state;
  const letterLengths = new WeakMap();
  const highlights = frame.contentWindow.CSS?.highlights;
  const HighlightClass = frame.contentWindow.Highlight;
  const glowStyle = doc.createElement('style');
  doc.head.append(glowStyle);
  const glowing = new Set();
  let animationFrame;
  let glyphId = 0;

  const paint = () => {
    const now = performance.now();
    const rules = [];
    for (const glyph of glowing) {
      if (!glyph.node.isConnected || state.skipped || now >= glyph.until) {
        highlights.delete(glyph.name);
        glowing.delete(glyph);
        continue;
      }
      const progress = Math.min(1, (now - glyph.started) / GLOW_DURATION);
      const eased = 1 - Math.pow(1 - progress, 3);
      const rgb = GLOW_COLOR.map((value, i) =>
        Math.round(value + (glyph.color[i] - value) * eased),
      );
      rules.push(
        `::highlight(${glyph.name}){color:rgb(${rgb.join(',')});text-shadow:0 0 ${8 * (1 - eased)}px rgba(8,232,222,${0.65 * (1 - eased)})}`,
      );
    }
    glowStyle.textContent = rules.join('\n');
    animationFrame = glowing.size ? requestAnimationFrame(paint) : null;
  };

  return function glowText(node) {
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
    if (text.length <= previous || !text.slice(previous).trim() || glowing.size >= MAX_GLOWING_RUNS)
      return;
    const style = frame.contentWindow.getComputedStyle(node.parentElement);
    if (style.visibility === 'hidden' || style.display === 'none') return;
    const range = doc.createRange();
    range.setStart(node, previous);
    range.setEnd(node, text.length);
    if (!range.getBoundingClientRect().width) return;
    const name = `build-glow-${++glyphId}`;
    const started = performance.now();
    highlights.set(name, new HighlightClass(range));
    const color = (style.color.match(/[\d.]+/g) || [240, 238, 233]).slice(0, 3).map(Number);
    glowing.add({ node, name, color, started, until: started + GLOW_DURATION });
    if (!animationFrame) animationFrame = requestAnimationFrame(paint);
  };
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
  state.drawingObserver = new MutationObserver((entries) => {
    for (const entry of entries)
      for (const node of entry.type === 'characterData' ? [entry.target] : entry.addedNodes) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        if (
          element &&
          !element.closest('style,script,head') &&
          isBuildVisible(element) &&
          element.getClientRects().length
        )
          state.focusNode = node;
        if (node.nodeType === Node.TEXT_NODE) glowText(node);
        if (
          node.nodeType !== Node.ELEMENT_NODE ||
          node.tagName === 'STYLE' ||
          node.tagName === 'SCRIPT'
        )
          continue;
        const textWalker = doc.createTreeWalker(node, NodeFilter.SHOW_TEXT);
        while (textWalker.nextNode()) glowText(textWalker.currentNode);
        trace(node);
        node.querySelectorAll('*').forEach(trace);
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
            { duration: 400, easing: 'ease-out' },
          );
        }
      }
  });
  state.drawingObserver.observe(doc.body, { childList: true, characterData: true, subtree: true });
}
