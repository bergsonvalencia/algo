// Renderers: turn a structure's frame state into DOM, reconciling by stable key so the
// FLIP engine can animate persisting elements. Box-layout primitives (array1d, grid,
// stack, queue, hashmap) use DOM + CSS grid/flex and carry data-key for FLIP. The graph
// uses inline SVG and transitions highlights via CSS (nodes hold fixed positions).
//
// Each renderer: render(container, structId, state, def) -> void.

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
const svg = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; };
const hlClass = (h) => (h ? ` hl-${h}` : '');
const fmt = (v) => (v === null ? 'null' : String(v));

// Reconcile `container`'s children to `items` (each with a `.key`) in order, by global
// data-key `${structId}/${key}`. Reuses matching nodes (so FLIP can move them), creates
// missing ones via make(item), refreshes all via update(node, item, index), drops stale.
function reconcile(container, structId, items, make, update) {
  const existing = new Map();
  for (const node of [...container.children]) if (node.dataset.key) existing.set(node.dataset.key, node);
  const seen = new Set();
  items.forEach((item, i) => {
    const dk = `${structId}/${item.key}`;
    let node = existing.get(dk);
    if (!node) { node = make(item); node.dataset.key = dk; }
    update(node, item, i);
    container.appendChild(node); // moves into final order
    seen.add(dk);
  });
  for (const [dk, node] of existing) if (!seen.has(dk)) node.remove();
}

// ---- array1d --------------------------------------------------------------
function renderArray1d(container, structId, state) {
  container.className = 's s-array1d';
  const [lo, hi] = state.range ?? [null, null];
  reconcile(
    container, structId, state.cells,
    () => {
      const cell = el('div', 'cell');
      cell.appendChild(el('div', 'cell-ptrs'));
      cell.appendChild(el('div', 'cell-box'));
      cell.appendChild(el('div', 'cell-idx'));
      return cell;
    },
    (cell, item, i) => {
      const ptrs = cell.children[0], box = cell.children[1], idx = cell.children[2];
      ptrs.textContent = (item.pointers ?? []).join(' ');
      box.className = 'cell-box' + hlClass(item.highlight);
      box.textContent = fmt(item.value);
      idx.textContent = i;
      const inRange = lo != null && i >= lo && i <= hi;
      cell.classList.toggle('in-range', inRange);
    },
  );
}

// ---- grid (2D array / DP table) -------------------------------------------
// Grid cells never move (only value/highlight change), so we build the skeleton once
// — including optional row/col header labels — and update cells in place, which lets CSS
// transition the highlight colors. Rebuilt only if the dimensions change.
function renderGrid(container, structId, state) {
  const { rows, cols, rowHeader, colHeader } = state;
  const hasRH = Array.isArray(rowHeader), hasCH = Array.isArray(colHeader);
  if (container.dataset.built !== `${rows}x${cols}`) {
    container.className = 's s-grid';
    container.style.setProperty('--cols', cols + (hasRH ? 1 : 0));
    const parts = [];
    if (hasCH) {
      if (hasRH) parts.push(el('div', 'ghead corner'));
      for (let j = 0; j < cols; j++) parts.push(el('div', 'ghead', String(colHeader[j] ?? '')));
    }
    for (let i = 0; i < rows; i++) {
      if (hasRH) parts.push(el('div', 'ghead', String(rowHeader[i] ?? '')));
      for (let j = 0; j < cols; j++) {
        const c = el('div', 'gcell');
        c.dataset.key = `${structId}/r${i}c${j}`;
        parts.push(c);
      }
    }
    container.replaceChildren(...parts);
    container.dataset.built = `${rows}x${cols}`;
  }
  for (const item of state.cells) {
    const c = container.querySelector(`[data-key="${structId}/${item.key}"]`);
    if (c) { c.className = 'gcell' + hlClass(item.highlight); c.textContent = fmt(item.value); }
  }
}

