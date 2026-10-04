import { parseFragment } from 'parse5';

/**
 * Translatable markup is authored in English and annotated with keys:
 *
 *   <p data-i="intro">I build the frontend…</p>             → text content
 *   <nav aria-label="Main navigation" data-i-aria-label="navLabel">  → attribute
 *
 * Both helpers below work on source offsets reported by parse5, so the original
 * formatting of the markup is preserved byte for byte outside the edited ranges.
 */

const TEXT_KEY = 'data-i';
const ATTRIBUTE_KEY_PREFIX = 'data-i-';

function* walk(node) {
  for (const child of node.childNodes ?? []) {
    if (child.tagName) yield child;
    yield* walk(child);
  }
}

function annotations(html) {
  const fragment = parseFragment(html, { sourceCodeLocationInfo: true });
  const found = [];
  for (const element of walk(fragment)) {
    const location = element.sourceCodeLocation;
    for (const { name, value } of element.attrs) {
      if (name === TEXT_KEY) {
        if (!location.endTag)
          throw new Error(`<${element.tagName} data-i="${value}"> needs a closing tag`);
        found.push({
          key: value,
          kind: 'text',
          start: location.startTag.endOffset,
          end: location.endTag.startOffset,
        });
      } else if (name.startsWith(ATTRIBUTE_KEY_PREFIX)) {
        const attribute = name.slice(ATTRIBUTE_KEY_PREFIX.length);
        const target = location.attrs[attribute];
        if (!target)
          throw new Error(`${name}="${value}" has no ${attribute} attribute to translate`);
        found.push({
          key: value,
          kind: 'attribute',
          attribute,
          value: element.attrs.find((attr) => attr.name === attribute).value,
          start: target.startOffset,
          end: target.endOffset,
        });
      }
    }
  }
  const texts = found.filter((item) => item.kind === 'text');
  for (const outer of texts) {
    const nested = texts.find(
      (inner) => inner !== outer && inner.start >= outer.start && inner.end <= outer.end,
    );
    if (nested) throw new Error(`data-i="${nested.key}" is nested inside data-i="${outer.key}"`);
  }
  return found;
}

const escapeHtml = (text) =>
  String(text).replace(
    /[&<>"]/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[char],
  );

/** Lists every translation key used by a piece of markup. */
export function translationKeys(html) {
  return [...new Set(annotations(html).map((item) => item.key))];
}

/** Reads the English source of every annotated text and attribute. */
export function extractMarkup(html) {
  const dictionary = {};
  for (const item of annotations(html)) {
    dictionary[item.key] = item.kind === 'text' ? html.slice(item.start, item.end) : item.value;
  }
  return dictionary;
}

/** Returns the markup with every annotated text and attribute replaced from `dictionary`. */
export function localizeMarkup(html, dictionary) {
  let result = html;
  const edits = annotations(html)
    .filter((item) => dictionary[item.key])
    .sort((a, b) => b.start - a.start);
  for (const item of edits) {
    const text = escapeHtml(dictionary[item.key]);
    const replacement =
      item.kind === 'text' ? text.replaceAll('\n', '<br>') : `${item.attribute}="${text}"`;
    result = result.slice(0, item.start) + replacement + result.slice(item.end);
  }
  return result;
}
