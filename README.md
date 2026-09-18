# Michael McNicholas — Portfolio

A project-first portfolio: one scrolling page that leads with **Cipher Twins**,
then shows two experiments in an open **Extra Projects** folder. Plain HTML,
CSS, and a tiny script, built with Vite.

## Structure

```
index.html                  Homepage. Project text, dates, tags, and links live here.
styles.css                  Homepage styles (neutral base + notebook and folder "worlds").
script.js                   Scroll reveal only; the page works without it.
assets/screenshots/*.webp   One optimized screenshot per project (decorative, alt="").
projects/boolean-logic/     Boolean Logic Playground demo (local route).
projects/generative-tree/   Procedural L-System Forest demo (local route, Three.js).
tests/                      Unit tests (node:test) and browser tests (Playwright).
scripts/check-repository.mjs  Whitespace and local-link check.
PROJECTS.md                 Checklist of the projects the site must include.
```

Cipher Twins lives in its own repository and is linked at
<https://m-mcnicholas.github.io/cipher-twins-game/>; there is no source for it here.

## Local commands

```sh
npm ci               # install
npm run dev          # dev server at http://localhost:5173
npm run build        # production build into dist/
npm run preview      # serve dist/ to check the production build
npm run check        # whitespace + local link check
npm run test:logic   # Boolean Logic unit tests
npm run test:e2e     # Playwright browser tests (starts the dev server itself)
```

The first browser-test run needs `npx playwright install chromium`. To use an
installed Chrome instead, set `PLAYWRIGHT_CHANNEL=chrome`.

## Updating a project

1. Edit its entry in `index.html` (description, date, `datetime`, tags, link).
   Keep the entry as semantic markup; there is no data layer.
2. Replace its screenshot in `assets/screenshots/` with a WebP of about 1200 px
   width, for example `cwebp -q 80 -resize 1200 0 shot.png -o assets/screenshots/name.webp`.
   Update the `width`/`height` attributes to match, so the page does not shift.
3. Update `PROJECTS.md` if the list of projects changes.
4. To add a new local demo, put it in `projects/<name>/index.html`, add it to
   `build.rollupOptions.input` in `vite.config.js`, and give it a
   `../../index.html#extra-projects` back link.
5. Run `npm run check`, `npm run test:logic`, `npm run test:e2e`, and
   `npm run build && npm run preview` before merging.

## Deployment

Pushing to `main` runs `.github/workflows/deploy-pages.yml`, which runs the logic
tests, the repository check, and a production build, then publishes `dist/` to
GitHub Pages. `vite.config.js` sets `base: "./"`, so the site works from a
domain root or a project path. `.github/workflows/ci.yml` also runs the browser
tests on every push and pull request.
