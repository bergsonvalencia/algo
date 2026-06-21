// Static site generator: content/algorithms/*.md -> dist/*.html
// Vanilla output (no client framework). markdown-it for rendering, build-time
// syntax highlighting via highlight.js, Mermaid rendered client-side.
import {
  readFileSync, writeFileSync, readdirSync, mkdirSync, rmSync, copyFileSync, cpSync, existsSync,
} from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createRequire } from "node:module";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import GithubSlugger from "github-slugger";

const require = createRequire(import.meta.url);
const hljs = require("highlight.js");

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = __dirname;
const CONTENT = join(ROOT, "content", "algorithms");
const OUT = join(ROOT, "dist");
const SRC = join(ROOT, "src");

const SITE = {
  title: "Algorithm Patterns",
  short: "Algorithm Patterns",
  tagline: "A visual, diagram-first guide to the algorithm patterns.",
  repo: "https://github.com/bergsonvalencia/algo",
};

const GROUPS = [
  { title: "Start here", accent: "blue", items: ["algorithm-patterns-index-reviewer"] },
  { title: "Foundations", accent: "teal", items: [
    "complexity-and-big-o-reviewer", "arrays-and-hashing-reviewer",
    "recursion-and-divide-and-conquer-reviewer", "sorting-algorithms-reviewer",
    "bit-manipulation-reviewer", "math-and-number-theory-reviewer",
  ]},
  { title: "Core patterns", accent: "purple", items: [
    "two-pointers-reviewer", "sliding-window-reviewer", "binary-search-reviewer",
    "stacks-and-monotonic-stacks-reviewer", "prefix-sums-and-difference-arrays-reviewer",
    "intervals-reviewer", "greedy-reviewer", "backtracking-reviewer", "dynamic-programming-reviewer",
  ]},
  { title: "Data structures", accent: "amber", items: [
    "linked-lists-reviewer", "trees-and-binary-search-trees-reviewer",
    "heaps-and-priority-queues-reviewer", "tries-reviewer", "graphs-reviewer",
  ]},
  { title: "Reference", accent: "rose", items: ["algorithms-glossary-reviewer"] },
];

const ACCENT_CLASS = { blue: "acc-blue", teal: "acc-teal", purple: "acc-purple", amber: "acc-amber", rose: "acc-rose", green: "acc-green" };

const GROUP_OF = {};
for (const g of GROUPS) for (const b of g.items) GROUP_OF[b] = { title: g.title, accent: g.accent };

/* ---------------- markdown-it ---------------- */
const slugger = new GithubSlugger();
const md = new MarkdownIt({
  html: true, linkify: true, typographer: false,
  highlight(str, lang) {
    if (lang === "mermaid") {
      return `<div class="mermaid-wrap"><pre class="mermaid">${md.utils.escapeHtml(str)}</pre></div>`;
    }
    const plain = !lang || ["text", "txt", "plaintext", "plain", "ascii", "console"].includes(lang.toLowerCase());
    if (!plain && hljs.getLanguage(lang)) {
      try {
        const v = hljs.highlight(str, { language: lang, ignoreIllegals: true }).value;
        return `<figure class="code"><figcaption>${lang}</figcaption><pre><code class="hljs language-${lang}">${v}</code></pre><button class="copy" type="button">copy</button></figure>`;
      } catch { /* fall through */ }
    }
    // plaintext / ASCII traces — keep monospace, no coloring, preserve alignment
    return `<pre class="trace"><code>${md.utils.escapeHtml(str)}</code></pre>`;
  },
});
md.use(anchor, {
  slugify: (s) => slugger.slug(s),
  permalink: anchor.permalink.linkInsideHeader({ symbol: "#", placement: "after", class: "header-anchor", ariaHidden: true }),
});

