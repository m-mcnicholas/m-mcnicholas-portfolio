# Michael McNicholas — Project Portfolio

A progressively enhanced project archive. Its base experience is a complete semantic reading ledger; supported desktop browsers enhance that ledger into a perspective-rendered Three.js study with a reading stand, open book, and chronological stack of selectable volumes.

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

Deploy the contents of `dist/`. Vite uses relative production asset URLs, so the output can be hosted at a domain root or a nested static-hosting path.

### Play Cipher Twins across two computers on the same network

Cipher Twins needs one browser per player. To try it on two machines on the
same Wi-Fi or LAN without deploying:

```sh
npm run preview:lan   # builds, then serves the production output on every interface
npm run dev:lan        # skips the build and serves the live dev server instead
```

Each command prints a `http://<this-machine-ip>:<port>/projects/cipher-twins/`
address. Open that address on the other computer, one player hosts, the other
joins with the room code.

Loading the page only needs the local network. Connecting the two players still
needs outbound internet on both machines, because the WebRTC handshake uses the
public PeerJS broker and STUN/TURN servers described in
`projects/cipher-twins/network.js`. If a computer cannot reach the preview
address, allow Node through its firewall or check for a VPN capturing local
traffic.

Run the rendered browser checks:

```sh
npx playwright install chromium --no-shell
npm run test:logic
npm run test:e2e
```

## Application structure

| File | Responsibility |
| --- | --- |
| `index.html` | Single semantic source for general information and all project content; also the no-JavaScript/mobile archive |
| `script.js` | Reads records, lazy-loads the desktop scene after its media query passes, creates semantic spine buttons, owns selection state, accessibility synchronization, route switching, and failure recovery |
| `scene.js` | Three.js camera, room, practical lighting, book geometry, projected DOM layout, interruptible physical motion, and GPU cleanup |
| `scene-textures.js` | Procedural color, bump, and roughness texture generation plus PBR material construction |
| `bindings.js` | Stable project-to-binding profiles shared by the Three.js volumes and semantic spine controls |
| `styles.css` | Ledger fallback, transparent page typography, physical spine controls, mode switching, focus states, and responsive/reduced-motion rules |
| `tests/` | Playwright checks for composition, interaction, no-JavaScript behavior, responsiveness, maintainability, and WebGL recovery |
| `vite.config.js` | Relative deployment paths and the production entry point |

Cipher Twins keeps its peer-message schema and board reducer in `projects/cipher-twins/protocol.js`. The host serializes level-scoped board operations and publishes revisions; generated `role-a.js` and `role-b.js` banks replace hundreds of production chunks while preserving role-specific loading. Run `npm run generate:word-banks` after changing any `w###.[ab].js` source file.

Three.js `0.180.0` is installed locally through npm and bundled by Vite. The released site has no CDN, remote font, or remote texture dependency. Most material maps are generated locally during scene initialization at 256–512px and disposed with the renderer. Two 1024px generated albedos (about 633kB total) are bundled under `assets/textures/` for walnut and rag paper.

## Data flow

`#project-records` in `index.html` is the sole project-content source. The first article is the permanent information record. Remaining records are projects ordered newest to oldest.

At desktop initialization, `script.js` reads each article once and creates an in-memory record. That same record supplies:

- the visible semantic spine label;
- the corresponding Three.js closed-book material and position;
- the selected open-book title, date, summary, details, and destination;
- accessible button names, pressed states, browser title, and live announcement;
- the mobile, no-JavaScript, narrow-screen, and WebGL-failure archive already present in HTML.

`bindings.js` hashes a record’s title, date, and kind to choose stable construction details, dimensions, foil treatment, wear, and alignment. `scene.js` then calculates cumulative stack levels from the resulting thicknesses and document order. The oldest project therefore remains lowest without project-specific coordinates. An optional `data-binding` may override the generated construction. The test suite injects an eighth temporary record and verifies that its archive page, spine, selected-book content, and destination appear automatically; the fixture never modifies source content.

See [ADDING_PROJECTS.md](ADDING_PROJECTS.md) for the exact entry contract and workflow.

## Desktop scene and camera

The enhanced room is enabled only at `1100px` wide or larger and at least `650px` tall. Smaller viewports use the archive instead of squeezing the room.

The Three.js perspective camera uses a shallow elevated reading sightline (a responsive `32–35°` field of view, positioned around `(0, 4.08, 14.4)` and aimed near `(0, 2.62, 0.18)`). Pages are modeled in an upright X/Y plane on a lectern. Aspect-ratio breakpoints shift the lectern into available left space and slightly open/recenter the camera on taller laptop screens, preserving a measured gutter before the selected spine.

Scene construction lives in `scene.js`; procedural material generation lives in `scene-textures.js`:

