// IA: fluxo de três telas. A principal tem o robô-pato e os projetos para escolher; ao escolher, o texto do projeto vira os nós de uma rede neural; o detalhe mostra a rede em quatro colunas (linguagem, ferramentas, conceitos, resultados). Portado do quadro "ia: fluxo" do design.

// @ts-nocheck: a cena foi portada como está do quadro; a tipagem fica para uma passada própria.

import { Cena, montarTela, movimentoReduzido } from "../terminal/tela.js";
import { CW, MARGEM, cl, criarGrade, ease } from "../terminal/grade.js";
import { el } from "../util/dom.js";

const { W, mk, put, box, vazio, split, legenda, pintar } = criarGrade({
  linhas: 24,
  camadas: 7,
});

// Caixas, blocos e setas são desenhados como formas na grade (sem depender da fonte);
// só as letras continuam como texto.
// camadas: 0 moldura suave, 1 ciano, 2 texto principal, 3 texto secundário, 4 âmbar, 5 escuro, 6 negrito ciano

/** Relógio dos pixels do robô: um passo a cada 140 ms (piscar, asa, água). */
const PASSO_PIXEL = 140;
/** Relógio da transição: um passo a cada 28 ms, 190 passos (cerca de 5,3 s). */
const PASSO_TRANSICAO = 28;
const DURACAO_TRANSICAO = 190;

// Projetos do GitHub. Os textos são placeholders; `repo` e `demo` viram links quando preenchidos.
const PROJETOS = [1, 2, 3, 4].map((n) => ({
  nome: `[projeto de IA ${n}]`,
  faz: "[o que faz, em 1 linha]",
  descricao: "[o que faz, em uma linha]",
  linguagem: "[linguagem]",
  data: "[data]",
  repo: null,
  demo: null,
}));

// ---------- o robô-pato (frente) ----------
const grade = (w, h) => Array.from({ length: h }, () => Array(w).fill(-1));
const HALF = [
  "..........CC",
  "..........CC",
  "...........W",
  "......WWWWWW",
  "....WWWWWWWW",
  "..WWWWWWWWWW",
  "..WWDDDDDDDD",
  ".WWWDDDDDDDD",
  ".WWWDDEEEDDD",
  ".WWWDDEEEDDD",
  ".WWWDDDDDDDD",
  ".WWWWWWWWAAA",
  "..WWWWWWAAAA",
  "..GWWWWWWAAA",
  "...GGWWWWWWW",
  "..WWWWWWWWWW",
  ".WWWWWWWWWWW",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
  "WWWWWDDDDDDD",
  "WWWWWDCCCDDD",
  "WWWWWDDDDDDD",
  "WWWWWWWWWWWW",
  "GWWWWWWWWWWW",
  "GGWWWWWWWWWW",
  ".GGGWWWWWWWW",
  "..GGGGGGGGGG",
  "...GGGGGGGGG",
  "............",
  "............",
  "............",
  "............",
];
const CORES = { W: 2, G: 3, D: 5, C: 1, E: 5, A: 4 };
const OLHOS = {
  normal: ["EEE", "EEE", "..."],
  blink: ["...", "EEE", "..."],
  curioso: ["EEE", "EEE", "EEE"],
  feliz: [".E.", "E.E", "..."],
  erro: ["E.E", ".E.", "E.E"],
  pensando: ["...", "...", "..."],
};
const ASA = [".WW", "WWW", "WWW", "GWW", ".GW"];

/**
 * Quadro de pixels do robô. `olhar`: -1 esquerda, 0 centro, 1 direita; `asaE` e `asaD`:
 * deslocamento vertical de cada asa (null = bate sozinha).
 */
