import { wheelIntent, dragIntent, createTurnLimiter, WHEEL_THRESHOLD, WHEEL_COOLDOWN_MS, DRAG_THRESHOLD } from "./intent.js";
export { wheelIntent, dragIntent, WHEEL_THRESHOLD, WHEEL_COOLDOWN_MS, DRAG_THRESHOLD } from "./intent.js";

export function mountReaderWheel(document, options = {}) {
  const pager = document.getElementById("pager");
  const textView = document.getElementById("text-view");
  if (!pager) return () => {};
  const window = document.defaultView;
  const now = options.now || (() => window.performance.now());
  const threshold = options.threshold ?? WHEEL_THRESHOLD;
  const cooldown = options.cooldown ?? WHEEL_COOLDOWN_MS;
  const dragThreshold = options.dragThreshold ?? DRAG_THRESHOLD;
  let accumulated = 0;
  let origin = null;

  function allowed() {
    if (textView && !textView.hidden) return false;
    if (document.documentElement.hasAttribute("data-ui-boot")) return false;
    return !document.querySelector("dialog[open]");
  }
  const turn = createTurnLimiter(now, cooldown, direction => {
    options.dispatch({ type: direction > 0 ? "NEXT_PAGE" : "PREVIOUS_PAGE" });
  });
  function onWheel(event) {
    if (event.ctrlKey || !allowed()) return;
    const delta = Math.abs(event.deltaY) >= Math.abs(event.deltaX) ? event.deltaY : event.deltaX;
    if (!Number.isFinite(delta)) return;
    accumulated += delta;
    const direction = wheelIntent(0, accumulated, threshold);
    if (!direction) return;
    accumulated = 0;
    if (!turn(direction)) return;
    event.preventDefault();
  }
  function onPointerDown(event) {
    accumulated = 0;
    origin = null;
    if (event.button !== 0 || event.pointerType === "touch" || !allowed()) return;
    const target = event.target;
    if (target instanceof window.Element && target.closest("button, a, input, select, textarea, [contenteditable]")) return;
    origin = { x: event.clientX, y: event.clientY };
    // Keep the gesture a page turn instead of a text selection or image drag.
    event.preventDefault();
  }
  function onPointerMove(event) {
    if (!origin) return;
    const direction = dragIntent(event.clientX - origin.x, event.clientY - origin.y, dragThreshold);
    if (!direction) return;
    origin = null;
    if (!turn(direction)) return;
    event.preventDefault();
  }
  function onPointerEnd() { origin = null; }
  const listeners = [
    ["wheel", onWheel, false], ["pointerdown", onPointerDown, false],
    ["pointermove", onPointerMove, false], ["pointerup", onPointerEnd, true],
    ["pointercancel", onPointerEnd, true], ["pointerleave", onPointerEnd, true],
  ];
  for (const [event, handler, passive] of listeners) pager.addEventListener(event, handler, { passive });
  return () => {
    for (const [event, handler] of listeners) pager.removeEventListener(event, handler);
  };
}
