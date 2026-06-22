// AlgVizPlayer — the playback widget. Mounts into an element, loads a trace, and
// renders any step as a pure function render(idx). Transport (play/pause/step/scrub/
// speed/fullscreen), keyboard control, and accessibility live here; all visual state is
// derived from frames[idx], so stepping backward and scrubbing are just render(idx) and
// can never desync.

import { validateTrace } from '../schema.mjs';
import { captureRects, playFlip } from './flip.mjs';
import { renderStructures, renderVars, renderCode } from './renderers.mjs';

const SPEEDS = [0.5, 1, 2];
const BASE_INTERVAL = 1100; // ms per step at 1x

const ICONS = {
  start: 'M6 5h2v14H6zM20 5 9 12l11 7z',
  prev: 'M7 5h2v14H7zm12 0L9 12l10 7z'.replace('9 12', '10 12'),
  play: 'M8 5v14l11-7z',
  pause: 'M7 5h3v14H7zm7 0h3v14h-3z',
  next: 'M15 5h2v14h-2zM5 5l10 7L5 19z',
  end: 'M16 5h2v14h-2zM4 5l11 7L4 19z',
  full: 'M4 4h6v2H6v4H4zm10 0h6v6h-2V6h-4zM4 14h2v4h4v2H4zm14 0h2v6h-6v-2h4z',
};
const icon = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

export class AlgVizPlayer {
  constructor(mount, trace, { autoplay = false } = {}) {
    const { ok, errors } = validateTrace(trace);
    if (!ok) { mount.innerHTML = `<pre class="algviz-error">Invalid trace:\n- ${errors.join('\n- ')}</pre>`; throw new Error('invalid trace'); }

    this.trace = trace;
    this.frames = trace.frames;
    this.idx = -1;
    this.playing = false;
    this.speed = 1;
    this.timer = null;
    this.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

    this._build(mount);
    this.render(0);
    this.root.focus({ preventScroll: true });
    if (autoplay) this.play();
  }

  _build(mount) {
    const root = document.createElement('div');
    root.className = 'algviz';
    root.tabIndex = 0;
    root.setAttribute('role', 'group');
    root.setAttribute('aria-label', `Algorithm visualization: ${this.trace.title}`);
    root.innerHTML = `
      <div class="algviz-head">
        <span class="algviz-title"></span>
        <span class="algviz-cx" title="Big-O complexity (estimated from the mentor notes)" hidden></span>
        <span class="algviz-spacer"></span>
        <span class="algviz-step" aria-live="off"></span>
        <button class="algviz-btn algviz-full" aria-label="Toggle fullscreen">${icon(ICONS.full)}</button>
      </div>
      <div class="algviz-controls">
        <button class="algviz-btn" data-act="start" aria-label="Go to start">${icon(ICONS.start)}</button>
        <button class="algviz-btn" data-act="prev" aria-label="Previous step">${icon(ICONS.prev)}</button>
        <button class="algviz-btn algviz-play" data-act="play" aria-label="Play">${icon(ICONS.play)}</button>
        <button class="algviz-btn" data-act="next" aria-label="Next step">${icon(ICONS.next)}</button>
        <button class="algviz-btn" data-act="end" aria-label="Go to end">${icon(ICONS.end)}</button>
        <input class="algviz-scrub" type="range" min="0" step="1" aria-label="Step scrubber">
        <span class="algviz-speed" role="group" aria-label="Playback speed"></span>
      </div>
      <div class="algviz-stage">
        <div class="algviz-main">
          <div class="algviz-vars"></div>
          <div class="algviz-structures"></div>
          <div class="algviz-result" hidden></div>
        </div>
        <div class="algviz-code"></div>
      </div>
      <p class="algviz-caption" aria-live="polite"></p>
      <div class="algviz-note" hidden></div>`;
    mount.replaceChildren(root);
    this.root = root;
    this.$ = (s) => root.querySelector(s);

    this.$('.algviz-title').textContent = this.trace.title;
    if (this.trace.complexity) { const cx = this.$('.algviz-cx'); cx.hidden = false; cx.textContent = this.trace.complexity; }
    this.$('.algviz-scrub').max = String(this.frames.length - 1);
    if (!this.trace.code?.length) this.$('.algviz-code').hidden = true;

    // Speed pills.
    const speedHost = this.$('.algviz-speed');
    SPEEDS.forEach((s) => {
      const b = document.createElement('button');
      b.className = 'algviz-pill'; b.textContent = `${s}×`; b.dataset.speed = String(s);
      b.setAttribute('aria-pressed', String(s === this.speed));
      b.addEventListener('click', () => this.setSpeed(s));
      speedHost.appendChild(b);
    });

    // Wire controls.
    root.addEventListener('click', (e) => {
      const act = e.target.closest('[data-act]')?.dataset.act;
      if (act === 'start') this.seek(0, false);
      else if (act === 'prev') this.prev();
      else if (act === 'next') this.next();
      else if (act === 'end') this.seek(this.frames.length - 1, false);
      else if (act === 'play') this.toggle();
    });
    this.$('.algviz-full').addEventListener('click', () => this._toggleFullscreen());
    this.$('.algviz-scrub').addEventListener('input', (e) => this.seek(Number(e.target.value)));
    root.addEventListener('keydown', (e) => this._onKey(e));
  }