// Rewrite relative .md links -> .html (same dir, only if the target was built);
// links to not-yet-built files become inert spans.
const defaultLinkOpen = md.renderer.rules.link_open || ((t, i, o, e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_open = function (tokens, idx, opts, env, self) {
  const token = tokens[idx];
  const hi = token.attrIndex("href");
  if (hi >= 0) {
    const href = token.attrs[hi][1];
    const res = resolveHref(href, env.builtSet);
    if (res.dead) { env._dead = true; return '<span class="x-link" title="Available when this section ships">'; }
    token.attrs[hi][1] = res.href;
    if (/^https?:/i.test(res.href)) { token.attrSet("target", "_blank"); token.attrSet("rel", "noopener"); }
  }
  return defaultLinkOpen(tokens, idx, opts, env, self);
};
const defaultLinkClose = md.renderer.rules.link_close || ((t, i, o, e, s) => s.renderToken(t, i, o));
md.renderer.rules.link_close = function (tokens, idx, opts, env, self) {
  if (env._dead) { env._dead = false; return "</span>"; }
  return defaultLinkClose(tokens, idx, opts, env, self);
};

function resolveHref(href, builtSet) {
  if (!href) return { href };
  if (/^(https?:|mailto:|tel:|\/\/)/i.test(href)) return { href };
  if (href.startsWith("#")) return { href };
  const hi = href.indexOf("#");
  const path = hi >= 0 ? href.slice(0, hi) : href;
  const hash = hi >= 0 ? href.slice(hi) : "";
  if (!path.endsWith(".md")) return { href };
  if (!path.includes("/")) {
    const base = path.slice(0, -3);
    if (builtSet.has(base)) return { href: base + ".html" + hash };
  }
  return { dead: true };
}

/* ---------------- helpers ---------------- */
function escAttr(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function escHtml(s) { return md.utils.escapeHtml(s); }

function getTitle(raw) {
  const m = raw.match(/^#\s+(.+)$/m);
  return m ? m[1].replace(/\s*\(Reviewer\)\s*$/i, "").trim() : "Untitled";
}

function getExcerpt(raw) {
  const lines = raw.split(/\r?\n/);
  let i = 0;
  while (i < lines.length && !/^#\s/.test(lines[i])) i++;
  i++;
  const para = [];
  for (; i < lines.length; i++) {
    const ln = lines[i].trim();
    if (!ln) { if (para.length) break; else continue; }
    if (/^(#{1,6}\s|Related:|>|\||`{3}|[-*]\s|\d+\.\s)/.test(ln)) { if (para.length) break; else continue; }
    para.push(ln);
  }
  let t = para.join(" ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1");
  if (t.length > 185) t = t.slice(0, 182).trimEnd() + "…";
  return t;
}

function removeNamedSection(tokens, name) {
  for (let i = 0; i < tokens.length; i++) {
    if (tokens[i].type === "heading_open" && tokens[i].tag === "h2" && tokens[i + 1]?.content?.trim() === name) {
      let j = i + 3;
      while (j < tokens.length && !(tokens[j].type === "hr" || (tokens[j].type === "heading_open" && (tokens[j].tag === "h1" || tokens[j].tag === "h2")))) j++;
      tokens.splice(i, j - i);
      return;
    }
  }
}

function collectHeadings(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if (t.type === "heading_open" && (t.tag === "h2" || t.tag === "h3")) {
      const id = t.attrGet("id");
      const text = tokens[i + 1]?.content || "";
      if (id) out.push({ level: t.tag === "h2" ? 2 : 3, slug: id, text });
    }
  }
  return out;
}

function buildTOC(heads) {
  if (!heads.length) return "";
  let html = '<ul class="toc-list">';
  for (const h of heads) html += `<li class="toc-l${h.level}"><a href="#${h.slug}">${escHtml(h.text)}</a></li>`;
  return html + "</ul>";
}

function renderSidebar(current, meta) {
  let html = '<nav class="nav">';
  for (const g of GROUPS) {
    const items = g.items.filter((b) => meta[b]);
    if (!items.length) continue;
    html += `<p class="nav-group">${escHtml(g.title)}</p><ul>`;
    for (const b of items) {
      const cls = b === current ? ' class="active"' : "";
      html += `<li><a${cls} href="${b}.html">${escHtml(meta[b].title)}</a></li>`;
    }
    html += "</ul>";
  }
  return html + "</nav>";
}

function cardMeta(b, meta) {
  const p = meta[b].problems, d = meta[b].diagrams;
  const parts = [];
  if (p) parts.push(`${p} problem${p === 1 ? "" : "s"}`);
  if (d) parts.push(`${d} diagram${d === 1 ? "" : "s"}`);
  return parts.join(" · ");
}

function renderBreadcrumb(base, meta) {
  const g = GROUP_OF[base];
  const group = g ? escHtml(g.title) : "Topics";
  return `<nav class="crumbs" aria-label="Breadcrumb"><a href="index.html">Algorithms</a><span class="sep">›</span><span>${group}</span><span class="sep">›</span><span class="current">${escHtml(meta[base].title)}</span></nav>`;
}

function renderRelated(base, meta) {
  const g = GROUP_OF[base];
  if (!g) return "";
  const group = GROUPS.find((x) => x.title === g.title);
  const sibs = group.items.filter((b) => b !== base && meta[b]);
  if (!sibs.length) return "";
  const cards = sibs.map((b) => `
      <a class="card ${ACCENT_CLASS[g.accent]}" href="${b}.html">
        <span class="tag">${escHtml(g.title)}</span>
        <h3>${escHtml(meta[b].title)}</h3>
        <span class="more">Read &rarr;</span>
      </a>`).join("");
  return `<section class="related"><h2>Related patterns</h2><div class="card-grid">${cards}</div></section>`;
}

function topbar() {
  const gh = SITE.repo ? `<a class="icon-btn gh-link" href="${SITE.repo}" target="_blank" rel="noopener" aria-label="GitHub">&#9733;</a>` : "";
  return `<header class="topbar">
  <button class="icon-btn menu-btn" id="menu-toggle" aria-label="Menu">&#9776;</button>
  <a class="brand" href="index.html"><span>${escHtml(SITE.title)}</span></a>
  <span class="spacer"></span>
  <div class="search"><span class="icon">&#9906;</span><input id="search" type="search" placeholder="Search topics…  (press /)" autocomplete="off" aria-label="Search"><div class="search-results" id="search-results"></div></div>
  <button class="icon-btn" id="theme-toggle" aria-label="Toggle theme">&#9790;</button>
  ${gh}
</header>`;
}

function shell({ title, desc, bodyMain, extraClass = "" }) {
  return `<!doctype html>
<html lang="en" data-theme="light">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escHtml(title)}</title>
<meta name="description" content="${escAttr(desc)}">
<link rel="stylesheet" href="assets/vendor/fonts.css">
<link rel="stylesheet" href="assets/vendor/github-dark.min.css">
<link rel="stylesheet" href="assets/theme.css">
</head>
<body class="${extraClass}">
<a class="skip" href="#main">Skip to content</a>
${topbar()}
${bodyMain}
<div class="backdrop" id="backdrop"></div>
<script src="assets/vendor/mermaid.min.js"></script>
<script type="module" src="assets/app.js"></script>
</body>
</html>`;
}

function renderPage({ base, title, excerpt, body, toc, sidebar, breadcrumb, related }) {
  const main = `<div class="layout">
  <aside class="sidebar" id="sidebar">${sidebar}</aside>
  <main class="content" id="main">${breadcrumb}<article class="prose">${body}</article>${related}</main>
  <aside class="toc"><div class="toc-inner"><p class="toc-title">On this page</p>${toc}</div></aside>
</div>`;
  return shell({ title: `${title} · ${SITE.title}`, desc: excerpt, bodyMain: main });
}

function renderHome(meta) {
  const built = new Set(Object.keys(meta));
  let sections = "";
  for (const g of GROUPS) {
    if (g.title === "Start here") continue;   // the hero "Start" button covers the index hub
    const items = g.items.filter((b) => built.has(b));
    if (!items.length) continue;
    const cards = items.map((b) => `
      <a class="card ${ACCENT_CLASS[g.accent]}" href="${b}.html">
        <span class="tag">${escHtml(g.title)}</span>
        <h3>${escHtml(meta[b].title)}</h3>
        <p>${escHtml(meta[b].excerpt)}</p>
        <span class="card-meta">${cardMeta(b, meta)}</span>
        <span class="more">Read &rarr;</span>
      </a>`).join("");
    sections += `<section class="home-section"><h2>${escHtml(g.title)}</h2><div class="card-grid">${cards}</div></section>`;
  }
  const first = built.has("two-pointers-reviewer") ? "two-pointers-reviewer.html" : Object.keys(meta)[0] + ".html";
  const idx = built.has("algorithm-patterns-index-reviewer") ? "algorithm-patterns-index-reviewer.html" : first;
  const main = `<div class="home">
  <section class="hero">
    <span class="eyebrow">${escHtml(SITE.tagline)}</span>
    <h1>Master the <span class="grad">algorithm patterns</span><br>that crack coding interviews</h1>
    <p>Every LeetCode pattern, explained the way you actually remember it — one clear diagram, one worked trace, one clean implementation at a time.</p>
    <div class="cta">
      <a class="btn btn-primary" href="${idx}">Start Here</a>
    </div>
  </section>
  ${sections}
  </div>
  <footer class="site-footer">Generated from the algorithms reviewer · built with vanilla HTML, CSS &amp; JS.</footer>`;
  return shell({ title: SITE.title, desc: SITE.tagline, bodyMain: main, extraClass: "home-page" });
}

/* ---------------- build ---------------- */
if (!existsSync(CONTENT)) {
  console.error(`No content found at ${CONTENT}. Run "npm run sync" first.`);
  process.exit(1);
}

const files = readdirSync(CONTENT).filter((f) => f.endsWith(".md"));
const builtSet = new Set(files.map((f) => f.slice(0, -3)));
const meta = {};
for (const f of files) {
  const raw = readFileSync(join(CONTENT, f), "utf8");
  const base = f.slice(0, -3);
  const problems = new Set((raw.match(/\bLC\s+\d+/g) || [])).size;
  const diagrams = (raw.match(/^```mermaid/gm) || []).length;
  meta[base] = { title: getTitle(raw), excerpt: getExcerpt(raw), raw, problems, diagrams };
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(join(OUT, "assets"), { recursive: true });
copyFileSync(join(SRC, "theme.css"), join(OUT, "assets", "theme.css"));
copyFileSync(join(SRC, "app.js"), join(OUT, "assets", "app.js"));
cpSync(join(SRC, "vendor"), join(OUT, "assets", "vendor"), { recursive: true });

const searchIndex = [];
for (const f of files) {
  const base = f.slice(0, -3);
  const env = { builtSet };
  slugger.reset();
  const tokens = md.parse(meta[base].raw, env);
  removeNamedSection(tokens, "Contents");
  const heads = collectHeadings(tokens);
  const toc = buildTOC(heads);
  const body = md.renderer.render(tokens, md.options, env);
  const sidebar = renderSidebar(base, meta);
  const breadcrumb = renderBreadcrumb(base, meta);
  const related = renderRelated(base, meta);
  writeFileSync(join(OUT, base + ".html"), renderPage({ base, title: meta[base].title, excerpt: meta[base].excerpt, body, toc, sidebar, breadcrumb, related }));
  searchIndex.push({ url: base + ".html", title: meta[base].title, excerpt: meta[base].excerpt, headings: heads.map((h) => ({ text: h.text, slug: h.slug })) });
}

writeFileSync(join(OUT, "assets", "search-index.json"), JSON.stringify(searchIndex));
writeFileSync(join(OUT, "index.html"), renderHome(meta));

console.log(`Built ${files.length} topic pages + homepage -> dist/`);
