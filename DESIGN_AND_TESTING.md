# Design and testing record

## Composition rationale

The removed Three.js experiment placed its camera around `(-0.15, 8.1, 11.8)` and aimed near `(0, 1.1, 0.15)`, creating roughly a 31° downward sightline. Its pages lay primarily in the X/Z plane, so they faced the ceiling and read as a flat tabletop object. It also used a detached previous/next HUD, counter, project link, and archive link.

The replacement camera is almost level and the selected pages stand in the X/Y plane against a wooden lectern. This lets page content face the reader while still exposing cover depth, page blocks, curved page surfaces, the hinge, ledge, support, desk, and room behind it.

Responsive camera steps at narrower aspect ratios increase field of view and recenter the world slightly. The lectern moves into otherwise unused left space while a minimum measured screen-space gutter separates it from every spine. This prevents the selected volume from cutting into the open book on taller laptop displays.

The project selector remains physically separate at the right. Every semantic spine button is projected from its corresponding Three.js book bounds, so the accessible control and physical volume share a location. There is no canvas raycasting or generic overlay navigation.

## Visual system

The revised scene uses one compact generated walnut albedo for the highest-area wood and otherwise builds material maps locally. Each important material has independent color, relief, and roughness information rather than one color map reused as bump:

- long-grain wood includes knots, fine scratches, directional construction scale, and variation between dark and light members;
- calf includes pores, creases, worn edges, and varied roughness;
- cloth and buckram use orthogonal woven fibers and higher diffuse roughness, visibly separating them from leather;
- paper uses short irregular fibers, restrained foxing, page-edge lines, and slightly different face/edge scales;
- brass uses a non-color roughness map for tarnish, handling marks, dark recesses, and restrained edge response.

The open book uses rounded extruded cover and page-block shapes. Subdivided paper meshes lift at the gutter, sag toward the outer edge, bow slightly between head and tail, and differ by side. Layered bottom edges, an exposed hinge, a lectern contact patch, and small half-angle differences prevent the silhouette from becoming two rectangles.

`bindings.js` creates stable calf, cloth, buckram, and half-leather profiles from record data. Width, thickness, depth, curvature, bands, title-label treatment, foil, wear, lean, and alignment vary without project-specific coordinates. Cumulative thickness preserves chronological stacking.

The visible green-shaded library lamp is the lighting explanation. A local warm point source supplies falloff, a warm directional key from the same physical direction supplies one economical shadow map, and dim ambient/cool stack fills preserve readable shadows. The scene intentionally avoids an integrated-GPU post-processing pass. Contact patches and ordinary cast shadows handle the most important gutter, ledge, stack, and blotter junctions.

DOM pages are transparent ink layers clipped to imperfect modeled bounds. Spine controls are transparent except for stamped type or binding-appropriate inset labels. The selected destination is a stamped double-rule bookplate; archive navigation is a small card-catalogue drawer front with a brass label and pull ring, matching the same object the mobile archive uses; the plinth plate has inset shading and mounting pins. The floating top plaque was removed visually because identity is already printed in the information volume.

The room adds framed panel battens, shelf crown molding, different bookcase dimensions, seeded shelf gaps and leaning groups, a leather desk blotter, and a generated starry-night framed picture. The existing inkwell remains the only small scale prop.

## State and interruption model

One synchronous `selectRecord()` path owns selection:

1. Clamp the requested index.
2. Set exactly one spine’s `aria-pressed` state.
3. Replace page type, title, date, summary, details, and destination.
4. Update document title and live announcement.
5. Apply the selected binding material to the reading book.
6. Retarget the physical spine and modeled page leaf.
7. Optionally start the 280ms visual transition and restrained typographic settle.

All descendant page animations are cancelled before each new animation. The Three.js scene cancels its active animation frame and interpolates from current spine positions to the newest targets while restarting the leaf from a known state. No timeout, transition-end handler, promise queue, or old record can change content later.

## Progressive enhancement

`index.html` begins with the complete archive. The desktop enhancement is attempted only at 1100px × 650px or larger. During initialization, the full-size scene is rendered at near-zero opacity behind the archive for 550ms so canvas textures and composited semantic labels settle, including at taller laptop resolutions. The archive is hidden only when initialization succeeds.

JavaScript failure, module failure, validation failure, WebGL creation failure, a lost WebGL context, narrow screens, and phones all preserve or restore the archive. Context-loss handling disposes GPU resources and removes generated controls before returning to semantic content.

## Accessibility implementation

- Every spine is a native button with visible text, `aria-controls`, and `aria-pressed`.
- Every destination and archive route is a native link.
- Enter and Space retain native behavior.
- Arrow keys, Home, and End share the same synchronous selection function.
- Focus has a high-contrast outline and does not rely on color.
- Selection uses position, brightness, shadow, a brass edge, and programmatic pressed state.
- A polite live region announces only the new title and date.
- The canvas is decorative and `aria-hidden`; selected content remains ordinary HTML.
- Reduced motion skips both page and Three.js selection motion.
- The no-JavaScript archive preserves every title, date, summary, detail, and destination.

