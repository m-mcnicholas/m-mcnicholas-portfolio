# Visual audit and refinement record

## Baseline reviewed — 20 August 2026

Fresh renders were inspected before visual source edits:

- `test-results/composition-1280x720.png`
- `test-results/composition-1512x900.png`
- `test-results/selected-project-1280x720.png`
- `test-results/baseline-project-0-1512x900.png`
- `test-results/baseline-project-3-1512x900.png`
- `test-results/baseline-project-5-1512x900.png`
- `test-results/archive-mobile-no-js.png`
- `test-results/baseline-mobile-js.png`

The baseline production build completed. Playwright completed with 22 passing tests and one expected project-filter skip. The first sandboxed attempt could not bind the preview port; the authorized rerun passed.

## Initial independent visual audit

This is the pre-implementation working audit. “Systemic” means the visible symptom points to a shared generator, camera, lighting, or overlay system rather than one local object.

### Overall realism and camera

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Systemic | The desktop reads as a carefully themed real-time scene, but not as a photographed study. The book and spines are almost orthographic front elevations, so their depth is communicated by graphic shading instead of physical perspective. | Near-level, long-lens camera and objects aligned too squarely to it. |
| High | Systemic | Large shapes have sharp, clean silhouettes while fine detail is confined to texture noise. The result resembles a game diorama: perfect rectangles, perfect shelf edges, cylindrical spines, and little intermediate-scale wear. | Primitive-heavy construction and strong frontal presentation. |
| Medium | Local | The open book and stack divide the frame well, but the empty black blotter occupies much of the lower half and absorbs detail without helping the reading action. | Blotter is very dark, broad, and almost unlit. |
| Medium | Systemic | The 1280 render feels crowded vertically; the ribbon text is clipped and the stack/plaque approach the bottom edge. | Fixed composition with insufficient safe-area allowance at the minimum enhanced viewport. |

### Open-book geometry and page-block construction

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Systemic | Enormous, nearly mirrored golden crescent regions cover both pages. They resemble cut paper or a graphic mask more than illumination over curved sheets, and are inconsistent with the lamp’s position. | Excessive page curvature and/or normals under a directional light; possibly compounded by overlay transparency. |
| High | Systemic | The top pages look like two large flat panels with a central dark rod. The fore-edge, head, tail, and lower text block are not legible as a continuous stack of paper at normal distance. | Camera suppresses depth; page-block geometry is mostly hidden behind page faces and ledge. |
| High | Systemic | The visible written sheets do not visibly transition into a layered page block. The leather-colored rim behind them is clearer than any cream paper thickness, so cover and text block cannot be confidently distinguished. | Page block has insufficient exposed inset/depth and inadequate paper-specific edge contrast. |
| High | Local | The center gutter is a thick dark brown cylinder, closer to a dowel than folded signatures accumulating at a hinge. | Cylindrical hinge/spine geometry is overexposed and too uniform. |
| Medium | Systemic | Head and tail edges are ruler-straight and the book silhouette is almost perfectly symmetric. | Mirrored shapes and minimal irregularity. |
| Medium | Local | Page corners are implausibly clean and rounded in the same way as the cover; paper and board continuity is ambiguous at the outer corners. | Shared rounded profiles and insufficient material/geometry separation. |

### Project-volume geometry and page blocks

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| Critical | Systemic | Visible fore-edges are binding-colored solid prisms. Green, blue, oxblood, purple, brown, and teal volumes appear to be colored boxes rather than boards containing cream paper. This is most obvious at the left ends and when a selected volume moves forward. | Binding-profile generator uses one binding material across spine/body/end geometry or omits a separate inset paper block. |
| High | Systemic | Several project books have deep barrel-like cylindrical spines and large repeated raised bands/support tabs. They look toy-like and overbuilt relative to their height. | Excessive spine radius, segment curvature, band depth, and thickness variation in the shared generator. |
| High | Systemic | Black gaps and hard rectangular shadows between books make some volumes appear suspended rather than resting under gravity. Selected books expose an especially large dark cavity. | Stack offsets and shadow/contact treatment do not preserve convincing support/contact. |
| High | Systemic | Cover board → paper block → cover board layering is not visible on any binding style, including calf, cloth/buckram, and half-leather examples. | No shared physical text-block construction in the volume generator. |
| Medium | Systemic | Different bindings vary mainly by saturated color and spine silhouette; material and construction differences are not convincing at final distance. | Material maps are subtle relative to broad lighting/color differences; profiles exaggerate shape rather than construction. |
| Medium | Local | Spine labels and date columns sit on perfectly aligned HTML rectangles; some title plates appear pasted on while unplated titles appear self-lit. | Semantic controls use sharp borders/type without surface wear, embossing, or local light modulation. |

