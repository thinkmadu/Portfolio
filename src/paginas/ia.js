// IA: a frase de assinatura é digitada, as letras voam e se reorganizam num robô-pato de pixels; ao lado fica a ficha com projetos e habilidades. Portado da tela desenhada no quadro de design.

// @ts-nocheck: a cena foi portada como está do quadro; a tipagem fica para uma passada própria.

import { Cena, montarTela, movimentoReduzido } from "../terminal/tela.js";
import { criarGrade, ease } from "../terminal/grade.js";

const { NL, mk, put, box, split, legenda } = criarGrade({
  linhas: 24,
  camadas: 7,
});

// Caracteres de caixa e de bloco são desenhados como formas na grade (sem depender da fonte);
// só as letras continuam como texto.

// camadas: 0 moldura suave, 1 ciano, 2 texto principal, 3 texto secundário, 4 âmbar, 5 escuro
const TABS = ["projetos", "habilidades"];
const PX = 45,
  PY = 4;
const PROJ = ["[projeto de IA 1]", "[projeto de IA 2]", "[projeto de IA 3]"];
const FIXO = {
  habilidades: [
    [["modelos e linguagem", 3]],
    [
      ["╠═ ", 0],
      ["[habilidade 1]", 1],
    ],
    [
      ["╚═ ", 0],
      ["[habilidade 2]", 1],
    ],
    [],
    [["dados e avaliação", 3]],
    [
      ["╠═ ", 0],
      ["[habilidade 3]", 1],
    ],
    [
      ["╚═ ", 0],
      ["[habilidade 4]", 1],
    ],
    [],
    [["ferramentas", 3]],
    [
      ["╠═ ", 0],
      ["[habilidade 5]", 1],
    ],
    [
      ["╚═ ", 0],
      ["[habilidade 6]", 1],
    ],
  ],
};
function projContent() {
  const lines = [],
    zs = [];
  PROJ.forEach((t, i) => {
    lines.push([[t, 2]]);
    lines.push([
      ["╠═ ", 0],
      ["[o que faz, em uma linha]", 3],
    ]);
    lines.push([
      ["╠═ ", 0],
      ["[modelos · bibliotecas · dados]", 3],
    ]);
    lines.push([
      ["╚═ ", 0],
      ["(ver caso)", 1],
      ["  ", 0],
      ["(repositório)", 1],
    ]);
    lines.push([]);
    const y = PY + i * 5 + 3;
    zs.push({
      tipo: "a",
      x: PX + 3,
      y: y,
      w: 10,
      href: "#caso-" + (i + 1),
      label: "Ver o caso de " + t,
    });
    zs.push({
      tipo: "a",
      x: PX + 15,
      y: y,
      w: 13,
      href: "#repo-" + (i + 1),
      label: "Abrir o repositório de " + t,
    });
  });
  return { lines: lines, zs: zs };
}

// robô de pixels (meio-bloco): metade esquerda, 11 colunas; a direita é o espelho
const SPR = [
  "..........A",
  "..........L",
  "..........L",
  "...WWWWWWWW",
  "..WWWWWWWWW",
  ".WWWWWWWWWW",
  ".WWDDDDDDDD",
  ".WWDDEEDDDD",
  ".WWDDEEDDDD",
  ".WWDDDDDDDD",
  ".WWDDDDEEEE",
  ".WWDDDDDDDD",
  "..WWWWWWWWW",
  "...WWWWWWWW",
  "........LLL",
  "...WWWWWWWW",
  "WW.WWWWWWWW",
  "WW.WLLLLLLL",
  "WW.WLDDDLLL",
  "WW.WLDEDLLL",
  "LL.WLDDDLLL",
  "...WLLLLLLL",
  "...WWWWWWWW",
  "....WWW....",
  "....WWW....",
  "...LLLL....",
];
const IDX = { W: 2, L: 1, D: 5, E: 2, A: 4 };
const SW_ = 38,
  SH_ = 26;