function pixFrente(expr, f, olhar, asaE, asaD) {
  const pix = grade(32, 32);
  HALF.forEach((r, j) => {
    for (let i = 0; i < 12; i++) {
      const ch = r[i];
      if (ch === ".") continue;
      let k = CORES[ch];
      if (ch === "C" && j < 2) k = Math.floor(f / 8) % 2 ? 4 : 1;
      pix[j][4 + i] = k;
      pix[j][27 - i] = k;
    }
  });
  let e = OLHOS[expr] || OLHOS.normal;
  if (expr === "normal" && Math.floor(f) % 47 < 3) e = OLHOS.blink;
  const dx = olhar || 0;
  for (let rr = 0; rr < 3; rr++)
    for (let cc = 0; cc < 3; cc++)
      if (e[rr][cc] === "E") {
        pix[8 + rr][10 + cc + dx] = 1;
        pix[8 + rr][19 + cc + dx] = 1;
      }
  if (expr === "pensando") {
    const lit = Math.floor(f / 6) % 3;
    [11, 15, 19].forEach((x, i) => {
      pix[9][x] = pix[9][x + 1] = i === lit ? 1 : 0;
    });
  }
  const bate = Math.floor(f / 6) % 2 ? -1 : 0;
  const dE = asaE == null ? bate : asaE;
  const dD = asaD == null ? bate : asaD;
  ASA.forEach((r, j) => {
    for (let c = 0; c < 3; c++) {
      const ch = r[c];
      if (ch === ".") continue;
      const k = ch === "W" ? 2 : 3;
      pix[17 + dE + j][c] = k;
      pix[17 + dD + j][31 - c] = k;
    }
  });
  for (let x = 0; x < 32; x++) {
    const top = 26 + Math.round(Math.sin((x + f / 2) / 3));
    for (let y = top; y < 32; y++) pix[y][x] = -1;
    pix[top][x] = 1;
    if (top + 1 < 32 && (x + Math.floor(f / 4)) % 3 === 0) pix[top + 1][x] = 0;
  }
  return pix;
}

// ---------- peças comuns às três telas ----------
function cabecalho(g, rotulo, trilha) {
  put(g, 1, 2, 0, "‹");
  put(g, 6, 4, 0, "v");
  put(g, 1, 5, 0, "oltar");
  put(g, 0, 12, 0, "│");
  put(g, 2, 14, 0, "(ia)");
  if (trilha) {
    put(g, 0, 19, 0, "›");
    put(g, 2, 21, 0, trilha);
  }
  put(g, 4, W - rotulo.length - 1, 0, rotulo);
  box(g, 0, 1, 1, 91, 23);
  put(g, 0, 1, 21, "├" + "─".repeat(89) + "┤");
}
/** Linha do card até o robô: corre até a primeira célula ocupada e termina num ponto. */
function ligar(g, y, x0, dir, ativo) {
  let x = x0;
  while (x >= 0 && x < W && vazio(g, x, y)) x += dir;
  if (x < 0 || x >= W) return;
  const fim = x - dir;
  const a = Math.min(x0, fim - dir);
  const b = Math.max(x0, fim - dir);
  put(g, ativo ? 1 : 0, a, y, "─".repeat(b - a + 1));
  put(g, ativo ? 1 : 0, fim, y, "•");
}
const px = (c) => c * CW + CW / 2;
const py = (r) => r * 16 + 8;

// ---------- 1. tela principal ----------
const CARDS = [
  { x: 3, y: 3, lado: -1 },
  { x: 3, y: 12, lado: -1 },
  { x: 63, y: 3, lado: 1 },
  { x: 63, y: 12, lado: 1 },
];
function telaPrincipal(f, alvo, alvoF, zonas, mapa, aoEscolher) {
  const g = mk();
  cabecalho(g, "tela principal");
  const sel = alvo;
  const expr =
    sel != null ? "curioso" : Math.floor(f / 14) % 2 ? "pensando" : "normal";
  const c = sel != null ? CARDS[sel] : null;
  const olhar = c ? c.lado : 0;
  const up = -Math.round(4 * ease((f - alvoF) / 5));
  const asaE = c && c.lado < 0 ? up : null;
  const asaD = c && c.lado > 0 ? up : null;
  pintar(g, pixFrente(expr, f, olhar, asaE, asaD), 30, 3);
  CARDS.forEach((cd, i) => {
    const p = PROJETOS[i];
    const on = i === sel;
    const lc = on ? 1 : 0;
    box(g, lc, cd.x, cd.y, 26, 5);
    put(g, lc, cd.x + 2, cd.y, "┤");
    put(g, 6, cd.x + 3, cd.y, String(i + 1));
    put(g, lc, cd.x + 4, cd.y, "├");
    put(g, on ? 2 : 3, cd.x + 2, cd.y + 1, p.nome);
    put(g, 3, cd.x + 2, cd.y + 2, p.faz);
    put(g, 1, cd.x + 2, cd.y + 3, "•");
    put(g, 3, cd.x + 4, cd.y + 3, `${p.linguagem} · ${p.data}`);
    ligar(
      g,
      cd.y + 2,
      cd.lado < 0 ? cd.x + 26 : cd.x - 1,
      cd.lado < 0 ? 1 : -1,
      on,
    );
    mapa[zonas.length] = i;
    zonas.push({
      tipo: "b",
      x: cd.x,
      y: cd.y,
      w: 26,
      h: 80,
      label: `Abrir ${p.nome}`,
      pick: () => aoEscolher(i),
    });
  });
  const fala = sel != null ? "olha esse!" : "qual vai ser?";
  put(g, 3, Math.round(46 - fala.length / 2), 19, fala);
  legenda(g, 3, 22, ["1", "2", "3", "4", "v"]);
  return split(g);
}

