// Sobre mim: um pato de pixels boia na tela de cima de um console de duas telas, a de baixo tem o botão de carinho, e ao lado fica a ficha em terminal com perfil, skills, formação e certificados. Portado da tela desenhada no quadro de design.

// @ts-nocheck: a cena foi portada como está do quadro; a tipagem fica para uma passada própria.

import { Cena, montarTela, movimentoReduzido } from "../terminal/tela.js";
import { criarGrade } from "../terminal/grade.js";

const { W, H, NL, mk, put, box, split, legenda } = criarGrade({
  linhas: 24,
  camadas: 7,
});

function clr(g, x, y, w, h) {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++)
      for (let k = 0; k < NL; k++) {
        const yy = y + j,
          xx = x + i;
        if (yy >= 0 && yy < H && xx >= 0 && xx < W) g[k][yy][xx] = " ";
      }
}

// Caracteres de caixa e de bloco são desenhados como formas na grade (sem depender da fonte);
// só as letras continuam como texto.
// camadas: 0 moldura suave, 1 acento, 2 texto principal, 3 texto secundário, 4 âmbar, 5 escuro
const TABS = ["perfil", "skills", "formação", "certificados"];
const AREAS = ["todos", "ia", "dados", "ferramentas", "full-stack", "testes"];
// provisório: trocar pelos certificados reais e pelos caminhos dos PDFs
const CERTS = [
  { n: "[certificado 1]", a: "ia", href: "#certificado-1" },
  { n: "[certificado 2]", a: "dados", href: "#certificado-2" },
  { n: "[certificado 3]", a: "ia", href: "#certificado-3" },
  { n: "[certificado 4]", a: "full-stack", href: "#certificado-4" },
  { n: "[certificado 5]", a: "testes", href: "#certificado-5" },
  { n: "[certificado 6]", a: "ferramentas", href: "#certificado-6" },
];
const FALA = {
  perfil: "oi! me chamo (quá)",
  skills: "olha quanta coisa!",
  formação: "estudando sempre!",
  certificados: "colecionando!",
};
const PX = 45,
  PY = 4;

const FIXO = {
  perfil: [
    [["nome", 3]],
    [
      ["╚═ ", 0],
      ["eduarda silva (thinkmadu)", 2],
    ],
    [],
    [["ocupação", 3]],
    [
      ["╚═ ", 0],
      ["[sua ocupação aqui]", 1],
    ],
    [],
    [["lema", 3]],
    [
      ["╚═ ", 0],
      ['"Se encontro um problema, desenvolvo', 2],
    ],
    [
      ["   ", 0],
      ['a solução."', 2],
    ],
  ],
  skills: [
    [["hard skills", 3]],
    [
      ["╠═ ", 0],
      ["ia", 2],
    ],
    [
      ["╠═ ", 0],
      ["dados", 2],
    ],
    [
      ["╠═ ", 0],
      ["ferramentas", 2],
    ],
    [
      ["╠═ ", 0],
      ["full-stack", 2],
    ],
    [
      ["╚═ ", 0],
      ["testes", 2],
    ],
    [],
    [["soft skills", 3]],
    [
      ["╠═ ", 0],
      ["[soft skill 1]", 1],
    ],
    [
      ["╠═ ", 0],
      ["[soft skill 2]", 1],
    ],
    [
      ["╚═ ", 0],
      ["[soft skill 3]", 1],
    ],
  ],
  formação: [
    [["formação acadêmica", 3]],
    [
      ["╠═ ", 0],
      ["[curso]", 2],
    ],
    [
      ["║  ", 0],
      ["╚═ ", 0],
      ["[instituição] · [ano]", 1],
    ],
    [
      ["╚═ ", 0],
      ["[curso 2]", 2],
    ],
    [
      ["   ", 0],
      ["╚═ ", 0],
      ["[instituição] · [ano]", 1],
    ],
  ],
};

