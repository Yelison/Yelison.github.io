import { isLanguage, readStorage, STORAGE_KEYS } from '../shared/storage.js';

const $ = (selector) => document.querySelector(selector);

/** Elements of index.html used by the launcher. */
export const ui = {
  launchScreen: $('#launch-screen'),
  launch: $('#launch'),
  consoleBox: $('#build-console'),
  consoleCode: $('.console-code'),
  sourceText: $('#source-text'),
  status: $('#build-status'),
  percent: $('#build-percent'),
  progress: $('#build-progress'),
  stage: $('#build-stage'),
  replay: $('#replay'),
  skip: $('#skip'),
  error: $('#build-error'),
  destroyDialog: $('#destroy-dialog'),
  destroyForm: $('#destroy-form'),
  destroyInput: $('#destroy-input'),
  destroyConfirm: $('#destroy-confirm'),
  destroyCancel: $('#destroy-cancel'),
};

const savedLanguage = readStorage(STORAGE_KEYS.language);

/** Mutable state shared by the launcher modules. */
export const state = {
  lang: isLanguage(savedLanguage) ? savedLanguage : 'es',
  /** live-source.json, once loaded. */
  data: undefined,
  /** The iframe that shows the portfolio, and its document while it is being written. */
  frame: null,
  doc: null,
  /** Incremented to cancel the build in progress. */
  run: 0,
  running: false,
  skipped: false,
  /** Typing waits until this timestamp while a border is being drawn. */
  holdUntil: 0,
  /** The node the console follows by scrolling the iframe. */
  focusNode: null,
  drawingObserver: null,
  /** Build progress from 0 to 1, followed by the scrollbar replica. */
  progress: 0,
  /** Scrollbar replica that glides during the build (see scrollbar.js). */
  buildScrollbar: null,
};

export const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
