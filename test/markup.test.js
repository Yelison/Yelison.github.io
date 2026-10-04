import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { extractMarkup, localizeMarkup, translationKeys } from '../scripts/lib/markup.mjs';

const html = `<nav aria-label="Main" data-i-aria-label="navLabel">
  <a data-i="navWork" href="#work">Selected work</a
  ><a data-i="contactTitle" href="#c">Let’s <em>talk.</em></a>
</nav>`;

describe('markup translation', () => {
  it('lists the keys used by texts and attributes', () => {
    assert.deepEqual(translationKeys(html).sort(), ['contactTitle', 'navLabel', 'navWork']);
  });

  it('extracts the English source, keeping inner markup', () => {
    assert.deepEqual(extractMarkup(html), {
      navLabel: 'Main',
      navWork: 'Selected work',
      contactTitle: 'Let’s <em>talk.</em>',
    });
  });

  it('replaces texts and attributes and leaves the rest of the markup untouched', () => {
    const spanish = localizeMarkup(html, {
      navLabel: 'Navegación principal',
      navWork: 'Proyectos',
      contactTitle: 'Hablemos.',
    });
    assert.equal(
      spanish,
      `<nav aria-label="Navegación principal" data-i-aria-label="navLabel">
  <a data-i="navWork" href="#work">Proyectos</a
  ><a data-i="contactTitle" href="#c">Hablemos.</a>
</nav>`,
    );
  });

  it('escapes translated text and keeps untranslated keys in English', () => {
    const result = localizeMarkup(html, { navWork: '<b> & "x"' });
    assert.match(result, />&lt;b&gt; &amp; &quot;x&quot;<\/a/);
    assert.match(result, /Let’s <em>talk\.<\/em>/);
  });

  it('turns line breaks into <br>', () => {
    assert.equal(
      localizeMarkup('<p data-i="k">a</p>', { k: 'one\ntwo' }),
      '<p data-i="k">one<br>two</p>',
    );
  });

  it('only translates the attribute named by data-i-*', () => {
    assert.throws(
      () => translationKeys('<div data-i-aria-label="k"></div>'),
      /has no aria-label attribute/,
    );
  });

  it('rejects nested translated elements', () => {
    assert.throws(
      () => translationKeys('<p data-i="outer">a <span data-i="inner">b</span></p>'),
      /nested/,
    );
  });
});
