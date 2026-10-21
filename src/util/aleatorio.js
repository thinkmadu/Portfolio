/**
 * Gerador pseudoaleatório com semente (mulberry32): a mesma semente desenha o mesmo fundo.
 * @param {number} s semente
 * @returns {() => number} número em [0, 1)
 */
export function seeded(s) {
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