### Materials

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Systemic | Paper reads as a luminous ochre surface with weak visible fiber at desktop scale. Large smooth tonal regions dominate the material response. | Strong warm key, low-frequency geometry shading, and insufficient edge-specific paper response. |
| High | Systemic | Leather, cloth, and buckram are distinguishable by color but not reliably by reflectance. Most spines share similarly smooth, broad highlights. | Roughness variation is too low-contrast or not aligned with wear and weave at final distance. |
| Medium | Systemic | Wood is dark enough that grain disappears in the shelves, lectern, and desk; it becomes flat brown or black geometry. | Low reflected illumination and compressed dark values. |
| Medium | Local | Brass plaque and lamp base use strong yellow gradients and blur-like tarnish, reading as stylized UI brass rather than metal with controlled reflections. | Roughness/highlight treatment is broad and screen-facing. |
| Medium | Systemic | Binding colors are saturated and clean for handled period volumes. | Base colors and edge wear do not sufficiently reduce chroma at exposed areas. |

### Lighting, shadows, contact, and ambient occlusion

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| Critical | Systemic | The visible lamp does not physically explain the scene. Its shade floats at upper left, a small brass nub sits behind the book, and the elliptical base lies far below/right with no visible stem joining them. | Lamp components are occluded/misaligned or modeled as disconnected props. |
| High | Systemic | The book is bright while adjacent shelf and room surfaces facing the same area are nearly black. The room appears to terminate behind the foreground rather than receiving bounce light. | Key/fill architecture isolates foreground; insufficient hemisphere/ambient contribution to vertical background surfaces. |
| High | Systemic | The page crescents are disproportionately large and symmetric compared with the lamp and do not describe believable form. | Directional shadow/normal response dominates instead of broad local lamp illumination. |
| High | Systemic | Deep black seams beneath books and behind the selected volume are too hard and too large, resembling cut-outs. | Contact patches/shadows are oversized or stack members do not meet. |
| Medium | Local | The open book has weak contact with its ledge: a thin dark strip exists, but page/cover weight is not described by localized occlusion. | Contact shadow is broad rather than following the book footprint. |
| Medium | Systemic | Background shelves have almost no reflected green/warm lamp light, making spatial zones feel independently lit. | Fill lights are weak or poorly placed. |

### DOM/WebGL integration, typography, and page composition

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Systemic | Text remains perfectly crisp, uniformly dark, and screen-aligned while the modeled surfaces shade underneath it. The curved/shaded page and flat HTML ink do not share a convincing print process. | DOM layers are projected as rectangles but not optically modulated by page texture/lighting. |
| High | Local | The archive ribbon at 1280×720 is clipped at the bottom, hiding part of “ALL PROJECT RECORDS”; this is a visible usability regression at the minimum desktop viewport. | Ribbon height/position exceeds the projected page safe area. |
| Medium | Systemic | Right pages are conspicuously sparse. A short paragraph, large blank region, thin destination box, and overlapping archive ribbon feel like interface placement rather than editorial composition. | Fixed content zones optimized for variable text rather than page rhythm. |
| Medium | Systemic | Spine dates are extremely small and low contrast; book titles mix plates, bare type, and all-caps treatment without a clear construction-based rationale. | Overlay typography is scaled to fit geometry rather than reading distance. |
| Medium | Local | Folios and running heads are so faint that they read as accidental antialiasing/noise, not print. | Opacity/size too low under the warm lighting. |
| Low | Local | The left-page diamond divider and bottom rules appear mathematically exact and isolated. | Pure CSS ornament without print irregularity. |

### Diegetic controls and selection continuity

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Local | The brass “PROJECT VOLUMES” plaque resembles a detached game HUD: centered at the screen-facing base of the stack, perfectly rectangular, and brighter than its mount. | Control explanation is not convincingly attached to furniture. |
| Medium | Local | The archive ribbon resembles a clipped web callout placed over a page rather than a loose bookmark/card: it is perfectly rectangular and anchored to a fixed corner. | DOM shape and projection lack thickness/contact/rotation. |
| Medium | Systemic | Selected books translate outward as entire blocks, exposing a black cavity. The motion communicates state, but not the physical act of removing/opening that volume. | Shared stack animation offsets one mesh without rearranging support or shadow/contact. |
| Medium | Systemic | Selection changes the reading book’s cover color immediately, which can imply the open book magically rebinds rather than the selected volume becoming the reading object. | State transition lacks an intermediate physical handoff/crossfade rationale. |

