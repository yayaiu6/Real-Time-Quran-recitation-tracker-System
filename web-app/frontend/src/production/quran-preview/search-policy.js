export const searchPolicy = Object.freeze({
  searchMinChars: 12,
  searchQueryChars: 250,
  searchDecisiveDistance: .35,
  searchDecisiveMargin: .1,
  searchEveryFrames: 25,
  searchEveryChars: 12,
  locateFailedFrames: 375,
});

export function shouldSearch(policy, buffered, newChars, elapsedFrames) {
  if (!(buffered >= policy.searchMinChars)) return false;
  return newChars >= policy.searchEveryChars || (newChars > 0 && elapsedFrames >= policy.searchEveryFrames);
}
