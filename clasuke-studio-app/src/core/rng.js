// Seeded randomness. A visual is fully described by one 32-bit seed, shown as a 7-char base36 code.
export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let x = Math.imul(a ^ a >>> 15, 1 | a);
    x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x;
    return ((x ^ x >>> 14) >>> 0) / 4294967296;
  };
}
export const codeOf = seed => (seed >>> 0).toString(36).toUpperCase().padStart(7, '0');
export function seedOf(code) {
  const c = String(code).trim().toLowerCase();
  if (!/^[0-9a-z]{1,7}$/.test(c)) return null;
  const v = parseInt(c, 36);
  return Number.isFinite(v) && v <= 0xffffffff ? v >>> 0 : null;
}
export const newSeed = () => (Math.random() * 0xffffffff) >>> 0;
export const TAU = Math.PI * 2;
