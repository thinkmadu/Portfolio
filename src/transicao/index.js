// Transição entre páginas: um campo suave de caracteres que se espalha em onda a partir do
// centro, troca de cor em degradê da página que sai para a que entra e desembaralha o título
// letra por letra. Portada da tela de transição do quadro de design.

import { el } from "../util/dom.js";
import { CW, cl, hash } from "../terminal/grade.js";
import { movimentoReduzido } from "../terminal/tela.js";

const COLUNAS = 92;
const LINHAS = 24;
const CX = 46;
const CY = 12;
/** Duração total, em unidades de 70 ms: a onda cobre o campo e o título termina de se montar. */
const DURACAO = 30;

/**
 * Cada página: título, legenda, alfabeto de acento, cor e palavras soltas.
 * As cores repetem a paleta de cada página (estilos/terminal.css e tokens).
 * @typedef {{ t: string, d: string, a: string, c: string, w: string[] }} Info
 * @type {Record<string, Info>}
 */
export const INFO = {
  inicio: {
    t: "(início)",
    d: "um sistema solar de caracteres",
    a: ".:·*",
    c: "#a79dd0",
    w: [
      "olá",
      "quá",
      "thinkmadu",
      "bom dia",
      "home",
      "pato",
      "sobre",
      "~/",
      "órbita",
      "sol",
    ],
  },
  sobre: {
    t: "(sobre mim)",
    d: "um pato no console de duas telas",
    a: "oO·.<3",
    c: "#c9a7d6",
    w: [
      "perfil",
      "skills",
      "formação",
      "quá quá",
      "carinho",
      "<3",
      "pixel",
      "pato",
      "certs",
      "nome",
    ],
  },
  ia: {
    t: "(ia)",
    d: "texto vira rede neural",
    a: "oO01.",
    c: "#7fc8e0",
    w: [
      "tokens",
      "embed",
      "attn",
      "tensor",
      "loss",
      "gpt",
      "softmax",
      "epoch",
      "0.97",
      "python",
      "pesos",
      "rede",
    ],
  },
  ferramentas: {
    t: "(ferramentas)",
    d: "um BBS com pipeline e pato",
    a: "+-|/\\=",
    c: "#8fd18a",
    w: [
      "git",
      "commit",
      "merge",
      "pull",
      "push",
      "main",
      "diff",
      "docker",
      "HEAD",
      "ATDT",
      "2400",
      "CI",
    ],
  },
  testes: {
    t: "(testes)",
    d: "um general pato vigiando",
    a: ".F.s",
    c: "#86d9a6",
    w: [
      "assert",
      "pytest",
      "mock",
      "PASS",
      "FAIL",
      "e2e",
      "flaky",
      "CI",
      "bug",
      "TDD",
      "404",
      "TODO",
    ],
  },
  email: {
    t: "(email)",
    d: "uma carta que viaja em texto",
    a: "@._~",
    c: "#f0b45a",
    w: [
      "@",
      "To:",
      "Re:",
      "Cc:",
      "inbox",
      "send",
      "mailto",
      "SMTP",
      "oi!",
      "tchau",
      "carta",
      "envio",
    ],
  },
};

const BASE = ".......···:::++*,,'`-~";
const GLIFOS = "!<>-_/[]{}=+*^?#%&";
const CINZA = "#8c8993";
const SEMENTE = 7;
const SOIS = [
  { x: 20, y: 7 },
  { x: 72, y: 15 },
];

/** @param {number} t */
const suave = (t) => t * t * (3 - 2 * t);

/** @param {string} c */
const rgb = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
/** Mistura duas cores `#rrggbb` na proporção t. @param {string} a @param {string} b @param {number} t */
function mistura(a, b, t) {
  const A = rgb(a);
  const B = rgb(b);
  return (
    "#" +
    A.map((v, i) =>
      Math.round(v + (B[i] - v) * t)
        .toString(16)
        .padStart(2, "0"),
    ).join("")
  );
}

/** Ruído de valor suave, como o do fundo do site. @param {number} px @param {number} py */
function ruido(px, py) {
  const gx = px / 10;
  const gy = py / 5;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = suave(gx - x0);
  const fy = suave(gy - y0);
  const L = (/** @type {number} */ a, /** @type {number} */ b) =>
    hash(a, b, SEMENTE);
  const a = L(x0, y0) + (L(x0 + 1, y0) - L(x0, y0)) * fx;
  const b = L(x0, y0 + 1) + (L(x0 + 1, y0 + 1) - L(x0, y0 + 1)) * fx;
  return a + (b - a) * fy;
}

