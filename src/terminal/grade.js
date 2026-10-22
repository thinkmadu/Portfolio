// Grade de caracteres das telas em terminal: 92 colunas de 7,8 px por linhas de 16 px, em camadas.
// Cada camada é uma cor. Letras saem como texto; caixas, blocos e setas saem como formas SVG,
// para a fonte não mudar o desenho. A fonte de verdade do desenho está no quadro de design.

/** Largura de uma coluna, em px. */
export const CW = 7.8;
/** Altura de uma linha, em px. */
export const LH = 16;
/** Colunas de todas as telas. */
export const COLUNAS = 92;
/** Margem esquerda e de topo da grade dentro da tela, em px. */
export const MARGEM = { x: 24, y: 20 };
/** Largura da tela inteira, em px: margem + 92 colunas + margem. */
export const LARGURA = 766;

/** @typedef {string[][][]} Grade camada, linha, coluna; ' ' é vazio */
/**
 * Forma extra além dos caracteres: retângulo arredondado `q`, retângulo `r`, segmento `s`
 * ou círculo `c`, sempre na camada `l`.
 * @typedef {{ t: "q", l: number, x: number, y: number, w: number, h: number, r: number }
 *   | { t: "r", l: number, x: number, y: number, w: number, h: number }
 *   | { t: "s", l: number, x1: number, y1: number, x2: number, y2: number }
 *   | { t: "c", l: number, x: number, y: number, r: number }} Extra
 */
/** @typedef {Record<string, string>} Camadas chaves `l<k>` (texto), `s<k>` (traços), `f<k>` (preenchimentos) */

/** @param {number} v @param {number} a @param {number} b */
export const cl = (v, a, b) => Math.max(a, Math.min(b, v));

/** Curva suave (smoothstep) de 0 a 1. @param {number} x */
export const ease = (x) => {
  x = cl(x, 0, 1);
  return x * x * (3 - 2 * x);
};

/** Ruído determinístico em [0, 1) por coluna, linha e semente: o mesmo quadro sempre sai igual. */
export const hash = (
  /** @type {number} */ x,
  /** @type {number} */ y,
  s = 0,
) => {
  let n =
    Math.imul(x + 1, 374761393) ^
    Math.imul(y + 1, 668265263) ^
    Math.imul(s + 1, 982451653);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
};

/**
 * Quebra o texto em linhas de até `n` colunas, sem partir palavras.
 * @param {string} txt
 * @param {number} n
 */
export function quebrar(txt, n) {
  /** @type {string[]} */
  const out = [];
  let cur = "";
  for (const w of txt.split(" ")) {
    if ((cur + " " + w).trim().length > n) {
      out.push(cur);
      cur = w;
    } else cur = (cur + " " + w).trim();
  }
  if (cur) out.push(cur);
  return out;
}

/** @param {number} x @param {number} y @param {number} w @param {number} h @param {number} r */
function retanguloArredondado(x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  const n = (/** @type {number} */ v) => v.toFixed(1);
  const arco = `a${r} ${r} 0 0 1`;
  return (
    `M${n(x + r)} ${n(y)}h${n(w - 2 * r)}${arco} ${r} ${r}v${n(h - 2 * r)}` +
    `${arco} -${r} ${r}h-${n(w - 2 * r)}${arco} -${r} -${r}v-${n(h - 2 * r)}` +
    `${arco} ${r} -${r}z`
  );
}

/** Blocos: início e altura do preenchimento dentro da célula. */
const BLOCOS = /** @type {Record<string, [number, number]>} */ ({
  "▀": [0, 8],
  "▄": [8, 8],
  "█": [0, 16],
});

/** @type {Map<string, boolean>} */
const ehForma = new Map();
/**
 * O caractere vira forma no SVG (traço, bloco ou círculo)? Os comuns só ficam no texto, e
 * perguntar uma vez por caractere evita montar caminhos que seriam descartados.
 * @param {string} c
 */
function viraForma(c) {
  let v = ehForma.get(c);
  if (v === undefined) {
    v = c === "•" || c in BLOCOS || !!tracado(c, 0, 0);
    ehForma.set(c, v);
  }
  return v;
}

/**
 * Traço do caractere dentro da célula em (X, Y), ou null se for texto comum.
 * @param {string} c
 * @param {number} X
 * @param {number} Y
 */