// ---------- 2. transição: texto vira rede neural ----------
const TAM = [4, 6, 6, 4, 2];
const COLS = [14, 30, 46, 62, 78];
const NOS = [];
TAM.forEach((n, l) => {
  for (let i = 0; i < n; i++)
    NOS.push({ l, i, x: COLS[l], y: Math.round(10.5 + (i - (n - 1) / 2) * 3) });
});
const ARESTAS = [];
for (let l = 0; l < TAM.length - 1; l++)
  NOS.filter((n) => n.l === l).forEach((a) =>
    NOS.filter((n) => n.l === l + 1).forEach((b) => {
      const pa = a.i / (TAM[l] - 1);
      const pb = b.i / (TAM[l + 1] - 1);
      if (Math.abs(pa - pb) <= 0.34) ARESTAS.push({ a, b, l });
    }),
  );
/** Letras do nome e da descrição do projeto, centradas, cada uma na sua célula. */
function letrasDe(p) {
  const out = [];
  [p.nome, p.descricao].forEach((s, j) => {
    const x0 = Math.round(46 - s.length / 2);
    for (let i = 0; i < s.length; i++)
      if (s[i] !== " ") out.push({ x: x0 + i, y: 10 + j * 2, ch: s[i] });
  });
  return out;
}
const LETRAS = PROJETOS.map(letrasDe);
const ETAPAS = ["texto", "nós", "rede", "ativação", "projeto"];

