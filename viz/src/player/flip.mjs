// FLIP animation engine (First-Last-Invert-Play) over the Web Animations API.
//
// The renderers reconcile the DOM to the target frame by stable key. FLIP makes any
// element that ended up in a new position appear to *slide* there from where it was,
// and fades/scales in genuinely new elements. We animate only transform/opacity, so
// everything runs on the compositor (no layout thrash). Elements opt in by carrying a
// unique data-key; the graph renderer omits it and transitions via CSS instead.

const DURATION = 360;
const EASING = 'cubic-bezier(.34, 1.2, .44, 1)'; // slight overshoot — feels lively, like NeetCode

// FIRST: record the on-screen rect of every keyed element under root.
export function captureRects(root) {
  const rects = new Map();
  for (const el of root.querySelectorAll('[data-key]')) {
    rects.set(el.dataset.key, el.getBoundingClientRect());
  }
  return rects;
}

// INVERT + PLAY: after the DOM has been reconciled to the new frame, slide movers from
// their old position and fade in newcomers. firstRects is the map from captureRects().
export function playFlip(root, firstRects, { duration = DURATION, easing = EASING } = {}) {
  for (const el of root.querySelectorAll('[data-key]')) {
    // Never stack tweens: cancel anything still running on this element first.
    el.getAnimations?.().forEach((a) => a.cancel());

    const first = firstRects.get(el.dataset.key);
    const last = el.getBoundingClientRect();

    if (first) {
      const dx = first.left - last.left;
      const dy = first.top - last.top;
      if (dx || dy) {
        el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration, easing },
        );
      }
    } else {
      // Entering element: pop in.
      el.animate(
        [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)' }],
        { duration, easing },
      );
    }
  }
}

// Convenience wrapper: capture, run the (synchronous) DOM mutation, then play.
export function flip(root, mutate, opts) {
  const first = captureRects(root);
  mutate();
  playFlip(root, first, opts);
}
