import assert from 'node:assert/strict';
import vm from 'node:vm';
import { describe, it } from 'node:test';
import {
  apiSource,
  cycle,
  examples,
  responseBody,
} from '../src/scripts/portfolio/hero-demo/examples.js';

describe('hero code examples', () => {
  it('types HTML, CSS and JS, then erases them in reverse', () => {
    assert.deepEqual(cycle, [0, 1, 2, 2, 1, 0]);
    assert.match(examples[0].code, /^<article class="live-card">/);
  });

  it('the displayed CSS positions the shapes itself', () => {
    const css = examples[1].code;
    assert.match(css, /\.css-art > \*\s*\{[^}]*position: absolute[^}]*translate: -50% -50%/);
    assert.match(css, /height: 225px/);
    assert.match(css, /transform-style: preserve-3d/);
  });

  it('the displayed JavaScript works on its own', () => {
    const classes = new Set();
    const art = {
      style: {},
      classList: {
        add: (name) => classes.add(name),
        contains: (name) => classes.has(name),
        remove: (name) => classes.delete(name),
      },
      addEventListener(type, handler) {
        assert.equal(type, 'transitionend');
        this.onTransition = handler;
      },
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 400, height: 225 }),
    };
    const card = { querySelector: (selector) => (selector === '.css-art' ? art : null) };
    vm.runInNewContext(examples[2].code, {
      setTimeout: (callback) => callback(),
      document: { querySelector: (selector) => (selector === '.live-card' ? card : null) },
    });
    assert.ok(classes.has('is-positioned'));
    art.onpointermove({ clientX: 300, clientY: 56.25 });
    assert.equal(art.style.transform, 'rotateX(4.5deg) rotateY(4.5deg)');
    art.onpointerleave();
    assert.equal(art.style.transform, 'rotateX(0) rotateY(0)');
  });

  it('the simulated API answers with the object passed to res.json', () => {
    assert.match(apiSource, /^app\.get\("\/api\/projects"/);
    assert.deepEqual(JSON.parse(responseBody()), {
      developer: 'Yelisson Ortiz',
      role: 'Full-Stack Developer',
      projects: [{ name: 'Silabín', stack: 'Next.js' }],
    });
  });
});