/**
 * Palavras soltas de cada página, em lugares fixos fora da faixa do título.
 * @type {Record<string, { w: string, x: number, y: number }[]>}
 */
const PALAVRAS = {};
Object.keys(INFO).forEach((k, ki) => {
  const lista = /** @type {{ w: string, x: number, y: number }[]} */ ([]);
  INFO[k].w.forEach((w, i) => {
    for (let tent = 0; tent < 6; tent++) {
      const x =
        Math.floor(hash(i, ki, 21 + tent) * (COLUNAS - w.length - 4)) + 2;
      const y = Math.floor(hash(i, ki, 41 + tent) * (LINHAS - 2)) + 1;
      const naFaixaDoTitulo = y >= 8 && y <= 13 && x + w.length > 16 && x < 76;
      if (naFaixaDoTitulo) continue;
      if (
        lista.some(
          (o) =>
            o.y === y && x < o.x + o.w.length + 3 && x + w.length + 3 > o.x,
        )
      )
        continue;
      lista.push({ w, x, y });
      break;
    }
  });
  PALAVRAS[k] = lista;
});

/** Texto que troca de `de` para `para` letra por letra; as que faltam ficam embaralhadas. */
function embaralha(
  /** @type {string} */ de,
  /** @type {string} */ para,
  /** @type {number} */ dt,
  /** @type {number} */ atraso,
  /** @type {number} */ f,
) {
  const n = Math.max(de.length, para.length);
  let s = "";
  for (let i = 0; i < n; i++) {
    if (dt > atraso + i * 2) {
      if (i < para.length) s += para[i];
    } else s += GLIFOS[Math.floor(hash(i, Math.floor(f), 9) * GLIFOS.length)];
  }
  return s;
}

/**
 * Camadas de caracteres do campo no instante `dt` (unidades de 70 ms) e relógio `f`.
 * @param {Info} A página que sai
 * @param {Info} B página que entra
 * @param {string} de
 * @param {string} para
 * @param {number} dt
 * @param {number} f
 */
function campo(A, B, de, para, dt, f) {
  const r = dt * 2.4;
  const L = [0, 1, 2, 3].map(() =>
    Array.from({ length: LINHAS }, () => Array(COLUNAS).fill(" ")),
  );
  const deriva = f * 0.035;
  for (let y = 0; y < LINHAS; y++)
    for (let x = 0; x < COLUNAS; x++) {
      const dx = x - CX;
      const dy = (y - CY) * 2;
      const d = Math.hypot(dx, dy);
      // ruído suave que desliza devagar, mais claro perto dos "sóis"
      let v = ruido(x + deriva, y);
      let fs = 0;
      for (const o of SOIS) {
        const ex = x - o.x;
        const ey = (y - o.y) * 2;
        fs = Math.max(fs, Math.exp(-(ex * ex + ey * ey) / 1100));
      }
      v = v * 0.75 + fs * 0.3;
      // clareira suave atrás do título
      const cx = dx / 30;
      const cy = (y - CY) / 2.6;
      v *= 1 - 0.85 * Math.exp(-(cx * cx + cy * cy));
      if (hash(x, y, 1) > 0.22 + 0.62 * v) continue;
      const pag = d < r - 3 ? B : A;
      const pisca = hash(x, y, 11) < 0.1 ? Math.floor(f / 9) : 0;
      const q = hash(x, y, 5 + pisca);
      const q2 = hash(x, y, 6 + pisca);
      let ch;
      if (q2 < 0.2) ch = pag.a[Math.floor(q * pag.a.length)];
      else if (q2 < 0.26) ch = "abcdefghijklmnopqrstuvwxyz"[Math.floor(q * 26)];
      else ch = BASE[Math.floor(q * BASE.length)];
      if (ch === " ") continue;
      // faixa da onda: mais clara e com caracteres de acento
      if (dt < 40 && d >= r - 3 && d < r) {
        L[2][y][x] = hash(x, y, 8) < 0.5 ? "*" : "+";
        continue;
      }
      L[v < 0.4 ? 0 : v < 0.68 ? 1 : 2][y][x] = ch;
    }
  // palavras soltas de cada página, reveladas pela onda
  const poe = (
    /** @type {string} */ k,
    /** @type {(d: number) => boolean} */ visivel,
  ) =>
    PALAVRAS[k].forEach((p) => {
      for (let j = 0; j < p.w.length; j++) {
        const ex = p.x + j - CX;
        const ey = (p.y - CY) * 2;
        if (visivel(Math.hypot(ex, ey))) {
          for (let q = 0; q < 3; q++) L[q][p.y][p.x + j] = " ";
          L[3][p.y][p.x + j] = p.w[j];
        }
      }
    });
  poe(de, (d) => d >= r);
  if (para !== de) poe(para, (d) => d < r - 3);
  return L.map((l) => l.map((linha) => linha.join("")).join("\n"));
}

