import { t } from '../i18n.js';
import { reducedMotion } from '../media.js';
import { isMotionPaused } from '../motion.js';
import { apiSource, responseBody } from './examples.js';
import { heroDemo } from './state.js';

const TICK = 42;
const AUTO_REQUEST_DELAY = 2000;
const RESPONSE_DELAY = 650;

/**
 * "Backend" mode: types a small Express endpoint, then a simulated client sends
 * the request (a fake cursor clicks "Send GET") and shows the JSON response.
 * Everything runs locally; no request leaves the browser.
 */
export function createBackendDemo({ editor, codeView, frontend }) {
  const modeBar = document.createElement('div');
  modeBar.className = 'demo-modes';
  modeBar.innerHTML =
    '<button type="button" data-demo-mode="frontend" aria-pressed="true">Frontend</button><button type="button" data-demo-mode="backend" aria-pressed="false">Backend</button>';
  editor.querySelector('.code-tabs').before(modeBar);

  const panel = document.createElement('div');
  panel.className = 'api-preview';
  panel.hidden = true;
  panel.innerHTML =
    '<div class="api-panel"><div class="api-heading"><strong>GET /api/projects</strong><span class="api-simulation"></span></div><button type="button" class="api-send button" disabled>Send GET</button><div class="api-response-header"><span class="api-status">200 OK</span><span>application/json</span></div><pre class="api-response"><code></code></pre></div>';
  frontend.preview.after(panel);

  const apiPanel = panel.querySelector('.api-panel');
  const response = panel.querySelector('.api-response code');
  const status = panel.querySelector('.api-status');
  const send = panel.querySelector('.api-send');
  const cursor = document.createElement('span');
  cursor.className = 'api-auto-cursor';
  cursor.setAttribute('aria-hidden', 'true');
  cursor.hidden = true;
  apiPanel.append(cursor);

  let position = 0;
  let deleting = false;
  let pending = false;
  let revision = 0;
  let lastSource = '';
  let autoTimer = null;
  let autoDone = false;
  let userActive = false;

  function cancelAutoRequest() {
    clearTimeout(autoTimer);
    autoTimer = null;
    cursor.hidden = true;
    cursor.getAnimations().forEach((animation) => animation.cancel());
  }

  // Any real interaction takes over from the simulated click. Hover alone does not
  // count: the expanding panel may move under a stationary pointer.
  panel.addEventListener(
    'pointerdown',
    () => {
      userActive = true;
      cancelAutoRequest();
    },
    { passive: true },
  );
  panel.addEventListener('focusin', () => {
    userActive = true;
    cancelAutoRequest();
  });

  async function animateCursorClick(scheduledRevision) {
    const panelBox = apiPanel.getBoundingClientRect();
    const buttonBox = send.getBoundingClientRect();
    const x = buttonBox.left - panelBox.left + buttonBox.width * 0.7;
    const y = buttonBox.top - panelBox.top + buttonBox.height * 0.6;
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    cursor.hidden = false;
    const startX = Math.max(120, panelBox.width - x - 32);
    const startY = Math.min(160, panelBox.height - y - 30);
    try {
      await cursor.animate(
        [
          { opacity: 0, transform: `translate(${startX}px,${startY}px)`, offset: 0 },
          { opacity: 1, transform: `translate(${startX}px,${startY}px)`, offset: 0.15 },
          { opacity: 1, transform: 'translate(0,0)', offset: 0.85 },
          { opacity: 1, transform: 'translate(0,0)', offset: 1 },
        ],
        { duration: 1350, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'forwards' },
      ).finished;
    } catch {
      return false;
    }
    if (userActive || scheduledRevision !== revision || heroDemo.mode !== 'backend') {
      cancelAutoRequest();
      return false;
    }
    send.animate(
      [
        { transform: 'scale(1)', filter: 'brightness(1)' },
        { transform: 'scale(.92)', filter: 'brightness(.75)' },
        { transform: 'scale(1)', filter: 'brightness(1)' },
      ],
      { duration: 420, easing: 'ease-out' },
    );
    cursor.animate(
      [{ transform: 'scale(1)' }, { transform: 'scale(.8)' }, { transform: 'scale(1)' }],
      {
        duration: 350,
        easing: 'ease-out',
      },
    );
    for (let i = 0; i < 8; i++) {
      const spark = document.createElement('span');
      spark.className = 'api-click-spark';
      spark.setAttribute('aria-hidden', 'true');
      spark.style.left = x + 'px';
      spark.style.top = y + 'px';
      const rotation = i * 45;
      apiPanel.append(spark);
      spark
        .animate(
          [
            {
              transform: `translate(-50%,-50%) rotate(${rotation}deg) translateX(7px) scaleX(.3)`,
              opacity: 1,
            },
            {
              transform: `translate(-50%,-50%) rotate(${rotation}deg) translateX(38px) scaleX(1)`,
              opacity: 1,
              offset: 0.35,
            },
            {
              transform: `translate(-50%,-50%) rotate(${rotation}deg) translateX(58px) scaleX(.2)`,
              opacity: 0,
            },
          ],
          { duration: 650, easing: 'cubic-bezier(.16,1,.3,1)' },
        )
        .finished.then(() => spark.remove())
        .catch(() => spark.remove());
    }
    setTimeout(() => {
      cursor.hidden = true;
    }, 700);
    return true;
  }

  function scheduleAutoRequest() {
    if (autoDone || userActive || autoTimer || send.disabled || document.hidden || isMotionPaused())
      return;
    const scheduledRevision = revision;
    autoTimer = setTimeout(async () => {
      autoTimer = null;
      if (
        heroDemo.mode !== 'backend' ||
        scheduledRevision !== revision ||
        userActive ||
        document.hidden ||
        isMotionPaused() ||
        send.disabled
      )
        return;
      autoDone = true;
      if (!reducedMotion.matches && !(await animateCursorClick(scheduledRevision))) return;
      send.click();
    }, AUTO_REQUEST_DELAY);
  }

  function syncLabels() {
    panel.querySelector('.api-simulation').textContent = t('apiSimulation');
    send.textContent = t('apiSend');
  }

  function paint() {
    codeView.setLanguageLabel(t('codeLanguageApi'));
    const source = apiSource.slice(0, position);
    codeView.paint(source, apiSource.length);
    const declared = source.includes('app.get(');
    panel.classList.toggle('is-empty', !declared);
    apiPanel.style.visibility = declared ? 'visible' : 'hidden';
    if (source !== lastSource) {
      cancelAutoRequest();
      lastSource = source;
      revision++;
      pending = false;
      response.textContent = '';
      status.textContent = t('apiNotExecuted');
    }
    send.disabled = position !== apiSource.length || pending;
    if (position === apiSource.length) scheduleAutoRequest();
  }

  send.addEventListener('click', async () => {
    if (send.disabled) return;
    clearTimeout(autoTimer);
    autoTimer = null;
    autoDone = true;
    const requestRevision = revision;
    pending = true;
    send.disabled = true;
    status.textContent = t('apiPending');
    response.textContent = 'GET /api/projects';
    await new Promise((resolve) => setTimeout(resolve, reducedMotion.matches ? 0 : RESPONSE_DELAY));
    if (requestRevision !== revision || heroDemo.mode !== 'backend') return;
    pending = false;
    send.disabled = false;
    status.textContent = '200 OK';
    response.textContent = responseBody();
    heroDemo.apiDue = performance.now() + 6500;
  });

  function setMode(mode) {
    cancelAutoRequest();
    autoDone = false;
    userActive = false;
    heroDemo.mode = mode;
    revision++;
    pending = false;
    lastSource = '';
    modeBar
      .querySelectorAll('button')
      .forEach((button) =>
        button.setAttribute('aria-pressed', String(button.dataset.demoMode === mode)),
      );
    editor.querySelector('.code-tabs').hidden = mode === 'backend';
    panel.hidden = mode !== 'backend';
    frontend.preview.hidden = mode === 'backend';
    syncLabels();
    if (mode === 'backend') {
      position = reducedMotion.matches || isMotionPaused() ? apiSource.length : 0;
      deleting = false;
      heroDemo.apiDue = performance.now() + 200;
      paint();
    } else {
      frontend.refresh();
    }
  }

  function tick() {
    if (
      !heroDemo.ready ||
      heroDemo.mode !== 'backend' ||
      reducedMotion.matches ||
      isMotionPaused() ||
      document.hidden ||
      pending ||
      performance.now() < heroDemo.apiDue
    )
      return;
    // Keep the finished endpoint on screen while the visitor is using the panel.
    if (
      position === apiSource.length &&
      (panel.matches(':hover') || panel.contains(document.activeElement))
    )
      return;
    position = deleting ? Math.max(0, position - 4) : Math.min(apiSource.length, position + 3);
    paint();
    if (position === apiSource.length) {
      deleting = true;
      heroDemo.apiDue = performance.now() + 4500;
    } else if (position === 0) {
      autoDone = false;
      userActive = false;
      deleting = false;
      heroDemo.apiDue = performance.now() + 900;
    }
  }

  modeBar
    .querySelectorAll('button')
    .forEach((button) => button.addEventListener('click', () => setMode(button.dataset.demoMode)));
  setInterval(tick, TICK);
  reducedMotion.addEventListener('change', (event) => {
    if (event.matches && heroDemo.mode === 'backend') {
      position = apiSource.length;
      paint();
    }
  });
  syncLabels();

  return {
    /** Resumes the automatic request after animations are re-enabled. */
    resume() {
      if (heroDemo.mode === 'backend' && position === apiSource.length) scheduleAutoRequest();
    },
    syncLanguage() {
      syncLabels();
      if (status.textContent !== '200 OK')
        status.textContent = t(pending ? 'apiPending' : 'apiNotExecuted');
      if (heroDemo.mode === 'backend') paint();
    },
  };
}