function tracado(c, X, Y) {
  X = +X.toFixed(2);
  Y = +Y.toFixed(2);
  const a = X + 3.9;
  const b = Y + 8;
  const anel = `M${a - 2.8} ${b}a2.8 2.8 0 1 0 5.6 0a2.8 2.8 0 1 0 -5.6 0`;
  switch (c) {
    case "─":
      return `M${X} ${b}h7.8`;
    case "│":
      return `M${a} ${Y}v16`;
    case "╭":
      return `M${a} ${Y + 16}v-4q0 -4 3.9 -4`;
    case "╮":
      return `M${a} ${Y + 16}v-4q0 -4 -3.9 -4`;
    case "╰":
      return `M${a} ${Y}v4q0 4 3.9 4`;
    case "╯":
      return `M${a} ${Y}v4q0 4 -3.9 4`;
    case "┤":
      return `M${a} ${Y}v16M${X} ${b}h3.9`;
    case "├":
      return `M${a} ${Y}v16M${a} ${b}h3.9`;
    case "┬":
      return `M${X} ${b}h7.8M${a} ${b}v8`;
    case "┴":
      return `M${X} ${b}h7.8M${a} ${Y}v8`;
    case "═":
      return `M${X} ${Y + 6.5}h7.8M${X} ${Y + 9.5}h7.8`;
    case "╠":
      return `M${X + 2.4} ${Y}v16M${X + 5.4} ${Y}v6.5h2.4M${X + 5.4} ${Y + 16}v-6.5h2.4`;
    case "╚":
      return `M${X + 2.4} ${Y}v9.5h5.4M${X + 5.4} ${Y}v6.5h2.4`;
    case "‹":
      return `M${X + 5.2} ${Y + 4}l-3.4 4l3.4 4`;
    case "›":
      return `M${X + 2.6} ${Y + 4.5}l3 3.5l-3 3.5`;
    case "❯":
      return `M${X + 1.6} ${Y + 3.5}l4.6 4.5l-4.6 4.5`;
    case "✓":
      return `M${X + 1.4} ${b + 0.5}l2.3 3l3.9 -6.2`;
    case "●":
      return `${anel}M${a} ${Y}v5.2M${a} ${b + 2.8}v5.2`;
    case "◉":
      return `${anel}M${a} ${b + 2.8}v5.2`;
  }
  return null;
}

/**
 * Uma grade de `linhas` linhas e `camadas` camadas, com as operações de desenho.
 * @param {{ linhas: number, camadas: number }} o
 */