function robotLayers(f, talk) {
  const pix = Array.from({ length: SH_ }, () => Array(SW_).fill(-1));
  const blink = f % 47 < 3;
  const ox = 8;
  const ant = Math.floor(f / 8) % 2 ? 4 : 2;
  const luz = Math.floor(f / 10) % 2 ? 2 : 1;
  SPR.forEach((r, j) => {
    for (let i = 0; i < 11; i++) {
      const ch = r[i];
      if (ch === ".") continue;
      let k = IDX[ch];
      if (ch === "A") k = ant;
      if (ch === "E" && j === 7 && blink) k = 5;
      if (ch === "E" && j === 19) k = luz;
      if (ch === "E" && j === 10 && talk) k = 5;
      pix[j][ox + i] = k;
      pix[j][ox + 21 - i] = k;
    }
  });
  if (talk) {
    for (let i = 8; i <= 10; i++) {
      pix[11][ox + i] = 2;
      pix[11][ox + 21 - i] = 2;
    }
  }
  const L = Array.from({ length: NL }, () => []);
  for (let r = 0; r < SH_ / 2; r++) {
    const rows = Array.from({ length: NL }, () => "");
    for (let x = 0; x < SW_; x++) {
      const a = pix[2 * r][x],
        b = pix[2 * r + 1][x];
      for (let k = 0; k < NL; k++)
        rows[k] +=
          a === k && b === k ? "█" : a === k ? "▀" : b === k ? "▄" : " ";
    }
    for (let k = 0; k < NL; k++) L[k].push(rows[k]);
  }
  return L;
}
const BASE = robotLayers(10, false);
const CELLS = [];
for (let r = 0; r < SH_ / 2; r++)
  for (let c = 0; c < SW_; c++) {
    let any = false;
    for (let k = 0; k < NL; k++) if (BASE[k][r][c] !== " ") any = true;
    if (any) CELLS.push({ r: r, c: c });
  }

// frase de entrada, em duas linhas centralizadas na janela (x interno de 2 a 39)
const SL = ["Se encontro um problema,", "desenvolvo a solução."];
const SPOS = [];
SL.forEach((s, j) => {
  const x0 = 2 + Math.floor((38 - s.length) / 2);
  for (let i = 0; i < s.length; i++)
    if (s[i] !== " ") SPOS.push({ x: x0 + i, y: 3 + j, ch: s[i] });
});
const P = 260;

