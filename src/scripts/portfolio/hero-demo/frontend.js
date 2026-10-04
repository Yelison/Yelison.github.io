import { t } from '../i18n.js';
import { reducedMotion } from '../media.js';
import { isMotionPaused } from '../motion.js';
import { cycle, examples } from './examples.js';
import { heroDemo } from './state.js';

const TICK = 42;
const TYPING_DURATION = [1800, 3500, 2200];
const ERASING_DURATION = 1300;
const ORBIT_DURATION = 8000;

const canAnimate = () => !isMotionPaused() && !reducedMotion.matches;

/**
 * "Frontend" mode: types card.html, card.css and card.js in turn while a live
 * preview under the headline renders whatever has been typed so far.
 */
export function createFrontendDemo(codeView) {
  const codeTabs = [...document.querySelectorAll('[data-code]')];
  const heroContent = document.querySelector('.hero-content');
  const liveStyle = document.createElement('style');
  document.head.append(liveStyle);

  const preview = document.createElement('div');
  preview.className = 'live-preview';
  preview.innerHTML =
    '<article class="live-card" hidden><h3></h3><p></p><button type="button" disabled></button><button class="card-copy" type="button" disabled hidden></button><output aria-live="polite"></output></article>';
  heroContent.querySelector('h1').after(preview);
  reservePreviewSpace(heroContent, preview);

  const card = preview.querySelector('article');
  const placeholders = [
    card.querySelector('h3'),
    card.querySelector('p'),
    card.querySelector('button'),
    card.querySelector('.card-copy'),
    card.querySelector('output'),
  ];

  const art = document.createElement('div');
  art.className = 'css-art';
  art.setAttribute('aria-label', t('artLabel'));
  art.innerHTML =
    '<div class="art-orbit"><span class="art-dot"></span></div><div class="art-frame"></div><div class="art-core"></div>';
  card.append(art);

  let codeIndex = 0;
  let codePosition = 0;
  let codeDeleting = false;
  let cycleStep = 0;
  let buffers = ['', '', ''];
  let viewedCode = 0;
  let followCode = true;

  const scriptConnected = () => buffers[2] === examples[2].code;

  // Once card.js is complete, the dot travels around its orbit once and returns.
  let orbitStartTimer;
  let orbitReturnTimer;
  let orbitFinished = false;
  art.addEventListener('transitionend', (event) => {
    if (
      !event.target.matches('.art-dot') ||
      event.propertyName !== 'transform' ||
      !art.classList.contains('is-positioned') ||
      art.classList.contains('is-styled')
    )
      return;
    art.classList.add('is-styled');
    orbitStartTimer = setTimeout(() => {
      if (!scriptConnected() || !canAnimate()) return;
      art.classList.add('is-ready');
      heroDemo.codeDue = performance.now() + ORBIT_DURATION + 800;
      orbitReturnTimer = setTimeout(() => {
        orbitFinished = true;
        art.classList.remove('is-ready');
        orbitReturnTimer = setTimeout(() => {
          art.classList.remove('is-positioned');
          orbitReturnTimer = setTimeout(() => art.classList.remove('is-styled'), 700);
        }, 42);
      }, ORBIT_DURATION);
    }, 600);
  });

  function followPointer(event) {
    const box = art.getBoundingClientRect();
    const x = (event.clientX - box.left) / box.width;
    const y = (event.clientY - box.top) / box.height;
    art.style.transform = `rotateX(${(0.5 - y) * 18}deg) rotateY(${(x - 0.5) * 18}deg)`;
  }

  /** Renders the preview from the code typed so far in each of the three files. */
  function applyPreview(text) {
    buffers[codeIndex] = text;
    const html = buffers[0];
    card.hidden = !html.includes('<article class="live-card">');
    preview.classList.toggle('is-empty', card.hidden);
    for (const node of placeholders) node.hidden = true;
    art.hidden = !html.includes('<div class="css-art"');
    // Each shape appears, with its inline styles, once its tag has been typed.
    for (const shape of art.querySelectorAll('[class]')) {
      shape.hidden = !html.includes(`class="${shape.className}"`);
      const match = html.match(new RegExp(`class="${shape.className}" style="([^"]*)"`));
      shape.style.cssText = match?.[1] || '';
    }
    art.style.position = 'relative';
    art.style.height = '225px';
    liveStyle.textContent = buffers[1];

    const connected = scriptConnected();
    if (connected && canAnimate()) {
      if (!orbitFinished && !art.classList.contains('is-positioned')) {
        art.classList.add('is-positioned');
        clearTimeout(orbitStartTimer);
      }
    } else {
      clearTimeout(orbitStartTimer);
      clearTimeout(orbitReturnTimer);
      orbitFinished = false;
      art.classList.remove('is-ready', 'is-styled', 'is-positioned');
    }
    art.onpointermove = connected && canAnimate() ? followPointer : null;
    art.onpointerleave = () => {
      art.style.transform = 'rotateX(0) rotateY(0)';
    };
    if (!connected) art.onpointerleave();
  }

  function render() {
    codeTabs.forEach((tab, index) =>
      tab.setAttribute('aria-pressed', String(index === viewedCode)),
    );
    codeView.setLanguageLabel(t(examples[viewedCode].languageKey));
    codeView.paint(buffers[viewedCode], examples[viewedCode].code.length);
  }

  function viewCode(index) {
    viewedCode = index;
    followCode = false;
    render();
  }

  function selectCode(index, instant = false, automatic = false) {
    codeIndex = index;
    if (!automatic) {
      cycleStep = index;
      buffers = examples.map((example, i) => (i < index ? example.code : ''));
    }
    codeDeleting = automatic && cycleStep >= 3;
    codePosition = instant || codeDeleting ? examples[index].code.length : 0;
    heroDemo.codeDue = performance.now() + (instant ? 3000 : 300);
    if (followCode) viewedCode = index;
    applyPreview(examples[index].code.slice(0, codePosition));
    render();
  }

  function tick() {
    if (
      !heroDemo.ready ||
      heroDemo.mode !== 'frontend' ||
      !canAnimate() ||
      document.hidden ||
      performance.now() < heroDemo.codeDue
    )
      return;
    // Hold the finished card while the visitor is interacting with it.
    if (cycleStep === 3 && (preview.matches(':hover') || preview.contains(document.activeElement)))
      return;
    const full = examples[codeIndex].code;
    const duration = codeDeleting ? ERASING_DURATION : TYPING_DURATION[codeIndex];
    const step = Math.max(1, Math.ceil((full.length * TICK) / duration));
    codePosition = codeDeleting
      ? Math.max(0, codePosition - step)
      : Math.min(full.length, codePosition + step);
    applyPreview(full.slice(0, codePosition));
    render();
    if (codeDeleting ? codePosition === 0 : codePosition === full.length) {
      cycleStep = (cycleStep + 1) % cycle.length;
      selectCode(cycle[cycleStep], false, true);
      heroDemo.codeDue = performance.now() + (cycleStep === 3 ? 11000 : codeDeleting ? 350 : 450);
    }
  }

  codeTabs.forEach((tab) =>
    tab.addEventListener('click', () => viewCode(Number(tab.dataset.code))),
  );
  selectCode(reducedMotion.matches ? 2 : 0, reducedMotion.matches);
  setInterval(tick, TICK);
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches) selectCode(2, true);
  });

  return {
    preview,
    /** Re-renders the current state, e.g. after switching back from backend mode. */
    refresh() {
      applyPreview(buffers[codeIndex]);
      render();
    },
    refreshPreview() {
      applyPreview(buffers[codeIndex]);
    },
    languageLabel: () => t(examples[viewedCode].languageKey),
    syncLanguage() {
      art.setAttribute('aria-label', t('artLabel'));
    },
  };
}

/**
 * Reserves the final height of the preview so typing never shifts the page.
 * Recomputed when the hero changes width and once web fonts have loaded.
 */
function reservePreviewSpace(heroContent, preview) {
  let measuredWidth = 0;
  const reserve = () => {
    if (Math.abs(heroContent.clientWidth - measuredWidth) < 1) return;
    measuredWidth = heroContent.clientWidth;
    const wasEmpty = preview.classList.contains('is-empty');
    preview.style.transition = 'none';
    preview.style.height = preview.style.minHeight = matchMedia('(max-width:760px)').matches
      ? '380px'
      : '340px';
    heroContent.style.minHeight = '';
    heroContent.style.minHeight = heroContent.scrollHeight + 'px';
    preview.style.height = preview.style.minHeight = '';
    void preview.offsetHeight;
    preview.style.transition = '';
    if (wasEmpty) preview.classList.add('is-empty');
  };
  new ResizeObserver(reserve).observe(heroContent);
  document.fonts?.ready.then(() => {
    measuredWidth = 0;
    reserve();
  });
}
