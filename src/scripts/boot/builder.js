import { installDrawing, traceLayer } from './drawing.js';
import { syncBootTheme, text } from './language.js';
import { createBuildScrollbar } from './scrollbar.js';
import { loadSource } from './source.js';
import { reduceMotion, state, ui } from './state.js';
import { STORAGE_KEYS, storedTheme, writeStorage } from '../shared/storage.js';

const CONSOLE_TAIL = 6000;
const FONT_TIMEOUT = 1800;
const FONT_READY_TIMEOUT = 1200;

let liveStyles = null;

export function rememberBuild() {
  writeStorage(STORAGE_KEYS.built, '1');
}

/** Shows the finished portfolio directly, without the build animation. */
export function showExisting() {
  state.frame = document.createElement('iframe');
  state.frame.title = text('frameTitle');
  state.frame.allow = 'microphone; autoplay; fullscreen';
  state.frame.src = 'portfolio.html';
  ui.stage.replaceChildren(state.frame);
  ui.launchScreen.hidden = true;
  ui.replay.hidden = false;
}

/** The console shows the tail of the source that has been applied so far. */
function updateCode(source) {
  ui.sourceText.textContent = source.slice(-CONSOLE_TAIL);
  ui.consoleCode.scrollTop = ui.consoleCode.scrollHeight;
}

function selectFile(name) {
  document
    .querySelectorAll('[data-file]')
    .forEach((el) => el.classList.toggle('active', el.dataset.file === name));
}

function stopBuildScrollbar() {
  state.buildScrollbar?.stop();
  state.buildScrollbar = null;
}

function makeFrame() {
  stopBuildScrollbar();
  state.frame = document.createElement('iframe');
  state.frame.title = text('buildingFrameTitle');
  state.frame.allow = 'microphone; autoplay; fullscreen';
  ui.stage.replaceChildren(state.frame);
  state.drawingObserver?.disconnect();
  traceLayer.replaceChildren();
  state.holdUntil = 0;
  state.doc = state.frame.contentDocument;
  state.doc.open();
  liveStyles = null;
}

function applyChunk(phase, chunk) {
  if (phase.kind === 'html') state.doc.write(chunk);
  if (phase.kind === 'css') {
    if (!liveStyles) {
      liveStyles = state.doc.createElement('style');
      liveStyles.id = 'live-styles';
      state.doc.head.append(liveStyles);
    }
    liveStyles.append(state.doc.createTextNode(chunk));
  }
  // JavaScript is only collected; it runs once its whole file has been written.
}

/** Scrolls the iframe so the node being written stays in view above the console. */
function followWriting(delta) {
  const { focusNode, doc } = state;
  let rect;
  if (focusNode.nodeType === Node.TEXT_NODE && focusNode.textContent.trim()) {
    const range = doc.createRange();
    range.selectNodeContents(focusNode);
    const boxes = range.getClientRects();
    rect = boxes[boxes.length - 1];
  } else if (focusNode.nodeType === Node.ELEMENT_NODE) {
    const box = focusNode.getBoundingClientRect();
    rect = { left: box.left, right: box.right, bottom: box.top + Math.min(box.height, 80) };
  }
  if (!rect) return;
  const win = state.frame.contentWindow;
  const consoleBox = ui.consoleBox.hidden ? null : ui.consoleBox.getBoundingClientRect();
  const clearOfConsole = consoleBox ? consoleBox.top - 24 : win.innerHeight;
  let overflow;
  if (matchMedia('(max-width:700px)').matches) {
    // On small screens the console spans the full width: keep writing in the area above it.
    overflow = rect.bottom - Math.min(win.innerHeight, clearOfConsole) * 0.72;
  } else if (consoleBox && rect.right > consoleBox.left && rect.left < consoleBox.right) {
    // On wide screens the console only covers the bottom-right corner. Text written in
    // that column (the end of the footer, for example) must rise above it.
    overflow = Math.max(rect.bottom - win.innerHeight * 0.72, rect.bottom - clearOfConsole);
  } else {
    overflow = rect.bottom - win.innerHeight * 0.72;
  }
  if (overflow > 1) {
    const step = reduceMotion.matches
      ? overflow
      : Math.min(overflow * (1 - Math.exp(-delta / 240)), delta * 0.85);
    win.scrollTo({ top: win.scrollY + step, behavior: 'instant' });
  }
}