/** Devolve as camadas e as letras em voo (posição livre, em px, desenhadas à parte). */
function telaTransicao(t, proj) {
  const letrasProj = LETRAS[proj];
  const g = mk();
  const ex = [];
  cabecalho(g, "transição");
  const etapa = t < 40 ? 0 : t < 75 ? 1 : t < 100 ? 2 : t < 145 ? 3 : 4;
  const nn = NOS.length;
  if (t < 40) {
    const n = Math.min(letrasProj.length, Math.floor(t * 1.2));
    letrasProj.forEach((L, i) => {
      if (i < n) put(g, 2, L.x, L.y, L.ch);
    });
  }
  // arestas, e o sinal que percorre a rede
  const q = ease((t - 75) / 25);
  const sub = t >= 100 && t < 145 ? ((t - 100) / 45) * 4 : t >= 145 ? 5 : 0;
  const fade = t >= 150 ? 1 - (t - 150) / 35 : 1;
  if (t >= 75 && fade > 0)
    ARESTAS.forEach((e) => {
      const x1 = px(e.a.x);
      const y1 = py(e.a.y);
      const x2 = px(e.b.x);
      const y2 = py(e.b.y);
      const u = cl(sub - e.l, 0, 1);
      const prog = q * fade;
      ex.push({
        t: "s",
        l: u >= 1 ? 1 : 0,
        x1,
        y1,
        x2: x1 + (x2 - x1) * prog,
        y2: y1 + (y2 - y1) * prog,
      });
      if (u > 0 && u < 1)
        ex.push({
          t: "f",
          l: 2,
          x: x1 + (x2 - x1) * u,
          y: y1 + (y2 - y1) * u,
          r: 3,
        });
    });
  // letras em voo (posição livre) e nós que crescem ao chegar
  const ls = [];
  letrasProj.forEach((L, i) => {
    if (t < 40) return;
    if (i >= nn) {
      const o = 1 - cl((t - 40) / 15, 0, 1);
      if (o > 0)
        ls.push({
          ch: L.ch,
          x: MARGEM.x + L.x * CW,
          y: MARGEM.y + L.y * 16,
          o: o.toFixed(2),
        });
      return;
    }
    const N = NOS[i];
    const p = cl(((t - 40) / 35) * 1.4 - (i / nn) * 0.4, 0, 1);
    const e = ease(p);
    if (p < 1) {
      const x = L.x + (N.x - L.x) * e;
      const y = Math.max(2, L.y + (N.y - L.y) * e - Math.sin(Math.PI * e) * 3);
      ls.push({ ch: L.ch, x: MARGEM.x + x * CW, y: MARGEM.y + y * 16, o: 1 });
    }
  });
  NOS.forEach((N, i) => {
    const tArr = 40 + (35 * (1 + (0.4 * i) / nn)) / 1.4;
    const pop = ease((t - tArr) / 6);
    if (pop <= 0 || fade <= 0) return;
    const lit = t >= 100 && sub >= N.l;
    ex.push({
      t: "f",
      l: lit ? 2 : 1,
      x: px(N.x),
      y: py(N.y),
      r: (lit ? 5.8 : 4.8) * pop * fade,
    });
  });
  put(g, 3, 3, 22, "etapa:");
  let cx = 10;
  ETAPAS.forEach((s, i) => {
    if (i > 0) {
      put(g, 3, cx, 22, "•");
      cx += 2;
    }
    put(g, i === etapa ? 6 : 3, cx, 22, s);
    cx += s.length + (i < ETAPAS.length - 1 ? 1 : 0);
  });
  return { camadas: split(g, ex), ls };
}

