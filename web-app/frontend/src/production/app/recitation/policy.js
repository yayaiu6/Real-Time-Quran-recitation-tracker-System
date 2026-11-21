// Application policy passed to the session host, separate from SDK configuration.
export function createSessionPolicy() {
  return {
    locateOnce: true,
    get mistakeSound() { return true; },
    remembersPlace: false,
    expectFatihah: false,
    lastRead: { surah: 1, ayah: 1 },
    onChange: () => () => {},
  };
}
