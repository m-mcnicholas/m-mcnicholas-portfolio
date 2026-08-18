# Michael McNicholas — Project Portfolio

A progressively enhanced school-project archive. The `feature/books` branch contains the dependency-free CSS book scene. The `feature/full3d` branch adds a Three.js WebGL scene while retaining the CSS scene as its automatic fallback. Phone users receive the complete chronological project list directly.

## Run locally

Serve the folder locally, then open the printed URL:

```sh
python3 -m http.server 8000
```

Visit `http://localhost:8000`. No install or build step is required. A local server is needed because the full-3D module imports Three.js from a pinned CDN URL.

## Add a project

Follow [ADDING_PROJECTS.md](ADDING_PROJECTS.md). Normal project additions require editing one HTML block; stack order, position, interaction, and mobile presentation are automatic.

## Files

- `index.html` contains all project content and semantic page structure.
- `styles.css` creates the desktop book scene and mobile project list.
- `script.js` progressively creates the interactive stack from the HTML project entries.
- `full3d.js` builds the optional WebGL book scene from those same entries.
- `ADDING_PROJECTS.md` documents the addition and verification workflow.