/** Types one phase into the iframe at a speed that fits `phase.duration`. Resolves false if cancelled. */
function playPhase(phase, number, total, token) {
  selectFile(phase.file);
  ui.sourceText.textContent = '';
  ui.status.textContent = phase.label[state.lang];
  if (phase.prelude) applyChunk(phase, phase.prelude);
  const code = phase.source;
  let position = 0;
  let lastTime = null;
  let characterBudget = 0;
  return new Promise((resolve) => {
    const tick = (now) => {
      if (token !== state.run) {
        resolve(false);
        return;
      }
      if (lastTime === null) lastTime = now;
      const delta = Math.min(60, now - lastTime);
      lastTime = now;
      const drawingHeld = now < state.holdUntil && !state.skipped;
      if (!drawingHeld) characterBudget += (delta * code.length) / phase.duration;
      let next = state.skipped
        ? code.length
        : drawingHeld
          ? position
          : Math.min(code.length, position + Math.floor(characterBudget));
      // Never cut a tag in half: the browser would render it as text.
      if (phase.kind === 'html' && !state.skipped) {
        const tagEnd = code.indexOf('>', position);
        if (tagEnd >= position && tagEnd < next) next = tagEnd + 1;
      }
      if (next > position) {
        const written = next - position;
        applyChunk(phase, code.slice(position, next));
        // Never accumulate a backlog while a border is being drawn.
        characterBudget = Math.max(0, characterBudget - written);
        if (phase.kind === 'html' && code[next - 1] === '>') characterBudget = 0;
        position = next;
        updateCode(code.slice(0, position));
      }
      // Keep following during the script phase too, so the last section settles in view.
      if (!state.skipped && state.focusNode?.isConnected) followWriting(delta);
      state.progress = (number + position / code.length) / total;
      const percent = Math.round(state.progress * 100);
      ui.percent.textContent = percent + '%';
      ui.progress.style.width = percent + '%';
      if (position < code.length) requestAnimationFrame(tick);
      else resolve(true);
    };
    requestAnimationFrame(tick);
  });
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function openConsole(token) {
  if (!reduceMotion.matches && !ui.launchScreen.hidden) {
    await ui.launchScreen.animate([{ opacity: 1 }, { opacity: 0 }], {
      duration: 260,
      easing: 'ease-out',
    }).finished;
  }
  ui.launchScreen.hidden = true;
  ui.consoleBox.hidden = false;
  ui.consoleBox.classList.remove('docked');
  if (!reduceMotion.matches) {
    await ui.consoleBox.animate(
      [
        { opacity: 0, transform: 'translate(-50%,-50%) scale(.94)' },
        { opacity: 1, transform: 'translate(-50%,-50%) scale(1)' },
      ],
      { duration: 480, easing: 'cubic-bezier(.22,1,.36,1)' },
    ).finished;
  }
  return token === state.run;
}

/** Writes the document head and the stylesheet, then waits for the web fonts. */
async function prepareDocument(setup, token) {
  makeFrame();
  for (const phase of setup) applyChunk(phase, phase.source);
  if (!reduceMotion.matches) {
    state.frame.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 800, easing: 'ease-in-out' });
  }
  const fonts = state.doc.createElement('link');
  fonts.rel = 'stylesheet';
  fonts.href = state.data.font;
  const fontsLoaded = new Promise((resolve) => {
    fonts.onload = resolve;
    fonts.onerror = resolve;
    setTimeout(resolve, FONT_TIMEOUT);
  });
  state.doc.head.append(fonts);
  if (!state.skipped) await fontsLoaded;
  if (token !== state.run) return false;
  state.doc.documentElement.dataset.theme = storedTheme();
  if (state.doc.fonts && !state.skipped) {
    await Promise.race([state.doc.fonts.ready, wait(FONT_READY_TIMEOUT)]);
  }
  return token === state.run;
}

/** Ends the build: runs the page scripts and hands the iframe over to the visitor. */
async function finishBuild(phases, token) {
  state.drawingObserver?.disconnect();
  state.doc
    .querySelectorAll('.trace-building')
    .forEach((el) => el.classList.remove('trace-building'));
  state.doc.documentElement.classList.replace('live-drawing', 'live-complete');
  traceLayer.replaceChildren();
  state.doc.close();
  const script = state.doc.createElement('script');
  script.textContent = phases
    .filter((phase) => phase.kind === 'js')
    .map((phase) => phase.source)
    .join('\n');
  state.doc.body.append(script);
  const root = state.doc.documentElement;
  state.buildScrollbar?.handover(() => !root.classList.contains('build-scroll-room'));
  state.frame.contentWindow.scrollTo({
    top: 0,
    behavior: state.skipped || reduceMotion.matches ? 'instant' : 'smooth',
  });
  ui.status.textContent = text('ready');
  rememberBuild();
  if (!state.skipped) await wait(800);
  if (token !== state.run) return;
  const releaseRoom = () => state.doc.documentElement.classList.remove('build-scroll-room');
  if (state.frame.contentWindow.scrollY < 2) releaseRoom();
  else {
    state.frame.contentWindow.addEventListener('scrollend', releaseRoom, { once: true });
    setTimeout(releaseRoom, 1600);
  }
  ui.consoleBox.hidden = true;
  ui.replay.hidden = false;
  state.running = false;
  state.frame.focus();
}

export async function build() {
  if (state.running) return;
  syncBootTheme();
  state.running = true;
  state.skipped = false;
  const token = ++state.run;
  ui.replay.hidden = true;
  ui.error.hidden = true;
  ui.sourceText.textContent = '';
  ui.status.textContent = text('loading');
  try {
    if (!(await openConsole(token))) return;
    ui.skip.focus();
    await loadSource();
    if (token !== state.run) return;
    const setup = state.data.phases.filter((phase) => phase.setup);
    if (!(await prepareDocument(setup, token))) return;
    installDrawing();
    state.progress = 0;
    state.buildScrollbar = createBuildScrollbar(state.frame, () => state.progress);
    const phases = state.data.phases.filter((phase) => !phase.setup);
    ui.consoleBox.classList.add('docked');
    for (let index = 0; index < phases.length; index++) {
      if (!(await playPhase(phases[index], index, phases.length, token))) return;
      if (!state.skipped && performance.now() < state.holdUntil) {
        await wait(Math.max(0, state.holdUntil - performance.now()));
      }
    }
    if (token !== state.run) return;
    await finishBuild(state.data.phases, token);
  } catch {
    if (token !== state.run) return;
    stopBuildScrollbar();
    state.running = false;
    ui.consoleBox.hidden = true;
    ui.error.hidden = false;
    ui.error.querySelector('a').focus();
  }
}

/** Cancels the animation and loads the finished page. */
export function skipBuild() {
  ++state.run;
  stopBuildScrollbar();
  state.skipped = true;
  state.drawingObserver?.disconnect();
  traceLayer.replaceChildren();
  ui.consoleBox.hidden = true;
  state.doc = null;
  liveStyles = null;
  state.data = undefined;
  state.running = false;
  rememberBuild();
  showExisting();
}
