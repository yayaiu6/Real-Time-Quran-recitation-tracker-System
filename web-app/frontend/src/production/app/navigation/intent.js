// Pure gesture policy, independent of DOM, timers and native navigation.
export const WHEEL_THRESHOLD = 40;
export const WHEEL_COOLDOWN_MS = 450;
export const DRAG_THRESHOLD = 56;

export function wheelIntent(deltaX, deltaY, threshold = WHEEL_THRESHOLD) {
  const delta = Math.abs(deltaY) >= Math.abs(deltaX) ? deltaY : deltaX;
  if (!Number.isFinite(delta) || Math.abs(delta) < threshold) return 0;
  return delta > 0 ? 1 : -1;
}

export function dragIntent(dx, dy, threshold = DRAG_THRESHOLD) {
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return 0;
  if (Math.abs(dy) > Math.abs(dx) || Math.abs(dx) < threshold) return 0;
  return dx > 0 ? 1 : -1;
}

/**
 * @param {() => number} now Monotonic clock shared by all gesture sources.
 * @param {number} cooldown Minimum time between turns, in milliseconds.
 * @param {(direction: number) => void} navigate Existing native navigation bridge.
 */
export function createTurnLimiter(now, cooldown, navigate) {
  let lastTurn = -Infinity;
  return direction => {
    const currentTime = now();
    if (currentTime - lastTurn < cooldown) return false;
    lastTurn = currentTime;
    navigate(direction);
    return true;
  };
}
