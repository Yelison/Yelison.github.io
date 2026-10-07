import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { examples } from '../src/scripts/portfolio/hero-demo/examples.js';
import { highlight, sharedPieces } from '../src/scripts/portfolio/hero-demo/highlight.js';

describe('hero editor highlighting', () => {
  it('alternates plain text and tokens, and keeps every character', () => {
    const code = 'const card = "live"; // 12';
    const pieces = highlight(code);
    assert.deepEqual(pieces, [
      { text: '' },
      { text: 'const', className: 'code-keyword' },
      { text: ' card = ' },
      { text: '"live"', className: 'code-string' },
      { text: '; ' },
      { text: '// 12', className: 'code-keyword' },
      { text: '' },
    ]);
    for (const example of examples) {
      assert.equal(
        highlight(example.code)
          .map((piece) => piece.text)
          .join(''),
        example.code,
      );
    }
  });

  it('keeps the pieces typing does not touch', () => {
    const before = highlight('const a = 1');
    const after = highlight('const a = 12');
    assert.equal(sharedPieces(before, after), 3);
    assert.equal(sharedPieces(after, after), after.length);
    assert.equal(sharedPieces([], after), 0);
  });

  it('notices when a later character changes an earlier token', () => {
    // The quote opened before "const" only becomes a string once it is closed.
    const before = highlight("x = 'a const");
    const after = highlight("x = 'a const'");
    assert.equal(before[1].className, 'code-keyword');
    assert.equal(sharedPieces(before, after), 0);
  });
});
