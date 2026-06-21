// algviz/1 — the visualization trace contract.
//
// A trace is a self-contained JSON document describing a step-by-step run of an
// algorithm. Every frame is a FULL snapshot (not a delta), so the player can render
// any step as a pure function render(idx) — making scrub / step-back / play
// desync-proof with no undo logic. This module is the single source of truth for the
// shape, shared by the tracer (producer), the build/validate scripts, and the player
// (consumer). It runs unchanged in Node and the browser.

export const SCHEMA_ID = 'algviz/1';

// Hard guard against runaway instrumentation (mirrors algorithm-visualizer's MAX_COMMANDS).
export const MAX_FRAMES = 5000;

// Semantic highlight states. Renderers map these enum names -> CSS classes -> colors,
// so themes and contrast live in one place and traces never carry raw colors.
export const HIGHLIGHTS = Object.freeze([
  'active',    // generic: the element under the cursor right now
  'compared',  // being compared this step
  'swapped',   // just swapped / written
  'visited',   // processed / done
  'frontier',  // discovered, waiting in a queue/stack
  'filled',    // a DP cell that has been computed
  'path',      // lies on the answer path
  'match',     // the found answer
  'current',   // currently visiting (graphs/trees)
  'muted',     // ruled out / no longer in play
]);

// The visual primitives the algorithms syllabus needs.
export const STRUCTURE_TYPES = Object.freeze([
  'array1d', 'grid', 'linkedList', 'binaryTree', 'graph',
  'stack', 'queue', 'hashmap', 'set', 'heap',
]);

const isInt = (n) => Number.isInteger(n);
const isScalar = (v) => v === null || ['string', 'number', 'boolean'].includes(typeof v);
const isStr = (v) => typeof v === 'string';

// Per-primitive state-shape checkers. Each pushes human-readable errors to `errs`,
// prefixed by `at` (e.g. "frame 3 / state 'nums'") so failures point to the exact spot.
const STATE_VALIDATORS = {
  array1d(s, at, errs) {
    if (!Array.isArray(s.cells)) return errs.push(`${at}: array1d.cells must be an array`);
    checkCells(s.cells, at, errs, ['pointers']);
    if (s.range != null && !(Array.isArray(s.range) && s.range.length === 2 && s.range.every(isInt)))
      errs.push(`${at}: array1d.range must be [lo, hi] integers`);
  },
  grid(s, at, errs) {
    if (!isInt(s.rows) || !isInt(s.cols)) errs.push(`${at}: grid needs integer rows/cols`);
    if (!Array.isArray(s.cells)) return errs.push(`${at}: grid.cells must be an array`);
    checkCells(s.cells, at, errs);
  },
  linkedList(s, at, errs) {
    if (!Array.isArray(s.nodes)) return errs.push(`${at}: linkedList.nodes must be an array`);
    checkCells(s.nodes, at, errs, ['next', 'pointers']);
  },
  binaryTree(s, at, errs) {
    if (!Array.isArray(s.nodes)) return errs.push(`${at}: binaryTree.nodes must be an array`);
    checkCells(s.nodes, at, errs, ['left', 'right', 'pointers']);
  },
  graph(s, at, errs) {
    if (!Array.isArray(s.nodes)) return errs.push(`${at}: graph.nodes must be an array`);
    if (!Array.isArray(s.edges)) return errs.push(`${at}: graph.edges must be an array`);
    checkCells(s.nodes, at, errs, ['x', 'y']);
    for (const e of s.edges) {
      if (!isStr(e.from) || !isStr(e.to)) errs.push(`${at}: graph edge needs string from/to`);
      checkHighlight(e.highlight, `${at} edge ${e.from}->${e.to}`, errs);
    }
  },
  stack(s, at, errs) { checkItems(s, at, errs); },
  queue(s, at, errs) {
    checkItems(s, at, errs);
    if (s.front != null && !isInt(s.front)) errs.push(`${at}: queue.front must be an integer`);
  },
  set(s, at, errs) { checkItems(s, at, errs); },
  hashmap(s, at, errs) {
    if (!Array.isArray(s.entries)) return errs.push(`${at}: hashmap.entries must be an array`);
    for (const e of s.entries) {
      if (!isStr(e.key)) errs.push(`${at}: hashmap entry needs a string key`);
      if (!('k' in e) || !('v' in e)) errs.push(`${at}: hashmap entry needs k and v`);
      checkHighlight(e.highlight, `${at} entry ${e.key}`, errs);
    }
  },
  heap(s, at, errs) {
    if (!Array.isArray(s.array)) return errs.push(`${at}: heap.array must be an array`);
    checkCells(s.array, at, errs);
  },
};

