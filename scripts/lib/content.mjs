/**
 * Turns the data in content/ into markup for the projects and the technology toolkit.
 * Every rendered string that can change language gets a `data-i` key, and its Spanish
 * text is returned in `translations` so the site can switch language at runtime.
 */

const escape = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );

function httpsUrl(value) {
  if (!/^https:\/\//.test(value)) throw new Error(`Expected an HTTPS URL: ${value}`);
  return escape(value);
}

function createTranslator() {
  const translations = {};
  const localized = (tag, key, text, attributes = '') => {
    if (typeof text?.en !== 'string' || typeof text?.es !== 'string') {
      throw new Error(`Missing en/es text: ${key}`);
    }
    translations[key] = text.es;
    const attrs = attributes ? `${attributes} ` : '';
    return `<${tag} ${attrs}data-i="${key}">${escape(text.en)}</${tag}>`;
  };
  return { translations, localized };
}

export function validateProjects(projects) {
  const ids = new Set();
  for (const project of projects) {
    if (!/^[a-z0-9-]+$/.test(project.id) || ids.has(project.id)) {
      throw new Error(`Project IDs must be unique lowercase slugs: "${project.id}"`);
    }
    ids.add(project.id);
  }
}

function defaultVisual(project) {
  return [
    '<div class="project-visual">',
    `  <span class="visual-label">${escape(project.name)}</span>`,
    `  <div class="product-wordmark" aria-hidden="true">${escape(project.name.slice(0, 2))}</div>`,
    `  <span class="visual-bottom">${escape((project.technologies ?? []).join(' / '))}</span>`,
    '</div>',
  ].join('\n');
}

/**
 * @param {object[]} projects entries from content/projects.json
 * @param {(id: string, part: 'visual' | 'details') => string | undefined} readPartial
 *   optional custom markup stored in content/projects/<id>/<part>.html
 */
export function renderProjects(projects, readPartial = () => undefined) {
  validateProjects(projects);
  const { translations, localized } = createTranslator();
  const rendered = projects
    .filter((project) => project.visible !== false)
    .map((project) => {
      const prefix = `project-${project.id}`;
      const demo = project.demo?.enabled
        ? `<button type="button" class="demo-launch button" aria-haspopup="dialog" data-project-name="${escape(project.name)}" data-project-url="${httpsUrl(project.demo.url)}" data-i="tryProject">Try project</button>`
        : '';
      const links = (project.links ?? [])
        .map((link, index) =>
          localized(
            'a',
            `${prefix}-link-${index}`,
            link.label,
            `class="${link.primary ? 'button primary' : 'repo-link'}" href="${httpsUrl(link.url)}" target="_blank" rel="noopener noreferrer"`,
          ),
        )
        .join('');
      const notice = project.notice ? localized('span', `${prefix}-notice`, project.notice) : '';
      const html = [
        `<article class="${escape(project.className ?? 'project reveal')}" data-project="${escape(project.id)}">`,
        '<div class="project-copy">',
        localized('p', `${prefix}-label`, project.label, 'class="eyebrow"'),
        `<h3>${escape(project.name)}</h3>`,
        localized('p', `${prefix}-description`, project.description),
        readPartial(project.id, 'details') ?? '',
        demo,
        `<div class="project-links">${links}${notice}</div>`,
        '</div>',
        readPartial(project.id, 'visual') ?? defaultVisual(project),
        '</article>',
      ]
        .filter(Boolean)
        .join('\n');
      return { id: project.id, name: project.name, html };
    });
  return { projects: rendered, translations };
}

export function renderToolkit(groups) {
  const rows = groups.map((group) => {
    if (!Array.isArray(group.items) || group.items.some((item) => typeof item !== 'string')) {
      throw new Error(`Technology items must be strings (group "${group.id}")`);
    }
    // The badges are rendered twice so the marquee can loop without a visible seam.
    const badges = group.items
      .map((item) => `<span class="tech-badge">${escape(item)}</span>`)
      .join('');
    return [
      '<div class="tech-row">',
      '<div class="marquee-track">',
      `<div class="tech-group">${badges}</div>`,
      `<div class="tech-group" aria-hidden="true">${badges}</div>`,
      '</div>',
      '</div>',
    ].join('\n');
  });
  return [
    '<div class="expertise-strip" aria-label="Technologies and tools" data-i-aria-label="toolkitLabel">',
    '<div class="tech-heading">',
    '<p class="eyebrow" data-i="techLabel">MY TOOLKIT</p>',
    '<span data-i="techHint">From frontend to deployment</span>',
    '</div>',
    ...rows,
    '</div>',
  ].join('\n');
}