## Automated verification performed

The final production build and Playwright Chromium checks were run against the Vite development server at 1280 × 720 and an emulated iPhone 13 viewport. The final run completed with 22 passing tests and one expected project-filter skip.

| Check | Observed result |
| --- | --- |
| Production build | `index.html` emitted with bundled local Three.js |
| No JavaScript | Study hidden; semantic archive and its current project records remain visible |
| Phone width | Archive shown; document width equals viewport width |
| JavaScript-enabled phone | Archive remains primary; desktop room is not initialized |
| 1280 × 720 composition | Open book measured 55.8% of viewport width; all seven spines inside viewport and at least 38px high |
| Laptop framing | 1280 × 720, 1440 × 900, and 1512 × 900 kept the open book and every spine inside the viewport with at least a 30px semantic gutter |
| Initial visual inspection | Near-level curved pages, layered thickness, stand contact, varied stack, practical lamp, panel depths, pinned plinth plate, archive ribbon, and all spine labels visible |
| Selected visual inspection | Pathfinding title, date, summary, details, pasted destination, and selected spine all readable |
| Every-record selection | All seven records matched their source title/date; project destinations updated |
| Rapid five-record input | Final title and pressed spine matched final input after animation completion |
| Keyboard | Arrow keys, Home, End, Enter, and Space reached and selected records |
| Announcement | Status region changed to the selected title for every record |
| Reduced motion | Page reported zero active animations and content changed immediately |
| Archive mode | Catalogue slip hid the study and exposed the archive; return link reversed it |
| Forced WebGL failure | No ready class; archive remained visible with seven records |
| Lost WebGL context | Scene disposed and archive became visible |
| Narrow desktop, 1024 × 720 | Complete archive shown instead of squeezed room |
| Temporary eighth record | Archive, spine, selected page, chronology position, and destination appeared without coordinate edits |
| Ten-volume fixture | All ten spine rectangles remained inside 1280 × 720 and at least 38px high |
| Console errors | Composition check observed none |
| Failed requests | Composition check observed no failed requests or HTTP responses at 400+ |
| DOM integration | Both page backgrounds and all semantic spine control backgrounds computed transparent; four deterministic binding types were present |
| Integrated-graphics guardrails | Pixel ratio stayed at or below 1.75, texture count stayed at or below 64, and render count did not change during a 350ms idle sample |
| Dependency audit | `npm audit` reported zero vulnerabilities after patch updates |

The test suite stores visual inspection captures in the ignored `test-results/` directory when it runs.

## Manual inspection performed

The generated 1280 × 720 initial and selected-project screenshots and the 1512 × 900 initial screenshot were directly inspected after the realism revision. The JavaScript-disabled phone screenshot was also inspected as a complete long ledger. The phone capture showed readable wrapping, visible links, comfortable targets, printed folios, a shared leather binding, and no horizontal overflow.

## Known limits and manual release work

- Automated accessibility assertions verify semantics, focusable native controls, keyboard behavior, pressed state, and announcements, but a named screen reader was not manually operated. Test VoiceOver, NVDA, or JAWS before a formal accessibility certification.
- Chromium was the available rendered browser engine. Safari, Firefox, Edge, physical iOS, and physical Android were not directly tested in this environment.
- Headless Chromium uses software WebGL, so final GPU performance should be spot-checked on target school hardware.
- Vite reports that the bundled Three.js application chunk is about 539kB minified (about 140kB gzip), above its default 500kB warning threshold. The two optional material albedos total about 648kB and retain generated fallbacks. The semantic fallback remains immediate HTML/CSS and the desktop renderer is still a single route; code splitting was not introduced solely to silence the warning.
- The six project records and their destination gallery are examples, not authoritative finished coursework. Replace them as real projects become available.
- Current copy fits the page. Significantly longer future titles or descriptions require a 1280 × 720 readability inspection.

## August 2026 autonomous visual refinement

A new screenshot-first audit was completed before source edits at 1280 × 720, 1512 × 900, multiple selected calf/cloth/buckram/half-leather records, JavaScript and no-JavaScript phone states, and the full room composition. Baseline and staged captures are retained under ignored `test-results/` output. The complete issue inventory and grades are in `VISUAL_AUDIT.md`.

The most important correction was systemic: the old project-volume body enclosed its nominal paper mesh, so rendered ends remained binding-colored even though a paper object existed in code. The stack now builds thin upper/lower boards around an inset paper block and adds the spine separately. The open-book top leaf was also raised above the lower text block after rendered comparison proved its sagging outer area was being occluded by the block, creating the previous giant crescent artifact.

The final production build succeeds with the existing Vite size warning. The final Chromium run remains 22 passing tests and one expected project-filter skip. Final checks covered composition, all records, rapid selection, keyboard operation, visible focus, reduced motion, archive switching, forced initialization failure, context loss, narrow-screen/mobile fallback, no JavaScript, injected eighth and ten-volume fixtures, failed requests, console errors, transparent semantic surfaces, binding determinism, texture limits, pixel-ratio cap, and idle rendering.