  _onKey(e) {
    // Let native control semantics win: the range scrubber owns ←/→ (step value) and
    // the transport buttons own Space (activate). Global transport keys still fire when
    // focus is on the player root itself (its default after mount).
    if (e.target.closest('input, button')) return;
    const k = e.key;
    if (k === 'ArrowRight') { this.next(); }
    else if (k === 'ArrowLeft') { this.prev(); }
    else if (k === ' ') { this.toggle(); }
    else if (k === 'Home') { this.seek(0, false); }
    else if (k === 'End') { this.seek(this.frames.length - 1, false); }
    else if (k === '+' || k === '=') { this._bumpSpeed(1); }
    else if (k === '-' || k === '_') { this._bumpSpeed(-1); }
    else return;
    e.preventDefault();
  }

  // ---- transport ----
  next() { this.pause(); if (this.idx < this.frames.length - 1) this.render(this.idx + 1); }
  prev() { this.pause(); if (this.idx > 0) this.render(this.idx - 1); }
  seek(i, pause = true) { if (pause) this.pause(); this.render(i); }

  toggle() { this.playing ? this.pause() : this.play(); }
  play() {
    if (this.playing) return;
    if (this.idx >= this.frames.length - 1) this.render(0); // replay from start
    this.playing = true;
    this._reflectPlay();
    this._schedule();
  }
  pause() {
    if (!this.playing) return;
    this.playing = false;
    clearTimeout(this.timer); this.timer = null;
    this._reflectPlay();
  }
  _schedule() {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      if (this.idx < this.frames.length - 1) { this.render(this.idx + 1); this._schedule(); }
      else this.pause();
    }, BASE_INTERVAL / this.speed);
  }

  setSpeed(s) {
    this.speed = s;
    this.$('.algviz-speed').querySelectorAll('.algviz-pill')
      .forEach((b) => b.setAttribute('aria-pressed', String(Number(b.dataset.speed) === s)));
    if (this.playing) this._schedule();
  }
  _bumpSpeed(dir) {
    const i = SPEEDS.indexOf(this.speed);
    this.setSpeed(SPEEDS[Math.max(0, Math.min(SPEEDS.length - 1, i + dir))]);
  }

  _reflectPlay() {
    const btn = this.$('.algviz-play');
    btn.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${this.playing ? ICONS.pause : ICONS.play}"/></svg>`;
    btn.setAttribute('aria-label', this.playing ? 'Pause' : 'Play');
    btn.classList.toggle('is-playing', this.playing);
  }

  _toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else this.root.requestFullscreen?.();
  }

  // ---- the single source of truth ----
  render(idx) {
    idx = Math.max(0, Math.min(this.frames.length - 1, idx));
    const animate = !this.reduced && Math.abs(idx - this.idx) === 1;
    const frame = this.frames[idx];
    const prevVars = idx > 0 ? (this.frames[idx - 1].vars ?? {}) : {};

    const main = this.$('.algviz-main');
    const first = animate ? captureRects(main) : null;

    renderVars(this.$('.algviz-vars'), frame.vars, prevVars);
    renderStructures(this.$('.algviz-structures'), this.trace, frame);
    renderCode(this.$('.algviz-code'), this.trace.code, frame.line ?? null);

    const res = this.$('.algviz-result');
    if (frame.result !== null && frame.result !== undefined) {
      res.hidden = false;
      res.textContent = `Result: ${JSON.stringify(frame.result)}`;
    } else res.hidden = true;

    this.$('.algviz-caption').textContent = frame.caption;
    const note = this.$('.algviz-note');
    if (frame.note) { note.hidden = false; note.textContent = frame.note; } else { note.hidden = true; note.textContent = ''; }
    this.$('.algviz-step').textContent = `Step ${idx + 1} / ${this.frames.length}`;
    const scrub = this.$('.algviz-scrub');
    scrub.value = String(idx);
    scrub.style.setProperty('--p', `${this.frames.length > 1 ? (idx / (this.frames.length - 1)) * 100 : 100}%`);

    if (animate) playFlip(main, first);
    this.idx = idx;
  }
}

// Convenience: fetch a trace JSON and mount a player.
export async function mountFromUrl(mount, url, opts) {
  const trace = await fetch(url).then((r) => { if (!r.ok) throw new Error(`fetch ${url}: ${r.status}`); return r.json(); });
  return new AlgVizPlayer(mount, trace, opts);
}
