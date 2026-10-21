// Geometria das órbitas: elipses inclinadas, caixas de texto e teste de sobreposição.
// Funções puras, sem DOM; todo o layout e os testes partem daqui.

/** @typedef {{ cx: number, cy: number, rx: number, ry: number, off?: number }} Elipse */
/** @typedef {{ cx: number, cy: number, w: number, h: number }} Caixa */
/** @typedef {{ x: number, y: number }} Ponto */

export const D2R = Math.PI / 180;
/** Inclinação de todas as elipses, em radianos. */
export const TILT = -28 * D2R;
/** Achatamento das órbitas grandes (ry = rx * QB). */
export const QB = 0.42;
/** Achatamento do oval da constelação (ry = rx * QM). */
export const QM = 0.65;

// Calculados uma vez; o resultado é idêntico a chamar Math.cos(TILT) a cada ponto.
const COS_T = Math.cos(TILT);
const SIN_T = Math.sin(TILT);

/**
 * Caixa de um texto monoespaçado com meio caractere de folga.
 * @param {string} t
 * @param {number} cw largura de um caractere
 * @param {number} lh altura de linha
 * @param {number} em fator de escala
 */
export function boxOf(t, cw, lh, em) {
  return { w: (t.length + 0.7) * cw * em, h: lh * em };
}

/**
 * Meia largura e meia altura da caixa que envolve uma elipse inclinada.
 * @param {number} rx
 * @param {number} ry
 */
export function halfBox(rx, ry) {
  return {
    w: Math.sqrt(rx * rx * COS_T * COS_T + ry * ry * SIN_T * SIN_T),
    h: Math.sqrt(rx * rx * SIN_T * SIN_T + ry * ry * COS_T * COS_T),
  };
}

/**
 * Ponto da elipse no ângulo dado (graus), somada a fase `off` da órbita.
 * @param {Elipse} o
 * @param {number} ang
 * @returns {Ponto}
 */
export function at(o, ang) {
  const a = (ang + (o.off || 0)) * D2R;
  const ex = o.rx * Math.cos(a);
  const ey = o.ry * Math.sin(a);
  return {
    x: o.cx + ex * COS_T - ey * SIN_T,
    y: o.cy + ex * SIN_T + ey * COS_T,
  };
}

/**
 * O ponto (x, y) cai dentro da elipse alargada por `pad`?
 * @param {Elipse} o
 * @param {number} x
 * @param {number} y
 * @param {number} pad
 */
export function inside(o, x, y, pad) {
  const dx = x - o.cx;
  const dy = y - o.cy;
  const lx = dx * COS_T + dy * SIN_T;
  const ly = -dx * SIN_T + dy * COS_T;
  const rx = o.rx + pad;
  const ry = o.ry + pad;
  return (lx * lx) / (rx * rx) + (ly * ly) / (ry * ry) < 1;
}

/**
 * @param {number} x
 * @param {number} y
 * @returns {number}
 */
export function gcd(x, y) {
  return y ? gcd(y, x % y) : x;
}

/**
 * Duas caixas centradas se sobrepõem (com folga de 4px na horizontal e 2px na vertical)?
 * @param {number} ax
 * @param {number} ay
 * @param {number} aw
 * @param {number} ah
 * @param {number} bx
 * @param {number} by
 * @param {number} bw
 * @param {number} bh
 */
export function ov(ax, ay, aw, ah, bx, by, bw, bh) {
  return (
    Math.abs(ax - bx) < (aw + bw) / 2 + 4 &&
    Math.abs(ay - by) < (ah + bh) / 2 + 2
  );
}
