const mermaid = window.mermaid;

/* ---------- Theme ---------- */
const root = document.documentElement;
const stored = localStorage.getItem("theme");
if (stored) root.dataset.theme = stored;
else root.dataset.theme = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";

const themeBtn = document.getElementById("theme-toggle");
function syncThemeIcon() {
  if (themeBtn) themeBtn.textContent = root.dataset.theme === "dark" ? "☀" : "☾";
}
syncThemeIcon();
themeBtn?.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  localStorage.setItem("theme", root.dataset.theme);
  syncThemeIcon();
  renderMermaid();
});

/* ---------- Mermaid ---------- */
const FONT = 'Inter, "Segoe UI", system-ui, sans-serif';
const LIGHT = {
  fontFamily: FONT, fontSize: "14px",
  primaryColor: "#ffffff", primaryTextColor: "#1a1a2e", primaryBorderColor: "#333740",
  lineColor: "#4b5563", mainBkg: "#ffffff", nodeBorder: "#333740", titleColor: "#1a1a2e",
  secondaryColor: "#e3f5ee", secondaryBorderColor: "#149f76", secondaryTextColor: "#0b5443",
  tertiaryColor: "#ece6f7", tertiaryBorderColor: "#6b4fa0", tertiaryTextColor: "#2f2350",
  clusterBkg: "#f3f0fa", clusterBorder: "#dcd3ec", edgeLabelBackground: "#ffffff",
};
const DARK = {
  fontFamily: FONT, fontSize: "14px",
  primaryColor: "#1f2433", primaryTextColor: "#e8ebed", primaryBorderColor: "#3a4154",
  lineColor: "#8b93a7", mainBkg: "#1f2433", nodeBorder: "#3a4154", titleColor: "#e8ebed",
  secondaryColor: "#13312a", secondaryBorderColor: "#2fd0a4", secondaryTextColor: "#bdf3e4",
  tertiaryColor: "#231a36", tertiaryBorderColor: "#b49cfc", tertiaryTextColor: "#e0d6ff",
  clusterBkg: "#161a26", clusterBorder: "#2c3340", edgeLabelBackground: "#1a2027",
};

const blocks = [...document.querySelectorAll("pre.mermaid")];
const sources = blocks.map((b) => b.textContent);
let mmReady = false;

async function renderMermaid() {
  if (!blocks.length || !mermaid) return;
  const dark = root.dataset.theme === "dark";
  mermaid.initialize({
    startOnLoad: false,
    theme: "base",
    themeVariables: dark ? DARK : LIGHT,
    flowchart: { curve: "basis", htmlLabels: true, padding: 12, nodeSpacing: 55, rankSpacing: 65, useMaxWidth: true },
    securityLevel: "loose",
  });
  blocks.forEach((b, i) => {
    b.textContent = sources[i];
    b.removeAttribute("data-processed");
  });
  try {
    await mermaid.run({ nodes: blocks });
    mmReady = true;
  } catch (e) {
    console.error("mermaid render failed", e);
  }
}
renderMermaid();

/* ---------- Copy buttons ---------- */
document.querySelectorAll(".code .copy").forEach((btn) => {
  btn.addEventListener("click", () => {
    const code = btn.closest(".code")?.querySelector("code");
    if (!code) return;
    navigator.clipboard.writeText(code.innerText).then(() => {
      const old = btn.textContent;
      btn.textContent = "copied";
      btn.classList.add("done");
      setTimeout(() => { btn.textContent = old; btn.classList.remove("done"); }, 1400);
    });
  });
});

/* ---------- TOC scrollspy ---------- */
const tocLinks = [...document.querySelectorAll(".toc-list a")];
if (tocLinks.length) {
  const map = new Map();
  tocLinks.forEach((a) => {
    const id = decodeURIComponent(a.getAttribute("href").slice(1));
    const el = document.getElementById(id);
    if (el) map.set(el, a);
  });
  const obs = new IntersectionObserver(
    (entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          tocLinks.forEach((a) => a.classList.remove("active"));
          map.get(en.target)?.classList.add("active");
        }
      });
    },
    { rootMargin: "-72px 0px -70% 0px", threshold: 0 }
  );
  map.forEach((_, el) => obs.observe(el));
}