### Historical plausibility, scale, room construction, background, and props

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Systemic | Wall panels are almost featureless black rectangles; shelving is shallow and abruptly cropped. The room reads as stage flats surrounding a product display. | Very low background exposure, little depth layering, and camera-facing panel geometry. |
| High | Local | The lamp has an appropriate green shade vocabulary but physically impossible assembly, undermining the strongest historical lighting cue. | Component positioning/occlusion problem. |
| Medium | Systemic | Shelf books repeat the same few rectangular forms, muted colors, and vertical alignment with limited page-edge visibility. | Seeded but visibly modular background-book generator. |
| Medium | Systemic | Foreground project volumes are extremely thick relative to likely small project ledgers, while background books are thin and tiny, weakening scale continuity. | Independent scale systems for stack and shelving. |
| Medium | Local | The framed print is mostly hidden and appears as a pale rectangle with a centered triangle; it does not yet read as an engraving. | Prop detail/contrast is too weak and occluded. |
| Low | Local | The inkwell or small desk prop is effectively invisible in the final composition, so it adds no useful scale cue. | Occlusion and dark exposure. |

### Repetition, symmetry, and animation

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Systemic | The open-page shading is mirrored enough to look procedural even though the lamp is asymmetrical. | Mirrored page deformation or similar normals/materials on both leaves. |
| Medium | Systemic | Raised bands/tabs repeat at regular intervals across multiple books, drawing attention to the generator. | Shared evenly spaced decorative geometry. |
| Medium | Systemic | Shelf bays and panel rectangles repeat at consistent depth and alignment. | Modular room construction lacks selective variation and occluding depth. |
| Medium | Systemic | Static captures cannot prove motion quality. Automated checks establish interruption correctness, but slow/rapid visual causality still requires rendered/manual observation after geometry changes. | Functional tests do not measure perceptual continuity. |

### Mobile physical metaphor, responsive behavior, and accessibility-related visual issues

| Severity | Scope | Visual symptom and damage to the illusion | Likely cause |
| --- | --- | --- | --- |
| High | Systemic | Removing the wood texture would reveal a conventional vertical stack of evenly spaced web cards. Records do not overlap, interlock, tab, or sit in drawer hardware. | Mobile fallback styles use repeated rectangular articles inside a bordered container. |
| High | Local | The introductory catalogue card floats separately above the cabinet with no shared physical housing, making the archive metaphor inconsistent. | Header and record list use unrelated card/container structures. |
| Medium | Systemic | Every record has nearly identical dimensions, edge treatment, paper, spacing, and typography, producing obvious repetition rather than handled catalogue slips. | One shared template without restrained per-record variation. |
| Medium | Systemic | Links are readable but look like ordinary bold web links with CSS underlines rather than stamped/typed catalogue references. | Link treatment optimizes clarity but lacks a diegetic mechanism. |
| Medium | Local | Small uppercase category text, dates, folios, and footer approach low-contrast/low-size territory on a phone. | Decorative hierarchy is scaled down uniformly. |
| Medium | Local | The long single-column object is usable but offers no visible drawer index, tabs, or grouping landmark, making navigation laborious. | No sticky/indexed physical control in the fallback architecture. |
| Low | Systemic | JavaScript and no-JavaScript phone renders are visually identical, which is resilient, but the presentation does not exploit progressive enhancement for optional navigation affordances. | Mobile intentionally stays entirely semantic/static. |

## Initial priorities

1. Reconstruct project volumes as board → inset aged-paper block → board, with paper-colored fore-edge/head/tail visible for every binding.
2. Correct the lamp assembly and lighting architecture; remove the implausible page crescents and restore reflected illumination/background depth.
3. Make the open book’s top sheets, lower paper block, cover, gutter, fore-edge, head, and tail read as one plausible object at the final camera distance.
4. Reduce barrel-like spine curvature, repeated oversized bands, book thickness, black gaps, and selected-volume cavity through the shared binding/stack systems.
5. Introduce enough camera/object obliqueness to explain depth without sacrificing text readability or project discoverability.
6. Integrate DOM ink/labels with physical surfaces and repair the clipped archive control.
7. Improve right-page editorial rhythm, plaque/ribbon attachment, background exposure, and room depth.
8. Rebuild the mobile records as a specific catalogue drawer/slip system with tabs, overlap, edge depth, and visible navigation landmarks while preserving semantic HTML and touch targets.
9. Observe slow/rapid selection, reduced motion, fallback, and keyboard behavior again after geometry/layout changes.

