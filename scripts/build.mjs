/**
 * Builds the site into dist/:
 *
 *   index.html           launcher that builds the portfolio live (src/pages/index.html)
 *   portfolio.html       the finished page, for visitors who skip the animation
 *   live-source.json     the phases the launcher types (src/live-build/phases.js)
 *   app.js, boot.js      bundled from src/scripts/portfolio and src/scripts/boot
 *   dots.js              vendor dot grid + the background that uses it
 *   style.css, boot.css  from src/styles
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { fontStylesheet, phases } from '../src/live-build/phases.js';
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

  // The markup is authored in English; Spanish is produced at build time from the dictionary.
  const english = resolvePhases(pagePhases, resolverFor('en'));
  const dictionaries = buildDictionaries(bodyOf(english), content.projectTranslations);
  const spanish = resolvePhases(pagePhases, resolverFor('es', dictionaries.es));

  const styles = readStyles('portfolio');
  const app = await bundle(fromRoot('src', 'scripts', 'portfolio', 'main.js'), {
    i18n: dictionaries,
  });
  const boot = await bundle(fromRoot('src', 'scripts', 'boot', 'main.js'));
  const dots = [
    read('src', 'vendor', 'interactive-dot-grid', 'dot-grid.js'),
    await bundle(fromRoot('src', 'scripts', 'shared', 'dot-background.js')),
  ].join('\n');

  const liveSource = {
    font: fontStylesheet,
    phases: english.map((phase, index) => {
      if (phase.kind === 'css') return { ...phase, source: styles };
      if (phase.kind === 'js') {
        // Everything the visitor watched being built is already on screen.
        const revealAll =
          "document.querySelectorAll('.reveal').forEach((el) => el.classList.add('visible'));";
        return { ...phase, source: [revealAll, app, dots].join('\n') };
      }
      const translated = spanish[index];
      return {
        ...phase,
        source: { en: phase.source, es: translated.source },
        ...(phase.prelude && { prelude: { en: phase.prelude, es: translated.prelude } }),
      };
    }),
  };

  fs.rmSync(outDir, { recursive: true, force: true });
  fs.mkdirSync(outDir, { recursive: true });
  const write = (file, value) => fs.writeFileSync(path.join(outDir, file), value);
  const copy = (file, ...source) => fs.copyFileSync(fromRoot(...source), path.join(outDir, file));
  write('index.html', read('src', 'pages', 'index.html'));
  write('portfolio.html', staticPage({ head: readPartial('head'), body: bodyOf(english) }));
  write('live-source.json', JSON.stringify(liveSource));
  write('app.js', app);
  write('boot.js', boot);
  write('dots.js', dots);
  write('style.css', styles);
  write('boot.css', read('src', 'styles', 'boot.css'));
  copy('Yelisson-Ortiz-CV.pdf', 'src', 'assets', 'Yelisson-Ortiz-CV.pdf');
  copy('interactive-dot-grid-LICENSE.txt', 'src', 'vendor', 'interactive-dot-grid', 'LICENSE.txt');
  return { projects: content.projects.length, phases: liveSource.phases.length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { projects, phases: count } = await build();
  console.log(`Built dist/ with ${projects} visible project(s) and ${count} live-build phases.`);
}