function certContent(area, onFiltro) {
  const lines = [],
    zs = [];
  const chipLine = (from, to, y) => {
    const segs = [];
    let off = 0;
    for (let i = from; i < to; i++) {
      const on = AREAS[i] === area;
      const len = AREAS[i].length + 4;
      segs.push(
        [on ? "(" : " ", 1],
        [String(i + 1), 6],
        [" " + AREAS[i], on ? 2 : 3],
        [on ? ")" : " ", 1],
        [" ", 0],
      );
      zs.push({
        tipo: "b",
        x: PX + off,
        y: y,
        w: len,
        label: "Filtrar certificados: " + AREAS[i],
        pick: () => onFiltro(AREAS[i]),
      });
      off += len + 1;
    }
    lines.push(segs);
  };
  chipLine(0, 4, PY);
  chipLine(4, 6, PY + 1);
  const filtrados = CERTS.filter((c) => area === "todos" || c.a === area);
  lines.push([["mostrando " + filtrados.length + " de " + CERTS.length, 3]]);
  lines.push([]);
  let yy = PY + 4;
  AREAS.slice(1).forEach((a) => {
    const itens = filtrados.filter((c) => c.a === a);
    if (!itens.length) return;
    lines.push([[a, 3]]);
    yy++;
    itens.forEach((c, j) => {
      const ult = j === itens.length - 1;
      lines.push([
        [ult ? "╚═ " : "╠═ ", 0],
        [c.n, 2],
        ["  ", 0],
        ["(pdf)", 1],
      ]);
      zs.push({
        tipo: "a",
        x: PX + 3,
        y: yy,
        w: c.n.length + 7,
        href: c.href,
        label: "Abrir o PDF do certificado " + c.n + " (área " + a + ")",
      });
      yy++;
    });
  });
  return { lines: lines, zs: zs };
}

// pato de pixels (meio-bloco), 24 colunas x 16 linhas de pixel = 24 x 8 caracteres
const DUCK = [
  "..........WWWW....",
  ".........WWWWWW...",
  ".........WWKWWAAA.",
  ".........WWWWWAAAA",
  ".........WLWWWAA..",
  "....WW....WWWW....",
  "....WWWWWWWWWW....",
  "....WWWWWWWWWWW...",
  "...WWWWWLLWWWWWW..",
  "...WWWWLLLLWWWWW..",
  "...WWWWWLLLWWWWW..",
  "....LWWWWWWWWWL...",
  ".....LLWWWWWLL....",
  ".......LLLLL......",
];
const IDX = { L: 1, W: 2, A: 4, K: 5 };
function duckLayers(f, mode, dm) {
  const PW_ = 24,
    PH = 16;
  const pix = Array.from({ length: PH }, () => Array(PW_).fill(-1));
  const blink = mode === "idle" && f % 43 < 3;
  let hop = 0;
  if (mode === "happy") hop = Math.round(Math.abs(Math.sin(dm / 2)) * 2);
  const ox = 3,
    oy = 2 + (Math.floor(f / 9) % 2) - hop;
  DUCK.forEach((r, j) => {
    for (let i = 0; i < 18; i++) {
      let ch = r[i];
      if (ch === "." || ch === undefined) continue;
      if (blink && ch === "K") ch = "W";
      const y = oy + j,
        x = ox + i;
      if (y >= 0 && y < PH && x < PW_) pix[y][x] = IDX[ch];
    }
  });
  for (let x = 0; x < PW_; x++) {
    const top = 13 + Math.round(Math.sin((x + f / 2) / 2));
    for (let y = top; y < PH; y++) pix[y][x] = -1;
    pix[top][x] = 1;
    if (top + 1 < PH && (x + Math.floor(f / 4)) % 3 === 0) pix[top + 1][x] = 0;
  }
  const L = Array.from({ length: NL }, () => []);
  for (let r = 0; r < PH / 2; r++) {
    const rows = Array.from({ length: NL }, () => "");
    for (let x = 0; x < PW_; x++) {
      const a = pix[2 * r][x],
        b = pix[2 * r + 1][x];
      for (let k = 0; k < NL; k++)
        rows[k] +=
          a === k && b === k ? "█" : a === k ? "▀" : b === k ? "▄" : " ";
    }
    for (let k = 0; k < NL; k++) L[k].push(rows[k]);
  }
  return L.map((a) => a.join("\n"));
}

