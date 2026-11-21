const within = (value, max) => Number.isInteger(value) && value >= 1 && value <= max;
const location = command => within(command.surah, 114) && within(command.ayah, 286);

// Commands are discriminated by `type`. Page/surah/ayah are one-based integers.
// The reader resolves a validly shaped reference through its atlas.
export function planCommand(command, { running, canUseText, active }) {
  if (!active || !command) return [];
  const navigate = effect => command.from === "index" || command.from === "search" || command.from === "mistakes"
    ? [["dialog-close", command.from], effect] : [effect];
  switch (command.type) {
    case "NAVIGATE_PAGE":
      return within(command.page, 604) && (command.surah === undefined || within(command.surah, 114))
        ? navigate(["pager-page", command.page, command.surah]) : [];
    case "NAVIGATE_AYAH":
    case "NAVIGATE_MISTAKE":
      return location(command) ? navigate(["pager-ayah", command.surah, command.ayah]) : [];
    case "NEXT_PAGE": return [["pager-next"]];
    case "PREVIOUS_PAGE": return [["pager-previous"]];
    case "SET_READER_MODE":
      return command.mode === "book" || (command.mode === "text" && canUseText) ? [["reader-mode", command.mode]] : [];
    case "SET_HIDDEN_MODE":
      return typeof command.hidden === "boolean" ? [["reader-hidden", command.hidden]] : [];
    case "START_RECITATION": return running ? [] : [["session-start"]];
    case "STOP_RECITATION": return running ? [["session-stop"]] : [];
    case "OPEN_INDEX": return [["dialog-index"]];
    case "OPEN_SEARCH": return [["dialog-search"]];
    case "OPEN_LAYOUT": return [["dialog-layout"]];
    case "OPEN_MISTAKES": return [["dialog-mistakes"]];
    case "OPEN_SETTINGS": return [["dialog-settings"]];
    default: return [];
  }
}

export function executeEffects(effects, handlers) {
  let result;
  for (const [kind, ...args] of effects) result = handlers[kind](...args);
  return result;
}