- `addRoom()` builds the desk and leather blotter, asymmetric framed paneling, recessed bookcases, irregular shelf rows, visible library lamp, a generated starry-night framed picture, and restrained inkwell.
- `addReadingStandAndBook()` builds rounded extruded covers, independently angled page blocks, curved page meshes, layered sheet edges, hinge, contact patch, lectern board, ledge, and support.
- `addStack()` derives every closed volume from project order and its deterministic binding profile.
- `updateDomLayout()` projects physical page and spine coordinates into screen-space bounds for the semantic HTML controls.
- `scene-textures.js` uses `canvasTexture()`, `textureSet()`, and the `make*Textures()` helpers to produce distinct color, bump, and roughness maps for long-grain wood, paper fibers/page edges, calf pores/creases, cloth weave, buckram, and tarnished brass.

The renderer uses ACES tone mapping, one 1024px shadow map, a warm local lamp falloff, a warm shadow key from the same direction, dim cool ambient fill, and a separate low-intensity stack fill. This avoids the cost of a screen-space post-processing pipeline on integrated graphics. The visible shade, bulb, arm, stem, and base explain the warm page illumination.

Texture repeat values are chosen for the world-space size of their objects: wood runs primarily along constructed members, cloth repeats more tightly than leather pores, paper fibers remain below typographic scale, and page-edge maps repeat vertically to imply sheets. Bundled generated photographs supply desk/trim and open-page color while local generated maps still supply bump and roughness. Their provenance and final prompts are recorded in `assets/textures/README.md`; they have no third-party attribution requirement. To replace a texture, import a public-domain repository asset with a module-relative URL and load it through `THREE.TextureLoader`. Keep assets inside the repository, record attribution and licensing, preserve fallback colors, handle load errors without aborting initialization, and verify production URLs with `npm run build`.

## Geometry and DOM alignment

The open book remains in an upright X/Y plane for reading. Each half has a rounded extruded cover and a deeper, separately shaded paper block. A subdivided top sheet lifts at the gutter, sags slightly toward the fore edge, bows subtly between head and tail, and always remains above the lower block. Fine independent lips at the head, tail, and outer fore-edge imply accumulated sheets without oversized stripes. The cover extends beyond the paper, while a narrow hinge and lectern ledge establish contact.

Every project volume uses the same physical construction system: two thin binding boards enclose an inset warm-paper block, and a separate flat or gently rounded spine covers only the bound edge. Half-leather books add cloth board panels without recoloring the paper. Fine, sub-pixel seams appear only on exposed text-block ends. This keeps page blocks cream and matte across calf, cloth, buckram, and half-leather bindings.

Semantic HTML is projected from the physical paper and spine bounds after every resize or selection frame. Page elements are transparent typographic layers with irregular clipping; the Three.js paper supplies their color, lighting, edge, relief, and shadow. Spine buttons likewise have transparent control boxes: stamped lettering or an inset title label is the only visible DOM treatment. The selected-project destination is a double-ruled stamped bookplate, archive navigation is a small card-catalogue drawer front (the same object the mobile archive uses), and the lower title plate is visibly pinned to its wooden plinth. The former floating top plaque remains semantic but is visually hidden because the information volume now establishes identity.

## Selection, motion, and accessibility

Spines are native buttons, not canvas hit targets. Destinations and the archive card are native links. Selection updates page content, link URL, `aria-pressed`, document title, and the polite status region synchronously before motion begins.

The optional 280ms motion has no content authority. Every selection cancels the active `requestAnimationFrame`, reads current book positions, retargets the chosen spine outward, immediately gives the reading book that volume’s binding material, and briefly lifts a modeled page leaf before it settles. Descendant page Web Animations are likewise cancelled before replacement. Consequently, rapid input cannot queue or restore an older record, and the destination is usable immediately.

When `prefers-reduced-motion: reduce` matches, spine travel, the modeled leaf, and page typography motion are skipped. Content and binding identity still change synchronously.

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

There is no perpetual render loop or post-processing pass. Three.js renders after initialization, resize, selection motion, and state changes only. Pixel ratio is capped at `1.75`; procedural maps top out at 512px; only the practical key casts a 1024px shadow map. `dispose()` releases geometries, materials, procedural textures, the renderer, listeners, and animation frames after a lost context.

## Mobile and fallback presentation

The base archive uses a card-catalogue drawer metaphor rather than reproducing WebGL. A wood desktop surrounds one dark drawer with inset rails and a brass index holder. Fibrous project slips overlap inside that housing and use staggered, numbered leather tabs, printed folios, small alignment variations, and typed destination lines. This treatment uses CSS only, so JavaScript-disabled visits and WebGL failures retain the same content, links, touch sizing, contrast, and loading behavior.

## Verification

See [DESIGN_AND_TESTING.md](DESIGN_AND_TESTING.md) for the measured checks, inspected screenshots, failure scenarios, and known limits. [VISUAL_AUDIT.md](VISUAL_AUDIT.md) records the pre-edit audit, staged comparisons, re-grades, final adversarial review, and remaining visual limitations.