// ---- queue / stack --------------------------------------------------------
function renderSequence(kind) {
  return (container, structId, state) => {
    container.className = `s s-seq s-${kind}`;
    // Endpoint labels frame the row (front/back for a queue, top for a stack).
    let rail = container.querySelector('.seq-rail');
    if (!rail) { rail = el('div', 'seq-rail'); container.appendChild(rail); }
    reconcile(
      rail, structId, state.items,
      () => el('div', 'qitem'),
      (node, item) => { node.className = 'qitem' + hlClass(item.highlight); node.textContent = fmt(item.value); },
    );
    const empty = state.items.length === 0;
    container.dataset.empty = empty ? '1' : '';
  };
}

// ---- hashmap --------------------------------------------------------------
function renderHashmap(container, structId, state) {
  container.className = 's s-hashmap';
  reconcile(
    container, structId, state.entries,
    () => {
      const chip = el('div', 'hentry');
      chip.appendChild(el('span', 'hk'));
      chip.appendChild(el('span', 'harrow', '→'));
      chip.appendChild(el('span', 'hv'));
      return chip;
    },
    (chip, item) => {
      chip.className = 'hentry' + hlClass(item.highlight);
      chip.children[0].textContent = fmt(item.k);
      chip.children[2].textContent = fmt(item.v);
    },
  );
  container.dataset.empty = state.entries.length === 0 ? '1' : '';
}

// ---- graph / tree (SVG) ---------------------------------------------------
// Shared SVG network painter used by graph, linked-list (directed graph), and binary
// tree. Positions never move per frame, so highlights transition via CSS (no FLIP).
const NODE_R = 6.5;

function ensureNetworkSvg(container, structId) {
  let root = container.querySelector('svg');
  if (!root) {
    root = svg('svg', { class: 'net-svg', viewBox: '0 0 100 100', preserveAspectRatio: 'xMidYMid meet' });
    const defs = svg('defs');
    const marker = svg('marker', { id: `arr-${structId}`, viewBox: '0 0 10 10', refX: 8.5, refY: 5, markerWidth: 4.5, markerHeight: 4.5, orient: 'auto-start-reverse' });
    marker.appendChild(svg('path', { d: 'M0,0 L10,5 L0,10 z', class: 'arrowhead' }));
    defs.appendChild(marker);
    root.appendChild(defs);
    root.appendChild(svg('g', { class: 'edges' }));
    root.appendChild(svg('g', { class: 'nodes' }));
    container.appendChild(root);
  }
  return root;
}

function paintNetwork(root, structId, nodes, edges, pos, directed) {
  const edgeG = root.querySelector('.edges'), nodeG = root.querySelector('.nodes');
  edgeG.replaceChildren();
  nodeG.replaceChildren();
  for (const e of edges) {
    const a = pos[e.from], b = pos[e.to];
    if (!a || !b) continue;
    let x1 = a.x, y1 = a.y, x2 = b.x, y2 = b.y;
    if (directed) { // pull endpoints in by the node radius so the arrowhead sits at the rim
      const dx = x2 - x1, dy = y2 - y1, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      x1 += ux * NODE_R; y1 += uy * NODE_R; x2 -= ux * NODE_R; y2 -= uy * NODE_R;
    }
    const attrs = { x1, y1, x2, y2, class: 'edge' + (e.highlight ? ` hl-${e.highlight}` : '') };
    if (directed) attrs['marker-end'] = `url(#arr-${structId})`;
    edgeG.appendChild(svg('line', attrs));
    if (e.weight != null) {
      const t = svg('text', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 - 1.5, class: 'edge-w' });
      t.textContent = e.weight; edgeG.appendChild(t);
    }
  }
  for (const n of nodes) {
    const p = pos[n.key]; if (!p) continue;
    const g = svg('g', { class: 'gnode' + (n.highlight ? ` hl-${n.highlight}` : '') });
    g.appendChild(svg('circle', { cx: p.x, cy: p.y, r: NODE_R, class: 'gnode-c' }));
    const t = svg('text', { x: p.x, y: p.y, class: 'gnode-t', 'text-anchor': 'middle', 'dominant-baseline': 'central' });
    t.textContent = fmt(n.value); g.appendChild(t);
    if (n.pointers && n.pointers.length) {
      const pl = svg('text', { x: p.x, y: p.y - NODE_R - 2.5, class: 'gnode-ptr', 'text-anchor': 'middle' });
      pl.textContent = n.pointers.join(' '); g.appendChild(pl);
    }
    nodeG.appendChild(g);
  }
}

