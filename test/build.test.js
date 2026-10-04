import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import { build } from '../scripts/build.mjs';

describe('build', () => {
  let outDir;
  let portfolio;

  before(async () => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'portfolio-build-'));
    await build({ outDir });
    portfolio = fs.readFileSync(path.join(outDir, 'portfolio.html'), 'utf8');
  });

  after(() => fs.rmSync(outDir, { recursive: true, force: true }));

  it('writes every file the site needs', () => {
    for (const file of [
      'index.html',
      'portfolio.html',
      'app.js',
      'dots.js',
      'style.css',
      'Yelisson-Ortiz-CV.pdf',
      'interactive-dot-grid-LICENSE.txt',
    ]) {
      assert.ok(fs.existsSync(path.join(outDir, file)), `${file} is missing`);
    }
  });

  it('assembles the page in order, with the visible projects', () => {
    const order = [
      '<header>',
      '<section class="hero">',
      'expertise-strip',
      'id="work"',
      'data-project="silabin"',
    ];
    const positions = order.map((marker) => portfolio.indexOf(marker));
    assert.ok(
      positions.every((position) => position > 0),
      positions.join(),
    );
    assert.deepEqual(
      [...positions].sort((a, b) => a - b),
      positions,
    );
    assert.doesNotMatch(portfolio, /data-project="pequo"/);
  });

  it('bundles the dictionaries into app.js', () => {
    const app = fs.readFileSync(path.join(outDir, 'app.js'), 'utf8');
    assert.match(app, /"Selected work"/);
    assert.match(app, /"Proyectos"/);
  });
});