## Acceptance gates for implementation

- No binding-colored exposed page blocks remain.
- At normal final distance, boards, paper block, spine, and fine sheet suggestion are distinguishable on the open book and calf, cloth/buckram, and half-leather project examples.
- The open written pages visibly continue into the lower text block.
- No physically unexplained lamp or page-shadow artifact remains.
- No reasonable Critical or High issue remains; every final category scores at least 8/10 or documents a concrete architecture/performance/accessibility constraint.
- Final grading is based on repeated renders and a screenshot-only adversarial pass, not code complexity.

## Cycle A re-grade

Cycle A was judged from the fresh `cycle-a-*` screenshots after the lighting, geometry, material-separation, camera, overlay, and mobile-drawer changes.

| Criterion | Cycle A | Remaining visible limitation |
| --- | ---: | --- |
| Physical place first | 8.2 | The room remains deliberately dark and the upper panels still read flatter than the foreground. |
| Open book | 8.0 | Top sheets are continuous and the cover is separate, but fore-edge sheet layering is still subtle at normal distance. |
| Project stack | 8.6 | Paper blocks and boards are now explicit; front profiles still use fairly clean generated geometry. |
| Material realism | 8.1 | Paper is convincing; binding wear remains restrained and somewhat uniform. |
| Lighting and spatial coherence | 8.2 | The impossible page occlusion is gone and reflected fill is better; background bounce remains modest. |
| DOM/WebGL integration | 8.0 | Ink is less self-lit, but spine labels remain sharper than the material below. |
| Diegetic interface | 8.0 | Controls read as page inserts/labels, though the project destination and archive bookmark nearly overlap. |
| Typography | 8.4 | Main-page hierarchy is strong; spine dates remain too small. |
| Historical tone | 8.2 | Palette and construction are credible, though the stack still has a designed display quality. |
| Interaction and motion | 8.1 | Correct interruption behavior is preserved; the short pull/leaf motion remains an abstraction. |
| Room depth | 8.0 | Shelves and print are clearer, but upper wall fields are still broad dark planes. |
| Mobile physical metaphor | 7.5 | The drawer housing is stronger, but low-contrast tabs collapse into paper slivers and do not provide a clear index rhythm. |
| Overall realism | 8.1 | Now physically coherent, but still visibly a restrained real-time scene rather than product-render realism. |

### Cycle B priorities

1. Make the mobile tab system unmistakable while retaining readable, semantic slips and 48px links.
2. Add restrained outer fore-edge sheet cues to the open book without thick stripes.
3. Separate the project destination and archive bookmark at both desktop sizes.
4. Increase spine-date legibility without turning the stack into conventional buttons.
5. Verify that the camera shift still satisfies composition gutters and that all functional/fallback checks remain intact.

## Final adversarial screenshot review

The final review used only `final-project-*.png`, the fresh 1280 × 720/1512 × 900 test captures, and the JavaScript/no-JavaScript phone captures. No credit was given for invisible implementation complexity.

- The books no longer read as colored boxes: cream matte text blocks are visible between separate boards on calf, cloth/buckram, and half-leather examples.
- Fine seams on exposed project fore-edges are thin and numerous enough to suggest paper without reading as grooves or wooden slats.
- The open written sheets remain continuous to their outer edges. Their inset exposes a narrow paper block and separate binding rim at head, tail, and fore-edge; no sheet falls behind the block.
- The impossible giant page crescents are gone. The remaining lighting follows a left practical with restrained ambient/stack/background fill.
- The selected book remains supported by the stack; its reduced travel no longer opens a dominant black cavity.
- JavaScript and no-JavaScript phone views share one catalogue drawer, overlapping paper slips, and staggered leather index tabs. Without the wood texture, the drawer rails, brass holder, tabs, overlap, and shared housing still communicate an archive rather than unrelated cards.
- The strongest remaining computer-generated cues are clean primitive silhouettes, limited middle-scale wear, shallow/dark wall-panel depth, and perfectly rasterized DOM lettering on subtly modeled surfaces.

No Critical or reasonable High-severity issue remains. Remaining work is material/room/typographic fidelity that would require higher-cost assets, UV work, a different text-rendering architecture, or a readability/performance tradeoff.

