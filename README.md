# Algorithm Patterns

A visual study website built from the algorithms reviewer. **Vanilla HTML/CSS/JS**
output (no front-end framework) — a tiny Node build step renders the Markdown to static pages.

The reviewer Markdown is the single source of truth and is **never modified** by this project; a
sync script copies it in.

## Develop

```bash
npm install
npm run sync     # copy reviewer/algorithms Markdown -> content/ (source untouched)
npm run build    # render content/ -> dist/
npm run serve    # preview dist/ at http://localhost:4173
# or all at once:
npm run dev
```

Point the sync at a different reviewer location with `REVIEWER_SRC`:

```bash
REVIEWER_SRC=/path/to/reviewer/algorithms npm run sync
```

## How it works

- `scripts/sync-content.mjs` — copies `*.md` from the reviewer into `content/algorithms/`.
- `build.mjs` — `markdown-it` + `markdown-it-anchor` render each file to `dist/<name>.html`:
  - ` ```mermaid ` blocks become client-rendered, theme-aware diagrams.
  - C# / other code is syntax-highlighted at build time (highlight.js).
  - ` ```text ` blocks render as alignment-preserving ASCII trace cards.
  - relative `.md` links are rewritten to `.html`; links to not-yet-built sections become inert.
  - a per-page table of contents and a `search-index.json` are generated.
- `src/theme.css`, `src/app.js` — the hand-written theme and behavior
  (dark mode, Mermaid theming, scrollspy TOC, glossary tooltips, search, mobile nav).

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which syncs, builds, and publishes `dist/`.
For a project site at `user.github.io/<repo>/`, links are relative so no base-path config is needed.