/**
 * Roda a transição de `de` para `para` em `raiz`. `fim` resolve quando ela termina ou é pulada
 * (clique ou tecla); com movimento reduzido ou sem página conhecida, resolve na hora.
 * @param {HTMLElement} raiz
 * @param {string} de
 * @param {string} para
 * @returns {{ fim: Promise<void>, destroy(): void }}
 */
export function transicao(raiz, de, para) {
  const A = INFO[de];
  const B = INFO[para];
  if (!A || !B || de === para || movimentoReduzido())
    return { fim: Promise.resolve(), destroy() {} };

  const camadas = [0, 1, 2, 3].map((k) =>
    el("pre", {
      class: `pf-tr-campo pf-tr-l${k}`,
      attrs: { "aria-hidden": "true" },
    }),
  );
  const imagem = el(
    "div",
    { class: "pf-tr-imagem", attrs: { "aria-hidden": "true" } },
    camadas,
  );
  const titulo = el("div", { class: "pf-tr-titulo" });
  const legenda = el("div", { class: "pf-tr-legenda" });
  const aviso = el("div", {
    class: "pf-tr-aviso",
    attrs: { role: "status" },
    text: B.t,
  });
  const palco = el("div", { class: "pf-tr-palco" }, [
    el("div", { class: "pf-tr-cena" }, [imagem, titulo, legenda, aviso]),
  ]);
  raiz.replaceChildren(palco);

  /** @type {() => void} */
  let terminar = () => {};
  const fim = /** @type {Promise<void>} */ (
    new Promise((resolve) => {
      terminar = () => resolve();
    })
  );
  const ini = Date.now();
  function quadro() {
    const f = (Date.now() - ini) / 70;
    const dt = f;
    const [l0, l1, l2, l3] = campo(A, B, de, para, dt, f);
    [l0, l1, l2, l3].forEach((t, k) => (camadas[k].textContent = t));
    const r = dt * 2.4;
    const cB = B.c;
    const cA = A.c;
    const bD = mistura(cB, CINZA, 0.45);
    const aD = mistura(cA, CINZA, 0.45);
    const m = mistura(bD, aD, 0.5);
    const rr = Math.min(r, 90);
    const r0 = Math.max(0, (rr - 6) * CW);
    const r1 = rr * CW;
    const r2 = (rr + 6) * CW;
    const grad = `radial-gradient(circle at ${(CX * CW).toFixed(0)}px ${CY * 16}px,${cB} 0px,${bD} ${Math.max(40, r0).toFixed(0)}px,${m} ${r1.toFixed(0)}px,${aD} ${r2.toFixed(0)}px,${cA} ${(r2 + 200).toFixed(0)}px)`;
    for (const c of camadas) c.style.backgroundImage = grad;
    const pT = cl(
      ((dt - 4) / (Math.max(A.t.length, B.t.length) * 2)) * 100,
      0,
      100,
    );
    const pD = cl(
      ((dt - 12) / (Math.max(A.d.length, B.d.length) * 2)) * 100,
      0,
      100,
    );
    titulo.style.backgroundImage = `linear-gradient(90deg,${cB} ${Math.max(0, pT - 8)}%,${cA} ${Math.min(100, pT + 8)}%)`;
    legenda.style.backgroundImage = `linear-gradient(90deg,${mistura(cB, CINZA, 0.35)} ${Math.max(0, pD - 8)}%,${mistura(cA, CINZA, 0.35)} ${Math.min(100, pD + 8)}%)`;
    titulo.textContent = embaralha(A.t, B.t, dt, 4, f);
    legenda.textContent = embaralha(A.d, B.d, dt, 12, f);
    if (dt >= DURACAO) terminar();
  }
  quadro();
  const timer = setInterval(quadro, 50);
  const pular = () => terminar();
  palco.addEventListener("pointerdown", pular);
  addEventListener("keydown", pular);
  fim.then(() => {
    clearInterval(timer);
    removeEventListener("keydown", pular);
  });
  return {
    fim,
    destroy() {
      terminar();
      raiz.replaceChildren();
    },
  };
}