class IA extends Cena {
  montar() {
    if (movimentoReduzido()) {
      this.setState({ f: 160 });
      return;
    }
  }
  tick() {
    const s = this.state || {};
    this.setState({ f: (s.f || 0) + 1 });
  }
  abrir(k) {
    const f = (this.state && this.state.f) || 0;
    this.setState({ tab: k, t0: f });
  }
  teclar(e) {
    const k = String((e && e.key) || "").toLowerCase();
    if (k === "v") {
      location.hash = "#inicio";
      return;
    }
    if (k === "p") this.abrir("projetos");
    if (k === "h") this.abrir("habilidades");
  }
  quadro() {
    const s = this.state || {};
    const f = s.f || 0;
    const tab = s.tab || "projetos",
      t0 = s.t0 || 0;
    const t = f % P;
    let phase = 0,
      p = 0;
    if (t >= 70 && t < 130) {
      phase = 1;
      p = (t - 70) / 60;
    } else if (t >= 130 && t < 215) {
      phase = 2;
      p = 1;
    } else if (t >= 215 && t < 255) {
      phase = 3;
      p = 1 - (t - 215) / 40;
    }
    const g = mk();
    const zonas = [];
    zonas.push({
      tipo: "a",
      x: 2,
      y: 0,
      w: 8,
      href: "#inicio",
      alvo: "_self",
      label: "Voltar para o início",
    });

    put(g, 1, 2, 0, "‹");
    put(g, 6, 4, 0, "v");
    put(g, 1, 5, 0, "oltar");
    put(g, 0, 11, 0, "│");
    put(g, 2, 13, 0, "(ia)");

    // janela do robô
    box(g, 0, 1, 1, 40, 23);

    if (phase === 0) {
      const n = Math.min(SPOS.length, Math.floor(t * 0.8));
      let c = 0;
      SL.forEach((sl, j) => {
        const x0 = 2 + Math.floor((38 - sl.length) / 2);
        let seen = "";
        for (let i = 0; i < sl.length; i++) {
          if (sl[i] === " ") {
            seen += " ";
            continue;
          }
          if (c < n) {
            seen += sl[i];
            c++;
          } else seen += " ";
        }
        put(g, 2, x0, 3 + j, seen);
      });
      if (f % 8 < 5 && n < SPOS.length) {
        const j = n < SL[0].replace(/ /g, "").length ? 0 : 1;
        const sl = SL[j];
        const x0 = 2 + Math.floor((38 - sl.length) / 2);
        put(g, 1, x0 + Math.min(sl.length, Math.max(0, sl.length)), 3 + j, "");
      }
    } else {
      const talk = phase === 2 && Math.floor(f / 40) % 2 === 1;
      const rl = robotLayers(f, talk);
      const N = CELLS.length;
      CELLS.forEach((cell, i) => {
        const sp = SPOS[i % SPOS.length];
        const q = Math.max(0, Math.min(1, p * 1.5 - (i / N) * 0.5));
        const e = ease(q);
        const gx = 2 + cell.c,
          gy = 5 + cell.r;
        if (q >= 1) {
          for (let k = 0; k < NL; k++) {
            const ch = rl[k][cell.r][cell.c];
            if (ch !== " ") g[k][gy][gx] = ch;
          }
        } else {
          const x = sp.x + (gx - sp.x) * e;
          const y = Math.max(
            2,
            sp.y +
              (gy - sp.y) * e -
              Math.sin(Math.PI * e) * 1.5 * (1 + (i % 3) * 0.3),
          );
          put(g, 2, x, y, sp.ch);
        }
      });
    }
    put(g, 0, 8, 18, "─".repeat(26));

    // pipeline
    ["1 texto", "2 tokens", "3 figura"].forEach((txt, i) => {
      const cur = [0, 1, 2, 1][phase] === i;
      put(g, 1, 5 + i * 12, 20, txt[0]);
      put(g, cur ? 2 : 3, 6 + i * 12, 20, txt.slice(1));
    });
    const pct = [(t / 70) * 33, 33 + p * 67, 100, p * 100][phase];
    const kk = Math.round((30 * Math.max(0, Math.min(100, pct))) / 100);
    put(g, 0, 5, 21, "[" + "#".repeat(kk) + "-".repeat(30 - kk) + "]");

    // ficha estilo btop
    box(g, 0, 43, 1, 49, 23);
    let tx = PX;
    TABS.forEach((k) => {
      const on = k === tab;
      put(g, 0, tx, 1, "┤");
      put(g, 6, tx + 1, 1, k[0]);
      put(g, on ? 2 : 3, tx + 2, 1, k.slice(1));
      put(g, 0, tx + 1 + k.length, 1, "├");
      if (on) put(g, 1, tx + 1, 2, "─".repeat(k.length));
      zonas.push({
        tipo: "b",
        x: tx,
        y: 1,
        w: k.length + 2,
        h: 22,
        dy: 3,
        label: "Aba " + k + " (tecla " + k[0] + ")",
        pick: () => this.abrir(k),
      });
      tx += k.length + 3;
    });

    let linhas = FIXO.habilidades;
    if (tab === "projetos") {
      const pc = projContent();
      linhas = pc.lines;
      pc.zs.forEach((z) => zonas.push(z));
    }
    let n = Math.floor(Math.max(0, f - t0) * 4),
      y = PY;
    for (let li = 0; li < linhas.length; li++) {
      const ln = linhas[li];
      let x = PX;
      for (let si = 0; si < ln.length; si++) {
        if (n <= 0) break;
        const tt = ln[si][0],
          l = ln[si][1];
        const part = tt.slice(0, n);
        put(g, l, x, y, part);
        n -= tt.length;
        x += part.length;
      }
      y++;
      if (n <= 0) break;
    }

    put(g, 0, 43, 21, "├" + "─".repeat(47) + "┤");
    legenda(g, PX, 22, ["p", "h", "v"], null);

    return { camadas: split(g), zonas };
  }
}

const CONFIG = {
  tema: "pf-tema-ia",
  altura: 424,
  camadas: 7,
  ordemSvg: [0, 1, 2, 3, 4, 5],
  negrito: [6],
  brilho: [],
  linhas: false,
  intervalo: 120,
  nitido: true,
  aria: "Página de IA. Teclas p e h trocam de aba, v volta",
  descricao:
    "A frase 'Se encontro um problema, desenvolvo a solução.' é digitada, suas letras voam e se reorganizam em um robô de pixels. Ao lado, uma ficha com abas projetos e habilidades",
};

/** @param {HTMLElement} raiz */
export function montar(raiz) {
  return montarTela(raiz, CONFIG, new IA());
}
