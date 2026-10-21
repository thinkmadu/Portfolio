// Fundo de caracteres: ruído suave com semente, mais claro perto dos sóis, com estrelas que piscam.
// Função pura: devolve o HTML do campo (só classes, sem `style`) e a lista de atrasos das
// piscadas, aplicados depois por CSSOM para respeitar a CSP.

import { seeded } from "../util/aleatorio.js";
import { esc } from "../util/dom.js";

const CHARS = [
  ".",
  ".",
  ".",
  ".",
  ".",
  ".",
  "·",
  "·",
  "·",
  ":",
  ":",
  "+",
  "+",
  "*",
  ",",
  ",",
  "'",
  "`",
  "-",
  "~",
];

/** @param {number} t */
function sm(t) {
  return t * t * (3 - 2 * t);
}

/**
 * @typedef {{ atraso: string, duracao: string }} Piscada
 * @typedef {{ html: string, piscadas: Piscada[] }} Campo
 */

/**
 * @param {object} p
 * @param {number} p.C colunas
 * @param {number} p.R linhas
 * @param {number} p.Cv colunas visíveis
 * @param {number} p.seed semente
 * @param {{ x: number, y: number }[]} p.sois centro dos sóis, em colunas e linhas
 * @returns {Campo}
 */
export function campo({ C, R, Cv, seed, sois }) {
  const rnd = seeded(seed);
  const gw = Math.ceil(C / 10) + 2;
  const gh = Math.ceil(R / 5) + 2;
  /** @type {number[][]} */
  const lat = [];
  for (let y = 0; y < gh; y++) {
    const linha = [];
    for (let x = 0; x < gw; x++) linha.push(rnd());
    lat.push(linha);
  }
  /**
   * @param {number} px
   * @param {number} py
   */
  function noise(px, py) {
    const gx = px / 10;
    const gy = py / 5;
    const x0 = Math.floor(gx);
    const y0 = Math.floor(gy);
    const fx0 = sm(gx - x0);
    const fy0 = sm(gy - y0);
    const a = lat[y0][x0] + (lat[y0][x0 + 1] - lat[y0][x0]) * fx0;
    const b = lat[y0 + 1][x0] + (lat[y0 + 1][x0 + 1] - lat[y0 + 1][x0]) * fx0;
    return a + (b - a) * fy0;
  }
  const sig = 2 * Math.pow(0.16 * Cv, 2);
  /** @type {Piscada[]} */
  const piscadas = [];
  let out = "";
  for (let y = 0; y < R; y++) {
    /** @type {string | null} */
    let cur = null;
    let buf = "";
    for (let x = 0; x < C; x++) {
      let v = noise(x, y);
      let f = 0;
      for (const s of sois) {
        const dx = x - s.x;
        const dy = (y - s.y) * 2;
        f = Math.max(f, Math.exp(-(dx * dx + dy * dy) / sig));
      }
      v = v * 0.75 + f * 0.3;
      const lv = v < 0.4 ? 0 : v < 0.68 ? 1 : 2;
      const ch = CHARS[Math.floor(rnd() * CHARS.length)];
      let k = "l" + lv;
      if (rnd() < 0.022) {
        k = "tw";
        piscadas.push({
          atraso: (-(rnd() * 6)).toFixed(2) + "s",
          duracao: (3 + rnd() * 4).toFixed(2) + "s",
        });
      }
      // estrela que pisca fica sozinha no próprio span; as demais se agrupam por nível
      if (k !== cur || k === "tw") {
        out += trecho(cur, buf);
        cur = k;
        buf = "";
      }
      buf += ch;
    }
    out += trecho(cur, buf);
    if (y < R - 1) out += "\n";
  }
  return { html: out, piscadas };
}

/**
 * @param {string | null} k
 * @param {string} buf
 */
function trecho(k, buf) {
  if (!buf) return "";
  if (!k) return esc(buf);
  return '<span class="pf-' + k + '">' + esc(buf) + "</span>";
}
