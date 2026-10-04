import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { renderProjects, renderToolkit } from '../scripts/lib/content.mjs';

const project = (overrides = {}) => ({
  id: 'sample',
  name: 'Sample',
  label: { en: 'PERSONAL PROJECT', es: 'PROYECTO PERSONAL' },
  description: { en: 'A new project', es: 'Un proyecto nuevo' },
  technologies: ['React', 'TypeScript'],
  demo: { enabled: true, url: 'https://example.com/' },
  links: [{ label: { en: 'Source', es: 'Código' }, url: 'https://github.com/Yelison' }],
  ...overrides,
});

describe('renderProjects', () => {
  it('renders a project without custom markup', () => {
    const { projects, translations } = renderProjects([project()]);
    assert.equal(projects.length, 1);
    const [{ html }] = projects;
    assert.match(html, /<article class="project reveal" data-project="sample">/);
    assert.match(html, /data-project-name="Sample" data-project-url="https:\/\/example.com\/"/);
    assert.match(html, /<div class="product-wordmark" aria-hidden="true">Sa<\/div>/);
    assert.match(html, /React \/ TypeScript/);
    assert.equal(translations['project-sample-description'], 'Un proyecto nuevo');
    assert.equal(translations['project-sample-link-0'], 'Código');
  });

  it('uses the custom visual and details partials when they exist', () => {
    const { projects } = renderProjects(
      [project()],
      (id, part) => `<div class="${part}-of-${id}"></div>`,
    );
    assert.match(projects[0].html, /details-of-sample/);
    assert.match(projects[0].html, /visual-of-sample/);
    assert.doesNotMatch(projects[0].html, /product-wordmark/);
  });

  it('skips hidden projects', () => {
    const { projects } = renderProjects([project(), project({ id: 'hidden', visible: false })]);
    assert.deepEqual(
      projects.map((p) => p.id),
      ['sample'],
    );
  });

  it('omits the demo button when the demo is disabled', () => {
    const { projects } = renderProjects([project({ demo: { enabled: false } })]);
    assert.doesNotMatch(projects[0].html, /demo-launch/);
  });

  it('rejects duplicated or malformed IDs', () => {
    assert.throws(() => renderProjects([project(), project()]), /unique/);
    assert.throws(() => renderProjects([project({ id: 'Not A Slug' })]), /unique lowercase slugs/);
  });

  it('requires HTTPS links and both languages', () => {
    assert.throws(
      () => renderProjects([project({ demo: { enabled: true, url: 'http://example.com' } })]),
      /HTTPS/,
    );
    assert.throws(() => renderProjects([project({ label: { en: 'Only English' } })]), /en\/es/);
  });

  it('escapes content', () => {
    const { projects } = renderProjects([project({ name: '<script>' })]);
    assert.match(projects[0].html, /<h3>&lt;script&gt;<\/h3>/);
  });
});

describe('renderToolkit', () => {
  it('renders every technology twice so the marquee loops seamlessly', () => {
    const html = renderToolkit([{ id: 'frontend', items: ['React', 'New technology'] }]);
    assert.equal(html.match(/New technology/g).length, 2);
    assert.match(html, /<div class="tech-group" aria-hidden="true">/);
  });

  it('rejects non-string items', () => {
    assert.throws(() => renderToolkit([{ id: 'x', items: [{}] }]), /strings/);
  });
});
