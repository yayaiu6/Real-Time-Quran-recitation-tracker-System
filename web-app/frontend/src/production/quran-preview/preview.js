import { GreedyFrameDecoder } from "./greedy.js";
import { PassageIndex } from "./passage-index.js";
import { searchPolicy, shouldSearch } from "./search-policy.js";

// Returns corpus candidates without committing a location or creating judgments.
export function createQuranPreview(corpus) {
  const index = new PassageIndex(corpus);
  const decoder = new GreedyFrameDecoder();
  let frame, lastSearchFrame, heardTotal, lastSearchChars, lastHearing, buffer;
  function reset() {
    frame = lastSearchFrame = heardTotal = lastSearchChars = 0;
    lastHearing = "";
    buffer = [];
    decoder.reset(0);
  }
  reset();
  return {
    reset,
    feed(primary, count) {
      if (count <= 0) return;
      const symbols = decoder.next({ logProbs: { data: primary, base: frame }, count40: frame + count });
      frame += count;
      for (const { sym } of symbols) {
        for (const ch of sym) { buffer.push(ch); heardTotal++; }
      }
      if (buffer.length > 1000) buffer.splice(0, buffer.length - 1000);
      if (!shouldSearch(searchPolicy, buffer.length, heardTotal - lastSearchChars, frame - lastSearchFrame)) return;
      lastSearchChars = heardTotal;
      lastSearchFrame = frame;
      const { hits: [hit] } = index.search(buffer.slice(-searchPolicy.searchQueryChars).join(""));
      if (!hit) return;
      const end = corpus.wordAt(hit.refEnd - 1);
      const key = `${hit.wordIndex}:${end}`;
      if (key === lastHearing) return;
      lastHearing = key;
      const words = [];
      for (let word = Math.max(hit.wordIndex, end - 6); word <= end; word++) words.push(corpus.plainWord(word));
      return words.join(" ");
    },
  };
}
