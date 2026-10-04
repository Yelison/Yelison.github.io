import { localizeMarkup } from './markup.mjs';

const PROJECTS_SLOT = '<!-- @projects -->';

/** Replaces the `projects` phase with one phase per visible project. */
export function expandProjectPhases(phases, projects) {
  return phases.flatMap((phase) =>
    phase.kind === 'projects'
      ? projects.map((project) => ({
          kind: 'html',
          file: phase.file,
          duration: phase.duration,
          label: {
            en: phase.label.en.replace('{name}', project.name),
            es: phase.label.es.replace('{name}', project.name),
          },
          parts: [`@project:${project.id}`],
        }))
      : [phase],
  );
}

/** The head written into the live-build iframe before anything is typed. */
export function liveDocumentHead({ lang, title }) {
  return [
    '<!doctype html>',
    `<html lang="${lang}" data-theme="dark">`,
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="theme-color" content="#111216">',
    '<meta name="description" content="Full-Stack Developer — Yelisson Ortiz">',
    `<title>${title}</title>`,
    '</head>',
    '<body>',
    '',
  ].join('\n');
}

/**
 * Resolves the `parts` of a phase (see src/live-build/phases.js) into markup in one
 * language. Each part is translated on its own, so no partial has to be split.
 */
export function createPartResolver({ readPartial, toolkit, projects, lang, title, dictionary }) {
  const localize = (html) => (dictionary ? localizeMarkup(html, dictionary) : html);
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  return function resolve(part) {
    if (part.startsWith('<')) return part;
    if (part === '@live-document') return liveDocumentHead({ lang, title });
    if (part === '@toolkit') return localize(toolkit);
    if (part.startsWith('@project:'))
      return localize(projectsById.get(part.slice('@project:'.length)).html);
    const [name, slot] = part.split(':');
    const html = readPartial(name);
    if (!slot) return localize(html.trimEnd());
    const index = html.indexOf(PROJECTS_SLOT);
    if (index < 0) throw new Error(`Partial "${name}" has no ${PROJECTS_SLOT} slot`);
    const piece =
      slot === 'before' ? html.slice(0, index) : html.slice(index + PROJECTS_SLOT.length);
    return localize(piece.trim());
  };
}

const joinParts = (parts) => parts.join('\n') + '\n';

/** Resolves every HTML phase to markup: `{ ...phase, source, prelude? }`. */
export function resolvePhases(phases, resolve) {
  return phases.map((phase) => {
    if (phase.kind !== 'html') return phase;
    const { parts, prelude, ...rest } = phase;
    return {
      ...rest,
      source: phase.setup ? parts.map(resolve).join('') : joinParts(parts.map(resolve)),
      ...(prelude && { prelude: joinParts(prelude.map(resolve)) }),
    };
  });
}

/** Everything the live build types into <body>, in order. */
export const bodyOf = (resolvedPhases) =>
  resolvedPhases
    .filter((phase) => phase.kind === 'html' && !phase.setup)
    .map((phase) => (phase.prelude ?? '') + phase.source)
    .join('');

/** The static portfolio page: the same body the live build types, behind a regular head. */
export function staticPage({ head, body }) {
  const indentedHead = head
    .trimEnd()
    .split('\n')
    .map((line) => (line ? `  ${line}` : line))
    .join('\n');
  return `<!doctype html>\n<html lang="en" data-theme="dark">\n<head>\n${indentedHead}\n</head>\n<body>\n${body}`;
}