class Sobre extends Cena {
  montar() {
    if (movimentoReduzido()) {
      this.setState({ f: 200 });
      return;
    }
  }
  tick() {
    const s = this.state || {};
    this.setState({ f: (s.f || 0) + 1 });
  }
  abrir(k) {
    const f = (this.state && this.state.f) || 0;
    this.setState({ tab: k, t0: f, mode: "happy", m0: f });
  }
  filtrar(a) {
    const f = (this.state && this.state.f) || 0;
    this.setState({ area: a, t0: f - 100, mode: "happy", m0: f });
  }
  carinho() {
    const s = this.state || {};
    this.setState({
      mode: "carinho",
      m0: s.f || 0,
      hearts: (s.hearts || 0) + 1,
    });
  }
  teclar(e) {
    const k = String((e && e.key) || "").toLowerCase();
    const mapa = { p: "perfil", s: "skills", f: "formação", c: "certificados" };
    if (k === "v") {
      location.hash = "#inicio";
      return;
    }
    if (mapa[k]) {
      this.abrir(mapa[k]);
      return;
    }
    const tab = (this.state && this.state.tab) || "perfil";
    if (tab === "certificados" && k.length === 1 && k >= "1" && k <= "6")
      this.filtrar(AREAS[Number(k) - 1]);
  }
  quadro() {
    const s = this.state || {};
    const f = s.f || 0;
    const tab = s.tab || "perfil",
      t0 = s.t0 || 0,
      area = s.area || "todos",
      hearts = s.hearts || 0;
    const dm = f - (s.m0 || 0);
    let mode = s.mode || "idle";
    if ((mode === "happy" && dm > 16) || (mode === "carinho" && dm > 30))
      mode = "idle";
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
    put(g, 2, 13, 0, "(sobre mim)");

    // console portátil de duas telas
    box(g, 0, 1, 1, 40, 12);
    box(g, 0, 1, 14, 40, 10);
    put(g, 0, 4, 13, "╞" + "═".repeat(34) + "╡");
    put(g, 0, 20, 1, "o");
    [4, 5, 6, 7].forEach((r) => {
      put(g, 0, 3, r, ":::");
      put(g, 0, 36, r, ":::");
    });
    box(g, 3, 8, 2, 26, 10);
    box(g, 3, 11, 15, 20, 8);
    box(g, 0, 3, 16, 5, 3);
    put(g, 0, 5, 17, "o");
    put(g, 0, 5, 19, "╷");
    put(g, 0, 4, 20, "╶┼╴");
    put(g, 0, 5, 21, "╵");
    put(g, 0, 34, 16, "(X)");
    put(g, 0, 32, 17, "(Y)");
    put(g, 0, 36, 17, "(A)");
    put(g, 0, 34, 18, "(B)");
    put(g, 0, 19, 23, "[o]");

    // tela de cima: o pato
    const dl = duckLayers(f, mode, dm);
    clr(g, 9, 3, 24, 8);
    dl.forEach((txt, k) => {
      txt.split("\n").forEach((row, r) => {
        for (let c = 0; c < row.length; c++) {
          const ch = row[c];
          if (ch !== " ") g[k][3 + r][9 + c] = ch;
        }
      });
    });
    if (mode === "carinho") {
      for (let i = 0; i < 3; i++)
        put(g, 1, 11 + i * 2, 6 - ((Math.floor(dm / 3) + i * 2) % 3), "<3");
    }
    if (mode === "happy") put(g, 1, 12, 4 - (dm % 2), "*");

    // tela de baixo: fala, botão de carinho e contador
    const say = mode === "carinho" ? "quá quá! <3" : FALA[tab];
    put(g, 2, 12 + Math.floor((18 - say.length) / 2), 16, say);
    box(g, 1, 13, 18, 16, 3);
    put(g, 2, 16, 19, "(carinho)");
    put(g, 1, 13, 21, "<3 " + hearts);
    zonas.push({
      tipo: "b",
      x: 13,
      y: 18,
      w: 16,
      h: 48,
      label: "Fazer carinho no pato",
      pick: () => this.carinho(),
    });

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

    let linhas = FIXO[tab],
      rate = 3;
    if (tab === "certificados") {
      const cc = certContent(area, (a) => this.filtrar(a));
      linhas = cc.lines;
      rate = 10;
      cc.zs.forEach((z) => zonas.push(z));
    }
    let n = Math.floor(Math.max(0, f - t0) * rate),
      y = PY;
    for (let li = 0; li < linhas.length; li++) {
      const ln = linhas[li];
      let x = PX;
      for (let si = 0; si < ln.length; si++) {
        if (n <= 0) break;
        const t = ln[si][0],
          l = ln[si][1];
        const part = t.slice(0, n);
        put(g, l, x, y, part);
        n -= t.length;
        x += part.length;
      }
      y++;
      if (n <= 0) break;
    }

    put(g, 0, 43, 21, "├" + "─".repeat(47) + "┤");
    legenda(
      g,
      PX,
      22,
      ["p", "s", "f", "c", "v"],
      tab === "certificados" ? ["filtro", "1-6"] : null,
    );

    return { camadas: split(g), zonas };
  }
}

const CONFIG = {
  tema: "pf-tema-sobre",
  altura: 424,
  camadas: 7,
  ordemSvg: [0, 1, 2, 3, 4, 5],
  negrito: [6],
  brilho: [],
  linhas: false,
  intervalo: 140,
  nitido: true,
  aria: "Ficha de apresentação. Teclas p, s, f e c trocam de aba, v volta; teclas de 1 a 6 filtram os certificados",
  descricao:
    "Um pato de pixels boiando na tela de cima de um console portátil de duas telas; a tela de baixo tem o botão de carinho. Ao lado, uma ficha estilo monitor de terminal com abas perfil, skills, formação e certificados",
};

/** @param {HTMLElement} raiz */
export function montar(raiz) {
  return montarTela(raiz, CONFIG, new Sobre());
}
