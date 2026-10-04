import assert from 'node:assert/strict';
import fs from 'node:fs';
import { describe, it } from 'node:test';
import { renderProjects, renderToolkit } from '../scripts/lib/content.mjs';
import { translationKeys } from '../scripts/lib/markup.mjs';

const root = new URL('../', import.meta.url);
const read = (path) => fs.readFileSync(new URL(path, root), 'utf8');
const readJson = (path) => JSON.parse(read(path));
const readOptional = (path) => (fs.existsSync(new URL(path, root)) ? read(path) : undefined);

const en = readJson('src/i18n/en.json');
const es = readJson('src/i18n/es.json');

/** Every key used anywhere in the markup, including projects that are currently hidden. */
function markupKeys() {
  const partials = fs
    .readdirSync(new URL('src/partials/', root))
    .map((file) => read(`src/partials/${file}`));
  const allProjects = readJson('content/projects.json').map((project) => ({
    ...project,
    visible: true,
  }));
  const { projects } = renderProjects(allProjects, (id, part) =>
    readOptional(`content/projects/${id}/${part}.html`),
  );
  const toolkit = renderToolkit(readJson('content/technologies.json'));
  const keys = [...partials, toolkit, ...projects.map((project) => project.html)].flatMap(
    translationKeys,
  );
  // Project texts come from content/projects.json and are translated there.
  return new Set(keys.filter((key) => !key.startsWith('project-')));
}

describe('translations', () => {
  const used = markupKeys();

  it('every translated string in the markup has Spanish text', () => {
    const missing = [...used].filter((key) => !es[key]);
    assert.deepEqual(missing, []);
  });

  it('every script message exists in both languages', () => {
    assert.deepEqual(
      Object.keys(en).filter((key) => !es[key]),
      [],
    );
  });

  it('src/i18n/es.json has no unused keys', () => {
    const unused = Object.keys(es).filter((key) => !used.has(key) && !(key in en));
    assert.deepEqual(unused, []);
  });

  it('script messages do not shadow strings that live in the markup', () => {
    assert.deepEqual(
      Object.keys(en).filter((key) => used.has(key)),
      [],
    );
  });
});
