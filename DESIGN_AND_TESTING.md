# Design and testing record

## Composition rationale

The removed Three.js experiment placed its camera around `(-0.15, 8.1, 11.8)` and aimed near `(0, 1.1, 0.15)`, creating roughly a 31° downward sightline. Its pages lay primarily in the X/Z plane, so they faced the ceiling and read as a flat tabletop object. It also used a detached previous/next HUD, counter, project link, and archive link.

The replacement camera is almost level and the selected pages stand in the X/Y plane against a wooden lectern. This lets page content face the reader while still exposing cover depth, page blocks, curved page surfaces, the hinge, ledge, support, desk, and room behind it.

Responsive camera steps at narrower aspect ratios increase field of view and recenter the world slightly. The lectern moves into otherwise unused left space while a minimum measured screen-space gutter separates it from every spine. This prevents the selected volume from cutting into the open book on taller laptop displays.

The project selector remains physically separate at the right. Every semantic spine button is projected from its corresponding Three.js book bounds, so the accessible control and physical volume share a location. There is no canvas raycasting or generic overlay navigation.

## Visual system

The released scene contains no downloaded decorative asset. `scene.js` procedurally produces:

- multi-line wood grain and knots;
- cloth/leather fiber variation and wear marks;
- paper fibers and page-edge lines;
- muted framed artwork.

Two framed, shadowed bookcase recesses add separate background planes. Their shelf fronts, inset backs, irregular cloth volumes, and localized light make the wall read as a room rather than a flat backdrop.

Three.js standard and physical materials provide rough paper, wood and cloth, reflective brass, and a clear-coated inkwell. A warm shadow-casting spot light is localized near the reading position; a restrained cool fill keeps spine labels readable. Soft shadows establish contact among the lectern, books, shelf, and desk.

The DOM page overlay is deliberately close to front-facing. Its small hinge rotation supplies depth without sacrificing readable text. The project destination is a pasted card, the archive route is a catalogue slip, and the selector heading is a brass shelf plate.

## State and interruption model

One synchronous `selectRecord()` path owns selection:

1. Clamp the requested index.
2. Set exactly one spine’s `aria-pressed` state.
3. Replace page type, title, date, summary, details, and destination.
4. Update document title and live announcement.
5. Retarget the physical spine.
6. Optionally start the 180ms visual transition.

The page animation is cancelled before each new animation. The Three.js scene cancels its active animation frame and interpolates from current positions to the newest targets. No timeout, transition-end handler, promise queue, or old record can change content later.

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

Playwright Chromium checks were run against the Vite development server at 1280 × 720 and an emulated iPhone 13 viewport.

| Check | Observed result |
| --- | --- |
| Production build | Both `index.html` and `examples/index.html` emitted with bundled local Three.js |
| No JavaScript | Study hidden; information plus six complete projects and all six links visible |
| Phone width | Archive shown; six projects available; document width equals viewport width |
| JavaScript-enabled phone | Archive remains primary; desktop room is not initialized |
| 1280 × 720 composition | Open book measured 55.8% of viewport width; all seven spines inside viewport and at least 38px high |
| Laptop framing | 1280 × 720, 1440 × 900, and 1512 × 900 kept the open book and every spine inside the viewport with at least a 30px semantic gutter |
| Initial visual inspection | Near-level pages, physical thickness, stand, stack, desk, room depths, plaque, archive route, and all spine labels visible |
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
| Dependency audit | `npm audit` reported zero vulnerabilities after patch updates |

The test suite stores visual inspection captures in the ignored `test-results/` directory when it runs.

## Manual inspection performed

The generated 1280 × 720 initial and selected-project screenshots were directly inspected. The JavaScript-disabled phone screenshot was also inspected as a complete long page. The phone capture showed readable wrapping, visible links, comfortable targets, and no horizontal overflow.

## Known limits and manual release work

- Automated accessibility assertions verify semantics, focusable native controls, keyboard behavior, pressed state, and announcements, but a named screen reader was not manually operated. Test VoiceOver, NVDA, or JAWS before a formal accessibility certification.
- Chromium was the available rendered browser engine. Safari, Firefox, Edge, physical iOS, and physical Android were not directly tested in this environment.
- Headless Chromium uses software WebGL, so final GPU performance should be spot-checked on target school hardware.
- The six project records and their destination gallery are examples, not authoritative finished coursework. Replace them as real projects become available.
- Current copy fits the page. Significantly longer future titles or descriptions require a 1280 × 720 readability inspection.