/* ---------- Tooltips for [title] links ---------- */
let tip;
function showTip(target) {
  const text = target.getAttribute("data-tip") || target.getAttribute("title");
  if (!text) return;
  if (target.hasAttribute("title")) {
    target.setAttribute("data-tip", text);
    target.removeAttribute("title");
  }
  if (!tip) { tip = document.createElement("div"); tip.className = "tooltip"; document.body.appendChild(tip); }
  tip.textContent = text;
  const r = target.getBoundingClientRect();
  tip.style.left = Math.max(8, Math.min(r.left + window.scrollX, window.innerWidth - 340)) + "px";
  tip.style.top = r.bottom + window.scrollY + 8 + "px";
  requestAnimationFrame(() => tip.classList.add("show"));
}
function hideTip() { tip?.classList.remove("show"); }
document.querySelectorAll(".prose a[title], .prose .x-link[title]").forEach((a) => {
  a.addEventListener("mouseenter", () => showTip(a));
  a.addEventListener("mouseleave", hideTip);
  a.addEventListener("focus", () => showTip(a));
  a.addEventListener("blur", hideTip);
});

/* ---------- Mobile nav ---------- */
const menuBtn = document.getElementById("menu-toggle");
const backdrop = document.getElementById("backdrop");
menuBtn?.addEventListener("click", () => document.body.classList.toggle("nav-open"));
backdrop?.addEventListener("click", () => document.body.classList.remove("nav-open"));

/* ---------- Search ---------- */
const searchInput = document.getElementById("search");
const searchResults = document.getElementById("search-results");
let index = [];
let sel = -1;

if (searchInput) {
  fetch("assets/search-index.json").then((r) => r.json()).then((d) => (index = d)).catch(() => {});

  const run = (q) => {
    q = q.trim().toLowerCase();
    if (!q) { searchResults.classList.remove("open"); return; }
    const out = [];
    for (const page of index) {
      if (page.title.toLowerCase().includes(q)) out.push({ url: page.url, title: page.title, sub: "Topic" });
      for (const h of page.headings) {
        if (out.length >= 9) break;
        if (h.text.toLowerCase().includes(q)) out.push({ url: page.url + "#" + h.slug, title: h.text, sub: page.title });
      }
      if (out.length >= 9) break;
    }
    sel = -1;
    if (!out.length) { searchResults.innerHTML = '<div class="empty">No matches</div>'; searchResults.classList.add("open"); return; }
    searchResults.innerHTML = out
      .map((r) => `<a href="${r.url}"><span class="r-title">${escapeHtml(r.title)}</span><span class="r-sub">${escapeHtml(r.sub)}</span></a>`)
      .join("");
    searchResults.classList.add("open");
  };

  searchInput.addEventListener("input", () => run(searchInput.value));
  searchInput.addEventListener("keydown", (e) => {
    const items = [...searchResults.querySelectorAll("a")];
    if (e.key === "ArrowDown") { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); }
    else if (e.key === "ArrowUp") { e.preventDefault(); sel = Math.max(sel - 1, 0); }
    else if (e.key === "Enter") { if (items[sel]) location.href = items[sel].getAttribute("href"); else if (items[0]) location.href = items[0].getAttribute("href"); return; }
    else if (e.key === "Escape") { searchResults.classList.remove("open"); searchInput.blur(); return; }
    items.forEach((a, i) => a.classList.toggle("sel", i === sel));
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search")) searchResults.classList.remove("open");
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "/" && document.activeElement !== searchInput) { e.preventDefault(); searchInput.focus(); }
  });
}

function escapeHtml(s) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
}
