/**
 * Builds the site into dist/:
 *
 *   index.html, portfolio.html  the page, assembled from src/partials and content/
 *   app.js                      bundled from src/scripts/portfolio
 *   dots.js                     vendor dot grid + the background that uses it
 *   style.css                   from src/styles
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { phases } from '../src/live-build/phases.js';
import { bundle } from './lib/bundle.mjs';
import { renderProjects, renderToolkit } from './lib/content.mjs';
import { extractMarkup } from './lib/markup.mjs';
import {
  bodyOf,
  createPartResolver,
  expandProjectPhases,
  resolvePhases,
  staticPage,
} from './lib/page.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fromRoot = (...segments) => path.join(root, ...segments);
const read = (...segments) => fs.readFileSync(fromRoot(...segments), 'utf8');
const readJson = (...segments) => JSON.parse(read(...segments));
const readOptional = (...segments) =>
  fs.existsSync(fromRoot(...segments)) ? read(...segments) : undefined;
const readPartial = (name) => read('src', 'partials', `${name}.html`);

export function loadContent() {
  const rendered = renderProjects(readJson('content', 'projects.json'), (id, part) =>
    readOptional('content', 'projects', id, `${part}.html`),
  );
  return {
    projects: rendered.projects,
    projectTranslations: rendered.translations,
    toolkit: renderToolkit(readJson('content', 'technologies.json')),
  };
}

/** Concatenates the numbered stylesheets of src/styles/<folder> in order. */
export function readStyles(folder) {
  const directory = fromRoot('src', 'styles', folder);
  return fs
    .readdirSync(directory)
    .filter((file) => file.endsWith('.css'))
    .sort()
    .map((file) => fs.readFileSync(path.join(directory, file), 'utf8'))
    .join('\n');
}

/**
 * Runtime dictionaries: English comes from the markup itself plus src/i18n/en.json,
 * Spanish from src/i18n/es.json plus the project texts in content/.
 * Fails when a key has no Spanish text, so a missing translation never ships.
 * (Spanish keys of hidden projects are allowed to be unused.)
 */
export function buildDictionaries(markup, projectTranslations) {
  const en = { ...extractMarkup(markup), ...readJson('src', 'i18n', 'en.json') };
  const es = { ...readJson('src', 'i18n', 'es.json'), ...projectTranslations };
  const missing = Object.keys(en).filter((key) => !es[key]);
  if (missing.length) throw new Error(`Missing Spanish translations: ${missing.join(', ')}`);
  return { en, es };
}

export async function build({ outDir = fromRoot('dist') } = {}) {
  const content = loadContent();
  const pagePhases = expandProjectPhases(phases, content.projects);
  const resolverFor = (lang, dictionary) =>
    createPartResolver({
      readPartial,
      toolkit: content.toolkit,
      projects: content.projects,
      lang,
      title: readJson('src', 'i18n', `${lang}.json`).pageTitle,
      dictionary,
    });

  // The markup is authored in English; Spanish is applied at runtime from the dictionary.
  const english = resolvePhases(pagePhases, resolverFor('en'));
  const dictionaries = buildDictionaries(bodyOf(english), content.projectTranslations);

  const styles = readStyles('portfolio');
  const app = await bundle(fromRoot('src', 'scripts', 'portfolio', 'main.js'), {
    i18n: dictionaries,
  });
  const dots = [
    read('src', 'vendor', 'interactive-dot-grid', 'dot-grid.js'),
    await bundle(fromRoot('src', 'scripts', 'shared', 'dot-background.js')),
  ].join('\n');

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const write = (file, value) => fs.writeFileSync(path.join(outDir, file), value);
  const copy = (file, ...source) => fs.copyFileSync(fromRoot(...source), path.join(outDir, file));
  const page = staticPage({ head: readPartial('head'), body: bodyOf(english) });
  write('index.html', page);
  write('portfolio.html', page);
  write('app.js', app);
  write('dots.js', dots);
  write('style.css', styles);
  copy('Yelisson-Ortiz-CV.pdf', 'src', 'assets', 'Yelisson-Ortiz-CV.pdf');
  copy('interactive-dot-grid-LICENSE.txt', 'src', 'vendor', 'interactive-dot-grid', 'LICENSE.txt');
  return { projects: content.projects.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { projects } = await build();
  console.log(`Built dist/ with ${projects} visible project(s).`);
}
