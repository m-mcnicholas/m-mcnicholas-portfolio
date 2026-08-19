# Michael McNicholas — Project Portfolio

A progressively enhanced project archive. Its base experience is a complete semantic card catalogue; supported desktop browsers enhance that catalogue into a perspective-rendered Three.js study with a reading stand, open book, and chronological stack of selectable volumes.

The application never requires WebGL to reach a project. Phones, narrow windows, JavaScript-disabled visits, initialization failures, and lost WebGL contexts retain or return to the same semantic archive.

## Requirements and local development

- Node.js 20.19+ or 22.12+
- npm
- A current Chrome, Edge, Firefox, or Safari release for the application
- Chromium installed through Playwright for automated rendered checks

Install and run the development server:

```sh
npm install
npm run dev
```

Vite prints the local URL, normally `http://localhost:5173`.

Build the static production output:

```sh
npm run build
npm run preview
```

Deploy the contents of `dist/`. Vite uses relative production asset URLs, so the output can be hosted at a domain root or a nested static-hosting path. Both the portfolio and `examples/index.html` are production build inputs.

Run the rendered browser checks:

```sh
npx playwright install chromium --no-shell
npm run test:e2e
```

## Application structure

| File | Responsibility |
| --- | --- |
| `index.html` | Single semantic source for general information and all project content; also the no-JavaScript/mobile archive |
| `script.js` | Reads records, initializes enhancement, creates semantic spine buttons, owns selection state, accessibility synchronization, route switching, and failure recovery |
| `scene.js` | Three.js camera, geometry, lights, procedural materials, projected DOM layout, interruptible spine motion, and GPU cleanup |
| `styles.css` | Archive layout, readable page overlays, physical spine controls, mode switching, focus states, and responsive/reduced-motion rules |
| `examples/` | Local example destinations used until real projects replace the sample records |
| `tests/` | Playwright checks for composition, interaction, no-JavaScript behavior, responsiveness, maintainability, and WebGL recovery |
| `vite.config.js` | Relative deployment paths and multi-page production inputs |

Three.js `0.180.0` is installed locally through npm and bundled by Vite. The released site has no CDN or runtime texture dependency.

## Data flow

`#project-records` in `index.html` is the sole project-content source. The first article is the permanent information record. Remaining records are projects ordered newest to oldest.

At desktop initialization, `script.js` reads each article once and creates an in-memory record. That same record supplies:

- the visible semantic spine label;
- the corresponding Three.js closed-book material and position;
- the selected open-book title, date, summary, details, and destination;
- accessible button names, pressed states, browser title, and live announcement;
- the mobile, no-JavaScript, narrow-screen, and WebGL-failure archive already present in HTML.

`scene.js` calculates stack levels from record count and document order. The oldest project therefore remains lowest without project-specific coordinates. The test suite injects an eighth temporary record and verifies that its archive card, spine, selected-book content, and destination appear automatically; the fixture never modifies source content.

See [ADDING_PROJECTS.md](ADDING_PROJECTS.md) for the exact entry contract and workflow.

## Desktop scene and camera

The enhanced room is enabled only at `1100px` wide or larger and at least `650px` tall. Smaller viewports use the archive instead of squeezing the room.

The Three.js perspective camera uses a nearly level reading sightline (a responsive `32–35°` field of view, positioned around `(0, 3.35, 14.4)` and aimed near `(0, 2.75, 0.25)`). Pages are modeled in an upright X/Y plane on a lectern. Aspect-ratio breakpoints shift the lectern into available left space and slightly open/recenter the camera on taller laptop screens, preserving a measured gutter before the selected spine. At 1280 × 720 the projected semantic page overlay occupies about 55.8% of viewport width, while all seven current spine labels remain exposed.

Important scene logic lives in `scene.js`:

- `addRoom()` builds the desk, dimensional wall paneling, recessed bookcases, shelf volumes, lamp, framed artwork, and reserved props.
- `addReadingStandAndBook()` builds cover thickness, page blocks, curved page faces, hinge, lectern board, ledge, and support.
- `addStack()` derives every closed book from project order.
- `updateDomLayout()` projects physical page and spine coordinates into screen-space bounds for the semantic HTML controls.
- `canvasTexture()` and the `make*Texture()` helpers produce local wood, paper, leather/cloth, scuffs, worn edges, and artwork textures. These maps also provide restrained bump detail on lit surfaces.

To replace a procedural texture, import a repository asset with a module-relative URL—for example `new URL("./assets/wood.webp", import.meta.url)`—and load it through `THREE.TextureLoader`. Keep assets inside the repository, preserve the existing fallback colors, handle load errors without aborting initialization, and verify production URLs with `npm run build`.

## Selection, motion, and accessibility

Spines are native buttons, not canvas hit targets. Destinations and the archive card are native links. Selection updates page content, link URL, `aria-pressed`, document title, and the polite status region synchronously before motion begins.

The optional 180ms motion has no content authority. Every selection cancels the active `requestAnimationFrame`, reads current book positions, and retargets toward the newest selection. The page Web Animation is likewise cancelled before replacement. Consequently, rapid input cannot queue or restore an older record, and the destination is usable immediately.

When `prefers-reduced-motion: reduce` matches, both the Three.js spine movement and page animation are skipped. Content still changes synchronously.

Keyboard support includes:

- Tab access to every spine and link;
- native Enter and Space button activation;
- Left/Up and Right/Down movement between records;
- Home and End movement to the first and last records;
- a visible non-color-only focus outline;
- a physical selected state using position, brightness, shadow, a brass edge, and `aria-pressed`;
- concise selection announcements through a polite live region.

## Progressive enhancement and failure behavior

The archive is visible by default. The study stays hidden while Three.js imports, validates semantic data, creates a renderer, prepares textures, and completes a full-size warm-up render. Only then does `script.js` apply `webgl-ready` and hide the archive.

Fallback behavior is automatic when:

- JavaScript is disabled or its bundle fails to load;
- the viewport is below the enhanced-scene threshold;
- record validation or WebGL renderer creation throws;
- the WebGL context is lost after initialization.

The diegetic catalogue card switches from the study to the archive. The archive’s return link reverses that mode on supported desktop viewports. CSS ensures the complete study and complete archive are not displayed together.

There is no perpetual render loop. Three.js renders after initialization, resize, selection motion, and state changes only. `dispose()` releases geometries, materials, procedural textures, the renderer, listeners, and animation frames after a lost context.

## Verification

See [DESIGN_AND_TESTING.md](DESIGN_AND_TESTING.md) for the measured checks, inspected screenshots, failure scenarios, and known limits.
