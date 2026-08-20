# Adding a project

Project content is stored once: as a semantic `<article class="project-record">` inside `#project-records` in `index.html`. Do not add a second JavaScript or mobile data list.

## Normal workflow

1. Open `index.html` and locate `id="project-records"`.
2. Copy one project record, not the first `information-record`.
3. Paste the copy after the information record and among the projects in newest-to-oldest order.
4. Replace every field described below.
5. Add the finished work to the repository or use its deployed URL.
6. Run `npm run build` and `npm run test:e2e`.
7. Inspect the new spine, selected book, archive ledger page, phone layout, and destination.

No existing book position or coordinate should be edited. `scene.js` recalculates every stack level from record count and order.

## Copyable record

```html
<article class="project-record"
  data-kind="project"
  data-color="#355c51"
  data-accent="#e5cc83"
  data-binding="cloth">
  <p class="record-type">School project · Category</p>
  <h2>Project title</h2>
  <time datetime="2026-06-01">June 1, 2026</time>
  <p class="record-summary">One sentence explaining the project goal.</p>
  <p class="record-details">A concise process note, result, or reflection.</p>
  <a href="projects/project-name/index.html">Open Project title</a>
</article>
```

## Supported fields

| Field | Required | Used by |
| --- | --- | --- |
| `data-kind="project"` | Yes | Distinguishes projects from the initial information volume |
| `data-color` | Yes | Generated leather/cloth color and selected reading-book cover |
| `data-accent` | Yes | Spine rules and dates; use a light color with strong contrast |
| `data-binding` | No | Overrides deterministic construction with `calf`, `cloth`, `buckram`, or `half-leather` |
| `.record-type` | Yes | Open-page classification and archive ledger page |
| `<h2>` | Yes | Spine, selected page, archive, accessible name, and browser title |
| `<time datetime>` | Yes | Visible spine/page/archive date and machine-readable chronology |
| `.record-summary` | Yes | Main project goal on the page and in the archive |
| `.record-details` | Yes | Supporting selected-page and archive context |
| direct child `<a href>` | Yes | Selected destination and fallback destination |

Keep titles near 30 characters where practical and keep selected-page copy concise enough to fit without scrolling at 1280 × 720.

When `data-binding` is omitted, `bindings.js` hashes the title, date, and kind to produce a stable binding kind, thickness, width, depth, spine profile, band count, foil treatment, alignment, and wear. Reordering the record does not change that identity. Use an override only when a particular construction is editorially important; color remains supplied by `data-color`.

## Chronology and capacity

The information record must remain first. Project records are manually ordered newest to oldest using their `<time datetime>` values. The first project rests immediately below the information volume; the oldest rests at the bottom.

The current scene is verified with seven volumes total and with an automated eight-volume fixture. Stack height is cumulative because each generated binding has a meaningful thickness. The procedural stack supports up to ten volumes at 1280 × 720, but after adding content always verify that every label remains visible and readable.

## Destinations and assets

Use a real, reachable destination. Relative project URLs are preferred for work stored in this repository because Vite preserves them in the static build. If a project opens on another site, add `target="_blank" rel="noopener"` only when a new tab is intentional; extend the record reader if target behavior must also appear in the selected-book link.

Store optional images, models, or textures under a clearly named repository folder such as `assets/`. Reference module assets from JavaScript with `new URL("./assets/name.webp", import.meta.url)` so Vite rewrites production paths. Optional visuals must have a fallback and must never contain the only copy of project text or navigation.

The six current projects are clearly labeled examples. Replace them with authoritative project content as real work is completed.

## Release check

- Confirm title, valid `datetime`, visible date, summary, details, and destination.
- Confirm document order is newest to oldest.
- Run `npm run build` and `npm run test:e2e`.
- Open the production preview and every destination.
- Inspect 1280 × 720 and a phone viewport.
- Disable JavaScript and confirm the new record remains complete.
- Tab to the new spine and test Enter, Space, arrows, Home, and End.
- Enable reduced motion and repeat selection.
- Confirm no existing record required a coordinate edit.
