# Algorithm Patterns

**🔗 Live site: <https://bergsonvalencia.github.io/algo/>**

A visual study website built from the algorithms reviewer — a diagram-first guide covering 32
algorithm-pattern topics (foundations, core patterns, data structures, and an interactive
[algo.monster decision flowchart](https://bergsonvalencia.github.io/algo/algomonster-flowchart.html)).
**Vanilla HTML/CSS/JS** output (no front-end framework) — a tiny Node build step renders the
Markdown to static pages.

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

## Pattern Mastery Quiz

A self-contained quiz at [`quiz.html`](https://bergsonvalencia.github.io/algo/quiz.html) tests whether
you can recognize and apply the core patterns — single-best-answer questions across every topic,
easy → hard, randomized, each with a full explanation whether you answer right or wrong.

- `quiz-data/questions.json` — the canonical question bank (one entry per question, committed).
- `scripts/quiz/app.js`, `scripts/quiz/quiz.css` — the quiz app (vanilla JS) and its styles.
- `scripts/build-quiz.mjs` — inlines the bank + app + styles into the single self-contained
  `static/quiz.html` (run automatically as the first step of `npm run build`).
- `scripts/merge-quiz.mjs` — validates and merges the generator's per-topic JSON
  (`.quizgen/*.json`, git-ignored) into `quiz-data/questions.json`. Each question was written from
  the reviewer Markdown and independently re-verified for correctness before being kept.

To edit the quiz: change `quiz-data/questions.json` (or the app/styles) and run `npm run build:quiz`
(or `npm run build`), then `npm run serve`.

## Deploy (GitHub Pages)

Pushing to `main` runs `.github/workflows/deploy.yml`, which syncs, builds, and publishes `dist/`
to <https://bergsonvalencia.github.io/algo/>. For a project site at `user.github.io/<repo>/`, links
are relative so no base-path config is needed.
