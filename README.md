# Yelisson Ortiz — Portfolio

A portfolio that **builds itself in front of the visitor**. A terminal opens, and the
real source code of the page is typed into an iframe while borders are drawn, letters
glow and each section appears. Visitors can skip the animation, switch between English
and Spanish, toggle a light or dark theme, try a live project demo, or type
`destroy` to watch the page fall apart and build it again.

The site is HTML, CSS and JavaScript with no framework. A small Node.js build step
assembles it from partials and data.

## Highlights

- **Live build engine.** `index.html` streams `live-source.json` into an iframe with
  `document.write`. The typing speed adapts so every phase lasts a fixed time, and
  the iframe scrolls to follow the code being written. Borders are traced with SVG,
  and new letters glow using the CSS Custom Highlight API.
- **One source of truth.** The same ordered list of phases
  ([`src/live-build/phases.js`](src/live-build/phases.js)) produces the static
  `portfolio.html` and the live build, so the two can never drift apart.
- **Build-time i18n.** Markup is written in English and annotated with `data-i`
  keys. The build reads the English text from the markup, merges it with
  [`src/i18n/es.json`](src/i18n/es.json), fails if a translation is missing, and
  generates the Spanish version of the live build ahead of time.
- **Content as data.** Projects, technologies and work experience live in
  [`content/`](content), and each project can have its own custom markup.
- **Accessible and respectful of preferences.** Includes a skip link, ARIA labels in
  both languages, keyboard support, `prefers-reduced-motion`, and a pause-animations
  button.

## Getting started

Requires Node.js 22 (see [`.nvmrc`](.nvmrc)).

```sh
npm install
npm start          # builds into dist/ and serves it at http://localhost:4173
```

The launcher fetches `live-source.json`, so the site must be served over HTTP.
Opening `dist/index.html` directly from disk will not work.

| Script             | What it does                                                  |
| ------------------ | ------------------------------------------------------------- |
| `npm run build`    | Builds the site into `dist/`                                  |
| `npm start`        | Builds and serves `dist/` locally                             |
| `npm test`         | Unit tests (`node:test`): build, i18n, content, hero examples |
| `npm run test:e2e` | End-to-end tests in Chromium (Playwright), desktop and mobile |
| `npm run lint`     | ESLint                                                        |
| `npm run format`   | Prettier                                                      |
| `npm run check`    | Formatting, lint, build and unit tests (what CI runs first)   |

Run `npx playwright install chromium` once before the first end-to-end run.

## Project structure

```
content/                 Data: projects, technologies, work experience
  projects/<id>/         Optional custom markup for a project (visual.html, details.html)
src/
  pages/index.html       The launcher
  partials/              Sections of the portfolio page (header, hero, work…)
  live-build/phases.js   Order, duration and labels of each build phase
  i18n/                  Spanish texts (es.json) and script-only English messages (en.json)
  scripts/portfolio/     The portfolio page, one module per feature
  scripts/boot/          The launcher: live build engine, drawing effects, destroy
  scripts/shared/        Code used by both pages (storage keys, dot-grid background)
  styles/                Stylesheets, concatenated in file-name order
  vendor/                Third-party code (interactive-dot-grid, MIT)
scripts/                 Build script and local server
test/                    Unit tests
e2e/                     End-to-end tests
```

## How the build works

```
content/ + src/partials/ ──► phases (English) ──► portfolio.html
                                  │
                         src/i18n/es.json
                                  ▼
                           phases (Spanish) ──► live-source.json ◄── style.css, app.js, dots.js
src/scripts/portfolio/ ──► esbuild ──► app.js
src/scripts/boot/      ──► esbuild ──► boot.js
```

The bundles are not minified on purpose: visitors watch them being typed in the
console.

## Editing content

- **Projects:** edit [`content/projects.json`](content/projects.json). Every text
  field takes `{ "en": "…", "es": "…" }`. Set `"visible": false` to hide a project
  without deleting it. Links must use HTTPS. If a project has no custom
  `visual.html`, a default card is generated.
- **Technologies:** edit [`content/technologies.json`](content/technologies.json).
- **Experience:** edit [`content/experience.json`](content/experience.json).
- **Static text:** edit the English text in `src/partials/` and add the Spanish
  translation under the same key in `src/i18n/es.json`. `npm test` reports missing
  and unused keys.

## Deployment

The site deploys on [Vercel](https://vercel.com) using [`vercel.json`](vercel.json),
which runs `npm run build` and serves `dist/`. No environment variables are needed.

## Credits

The dot-grid background is based on
[interactive-dot-grid](https://github.com/sathishk-dev/interactive-dot-grid) 0.1.2
(MIT), kept as a modified copy in [`src/vendor/interactive-dot-grid`](src/vendor/interactive-dot-grid).
