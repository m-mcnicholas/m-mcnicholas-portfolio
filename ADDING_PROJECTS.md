# Adding a project

Projects are stored directly in `index.html`. There is no framework, build command, or second data file to keep in sync.

## The five-minute workflow

1. Open `index.html` and find `id="project-list"`.
2. Copy the sample `<article class="project-card">...</article>` block.
3. Paste it immediately after the information-book article so the newest project stays on top.
4. Replace the title, machine-readable and visible date, summary, details, and link.
5. Choose a dark `data-color` for the book cloth and a lighter `data-accent` for its lettering.
6. Open `index.html` in a browser and check the spine, open book, project index, and destination link.

The stack positions every book automatically. Never add pixel positions for an individual project.

## Copyable project template

```html
<article class="project-card"
  data-kind="project"
  data-color="#365f68"
  data-accent="#9fc4bd">
  <p class="card-type">School project</p>
  <h3>Project title</h3>
  <time datetime="2026-11-06">November 6, 2026</time>
  <p class="card-summary">One sentence explaining the project's goal.</p>
  <p class="card-details">Optional context, reflection, or process note. Keep this concise.</p>
  <a href="https://your-project-url.example" target="_blank" rel="noopener">Open finished project</a>
</article>
```

## What each field controls

| Field | Where it appears |
| --- | --- |
| `data-color` | Book cloth, and the colored edge in the project index |
| `data-accent` | Spine rules and spine date |
| `.card-type` | Small label on the open book and index |
| `<h3>` | Spine, open-book title, and index title |
| `<time>` | Spine, open-book date, and index date |
| `.card-summary` | Main project goal on the left page and index |
| `.card-details` | Supporting note on the right page and mobile card |
| `<a href>` | Direct destination for the finished work |

## Before publishing

- Remove both sample projects once real projects replace them.
- Keep the information book first and projects newest-to-oldest beneath it.
- Use short titles so a spine is easy to scan. Aim for 30 characters or fewer.
- Write a summary that says what the project was meant to accomplish, not merely what technology it used.
- Test every project URL in a private/incognito browser window so private or signed-in-only links are caught.
- Check the site at 1280 × 720 and on a phone-sized screen. The simplified list replaces the desk scene at 840px and below.
- Tab through every spine and confirm the selected title changes.
- Turn on “Reduce motion” in the operating system and confirm nothing important disappears.

## Optional evidence

Screenshots, repositories, videos, and longer reflections are intentionally not part of the base template. Add them to the finished project itself or extend a single project card only when that evidence helps explain the work. The title, date, summary, and finished-project link should always remain first.
