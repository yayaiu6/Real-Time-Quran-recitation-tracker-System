export function createPublicDataLoader({ fetch, decompress }) {
  async function binary(url, signal) {
    const response = await fetch(url, { signal });
    if (!response.ok) throw Error(`${url.split("?")[0]} HTTP ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    return bytes[0] === 31 && bytes[1] === 139 ? decompress(bytes) : bytes;
  }
  return {
    binary,
    async loadQuran(signal) {
      const response = await fetch("/data/quran.json?v=8c00f334", { signal });
      if (!response.ok) throw Error(`quran.json HTTP ${response.status}`);
      return response.json();
    },
    loadAlignmentAssets: signal => Promise.all([
      binary("/data/engine.wasm.gz?v=65f76431", signal),
      binary("/data/engine-words.jsonl.gz?v=5b8d99e4", signal),
    ]),
  };
}

export async function decompressGzip(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}