export function criarGrade({ linhas: H, camadas: NL }) {
  const W = COLUNAS;

  /** Grade vazia. @returns {Grade} */
  const mk = () =>
    Array.from({ length: NL }, () =>
      Array.from({ length: H }, () => Array(W).fill(" ")),
    );

  /**
   * Escreve `s` na camada `l`, a partir de (x, y), limpando as outras camadas nas células tocadas.
   * Espaço não apaga nada.
   * @param {Grade} g @param {number} l @param {number} x @param {number} y @param {string} s
   */
  function put(g, l, x, y, s) {
    x = Math.round(x);
    y = Math.round(y);
    if (y < 0 || y >= H) return;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      const xx = x + i;
      if (c === " " || xx < 0 || xx >= W) continue;
      for (let k = 0; k < NL; k++) g[k][y][xx] = k === l ? c : " ";
    }
  }

  /**
   * Moldura de w por h células com cantos `cantos` (padrão arredondado).
   * @param {Grade} g @param {number} l @param {number} x @param {number} y
   * @param {number} w @param {number} h @param {string} [cantos]
   */
  function box(g, l, x, y, w, h, cantos = "╭╮╰╯") {
    put(g, l, x, y, cantos[0] + "─".repeat(w - 2) + cantos[1]);
    put(g, l, x, y + h - 1, cantos[2] + "─".repeat(w - 2) + cantos[3]);
    for (let j = 1; j < h - 1; j++) {
      put(g, l, x, y + j, "│");
      put(g, l, x + w - 1, y + j, "│");
    }
  }

  /** A célula está vazia em todas as camadas? @param {Grade} g @param {number} x @param {number} y */
  const vazio = (g, x, y) => {
    for (let k = 0; k < NL; k++) if (g[k][y][x] !== " ") return false;
    return true;
  };

  /**
   * Converte a grade e as formas extras em camadas prontas para desenhar.
   * @param {Grade} g
   * @param {Extra[]} [extras]
   * @returns {Camadas}
   */
  function split(g, extras = []) {
    /** @type {Camadas} */
    const o = {};
    for (let k = 0; k < NL; k++) {
      let st = "";
      let fl = "";
      const rows = [];
      for (let y = 0; y < H; y++) {
        let row = "";
        for (let x = 0; x < W; x++) {
          const c = g[k][y][x];
          if (c === " " || !viraForma(c)) {
            row += c;
            continue;
          }
          const X = x * CW;
          const Y = y * LH;
          if (c === "•") {
            fl += `M${(X + 0.9).toFixed(2)} ${Y + 8}a3 3 0 1 0 6 0a3 3 0 1 0 -6 0z`;
            row += " ";
            continue;
          }
          const bloco = BLOCOS[c];
          if (bloco) {
            fl += `M${X.toFixed(2)} ${Y + bloco[0]}h${CW}v${bloco[1]}h-${CW}z`;
            row += " ";
            continue;
          }
          const d = tracado(c, X, Y);
          if (d) {
            st += d;
            row += " ";
          } else row += c;
        }
        rows.push(row);
      }
      o["l" + k] = rows.join("\n");
      o["s" + k] = st;
      o["f" + k] = fl;
    }
    for (const e of extras) {
      if (e.t === "q")
        o["f" + e.l] += retanguloArredondado(e.x, e.y, e.w, e.h, e.r);
      else if (e.t === "r")
        o["f" + e.l] +=
          `M${e.x.toFixed(1)} ${e.y.toFixed(1)}h${e.w.toFixed(1)}v${e.h.toFixed(1)}h-${e.w.toFixed(1)}z`;
      else if (e.t === "s")
        o["s" + e.l] +=
          `M${e.x1.toFixed(1)} ${e.y1.toFixed(1)}L${e.x2.toFixed(1)} ${e.y2.toFixed(1)}`;
      else
        o["f" + e.l] +=
          `M${(e.x - e.r).toFixed(1)} ${e.y.toFixed(1)}a${e.r} ${e.r} 0 1 0 ${2 * e.r} 0a${e.r} ${e.r} 0 1 0 -${2 * e.r} 0z`;
    }
    return o;
  }

  /**
   * Legenda `navegação: 1 • 2 • v`, com teclas em negrito (camada 6) e, opcionalmente, um
   * par extra `rótulo: tecla`. Camada 3 é o texto secundário.
   * @param {Grade} g @param {number} x @param {number} y
   * @param {string[]} teclas @param {[string, string] | null} [extra]
   */
  function legenda(g, x, y, teclas, extra = null) {
    put(g, 3, x, y, "navegação:");
    let cx = x + 11;
    teclas.forEach((k, i) => {
      if (i > 0) {
        put(g, 3, cx, y, "•");
        cx += 2;
      }
      put(g, 6, cx, y, k);
      cx += k.length + (i < teclas.length - 1 ? 1 : 0);
    });
    if (extra) {
      cx += 3;
      put(g, 3, cx, y, extra[0] + ":");
      cx += extra[0].length + 2;
      put(g, 6, cx, y, extra[1]);
    }
  }

  /**
   * Pixel art em meios-blocos: `pix` é uma matriz de índices de camada (-1 é vazio), duas
   * linhas de pixel por linha da grade. Só desenha entre as colunas xmin e xmax.
   * @param {Grade} g @param {number[][]} pix @param {number} ox @param {number} oy
   * @param {number} [xmin] @param {number} [xmax]
   */
  function pintar(g, pix, ox, oy, xmin = 0, xmax = W - 1) {
    const rows = Math.floor(pix.length / 2);
    const cols = pix[0].length;
    for (let r = 0; r < rows; r++)
      for (let x = 0; x < cols; x++) {
        const a = pix[2 * r][x];
        const b = pix[2 * r + 1][x];
        if (a < 0 && b < 0) continue;
        const gx = ox + x;
        const gy = oy + r;
        if (gx < xmin || gx > xmax || gy < 0 || gy >= H) continue;
        for (let k = 0; k < NL; k++) g[k][gy][gx] = " ";
        if (a === b) g[a][gy][gx] = "█";
        else {
          if (a >= 0) g[a][gy][gx] = "▀";
          if (b >= 0) g[b][gy][gx] = "▄";
        }
      }
  }

  return { W, H, NL, mk, put, box, vazio, split, legenda, pintar };
}