function checkItems(s, at, errs) {
  if (!Array.isArray(s.items)) return errs.push(`${at}: ${s.type}.items must be an array`);
  checkCells(s.items, at, errs);
}

// Shared check for "a list of keyed elements with a value and optional highlight".
function checkCells(cells, at, errs, _extra = []) {
  const seen = new Set();
  for (const c of cells) {
    if (!isStr(c.key)) { errs.push(`${at}: element missing string key`); continue; }
    if (seen.has(c.key)) errs.push(`${at}: duplicate element key "${c.key}"`);
    seen.add(c.key);
    if (!('value' in c)) errs.push(`${at}: element "${c.key}" missing value`);
    checkHighlight(c.highlight, `${at} element ${c.key}`, errs);
  }
}

function checkHighlight(h, at, errs) {
  if (h != null && !HIGHLIGHTS.includes(h))
    errs.push(`${at}: unknown highlight "${h}" (allowed: ${HIGHLIGHTS.join(', ')})`);
}

// Validate a complete trace document. Returns { ok, errors }. Strict by design:
// a plausible-but-wrong trace (off-by-one pointer, stray highlight) should fail loudly
// rather than render a silently broken frame.
export function validateTrace(t) {
  const errs = [];
  if (!t || typeof t !== 'object') return { ok: false, errors: ['trace is not an object'] };
  if (t.schema !== SCHEMA_ID) errs.push(`schema must be "${SCHEMA_ID}" (got ${JSON.stringify(t.schema)})`);
  if (!isStr(t.title)) errs.push('title must be a string');
  if (!isStr(t.topic)) errs.push('topic must be a string');

  const code = t.code ?? [];
  if (!Array.isArray(code) || !code.every(isStr)) errs.push('code must be an array of strings');

  const structures = t.structures ?? {};
  if (typeof structures !== 'object') errs.push('structures must be an object');
  for (const [id, def] of Object.entries(structures)) {
    if (!STRUCTURE_TYPES.includes(def?.type)) errs.push(`structure "${id}": unknown type "${def?.type}"`);
    if (def && 'label' in def && !isStr(def.label)) errs.push(`structure "${id}": label must be a string`);
  }

  if (!Array.isArray(t.frames) || t.frames.length === 0) {
    errs.push('frames must be a non-empty array');
    return { ok: false, errors: errs };
  }
  if (t.frames.length > MAX_FRAMES) errs.push(`too many frames (${t.frames.length} > ${MAX_FRAMES})`);

  t.frames.forEach((f, i) => {
    const fat = `frame ${i}`;
    if (!isStr(f.caption) || f.caption.trim() === '') errs.push(`${fat}: caption must be a non-empty string`);
    if (f.note != null && !isStr(f.note)) errs.push(`${fat}: note must be a string`);
    if (f.line != null && !(isInt(f.line) && f.line >= 1 && f.line <= code.length))
      errs.push(`${fat}: line ${f.line} out of range 1..${code.length}`);
    if (f.vars != null) {
      if (typeof f.vars !== 'object') errs.push(`${fat}: vars must be an object`);
      else for (const [k, v] of Object.entries(f.vars))
        if (!isScalar(v)) errs.push(`${fat}: var "${k}" must be scalar (string/number/boolean/null)`);
    }
    const states = f.states ?? {};
    for (const [id, st] of Object.entries(states)) {
      const sat = `${fat} / state "${id}"`;
      if (!(id in structures)) { errs.push(`${sat}: not declared in structures`); continue; }
      if (st.type !== structures[id].type)
        errs.push(`${sat}: type "${st.type}" != declared "${structures[id].type}"`);
      const v = STATE_VALIDATORS[st.type];
      if (v) v(st, sat, errs);
    }
  });

  return { ok: errs.length === 0, errors: errs };
}