// graph: author-provided x/y in 0..100 space; `directed` adds arrowheads (linked lists too).
function renderGraph(container, structId, state) {
  container.className = 's s-graph';
  const root = ensureNetworkSvg(container, structId);
  const pos = Object.fromEntries(state.nodes.map((n) => [n.key, n]));
  paintNetwork(root, structId, state.nodes, state.edges, pos, !!state.directed);
}

// binary tree / BST: positions auto-computed (in-order x, depth y) so authors give structure only.
function renderBinaryTree(container, structId, state) {
  container.className = 's s-graph s-tree';
  const root = ensureNetworkSvg(container, structId);
  const byKey = Object.fromEntries(state.nodes.map((n) => [n.key, n]));
  const depth = {}; const order = []; const seen = new Set();
  (function inorder(k, d) {
    if (k == null || seen.has(k) || d > 64) return;   // guard: never recurse a malformed/cyclic tree
    const n = byKey[k]; if (!n) return;
    seen.add(k); depth[k] = d; inorder(n.left, d + 1); order.push(k); inorder(n.right, d + 1);
  })(state.root, 0);
  const maxD = Math.max(0, ...Object.values(depth));
  const count = order.length;
  const pos = {};
  order.forEach((k, i) => {
    pos[k] = {
      x: count > 1 ? 8 + (i / (count - 1)) * 84 : 50,
      y: maxD > 0 ? 13 + (depth[k] / maxD) * 72 : 16,
    };
  });
  const edges = [];
  for (const n of state.nodes) for (const c of [n.left, n.right]) if (c != null) edges.push({ from: n.key, to: c });
  paintNetwork(root, structId, state.nodes, edges, pos, false);
}

const RENDERERS = {
  array1d: renderArray1d,
  grid: renderGrid,
  queue: renderSequence('queue'),
  stack: renderSequence('stack'),
  hashmap: renderHashmap,
  graph: renderGraph,
  binaryTree: renderBinaryTree,
};

// Render every structure in the frame into `host`, creating one panel per structure and
// keeping panels keyed by structure id so they persist across frames.
export function renderStructures(host, trace, frame) {
  const order = Object.keys(trace.structures);
  for (const id of order) {
    const def = trace.structures[id];
    const state = frame.states?.[id];
    let panel = host.querySelector(`[data-struct="${id}"]`);
    if (!panel) {
      panel = el('div', 'struct-panel');
      panel.dataset.struct = id;
      panel.appendChild(el('div', 'struct-label', def.label ?? id));
      const b = el('div', 'struct-body');
      b.dataset.body = '1'; // stable selector: renderers overwrite className for layout
      panel.appendChild(b);
      host.appendChild(panel);
    }
    const body = panel.querySelector('[data-body="1"]');
    if (!state) { panel.style.display = 'none'; continue; }
    panel.style.display = '';
    const fn = RENDERERS[state.type];
    if (fn) fn(body, id, state, def);
    else body.textContent = `[no renderer for "${state.type}"]`;
  }
}

// Scalar variable board. Rebuilt each frame; keys whose value changed since the previous
// frame get a brief flash class.
export function renderVars(host, vars = {}, prevVars = {}) {
  host.replaceChildren();
  const entries = Object.entries(vars);
  host.style.display = entries.length ? '' : 'none';
  for (const [k, v] of entries) {
    const chip = el('div', 'var-chip');
    chip.appendChild(el('span', 'var-k', k));
    chip.appendChild(el('span', 'var-eq', '='));
    chip.appendChild(el('span', 'var-v', fmt(v)));
    if (!(k in prevVars) || prevVars[k] !== v) chip.classList.add('changed');
    host.appendChild(chip);
  }
}

// Code panel: render once, then just toggle the current line.
export function renderCode(host, code = [], line = null) {
  if (!host.firstChild && code.length) {
    const ol = el('ol', 'code-ol');
    for (const ln of code) ol.appendChild(el('li', 'code-line', ln));
    host.appendChild(ol);
  }
  const lines = host.querySelectorAll('.code-line');
  lines.forEach((li, i) => {
    const on = line === i + 1;
    li.classList.toggle('current', on);
    if (on) li.scrollIntoView({ block: 'nearest' });
  });
}
