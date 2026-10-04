/**
 * The portfolio page described as an ordered list of build phases.
 *
 * The same list produces both entry points, so they can never drift apart:
 *  - `portfolio.html` concatenates every HTML phase into a regular static page;
 *  - `live-source.json` feeds the console on `index.html`, which types each phase
 *    into an iframe while the page draws itself.
 *
 * `parts` accepts:
 *  - a partial name             → src/partials/<name>.html
 *  - `<partial>:before|after`   → the partial split at its `<!-- @projects -->` slot
 *  - `@toolkit`                 → generated from content/technologies.json
 *  - literal markup (`<main>`)  → copied as is
 *
 * `prelude` parts are written instantly before the phase starts typing.
 * `setup` phases are applied before the console appears and are never typed.
 * `duration` is the typing time in milliseconds, independent of the source length.
 */
export const fontStylesheet =
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;550;600;650;700&family=DM+Mono:wght@400&display=swap';

export const phases = [
  {
    kind: 'html',
    file: 'index.html',
    setup: true,
    parts: ['@live-document'],
    duration: 1000,
    label: { en: 'Creating the document', es: 'Creando el documento' },
  },
  {
    kind: 'css',
    file: 'style.css',
    setup: true,
    duration: 4500,
    label: {
      en: 'Preparing the styles before the content',
      es: 'Preparando los estilos antes del contenido',
    },
  },
  {
    kind: 'html',
    file: 'index.html',
    prelude: ['body-start'],
    parts: ['header', '<main>'],
    duration: 825,
    label: { en: 'Building the header', es: 'Construyendo el encabezado' },
  },
  {
    kind: 'html',
    file: 'index.html',
    parts: ['hero'],
    duration: 1760,
    label: { en: 'Building the introduction', es: 'Construyendo la presentación' },
  },
  {
    kind: 'html',
    file: 'index.html',
    parts: ['@toolkit'],
    duration: 630,
    label: { en: 'Adding the technology toolkit', es: 'Añadiendo las tecnologías' },
  },
  {
    kind: 'html',
    file: 'index.html',
    parts: ['work:before'],
    duration: 420,
    label: { en: 'Creating the project section', es: 'Creando la sección de proyectos' },
  },
  {
    // Expanded into one phase per visible project.
    kind: 'projects',
    file: 'index.html',
    duration: 1470,
    label: { en: 'Building {name}', es: 'Construyendo {name}' },
  },
  {
    kind: 'html',
    file: 'index.html',
    parts: ['work:after'],
    duration: 210,
    label: { en: 'Finishing the projects', es: 'Terminando los proyectos' },
  },
  {
    kind: 'html',
    file: 'index.html',
    parts: ['experience'],
    duration: 525,
    label: { en: 'Adding professional experience', es: 'Añadiendo la experiencia' },
  },
  {
    kind: 'html',
    file: 'index.html',
    parts: ['contact'],
    duration: 630,
    label: { en: 'Building the contact section', es: 'Construyendo el contacto' },
  },
  {
    kind: 'html',
    file: 'index.html',
    parts: ['</main>', 'footer', 'project-demo', '</body>\n</html>'],
    duration: 350,
    label: { en: 'Finishing the document', es: 'Terminando el documento' },
  },
  {
    kind: 'js',
    file: 'app.js',
    duration: 700,
    label: { en: 'Connecting the interactions', es: 'Conectando las interacciones' },
  },
];
