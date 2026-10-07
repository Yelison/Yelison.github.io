const TOKEN_PATTERN =
  /(\/\/[^\n]*|'[^']*'|"[^"]*"|\b(?:type|export|function|return|const|import|from|string|color|background|border-radius|letter-spacing|headline|accent|message)\b|#[a-fA-F0-9]{6}|\b\d+\b)/g;

function tokenClass(token) {
  if (token.startsWith("'") || token.startsWith('"')) return 'code-string';
  if (/^\d|^#/.test(token)) return 'code-number';
  return 'code-keyword';
}

/**
 * Splits code into what the editor shows, in order: plain text runs (possibly empty)
 * alternating with highlighted tokens, which carry a `className`.
 */
export function highlight(text) {
  const pieces = [];
  let previous = 0;
  for (const match of text.matchAll(TOKEN_PATTERN)) {
    pieces.push({ text: text.slice(previous, match.index) });
    pieces.push({ text: match[0], className: tokenClass(match[0]) });
    previous = match.index + match[0].length;
  }
  pieces.push({ text: text.slice(previous) });
  return pieces;
}

/** How many leading pieces two highlights have in common. */
export function sharedPieces(before, after) {
  let count = 0;
  while (
    count < before.length &&
    count < after.length &&
    before[count].text === after[count].text &&
    before[count].className === after[count].className
  )
    count++;
  return count;
}