## Final visual grade

| Criterion | Final | Why it is below 9 / feasibility within the current architecture |
| --- | ---: | --- |
| Physical place first | 8.4 | The composition reads as a study first, but the broad upper panels and clean silhouettes still disclose a real-time diorama. Reaching 9 needs deeper environment geometry and higher-fidelity indirect lighting. |
| Open book | 8.4 | Cover, text block, fine sheet lips, gutter, head, tail, and fore-edge are distinct and continuous; the readability-first frontal pose suppresses some visible depth. A more oblique pose is possible but would reduce DOM alignment and comfortable reading. |
| Project stack | 8.7 | Every tested binding now contains paper correctly and has restrained proportions; generated edges remain cleaner and more regular than handled volumes. Better scanned wear/UVs are possible but exceed a localized geometry fix. |
| Material realism | 8.3 | Wood, paper, leather/cloth, brass, and ink separate convincingly; binding wear still lacks the directional, object-specific richness of authored texture sets. Reaching 9 needs curated high-resolution material assets and UV authoring. |
| Lighting and spatial coherence | 8.4 | The practical is connected, page occlusion is plausible, and room fill now relates zones; true bounced light and soft area-source shadows are limited by the performance-conscious light rig. An environment/lightmap or post pipeline would be architectural work. |
| DOM/WebGL integration | 8.2 | Transparent, multiply-blended ink belongs much better to paper, and spine controls expose only stamped content; glyphs remain perfectly rasterized and do not deform with micro-curvature. A 9 requires texture/MSDF text plus a separate accessible semantic mirror. |
| Diegetic interface | 8.3 | The destination, bookmark, stamped spines, and pinned selector are legible physical objects; the selector plaque remains deliberately presentation-oriented. Further concealment would weaken discoverability. |
| Typography | 8.6 | Printed hierarchy, measure, contrast, folios, and spine dates are comfortable; digital edge precision remains visible under close inspection. Texture-rendered ink could improve this but complicates accessibility and dynamic content. |
| Historical tone | 8.4 | Binding logic, restrained ornament, green lamp, paneling, brass, and type form a credible academic study; colors and display organization remain slightly curated. More authentic disorder is possible but would compete with portfolio scanning. |
| Interaction and motion | 8.3 | Selection is immediate, interruptible, restrained, and physically signaled; the selected volume does not literally travel into the lectern. A full volume-to-open-book handoff would require a different scene/state architecture and longer motion. |
| Room depth | 8.1 | Recessed shelves, panel battens, engraving, desk planes, and reflected fill establish a room, but upper wall fields remain shallow and dark. A 9 needs additional constructed depth, reflections, and environmental assets. |
| Mobile physical metaphor | 8.3 | One drawer, inset rails, brass index label, overlapping slips, staggered leather tabs, edge depth, folios, and typed links survive without texture. It remains a long scroll without a separate alphabetical drawer index; adding one is feasible but not justified for seven records. |
| Overall realism | 8.4 | The final still is physically coherent and materially differentiated, but clean generated geometry and semantic overlay text prevent architectural/product-render fidelity. |

## Remaining visual problems

### Meaningful remaining limitations

- DOM ink remains screen-rasterized rather than truly printed into the Three.js paper. Replacing it would require a dual visual/semantic text architecture and would increase layout and accessibility risk.
- The background wall is constructed but shallow, and its broad dark panels have limited reflected-light variation. Product-render room depth would require more geometry, light baking/environment lighting, or a post-processing path beyond the integrated-graphics budget.
- Binding wear is procedural and shared by material kind. It avoids obvious repetition at normal distance but lacks individually authored stains, edge abrasion, and UV-specific handling history.
- The open book remains close to front-facing to preserve readable live HTML and robust projected hit regions. A strongly oblique photographic pose would improve depth but materially reduce readability and DOM/WebGL registration.

### Minor polish opportunities

- Shelf books could use occasional visible paper edges and a wider range of lean/contact patterns.
- The selector’s brass plate could be less presentation-perfect with bespoke engraving roughness.
- The engraving could carry more fine tonal range if it did not sit behind the stack.
- Mobile tabs could carry abbreviated project categories; with seven records, numerals are cleaner and less repetitive.

## Final judgment

**B — Convincing real-time 3D antique study.** The largest gap to C is not missing decoration; it is the combination of authored material fidelity, deeper indirect/environment lighting, richer room construction, and text that genuinely follows the rendered paper surface.
