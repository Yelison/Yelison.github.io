import { t } from './i18n.js';
import { onLanguageChange } from './language.js';

const LOAD_TIMEOUT = 18000;

/** Modal that embeds the live demo of a project in an iframe. */
export function initProjectDemo() {
  const dialog = document.getElementById('silabin-demo');
  const title = document.getElementById('demo-title');
  const host = document.getElementById('demo-frame-host');
  const stage = dialog.querySelector('.demo-stage');
  const loading = dialog.querySelector('.demo-loading');
  const loadingText = loading.querySelector('[data-i="loadingDemo"]');
  const external = dialog.querySelector('[data-i="openExternal"]');
  const expand = document.getElementById('demo-expand');
  const close = document.getElementById('demo-close');
  let loadTimer;
  let opener;

  const projectName = () => opener?.dataset.projectName ?? title.textContent;

  function syncExpandLabel() {
    const expanded = dialog.classList.contains('expanded');
    expand.textContent = t(expanded ? 'demoRestore' : 'expandDemo');
    expand.setAttribute('aria-pressed', String(expanded));
  }

  function syncTexts() {
    const name = projectName();
    loadingText.textContent = t('loadingProject', { name });
    external.textContent = t('openProject', { name });
    host.querySelector('iframe')?.setAttribute('title', t('projectFrameTitle', { name }));
  }

  function finishLoading() {
    clearTimeout(loadTimer);
    loading.hidden = true;
    stage.setAttribute('aria-busy', 'false');
  }

  function open(event) {
    if (dialog.open) return;
    opener = event.currentTarget;
    const name = projectName();
    const url = opener.dataset.projectUrl;
    title.textContent = name;
    external.href = url;
    syncTexts();
    dialog.classList.remove('expanded');
    syncExpandLabel();
    loading.hidden = false;
    stage.setAttribute('aria-busy', 'true');
    dialog.showModal();
    document.body.classList.add('demo-open');

    const frame = document.createElement('iframe');
    frame.title = t('projectFrameTitle', { name });
    frame.setAttribute('allow', 'microphone; autoplay; fullscreen');
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-downloads');
    frame.referrerPolicy = 'strict-origin-when-cross-origin';
    frame.addEventListener('load', finishLoading, { once: true });
    frame.addEventListener('error', finishLoading, { once: true });
    frame.src = url;
    host.replaceChildren(frame);
    loadTimer = setTimeout(finishLoading, LOAD_TIMEOUT);
    close.focus();
  }

  document
    .querySelectorAll('.demo-launch')
    .forEach((button) => button.addEventListener('click', open));
  close.addEventListener('click', () => dialog.close());
  expand.addEventListener('click', () => {
    dialog.classList.toggle('expanded');
    syncExpandLabel();
  });
  // Clicking the backdrop (outside the dialog box) closes it.
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    const box = dialog.getBoundingClientRect();
    const outside =
      event.clientX < box.left ||
      event.clientX > box.right ||
      event.clientY < box.top ||
      event.clientY > box.bottom;
    if (outside) dialog.close();
  });
  dialog.addEventListener('close', () => {
    clearTimeout(loadTimer);
    host.replaceChildren();
    stage.setAttribute('aria-busy', 'false');
    document.body.classList.remove('demo-open');
    opener?.focus({ preventScroll: true });
  });
  onLanguageChange(() => {
    syncExpandLabel();
    syncTexts();
  });
}
