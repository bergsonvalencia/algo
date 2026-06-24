// Assemble the self-contained quiz page:
//   quiz-data/questions.json + scripts/quiz/quiz.css + scripts/quiz/app.js
//   -> static/quiz.html   (single file; build.mjs copies static/*.html into dist/)
//
//   node scripts/build-quiz.mjs
//
// The page reuses the site's shared assets (assets/vendor/fonts.css, assets/theme.css)
// which exist in dist/, so it themes identically to the rest of the site.
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DATA = join(ROOT, "quiz-data", "questions.json");
const CSS = join(ROOT, "scripts", "quiz", "quiz.css");
const APP = join(ROOT, "scripts", "quiz", "app.js");
const OUT = join(ROOT, "static", "quiz.html");

if (!existsSync(DATA)) {
  console.error(`Missing ${DATA}. Run "node scripts/merge-quiz.mjs" first.`);
  process.exit(1);
}

const questions = JSON.parse(readFileSync(DATA, "utf8"));
const css = readFileSync(CSS, "utf8");
const app = readFileSync(APP, "utf8");

// Safe to embed inside a <script> tag: escaping "<" as < prevents any
// "</script>" or "<!--" sequence in the data from breaking out of the script.
const dataJson = JSON.stringify(questions)
  .replace(/</g, "\\u003c");

const topics = new Set(questions.map((q) => q.slug)).size;

const html = `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Pattern Mastery Quiz · Algorithm Patterns</title>
<meta name="description" content="Test whether you understand the core algorithm patterns well enough to solve LeetCode problems — ${questions.length} questions across ${topics} topics, easy to hard, every answer fully explained.">
<link rel="stylesheet" href="assets/vendor/fonts.css">
<link rel="stylesheet" href="assets/theme.css">
<style>
${css}
</style>
<script>
  // Apply the saved theme before first paint to avoid a flash.
  (function () {
    try {
      var t = localStorage.getItem("theme");
      document.documentElement.dataset.theme = t || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    } catch (e) { document.documentElement.dataset.theme = "light"; }
  })();
</script>
</head>
<body>
<a class="skip" href="#quiz-root">Skip to content</a>
<header class="topbar">
  <a class="brand" href="index.html"><span>Algorithm Patterns</span></a>
  <span class="spacer"></span>
  <a class="icon-btn" href="index.html" style="width:auto;padding:0 12px;font-size:13px;font-weight:600;text-decoration:none">Topics</a>
  <a class="icon-btn" href="viz/index.html" style="width:auto;padding:0 12px;gap:6px;font-size:13px;font-weight:600;text-decoration:none" title="Step-by-step visualizations">&#9654;&nbsp;Visualize</a>
  <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme">&#9790;</button>
</header>
<main class="quiz-main" id="quiz-root"></main>
<script>window.__QUIZ__ = ${dataJson};</script>
<script>
  // Theme toggle (shares the "theme" key with the rest of the site).
  (function () {
    var root = document.documentElement, btn = document.getElementById("theme-toggle");
    function sync() { if (btn) btn.textContent = root.dataset.theme === "dark" ? "\\u2600" : "\\u263e"; }
    sync();
    if (btn) btn.addEventListener("click", function () {
      root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
      try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
      sync();
    });
  })();
</script>
<script>
${app}
</script>
</body>
</html>
`;

writeFileSync(OUT, html);
console.log(`Built quiz page (${questions.length} questions, ${topics} topics) -> ${OUT}`);
