import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { build } from '../scripts/build.mjs';

describe('build', () => {
  let outDir;
  let portfolio;
  let live;
  const body = (lang) =>
    live.phases
      .filter((phase) => phase.kind === 'html' && !phase.setup)
      .map((phase) => (phase.prelude?.[lang] ?? '') + phase.source[lang])
      .join('');

  before(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-build-'));
    await build({ outDir });
    portfolio = fs.readFileSync(path.join(outDir, 'portfolio.html'), 'utf8');
    live = JSON.parse(fs.readFileSync(path.join(outDir, 'live-source.json'), 'utf8'));
  });

  after(() => fs.rmSync(outDir, { recursive: true, force: true }));

  it('writes every file the site needs', () => {
    for (const file of [
      'index.html',
      'portfolio.html',
      'live-source.json',
      'app.js',
      'boot.js',
      'dots.js',
      'style.css',
      'boot.css',
      'Yelisson-Ortiz-CV.pdf',
      'interactive-dot-grid-LICENSE.txt',
    ]) {
      assert.ok(fs.existsSync(path.join(outDir, file)), `${file} is missing`);
    }
  });

  it('the static page and the live build contain exactly the same body', () => {
    // The static page only adds its scripts, at the end of the body.
    const scripts = fs.readFileSync(
      new URL('../src/partials/scripts.html', import.meta.url),
      'utf8',
    );
    assert.ok(portfolio.endsWith(body('en').replace('</body>', `${scripts.trimEnd()}\n</body>`)));
    assert.equal(portfolio.match(/<script src=/g).length, 2);
  });

  it('only setup phases are applied without typing, and they come first', () => {
    const setup = live.phases.map((phase) => Boolean(phase.setup));
    assert.deepEqual(setup.slice(0, 2), [true, true]);
    assert.ok(setup.slice(2).every((value) => !value));
    assert.match(live.phases[0].source.en, /^<!doctype html>\n<html lang="en"/);
    assert.match(live.phases[0].source.es, /^<!doctype html>\n<html lang="es"/);
  });

  it('every phase has a label in both languages', () => {
    for (const phase of live.phases) {
      assert.ok(phase.label.en && phase.label.es, JSON.stringify(phase));
    }
  });

  it('builds the Spanish page at build time', () => {
    const spanish = body('es');
    assert.match(spanish, />Proyectos<\/a/);
    assert.match(spanish, />Desarrollador Full-Stack<\/span/);
    assert.match(spanish, />Hablemos\.<\/h2>/);
    assert.match(spanish, /aria-label="Navegación principal"/);
    assert.match(
      live.phases[0].source.es,
      /<title>Yelisson Ortiz — Desarrollador Full-Stack<\/title>/,
    );
  });

  it('keeps the English language button in the Spanish build', () => {
    // Only annotated markup is translated: a blanket replace of lang="en" would also hit data-lang="en".
    assert.match(body('es'), /data-lang="en"/);
  });

  it('runs the bundled scripts at the end of the live build', () => {
    const scripts = live.phases.at(-1);
    assert.equal(scripts.kind, 'js');
    assert.ok(scripts.source.includes(fs.readFileSync(path.join(outDir, 'app.js'), 'utf8')));
    assert.ok(scripts.source.includes(fs.readFileSync(path.join(outDir, 'dots.js'), 'utf8')));
  });

  it('bundles the dictionaries into app.js', () => {
    const app = fs.readFileSync(path.join(outDir, 'app.js'), 'utf8');
    assert.match(app, /"Selected work"/);
    assert.match(app, /"Proyectos"/);
  });
});