// ---------- 3. detalhe do projeto ----------
// A rede do detalhe é a mesma para os quatro projetos por enquanto (placeholders).
const COLS3 = [
  { x: 3, t: "linguagem", n: ["[linguagem 1]", "[linguagem 2]"], r: [9, 13] },
  {
    x: 20,
    t: "ferramentas",
    n: ["[ferramenta 1]", "[ferramenta 2]", "[ferramenta 3]"],
    r: [8, 11, 14],
  },
  {
    x: 37,
    t: "conceitos",
    n: ["[conceito 1]", "[conceito 2]", "[conceito 3]"],
    r: [8, 11, 14],
  },
  { x: 53, t: "resultados", n: ["[métrica 1]", "[métrica 2]"], r: [9, 13] },
];
const NOS3 = [];
COLS3.forEach((c, ci) =>
  c.n.forEach((nome, i) =>
    NOS3.push({
      c: ci,
      i,
      id: ci + "-" + i,
      nome,
      x: c.x,
      y: c.r[i],
      fim: c.x + 2 + nome.length,
    }),
  ),
);
const por = (ci, i) => NOS3.find((n) => n.c === ci && n.i === i);
const ARE3 = [
  [0, 0, 1, 0],
  [0, 0, 1, 1],
  [0, 1, 1, 1],
  [0, 1, 1, 2],
  [1, 0, 2, 0],
  [1, 1, 2, 0],
  [1, 1, 2, 1],
  [1, 2, 2, 1],
  [1, 2, 2, 2],
  [2, 0, 3, 0],
  [2, 1, 3, 0],
  [2, 1, 3, 1],
  [2, 2, 3, 1],
].map((a) => ({ a: por(a[0], a[1]), b: por(a[2], a[3]) }));
/** Todos os nós ligados ao nó `no`, nos dois sentidos da rede. */
function alcance(no) {
  const set = new Set([no.id]);
  let mudou = true;
  while (mudou) {
    mudou = false;
    ARE3.forEach((e) => {
      if (e.a.c < no.c && set.has(e.b.id) && !set.has(e.a.id)) {
        set.add(e.a.id);
        mudou = true;
      }
      if (e.b.c > no.c && set.has(e.a.id) && !set.has(e.b.id)) {
        set.add(e.b.id);
        mudou = true;
      }
    });
  }
  return set;
}
function telaDetalhe(f, proj, alvo, zonas, mapa, aoVoltar) {
  const p = PROJETOS[proj];
  const g = mk();
  const ex = [];
  cabecalho(g, "detalhe do projeto", p.nome);
  zonas.push({
    tipo: "b",
    x: 2,
    y: 0,
    w: 8,
    label: "Voltar para os projetos",
    pick: aoVoltar,
  });
  put(g, 2, 3, 3, p.descricao);
  [
    [3, "(repositório)", p.repo],
    [18, "(demo)", p.demo],
  ].forEach(([x, rotulo, url]) => {
    put(g, 1, x, 4, rotulo);
    if (url)
      zonas.push({
        tipo: "a",
        x,
        y: 4,
        w: rotulo.length,
        href: url,
        alvo: "_blank",
        label: `${rotulo} de ${p.nome}`,
      });
  });
  COLS3.forEach((c) => put(g, 3, c.x, 6, c.t));
  const hov = NOS3[alvo ?? Math.floor(f / 40) % NOS3.length];
  const luz = alcance(hov);
  ARE3.forEach((e) => {
    const on = luz.has(e.a.id) && luz.has(e.b.id);
    ex.push({
      t: "s",
      l: on ? 1 : 0,
      x1: (e.a.fim + 0.4) * CW,
      y1: py(e.a.y),
      x2: px(e.b.x) - 5,
      y2: py(e.b.y),
    });
  });
  NOS3.forEach((n, i) => {
    const on = luz.has(n.id);
    const atual = n.id === hov.id;
    ex.push({
      t: "f",
      l: on ? 1 : 3,
      x: px(n.x),
      y: py(n.y),
      r: atual ? 5.6 : 4.6,
    });
    put(g, on ? 2 : 3, n.x + 2, n.y, n.nome);
    mapa[zonas.length] = i;
    zonas.push({
      tipo: "b",
      x: n.x,
      y: n.y,
      w: 2 + n.nome.length,
      label: n.nome,
      pick: () => {},
    });
  });
  put(g, 2, 3, 17, hov.nome);
  put(g, 0, 3, 18, "╚═");
  put(g, 3, 6, 18, "[explicação em uma linha]");
  // só a metade de cima do robô aparece, espiando do canto
  pintar(
    g,
    pixFrente(f % 160 < 110 ? "curioso" : "feliz", f, -1, null, null).slice(
      0,
      14,
    ),
    63,
    11,
  );
  legenda(g, 3, 22, ["v"]);
  put(g, 3, 24, 22, "mouse num nó destaca o caminho");
  return split(g, ex);
}

