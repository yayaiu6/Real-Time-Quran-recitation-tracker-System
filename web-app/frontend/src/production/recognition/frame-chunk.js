export const TOKEN_COUNT = 38;
export const MODEL_HEADS = Object.freeze(["log_probs", "inter1_log_probs", "timing_log_probs", "attr_qalqalah"]);

function matches(head, frames, classes) {
  return head?.classes === classes && head.frames === frames;
}

// Shape the SDK output for the aligner, without decoding or altering logits.
export class EvidenceDecoder {
  decode({ heads, speech }) {
    const primary = heads.get(MODEL_HEADS[0]);
    const intermediate = heads.get(MODEL_HEADS[1]);
    if (!primary || !intermediate || primary.frames === 0) return null;
    if (!matches(primary, primary.frames, TOKEN_COUNT) || !matches(intermediate, primary.frames, TOKEN_COUNT)) {
      throw new Error(`unexpected model output: ${primary.frames}×${primary.classes} and ${intermediate.frames}×${intermediate.classes}`);
    }
    const timing = heads.get(MODEL_HEADS[2]);
    const qalqalah = heads.get(MODEL_HEADS[3]);
    const doubleFrames = 2 * primary.frames;
    const detail = matches(timing, doubleFrames, TOKEN_COUNT) && matches(qalqalah, doubleFrames, 3)
      ? { timing: timing.values, qalqalah: qalqalah.values }
      : null;
    return { primary: primary.values, intermediate: intermediate.values, count: primary.frames, speech, detail };
  }
}

const decoder = new EvidenceDecoder();
export const unpackFrameChunk = chunk => decoder.decode(chunk);
