/* ============================================================
   Pattern Mastery Quiz — app logic (vanilla JS, no framework)
   Reads the inlined question bank from window.__QUIZ__.
   ============================================================ */
(function () {
  "use strict";

  const ALL = Array.isArray(window.__QUIZ__) ? window.__QUIZ__.slice() : [];
  const root = document.getElementById("quiz-root");

  /* ---------- taxonomy: category -> group + accent ---------- */
  const GROUP_OF = {
    "pattern-selection": "Pattern selection",
    "two-pointers": "Core patterns", "sliding-window": "Core patterns", "binary-search": "Core patterns",
    "monotonic-stack": "Core patterns", "prefix-sums": "Core patterns", "intervals": "Core patterns",
    "greedy": "Core patterns", "backtracking": "Core patterns", "dynamic-programming": "Core patterns",
    "string-searching": "Core patterns",
    "linked-lists": "Data structures", "trees-bst": "Data structures", "heaps": "Data structures",
    "tries": "Data structures", "graphs": "Data structures", "hash-tables": "Data structures",
    "balanced-trees": "Data structures", "b-trees": "Data structures", "sets": "Data structures",
    "segment-tree": "Data structures",
    "complexity": "Foundations", "arrays-hashing": "Foundations", "recursion": "Foundations",
    "sorting": "Foundations", "bit-manipulation": "Foundations", "math-number-theory": "Foundations",
    "quick-dsa": "Foundations", "math-basics": "Foundations",
    "concurrency": "Systems & concurrency",
  };
  const GROUP_ORDER = ["Pattern selection", "Core patterns", "Data structures", "Foundations", "Systems & concurrency"];
  const GROUP_ACCENT = {
    "Pattern selection": "blue", "Core patterns": "purple", "Data structures": "amber",
    "Foundations": "teal", "Systems & concurrency": "green",
  };
  const ACCENT_VAR = { blue: "--c-blue", purple: "--c-purple", amber: "--c-amber", teal: "--c-teal", green: "--c-green", rose: "--c-rose" };
  const ACCENT_SOFT = { blue: "--c-blue-soft", purple: "--c-purple-soft", amber: "--c-amber-soft", teal: "--c-teal-soft", green: "--c-green-soft", rose: "--c-rose-soft" };
  const DIFFS = ["easy", "medium", "hard"];

  /* ---------- build category index from the data ---------- */
  const catMap = new Map(); // slug -> {slug, topic, group, total, byDiff:{easy,medium,hard}}
  for (const q of ALL) {
    if (!catMap.has(q.slug)) {
      catMap.set(q.slug, { slug: q.slug, topic: q.topic, group: GROUP_OF[q.slug] || "Other", total: 0, byDiff: { easy: 0, medium: 0, hard: 0 } });
    }
    const c = catMap.get(q.slug);
    c.total++;
    if (c.byDiff[q.difficulty] != null) c.byDiff[q.difficulty]++;
  }
  const groups = GROUP_ORDER.map((g) => ({
    name: g,
    accent: GROUP_ACCENT[g] || "teal",
    cats: [...catMap.values()].filter((c) => c.group === g).sort((a, b) => a.topic.localeCompare(b.topic)),
  })).filter((g) => g.cats.length);
  // any leftover groups not in GROUP_ORDER
  for (const c of catMap.values()) {
    if (!GROUP_ORDER.includes(c.group) && !groups.some((g) => g.name === c.group)) {
      groups.push({ name: c.group, accent: "teal", cats: [...catMap.values()].filter((x) => x.group === c.group) });
    }
  }
  const diffTotals = { easy: 0, medium: 0, hard: 0 };
  for (const q of ALL) if (diffTotals[q.difficulty] != null) diffTotals[q.difficulty]++;

  /* ---------- state ---------- */
  const LS_KEY = "quiz.config.v1";
  const state = {
    cats: new Set(catMap.keys()),     // selected category slugs
    diffs: new Set(DIFFS),            // selected difficulties
    count: 20,                        // 0 = all
    session: null,
  };
  try {
    const saved = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (saved) {
      if (Array.isArray(saved.cats)) { const valid = saved.cats.filter((s) => catMap.has(s)); if (valid.length) state.cats = new Set(valid); }
      if (Array.isArray(saved.diffs) && saved.diffs.length) state.diffs = new Set(saved.diffs.filter((d) => DIFFS.includes(d)));
      if (typeof saved.count === "number") state.count = saved.count;
    }
  } catch (e) { /* ignore */ }
  function persist() {
    try { localStorage.setItem(LS_KEY, JSON.stringify({ cats: [...state.cats], diffs: [...state.diffs], count: state.count })); } catch (e) { /* ignore */ }
  }

  /* ---------- helpers ---------- */
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
  // escape, then render inline `code` spans + **bold** (markdown the source uses)
  function inlineMd(t) {
    return t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  }
  function fmt(s) {
    const parts = String(s == null ? "" : s).split("`");
    let out = "";
    for (let i = 0; i < parts.length; i++) {
      out += i % 2 === 1 ? `<code>${esc(parts[i])}</code>` : inlineMd(esc(parts[i]));
    }
    return out;
  }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      const t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }
  function pool() {
    return ALL.filter((q) => state.cats.has(q.slug) && state.diffs.has(q.difficulty));
  }
  const cssVar = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

  /* ============================================================
     CONFIG SCREEN
     ============================================================ */
  function renderConfig() {
    state.session = null;
    const total = ALL.length;
    const catChips = groups.map((g) => `
      <div class="cat-group g-${g.accent}">
        <p class="cat-group-h">${esc(g.name)}</p>
        <div class="chips">
          ${g.cats.map((c) => `<button type="button" class="chip-btn cat-chip${state.cats.has(c.slug) ? " on" : ""}" data-cat="${esc(c.slug)}">${esc(c.topic)}<span class="ct">${c.total}</span></button>`).join("")}
        </div>
      </div>`).join("");

    root.innerHTML = `
      <div class="quiz-hero">
        <span class="eyebrow">Self-test &middot; ${total} questions</span>
        <h1>Pattern Mastery <span class="grad">Quiz</span></h1>
        <p>Check whether you truly understand the core patterns &mdash; enough to recognize them and solve LeetCode problems. Every answer comes with a full explanation.</p>
        <div class="quiz-stats">
          <div class="stat"><b>${total}</b><span>questions</span></div>
          <div class="stat"><b>${catMap.size}</b><span>topics</span></div>
          <div class="stat"><b>${diffTotals.easy}</b><span>easy</span></div>
          <div class="stat"><b>${diffTotals.medium}</b><span>medium</span></div>
          <div class="stat"><b>${diffTotals.hard}</b><span>hard</span></div>
        </div>
      </div>

      <div class="panel">
        <h2>Quick start</h2>
        <p class="hint">Jump straight in with a random mix across every topic and difficulty.</p>
        <div class="preset-row">
          <button type="button" class="preset" data-preset="10"><b>Warm-up</b><span>10 random questions</span></button>
          <button type="button" class="preset" data-preset="20"><b>Standard</b><span>20 random questions</span></button>
          <button type="button" class="preset" data-preset="50"><b>Marathon</b><span>50 random questions</span></button>
          <button type="button" class="preset" data-preset="hard"><b>Hard mode</b><span>20 hard-only questions</span></button>
        </div>
      </div>

      <div class="panel">
        <h2>Customize</h2>
        <p class="hint">Pick the topics and difficulty you want to drill, then start.</p>

        <div class="field">
          <label class="field-label">Topics</label>
          <div class="chips" style="margin-bottom:14px">
            <button type="button" class="chip-btn quick" data-quick="all">Select all</button>
            <button type="button" class="chip-btn quick" data-quick="core">Core patterns</button>
            <button type="button" class="chip-btn quick" data-quick="ds">Data structures</button>
            <button type="button" class="chip-btn quick" data-quick="none">Clear</button>
          </div>
          ${catChips}
        </div>

        <div class="field">
          <label class="field-label">Difficulty</label>
          <div class="chips">
            ${DIFFS.map((d) => `<button type="button" class="chip-btn diff-chip diff-${d}${state.diffs.has(d) ? " on" : ""}" data-diff="${d}">${d[0].toUpperCase() + d.slice(1)}<span class="ct">${diffTotals[d]}</span></button>`).join("")}
          </div>
        </div>

        <div class="field">
          <label class="field-label">How many questions</label>
          <div class="seg" id="count-seg">
            ${[10, 20, 35, 50, 0].map((n) => `<button type="button" data-count="${n}"${state.count === n ? " class=\"on\"" : ""}>${n === 0 ? "All" : n}</button>`).join("")}
          </div>
        </div>

        <div class="start-row">
          <button type="button" class="btn btn-primary btn-lg" id="start-btn">Start quiz &rarr;</button>
          <span class="match-count" id="match-count"></span>
        </div>
      </div>`;

    // wire presets
    root.querySelectorAll(".preset").forEach((b) => b.addEventListener("click", () => {
      const p = b.dataset.preset;
      state.cats = new Set(catMap.keys());
      if (p === "hard") { state.diffs = new Set(["hard"]); state.count = 20; }
      else { state.diffs = new Set(DIFFS); state.count = parseInt(p, 10); }
      persist();
      start();
    }));
    // category chips
    root.querySelectorAll(".cat-chip").forEach((b) => b.addEventListener("click", () => {
      const c = b.dataset.cat;
      if (state.cats.has(c)) state.cats.delete(c); else state.cats.add(c);
      b.classList.toggle("on");
      updateMatch();
    }));
    // quick selectors
    root.querySelectorAll(".quick").forEach((b) => b.addEventListener("click", () => {
      const q = b.dataset.quick;
      if (q === "all") state.cats = new Set(catMap.keys());
      else if (q === "none") state.cats = new Set();
      else if (q === "core") state.cats = new Set([...catMap.keys()].filter((s) => GROUP_OF[s] === "Core patterns"));
      else if (q === "ds") state.cats = new Set([...catMap.keys()].filter((s) => GROUP_OF[s] === "Data structures"));
      root.querySelectorAll(".cat-chip").forEach((cb) => cb.classList.toggle("on", state.cats.has(cb.dataset.cat)));
      updateMatch();
    }));
    // difficulty chips
    root.querySelectorAll(".diff-chip").forEach((b) => b.addEventListener("click", () => {
      const d = b.dataset.diff;
      if (state.diffs.has(d)) { if (state.diffs.size > 1) { state.diffs.delete(d); b.classList.remove("on"); } }
      else { state.diffs.add(d); b.classList.add("on"); }
      updateMatch();
    }));
    // count segmented
    root.querySelectorAll("#count-seg button").forEach((b) => b.addEventListener("click", () => {
      state.count = parseInt(b.dataset.count, 10);
      root.querySelectorAll("#count-seg button").forEach((x) => x.classList.toggle("on", x === b));
      updateMatch();
    }));
    root.querySelector("#start-btn").addEventListener("click", start);
    updateMatch();
  }

  function updateMatch() {
    const n = pool().length;
    const el = root.querySelector("#match-count");
    const btn = root.querySelector("#start-btn");
    if (!el) return;
    const take = state.count === 0 ? n : Math.min(state.count, n);
    el.innerHTML = n === 0
      ? `No questions match &mdash; pick at least one topic and difficulty.`
      : `<b>${take}</b> of <b>${n}</b> matching question${n === 1 ? "" : "s"} will be drawn.`;
    if (btn) btn.disabled = n === 0;
    persist();
  }

  /* ============================================================
     QUIZ RUNNER
     ============================================================ */
  function start() {
    const p = pool();
    if (!p.length) return;
    const picked = shuffle(p).slice(0, state.count === 0 ? p.length : state.count);
    state.session = {
      qs: picked.map((q) => {
        const opts = shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer })));
        return { q, opts, correctIndex: opts.findIndex((o) => o.correct) };
      }),
      i: 0,
      answers: [], // {idx, chosen, correct, sq}
      startedAt: Date.now(),
    };
    renderQuestion();
  }

  function startFrom(list, count) {
    if (!list || !list.length) return;
    const picked = shuffle(list).slice(0, count == null ? list.length : count);
    state.session = {
      qs: picked.map((q) => {
        const opts = shuffle(q.options.map((text, i) => ({ text, correct: i === q.answer })));
        return { q, opts, correctIndex: opts.findIndex((o) => o.correct) };
      }),
      i: 0, answers: [], startedAt: Date.now(),
    };
    renderQuestion();
  }

  function accentStyleFor(slug) {
    const g = GROUP_OF[slug] || "Foundations";
    const acc = GROUP_ACCENT[g] || "teal";
    return `--badge-fg:var(${ACCENT_VAR[acc]});--badge-bg:var(${ACCENT_SOFT[acc]});--badge-bd:var(${ACCENT_VAR[acc]})`;
  }

  function renderQuestion() {
    const s = state.session;
    const cur = s.qs[s.i];
    const q = cur.q;
    const answered = s.answers[s.i];
    const correctCount = s.answers.filter((a) => a && a.correct).length;
    const wrongCount = s.answers.filter((a) => a && !a.correct).length;
    const pct = Math.round((s.i / s.qs.length) * 100);

    const codeBlock = q.code && q.code.trim()
      ? `<figure class="qcode"><figcaption>${esc(q.codeLang || "code")}</figcaption><pre><code>${esc(q.code)}</code></pre></figure>` : "";

    const optsHtml = cur.opts.map((o, i) => `
      <button type="button" class="opt" data-i="${i}">
        <span class="key">${String.fromCharCode(65 + i)}</span>
        <span class="otxt">${fmt(o.text)}</span>
        <span class="mark"></span>
      </button>`).join("");

    root.innerHTML = `
      <div class="runner-bar">
        <div class="row1">
          <span class="qpos">Question ${s.i + 1} <small>/ ${s.qs.length}</small></span>
          <span class="score-pill"><b class="ok">${correctCount}</b> right &middot; <b class="no">${wrongCount}</b> wrong</span>
        </div>
        <div class="progress"><span style="width:${pct}%"></span></div>
      </div>

      <div class="qcard">
        <div class="qmeta">
          <span class="topic-chip" style="${accentStyleFor(q.slug)}">${esc(q.topic)}</span>
          <span class="diff-badge ${q.difficulty}">${q.difficulty}</span>
          ${(q.tags || []).map((t) => `<span class="tag-chip">${esc(t)}</span>`).join("")}
        </div>
        <p class="qtext">${fmt(q.question)}</p>
        ${codeBlock}
        <div class="opts" id="opts">${optsHtml}</div>
        <div id="fb"></div>
      </div>

      <div class="runner-foot">
        <span class="kbd-hint">Keys <kbd>1</kbd>&ndash;<kbd>4</kbd> to answer &middot; <kbd>Enter</kbd> next</span>
        <div class="foot-right">
          <button type="button" class="link-btn" id="quit-btn">Quit &amp; see results</button>
          <button type="button" class="btn btn-primary" id="next-btn" hidden>Next &rarr;</button>
        </div>
      </div>`;

    const optButtons = [...root.querySelectorAll(".opt")];
    optButtons.forEach((b) => b.addEventListener("click", () => choose(parseInt(b.dataset.i, 10))));
    root.querySelector("#quit-btn").addEventListener("click", () => finish(true));
    const nextBtn = root.querySelector("#next-btn");
    nextBtn.addEventListener("click", advance);

    if (answered) revealAnswer(answered.chosen); // re-render an already-answered question (e.g., via Back — not used but safe)
  }

  function choose(chosenIdx) {
    const s = state.session;
    if (s.answers[s.i]) return; // already answered
    const cur = s.qs[s.i];
    const correct = cur.opts[chosenIdx].correct;
    s.answers[s.i] = { idx: s.i, chosen: chosenIdx, correct, sq: cur };
    revealAnswer(chosenIdx);
  }

  function revealAnswer(chosenIdx) {
    const s = state.session;
    const cur = s.qs[s.i];
    const q = cur.q;
    const correct = cur.opts[chosenIdx].correct;
    const optButtons = [...root.querySelectorAll(".opt")];
    optButtons.forEach((b, i) => {
      b.disabled = true;
      const mark = b.querySelector(".mark");
      if (cur.opts[i].correct) { b.classList.add("correct"); mark.textContent = "✓"; }
      else if (i === chosenIdx) { b.classList.add("wrong"); mark.textContent = "✗"; }
      else b.classList.add("dim");
    });
    const fb = root.querySelector("#fb");
    fb.innerHTML = `
      <div class="feedback ${correct ? "right" : "wrong"}">
        <div class="verdict"><span class="icon">${correct ? "✓" : "✗"}</span>${correct ? "Correct!" : "Not quite."}${correct ? "" : ` The answer is <strong style="margin-left:4px">${String.fromCharCode(65 + cur.correctIndex)}</strong>.`}</div>
        <div class="exp"><p class="exp-h">Explanation</p>${fmt(q.explanation)}</div>
      </div>`;
    // update running score pill
    const correctCount = s.answers.filter((a) => a && a.correct).length;
    const wrongCount = s.answers.filter((a) => a && !a.correct).length;
    const pill = root.querySelector(".score-pill");
    if (pill) pill.innerHTML = `<b class="ok">${correctCount}</b> right &middot; <b class="no">${wrongCount}</b> wrong`;
    const nextBtn = root.querySelector("#next-btn");
    nextBtn.hidden = false;
    nextBtn.textContent = s.i === s.qs.length - 1 ? "See results →" : "Next →";
    nextBtn.focus();
  }

  function advance() {
    const s = state.session;
    if (!s.answers[s.i]) return;
    if (s.i === s.qs.length - 1) { finish(false); return; }
    s.i++;
    renderQuestion();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  /* ============================================================
     RESULTS
     ============================================================ */
  function finish(early) {
    const s = state.session;
    const answered = s.answers.filter(Boolean);
    const n = answered.length;
    const correct = answered.filter((a) => a.correct).length;
    const pct = n ? Math.round((correct / n) * 100) : 0;
    const secs = Math.round((Date.now() - s.startedAt) / 1000);
    const mins = Math.floor(secs / 60);
    const timeStr = mins > 0 ? `${mins}m ${secs % 60}s` : `${secs}s`;

    // breakdown by difficulty & topic
    const byDiff = {}; const byTopic = {};
    for (const a of answered) {
      const d = a.sq.q.difficulty, t = a.sq.q.topic;
      (byDiff[d] = byDiff[d] || { c: 0, n: 0 }); byDiff[d].n++; if (a.correct) byDiff[d].c++;
      (byTopic[t] = byTopic[t] || { c: 0, n: 0 }); byTopic[t].n++; if (a.correct) byTopic[t].c++;
    }
    const barClass = (frac) => frac >= 0.8 ? "hi" : frac >= 0.5 ? "mid" : "lo";
    const diffRows = DIFFS.filter((d) => byDiff[d]).map((d) => {
      const o = byDiff[d]; const f = o.c / o.n;
      return `<div class="bd-row"><span class="bd-name">${d[0].toUpperCase() + d.slice(1)}</span><span class="bd-frac">${o.c}/${o.n}</span><div class="bd-bar"><span class="${barClass(f)}" style="width:${Math.round(f * 100)}%"></span></div></div>`;
    }).join("");
    const topicRows = Object.keys(byTopic).sort((a, b) => (byTopic[a].c / byTopic[a].n) - (byTopic[b].c / byTopic[b].n)).map((t) => {
      const o = byTopic[t]; const f = o.c / o.n;
      return `<div class="bd-row"><span class="bd-name">${esc(t)}</span><span class="bd-frac">${o.c}/${o.n}</span><div class="bd-bar"><span class="${barClass(f)}" style="width:${Math.round(f * 100)}%"></span></div></div>`;
    }).join("");

    const missed = answered.filter((a) => !a.correct);
    const verdict = pct >= 90 ? "Outstanding — you know these patterns cold."
      : pct >= 75 ? "Strong. A few gaps to tighten up."
      : pct >= 50 ? "Decent base — review the misses below."
      : "Lots of room to grow — dig into the explanations.";

    const C = 2 * Math.PI * 76;
    root.innerHTML = `
      <div class="results-head">
        <div class="score-ring">
          <svg width="168" height="168" viewBox="0 0 168 168">
            <circle class="ring-bg" cx="84" cy="84" r="76" fill="none" stroke-width="14"></circle>
            <circle class="ring-fg" cx="84" cy="84" r="76" fill="none" stroke-width="14"
              stroke-dasharray="${C}" stroke-dashoffset="${C}" id="ring-fg"></circle>
          </svg>
          <div class="ring-label"><b>${pct}%</b><span>${correct} / ${n}</span></div>
        </div>
        <h1>${early ? "Quiz ended" : "Quiz complete"}</h1>
        <p class="sub">${esc(verdict)} &middot; ${timeStr}</p>
      </div>

      <div class="breakdown">
        <div class="bd-card"><h3>By difficulty</h3>${diffRows || '<p class="empty-note" style="padding:6px">&mdash;</p>'}</div>
        <div class="bd-card"><h3>By topic</h3>${topicRows || '<p class="empty-note" style="padding:6px">&mdash;</p>'}</div>
      </div>

      <div class="review-controls">
        <h2>Review</h2>
        <div class="chips">
          <button type="button" class="chip-btn rev-filter on" data-filter="all">All ${n}</button>
          <button type="button" class="chip-btn rev-filter" data-filter="missed">Missed ${missed.length}</button>
        </div>
      </div>
      <div id="review-list">${renderReview(answered, "all")}</div>

      <div class="results-actions">
        <button type="button" class="btn btn-primary" id="again-btn">New quiz</button>
        <button type="button" class="btn btn-ghost" id="same-btn">Same settings again</button>
        ${missed.length ? `<button type="button" class="btn btn-ghost" id="retry-btn">Retry ${missed.length} missed</button>` : ""}
      </div>`;

    // animate ring
    requestAnimationFrame(() => {
      const ring = root.querySelector("#ring-fg");
      if (ring) {
        ring.style.stroke = pct >= 75 ? cssVar("--c-green") : pct >= 50 ? cssVar("--c-amber") : cssVar("--c-rose");
        ring.style.strokeDashoffset = String(C * (1 - pct / 100));
      }
    });

    root.querySelectorAll(".rev-filter").forEach((b) => b.addEventListener("click", () => {
      root.querySelectorAll(".rev-filter").forEach((x) => x.classList.toggle("on", x === b));
      root.querySelector("#review-list").innerHTML = renderReview(answered, b.dataset.filter);
    }));
    root.querySelector("#again-btn").addEventListener("click", () => { renderConfig(); window.scrollTo({ top: 0 }); });
    root.querySelector("#same-btn").addEventListener("click", () => { start(); window.scrollTo({ top: 0 }); });
    const retry = root.querySelector("#retry-btn");
    if (retry) retry.addEventListener("click", () => { startFrom(missed.map((a) => a.sq.q), null); window.scrollTo({ top: 0 }); });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderReview(answered, filter) {
    const list = filter === "missed" ? answered.filter((a) => !a.correct) : answered;
    if (!list.length) return '<p class="empty-note">Nothing here — nice work!</p>';
    return list.map((a) => {
      const q = a.sq.q;
      const correctText = a.sq.opts[a.sq.correctIndex].text;
      const yourText = a.sq.opts[a.chosen].text;
      return `
        <div class="review-item ${a.correct ? "r-right" : "r-wrong"}">
          <p class="ri-q">${fmt(q.question)}</p>
          ${a.correct
            ? `<p class="ri-line"><span class="a-correct">&#10003; You answered:</span> ${fmt(yourText)}</p>`
            : `<p class="ri-line"><span class="a-yours">&#10007; Your answer:</span> ${fmt(yourText)}</p>
               <p class="ri-line"><span class="a-correct">&#10003; Correct:</span> ${fmt(correctText)}</p>`}
          <details${a.correct ? "" : " open"}><summary>Explanation</summary><div class="ri-exp">${fmt(q.explanation)}</div></details>
        </div>`;
    }).join("");
  }

  /* ---------- keyboard ---------- */
  document.addEventListener("keydown", (e) => {
    if (!state.session) return;
    const tag = (document.activeElement && document.activeElement.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    const s = state.session;
    const cur = s.qs[s.i];
    if (!cur) return;
    if (["1", "2", "3", "4"].includes(e.key)) {
      const i = parseInt(e.key, 10) - 1;
      if (i < cur.opts.length && !s.answers[s.i]) { e.preventDefault(); choose(i); }
    } else if (e.key === "Enter" || e.key === "ArrowRight") {
      if (s.answers[s.i]) { e.preventDefault(); advance(); }
    }
  });

  /* ---------- boot ---------- */
  if (!ALL.length) {
    root.innerHTML = '<p class="empty-note">The question bank failed to load.</p>';
  } else {
    renderConfig();
  }
})();