class IA extends Cena {
  constructor() {
    super();
    this.mapa = [];
    /** Chamadas ligadas por `montar` (o fim do arquivo): letras em voo e foco do teclado. */
    this.aoVoo = null;
    this.focar = null;
  }
  montar() {
    this.t0 = Date.now();
    this.setState({
      tela: "principal",
      proj: 0,
      alvo: null,
      alvoF: 0,
      f: 0,
      t: 0,
    });
    // com movimento reduzido não há relógio: a tela principal parada no meio de um ciclo
    if (movimentoReduzido()) this.setState({ f: 60 });
  }
  tick() {
    const agora = Date.now();
    const u = { f: (agora - this.t0) / PASSO_PIXEL };
    if (this.state.tela === "transicao") {
      const t = (agora - this.ti) / PASSO_TRANSICAO;
      if (t >= DURACAO_TRANSICAO) this.ir("detalhe");
      else u.t = t;
    }
    this.setState(u);
  }
  /** Muda de tela, limpa o destaque e devolve o foco à tela (o botão clicado some). */
  ir(tela, proj = this.state.proj) {
    this.ti = Date.now();
    this.setState({ tela, proj, alvo: null, alvoF: this.state.f, t: 0 });
    this.focar?.();
  }
  abrir(i) {
    // sem movimento não há transição: vai direto ao detalhe
    this.ir(movimentoReduzido() ? "detalhe" : "transicao", i);
  }
  voltar() {
    this.ir("principal");
  }
  /** Pula a transição. */
  pular() {
    if (this.state.tela === "transicao") this.ir("detalhe");
  }
  /** O ponteiro ou o foco entrou (índice da zona) ou saiu (null) de uma zona. */
  apontar(zona) {
    const alvo = zona == null ? null : (this.mapa[zona] ?? null);
    if (alvo !== this.state.alvo) this.setState({ alvo, alvoF: this.state.f });
  }
  teclar(e) {
    const k = String((e && e.key) || "").toLowerCase();
    const { tela } = this.state;
    if (e.shiftKey || k === "tab" || k === "shift") return;
    if (k === "v" || k === "escape") {
      if (tela === "principal") location.hash = "#inicio";
      else this.voltar();
      return;
    }
    if (tela === "transicao") this.pular();
    else if (tela === "principal" && /^[1-4]$/.test(k))
      this.abrir(Number(k) - 1);
  }
  quadro() {
    const { tela, proj, alvo, alvoF, t } = this.state;
    const f = this.state.f || 0;
    const zonas = [];
    this.mapa = [];
    let camadas;
    if (tela === "principal") {
      zonas.push({
        tipo: "a",
        x: 2,
        y: 0,
        w: 8,
        href: "#inicio",
        alvo: "_self",
        label: "Voltar para o início",
      });
      camadas = telaPrincipal(f, alvo, alvoF, zonas, this.mapa, (i) =>
        this.abrir(i),
      );
    } else if (tela === "transicao") {
      const r = telaTransicao(t, proj);
      camadas = r.camadas;
      this.aoVoo?.(r.ls);
    } else {
      camadas = telaDetalhe(f, proj, alvo, zonas, this.mapa, () =>
        this.voltar(),
      );
    }
    if (tela !== "transicao") this.aoVoo?.([]);
    return { camadas, zonas };
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
  intervalo: 33,
  nitido: true,
  aria: "Página de IA. Teclas 1 a 4 abrem um projeto, v volta",
  descricao:
    "O robô-pato fica no centro com quatro projetos do GitHub ao redor. Ao escolher um, o texto do projeto vira os nós de uma rede neural, e o detalhe mostra a rede em quatro colunas: linguagem, ferramentas, conceitos e resultados",
};

/**
 * Letras em voo: ficam fora da grade (movem-se em pixels, em curva), então vivem em
 * elementos próprios por cima da imagem, reaproveitados quadro a quadro.
 * @param {HTMLElement} imagem
 */
function criarVoo(imagem) {
  /** @type {HTMLElement[]} */
  const pool = [];
  return (ls) => {
    while (pool.length < ls.length) {
      const s = el("span", {
        class: "pf-ia-voo",
        attrs: { "aria-hidden": "true" },
      });
      imagem.append(s);
      pool.push(s);
    }
    pool.forEach((s, i) => {
      const L = ls[i];
      s.hidden = !L;
      if (!L) return;
      if (s.textContent !== L.ch) s.textContent = L.ch;
      s.style.transform = `translate(${L.x.toFixed(1)}px, ${L.y.toFixed(1)}px)`;
      s.style.opacity = String(L.o);
    });
  };
}

/** @param {HTMLElement} raiz */
export function montar(raiz) {
  const cena = new IA();
  const tela = montarTela(raiz, CONFIG, cena);
  const pf = /** @type {HTMLElement} */ (raiz.querySelector(".pf-tela"));
  const zonas = /** @type {HTMLElement} */ (raiz.querySelector(".pf-t-zonas"));
  cena.aoVoo = criarVoo(
    /** @type {HTMLElement} */ (raiz.querySelector(".pf-t-imagem")),
  );
  cena.focar = () => pf.focus({ preventScroll: true });
  /** @param {Event} e */
  const zonaDe = (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest?.("button[data-z]");
    return b ? Number(b.getAttribute("data-z")) : null;
  };
  for (const tipo of ["pointerover", "focusin"])
    zonas.addEventListener(tipo, (e) => {
      const i = zonaDe(e);
      if (i !== null) cena.apontar(i);
    });
  for (const tipo of ["pointerout", "focusout"])
    zonas.addEventListener(tipo, (e) => {
      if (zonaDe(e) !== null) cena.apontar(null);
    });
  pf.addEventListener("pointerdown", () => cena.pular());
  return tela;
}
