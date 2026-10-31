// Testes: um general pato em terra firme vigia a lista de ferramentas e técnicas de teste, nota os bugs que aparecem, marcha até eles e carimba corrigido. Portado da tela desenhada no quadro de design.

// @ts-nocheck: a cena foi portada como está do quadro; a tipagem fica para uma passada própria.

import { Cena, montarTela, movimentoReduzido } from "../terminal/tela.js";
import { CW, cl, criarGrade, ease, hash } from "../terminal/grade.js";

const { NL, mk, put, box, split, legenda, pintar } = criarGrade({
  linhas: 30,
  camadas: 13,
});

// camadas: 0 moldura, 1 verde-menta, 2 texto, 3 secundário, 4 âmbar, 5 escuro, 6 menta em negrito, 7 ciano do robô, 8 vermelho
const GEN = [
  ".........MMMMMMMM.......",
  "........MMMMMMMMMM......",
  "........MMMMMMMMMM......",
  "........AAAAAAAAAA......",
  "......MMMMMMMMMMMM......",
  "........WWWWWWWWW.......",
  "........WWKWWWWWW.......",
  "......AAWWWWWWWWW.......",
  "....AAAAAWWWWWWW........",
  "......AAWWWWWWWW........",
  ".........WWWWWWW........",
  "........MMMMMMMMM.......",
  ".......AMMMMMMMMMA......",
  "......WWWWWWWWWWWWW.....",
  "......WWWRWAWWWWWWW.....",
  "......WWWWWWWWWWWWW.....",
  "......MMMMMMAMMMMMM.....",
  "......WWWWWWWWWWWWW.....",
  "......WWWWWWWWWWGGG.....",
  ".......WWWWWWWWWGGG.....",
  ".......WWWWWWWWWGG......",
  "........WWWWWWWWG.......",
  ".........WWWWWWG........",
  "..........AA.AA.........",
  "..........AA.AA.........",
  "........AAAA.AAAA.......",
];
GEN.forEach((r, j) => {
  if (r.length !== 24)
    throw new Error("linha " + j + " do general tem " + r.length);
});
const GENCOR = { W: 2, G: 3, A: 4, K: 5, M: 1, R: 8 };
// face 0 olha para a esquerda (para a lista), face 1 para a direita
function pixGeneral(f, face, anda, dy) {
  const rows = GEN.map((r) => Array.from(r));
  if (anda && Math.floor(f / 3) % 2) {
    rows[23] = Array.from("..........AA..AA........");
    rows[24] = rows[23].slice();
    rows[25] = Array.from("........AAAA..AAAA......");
  }
  if (f % 53 < 3) rows[6][10] = "W";
  const pix = Array.from({ length: 28 }, () => Array(24).fill(-1));
  rows.forEach((r, j) =>
    r.forEach((ch, i) => {
      if (ch === ".") return;
      const y = j + dy;
      if (y < 28) pix[y][face ? 23 - i : i] = GENCOR[ch];
    }),
  );
  return pix;
}
// bug pixelado (6 x 4) e selo de "corrigido", em posição livre
const BUG = [
  ["..RR..", ".RRRR.", "RRRRRR", "R.RR.R"],
  ["..RR..", ".RRRR.", "RRRRRR", ".R..R."],
];
function rectsBug(ex, px, py, f, esc) {
  const q = BUG[Math.floor(f / 3) % 2],
    w = CW * esc,
    h = 8 * esc;
  q.forEach((r, j) => {
    for (let i = 0; i < 6; i++)
      if (r[i] === "R")
        ex.push({
          t: "r",
          l: 8,
          x: px + (i - 3) * w,
          y: py + (j - 2) * h,
          w: w,
          h: h,
        });
  });
}
function rectsFrasco(ex, px, yb) {
  const w = 8 * CW,
    x0 = px - w / 2;
  ex.push({ t: "r", l: 7, x: x0, y: yb - 64, w: CW, h: 64 });
  ex.push({ t: "r", l: 7, x: x0 + w - CW, y: yb - 64, w: CW, h: 64 });
  ex.push({ t: "r", l: 7, x: x0, y: yb - 8, w: w, h: 8 });
  ex.push({ t: "r", l: 3, x: x0 - CW * 0.5, y: yb - 76, w: w + CW, h: 12 });
}
// bugs alternam: os de número par aparecem à frente e o general pega sozinho;
// os de número ímpar aparecem atrás dele e só são capturados com o clique do usuário.
const POST = 58,
  SPAWN0 = 60,
  PERIODO = 95,
  XBA = [48, 52, 47],
  XBF = [84, 83];
function captura(k, ms) {
  const auto = k % 2 === 0;
  const xb = auto ? XBA[(k >> 1) % XBA.length] : XBF[(k >> 1) % XBF.length];
  const alvo = auto ? xb + 4 : xb - 21;
  const M = Math.max(3, Math.abs(alvo - POST));
  return {
    auto: auto,
    xb: xb,
    alvo: alvo,
    M: M,
    ms: ms,
    jarra: ms + M,
    t3: ms + M + 14,
    t4: ms + M + 20,
    fim: ms + M + 20 + M,
  };
}
// quando a captura do bug k começa e quanto tempo o general demora para reagir
function comecoDe(k, caps) {
  const cp = caps.find((c) => c.k === k),
    spawn = SPAWN0 + k * PERIODO;
  if (k % 2 === 0)
    return {
      ts: spawn,
      ms: cp ? Math.min(10, Math.max(2, cp.t - spawn + 1)) : 10,
    };
  return cp ? { ts: cp.t, ms: 6 } : null;
}
function olhandoTras(f) {
  const c = f % 100;
  return ease((c - 70) / 2) * (1 - ease((c - 83) / 2));
}

// ---------- ferramentas e técnicas: u = usei, c = conheço ----------
// Textos por idioma. Os ids dos grupos (`ferramentas`, `técnicas`) são internos. A tecla de
// cada grupo é a primeira letra do rótulo (vai em negrito): em inglês, "tools" e "techniques"
// brigariam pelo mesmo `t`, então o segundo grupo é "methods" e a tecla é `m`.
export const TEXTOS = {
  pt: {
    zonaVoltar: "Voltar para o início",
    voltar: "oltar",
    titulo: "(testes)",
    legenda: "navegação:",
    grupos: [
      { id: "ferramentas", rotulo: "ferramentas", tecla: "f" },
      { id: "técnicas", rotulo: "técnicas", tecla: "t" },
    ],
    filtros: ["todos", "usei", "conheço"],
    dados: {
      ferramentas: [
        {
          g: "automação de UI",
          c: 0,
          it: [
            ["[ferramenta 1]", "u"],
            ["[ferramenta 2]", "u"],
            ["[ferramenta 3]", "c"],
          ],
        },
        {
          g: "api e contrato",
          c: 0,
          it: [
            ["[ferramenta 4]", "u"],
            ["[ferramenta 5]", "c"],
          ],
        },
        { g: "carga e desempenho", c: 1, it: [["[ferramenta 6]", "c"]] },
        {
          g: "integração contínua",
          c: 1,
          it: [
            ["[ferramenta 7]", "u"],
            ["[ferramenta 8]", "u"],
          ],
        },
      ],
      técnicas: [
        {
          g: "níveis de teste",
          c: 0,
          it: [
            ["[técnica 1]", "u"],
            ["[técnica 2]", "u"],
            ["[técnica 3]", "u"],
            ["[técnica 4]", "c"],
          ],
        },
        {
          g: "projeto de casos",
          c: 1,
          it: [
            ["[técnica 5]", "u"],
            ["[técnica 6]", "c"],
            ["[técnica 7]", "c"],
          ],
        },
        {
          g: "abordagens",
          c: 0,
          it: [
            ["[técnica 8]", "u"],
            ["[técnica 9]", "c"],
          ],
        },
      ],
    },
    // piadinhas: aparecem durante o carregamento, em ordem, e o pato comenta quando está ocioso
    carga: [
      "chamada geral...",
      "o general não dorme",
      "em formação, soldados!",
      "conferindo se o bug é feature...",
      "esperando o CI: 3 min, jura",
      "culpando o fuso horário...",
      "cobertura de 100%? o general desconfia",
      "sem novidades no front",
    ],
    ocioso: [
      "descansar, soldados.",
      "sem bugs no meu turno",
      "quá! (é continência)",
      "nenhum bug passa por mim",
      "inspeção de rotina...",
      "estou de olho em tudo",
    ],
    falas: {
      auto: "opa! um bug!",
      atras: "ei! quem foi?",
      vai: "deixa comigo!",
      vaiAtras: "te peguei!",
      capturando: "capturando...",
      capturado: "capturado!",
      frasco: "mais um pro frasco",
      volta: "de volta ao posto",
      ouvi: "hmm? ouvi algo...",
      usei: "condecorado!",
      conheco: "na reserva.",
      inspecionando: "inspecionando...",
    },
    ondeUsei: "onde usei",
    emConstrucao: "em construção",
    ondeEstudei: "onde estudei",
    cursoOuLeitura: "[curso ou leitura]",
    naoPrecisei: "ainda não precisei em projeto",
    seloUsei: ["USEI", 70],
    seloConheco: ["CONHEÇO", 68],
    bugs: "bugs capturados:",
    rodar: "odar tudo",
    tenta: "tenta clicar nos bugs",
    legendaUsei: "usei",
    legendaConheco: "conheço",
    zonaGrupo: (/** @type {string} */ rotulo, /** @type {string} */ tecla) =>
      "Grupo " + rotulo + " (tecla " + tecla + ")",
    zonaFiltro: (/** @type {string} */ nome, /** @type {number} */ n) =>
      "Mostrar: " + nome + " (tecla " + n + ")",
    zonaDetalhe: (/** @type {string} */ nome) => "Ver o detalhe de " + nome,
    zonaRodar: "Rodar a verificação de novo (tecla r)",
    zonaBug: "Chamar o general para capturar o bug",
    aria: "Página de testes. Teclas f e t trocam de grupo, 1 a 3 filtram, r roda a verificação, v volta",
    descricao:
      "Lista de ferramentas e técnicas de teste marcadas como usei ou conheço, e um general pato em terra firme que vigia a lista, nota os bugs que aparecem, marcha até eles e carimba corrigido",
  },
  en: {
    zonaVoltar: "Back to home",
    voltar: " back",
    titulo: "(testing)",
    legenda: "keys:",
    grupos: [
      { id: "ferramentas", rotulo: "tools", tecla: "t" },
      { id: "técnicas", rotulo: "methods", tecla: "m" },
    ],
    filtros: ["all", "used", "know"],
    dados: {
      ferramentas: [
        {
          g: "UI automation",
          c: 0,
          it: [
            ["[tool 1]", "u"],
            ["[tool 2]", "u"],
            ["[tool 3]", "c"],
          ],
        },
        {
          g: "api and contract",
          c: 0,
          it: [
            ["[tool 4]", "u"],
            ["[tool 5]", "c"],
          ],
        },
        { g: "load and performance", c: 1, it: [["[tool 6]", "c"]] },
        {
          g: "continuous integration",
          c: 1,
          it: [
            ["[tool 7]", "u"],
            ["[tool 8]", "u"],
          ],
        },
      ],
      técnicas: [
        {
          g: "test levels",
          c: 0,
          it: [
            ["[method 1]", "u"],
            ["[method 2]", "u"],
            ["[method 3]", "u"],
            ["[method 4]", "c"],
          ],
        },
        {
          g: "test case design",
          c: 1,
          it: [
            ["[method 5]", "u"],
            ["[method 6]", "c"],
            ["[method 7]", "c"],
          ],
        },
        {
          g: "approaches",
          c: 0,
          it: [
            ["[method 8]", "u"],
            ["[method 9]", "c"],
          ],
        },
      ],
    },
    carga: [
      "roll call...",
      "the general never sleeps",
      "fall in, soldiers!",
      "checking if the bug is a feature...",
      "waiting for CI: 3 min, promise",
      "blaming the time zone...",
      "100% coverage? the general doubts it",
      "all quiet on the front end",
    ],
    ocioso: [
      "at ease, soldiers.",
      "no bugs on my watch",
      "quack! (that's a salute)",
      "no bug gets past me",
      "routine inspection...",
      "keeping an eye on everything",
    ],
    falas: {
      auto: "oops! a bug!",
      atras: "hey! who's there?",
      vai: "leave it to me!",
      vaiAtras: "got you!",
      capturando: "capturing...",
      capturado: "captured!",
      frasco: "one more for the jar",
      volta: "back to my post",
      ouvi: "hmm? heard something...",
      usei: "decorated!",
      conheco: "in the reserve.",
      inspecionando: "inspecting...",
    },
    ondeUsei: "where i used it",
    emConstrucao: "under construction",
    ondeEstudei: "where i studied",
    cursoOuLeitura: "[course or reading]",
    naoPrecisei: "haven't needed it in a project yet",
    seloUsei: ["USED", 70],
    seloConheco: ["KNOW", 70],
    bugs: "bugs captured:",
    rodar: "un all",
    tenta: "try clicking the bugs",
    legendaUsei: "used",
    legendaConheco: "know",
    zonaGrupo: (/** @type {string} */ rotulo, /** @type {string} */ tecla) =>
      "Group " + rotulo + " (key " + tecla + ")",
    zonaFiltro: (/** @type {string} */ nome, /** @type {number} */ n) =>
      "Show: " + nome + " (key " + n + ")",
    zonaDetalhe: (/** @type {string} */ nome) => "See details of " + nome,
    zonaRodar: "Run the check again (key r)",
    zonaBug: "Call the general to catch the bug",
    aria: "Testing page. Keys t and m switch group, 1 to 3 filter, r runs the check, v goes back",
    descricao:
      "List of testing tools and methods marked as used or know, and a general duck on solid ground who watches the list, spots the bugs that show up, marches to them and stamps them fixed",
  },
};
const LX = 3,
  SX0 = 46,
  GR = 20;

function linhas(T, tab, filtro) {
  const itens = [],
    titulos = [];
  let n = 0,
    y = 5;
  T.dados[tab].forEach((gr) => {
    const its = gr.it.filter(
      (i) =>
        filtro === 0 ||
        (filtro === 1 && i[1] === "u") ||
        (filtro === 2 && i[1] === "c"),
    );
    if (!its.length) return;
    titulos.push({ nome: gr.g, x: LX, y: y });
    y++;
    its.forEach((i, k) => {
      itens.push({
        nome: i[0],
        st: i[1],
        ult: k === its.length - 1,
        x: LX,
        y: y,
        idx: n++,
      });
      y++;
    });
    y++;
  });
  return { itens: itens, titulos: titulos, total: n };
}

// terra firme: grama com tufos e flores; o solo é um campo suave de caracteres (os do fundo da
// página inicial + o estilo do campo de transição), com letras e palavras de teste, que se
// dissolve para baixo em degradê de cor e de densidade
const SOLO_BASE = "......····::::,,,'";
const SOLO_PALAVRAS = [
  ["404", 52, 1],
  ["null", 72, 2],
  ["assert", 58, 3],
  ["TODO", 80, 3],
  ["pytest", 66, 4],
];
const SOLO_LINHAS = 4;
// do mais claro ao mais escuro: a grama escorre para o solo e se funde com o fundo
const ESCALA = [1, 9, 10, 11, 12];
function ruidoSolo(px, py) {
  const gx = px / 14,
    gy = py / 2.5,
    x0 = Math.floor(gx),
    y0 = Math.floor(gy);
  const fx = gx - x0,
    fy = gy - y0,
    sx = fx * fx * (3 - 2 * fx),
    sy = fy * fy * (3 - 2 * fy);
  const L = (a, b) => hash(a, b, 7);
  const a = L(x0, y0) + (L(x0 + 1, y0) - L(x0, y0)) * sx;
  const c = L(x0, y0 + 1) + (L(x0 + 1, y0 + 1) - L(x0, y0 + 1)) * sx;
  return a + (c - a) * sy;
}
function terra(g, f) {
  const deriva = f * 0.02;
  for (let x = 46; x <= 90; x++) {
    g[1][GR][x] = "▀";
    g[0][GR][x] = "▄";
    const r = hash(x, 1, 3);
    if (r > 0.82 && r < 0.93) put(g, 9, x, GR - 1, "▄");
    else if (r >= 0.93) put(g, 4, x, GR - 1, "*");
    for (let d = 1; d <= SOLO_LINHAS; d++) {
      const v = ruidoSolo(x + deriva, d);
      const prof = (d - 1) / SOLO_LINHAS;
      if (hash(x, d, 1) > 0.97 - prof * 0.18) continue;
      const pisca = hash(x, d, 11) < 0.1 ? Math.floor(f / 10) : 0;
      const q = hash(x, d, 5 + pisca);
      let ch;
      ch = SOLO_BASE[Math.floor(q * SOLO_BASE.length)];
      // brilho contínuo: ruído suave + queda com a profundidade
      const t = 0.45 * v + 0.55 * (1 - prof) - 0.1;
      const idx = cl(
        Math.floor((1 - t) * ESCALA.length * 0.95),
        0,
        ESCALA.length - 1,
      );
      put(g, ESCALA[idx], x, GR + d, ch);
    }
  }
  // palavras entram no mesmo tom do solo, só um pouco mais claras
  SOLO_PALAVRAS.forEach(([t, x, d]) => {
    const prof = (d - 1) / SOLO_LINHAS;
    const l =
      ESCALA[cl(Math.floor(prof * ESCALA.length * 0.8), 0, ESCALA.length - 1)];
    for (let i = -1; i <= t.length; i++) {
      if (x + i < 46 || x + i > 90) continue;
      for (let k = 0; k < NL; k++) g[k][GR + d][x + i] = " ";
    }
    for (let i = 0; i < t.length; i++)
      put(g, l === 1 ? 9 : l, x + i, GR + d, t[i]);
  });
}

class Testes extends Cena {
  /** @param {typeof TEXTOS.pt} T */
  constructor(T) {
    super();
    this.T = T;
  }
  montar() {
    if (movimentoReduzido()) {
      this.setState({ f: 400, t0: 0 });
      return;
    }
    this.ini = Date.now();
  }
  tick() {
    this.setState({ f: (Date.now() - this.ini) / 140 });
  }
  agora() {
    return (this.state && this.state.f) || 0;
  }
  grupo(k) {
    this.setState({ tab: k, t0: this.agora(), sel: -1 });
  }
  filtrar(i) {
    this.setState({ filtro: i, t0: this.agora(), sel: -1 });
  }
  rodar() {
    this.setState({ t0: this.agora(), sel: -1 });
  }
  selecionar(i) {
    const s = this.state || {};
    this.setState({ sel: s.sel === i ? -1 : i });
  }
  chamar(k) {
    const s = this.state || {};
    const c = (s.caps || []).slice();
    if (!c.some((x) => x.k === k)) c.push({ k: k, t: this.agora() });
    this.setState({ caps: c });
  }
  teclar(e) {
    const k = String((e && e.key) || "").toLowerCase();
    if (k === "v") {
      location.hash = "#inicio";
      return;
    }
    for (const gr of this.T.grupos) if (k === gr.tecla) this.grupo(gr.id);
    if (k === "r") this.rodar();
    if (k >= "1" && k <= "3") this.filtrar(Number(k) - 1);
  }
  quadro() {
    const T = this.T;
    const s = this.state || {};
    const f = s.f || 0;
    const tab = s.tab || "ferramentas",
      filtro = s.filtro || 0,
      t0 = s.t0 || 0,
      sel = s.sel == null ? -1 : s.sel;
    const caps = s.caps || [];
    const L = linhas(T, tab, filtro);
    const rel = f - t0,
      ritmo = 2,
      inicio = 5;
    const feitos = cl(Math.floor((rel - inicio) / ritmo), 0, L.total),
      rodando = rel < inicio + L.total * ritmo;
    const g = mk(),
      ex = [];
    const zonas = [];
    zonas.push({
      tipo: "a",
      x: 2,
      y: 0,
      w: 8,
      href: "#inicio",
      alvo: "_self",
      label: T.zonaVoltar,
    });
    put(g, 1, 2, 0, "‹");
    put(g, 6, 4, 0, "v");
    put(g, 1, 5, 0, T.voltar);
    put(g, 0, 12, 0, "│");
    put(g, 2, 14, 0, T.titulo);
    box(g, 0, 1, 1, 91, 29);

    // abas e filtros
    let cx = LX;
    T.grupos.forEach(({ id, rotulo: k, tecla }) => {
      const on = id === tab;
      put(g, 0, cx, 2, "[");
      put(g, 6, cx + 1, 2, k[0]);
      put(g, on ? 1 : 3, cx + 2, 2, k.slice(1));
      put(g, 0, cx + 1 + k.length, 2, "]");
      zonas.push({
        tipo: "b",
        x: cx,
        y: 2,
        w: k.length + 2,
        label: T.zonaGrupo(k, tecla),
        pick: () => this.grupo(id),
      });
      cx += k.length + 4;
    });
    cx = LX;
    T.filtros.forEach((nm, i) => {
      const on = i === filtro,
        len = nm.length + 4;
      put(g, 1, cx, 3, on ? "(" : " ");
      put(g, 6, cx + 1, 3, String(i + 1));
      put(g, on ? 2 : 3, cx + 2, 3, " " + nm);
      put(g, 1, cx + len - 1, 3, on ? ")" : " ");
      zonas.push({
        tipo: "b",
        x: cx,
        y: 3,
        w: len,
        label: T.zonaFiltro(nm, i + 1),
        pick: () => this.filtrar(i),
      });
      cx += len + 1;
    });

    // lista em árvore, em duas colunas, com uma linha em branco entre os tópicos
    let selItem = null;
    L.titulos.forEach((t) => put(g, 3, t.x, t.y, t.nome));
    L.itens.forEach((r) => {
      const y = r.y,
        x = r.x;
      put(g, 0, x, y, r.ult ? "╚═" : "╠═");
      const visto = r.idx < feitos,
        atual = r.idx === feitos && rodando && rel >= inicio;
      if (r.idx === sel) {
        put(g, 1, x + 2, y, "›");
        selItem = r;
      }
      if (!visto) put(g, 0, x + 4, y, atual ? "?" : "·");
      else if (r.st === "u") put(g, 1, x + 4, y, "•");
      else put(g, 4, x + 4, y, "s");
      put(g, r.idx === sel ? 2 : visto ? 2 : 3, x + 6, y, r.nome);
      zonas.push({
        tipo: "b",
        x: x,
        y: y,
        w: 20,
        label: T.zonaDetalhe(r.nome),
        pick: () => this.selecionar(r.idx),
      });
    });

    // carregamento com piadinhas, depois o resumo
    if (rodando) {
      const kk = Math.round((24 * feitos) / Math.max(1, L.total));
      put(g, 0, LX, 21, "[" + "#".repeat(kk) + "-".repeat(24 - kk) + "]");
      const j =
        rel < inicio
          ? 0
          : 1 + (Math.floor((rel - inicio) / 3.2) % (T.carga.length - 1));
      put(g, 3, LX, 22, T.carga[j]);
    }
    if (selItem) {
      put(g, 2, LX, 24, selItem.nome);
      put(g, 0, LX, 25, "╠═");
      put(g, 0, LX, 26, "╚═");
      if (selItem.st === "u") {
        put(g, 3, LX + 3, 25, T.ondeUsei);
        put(g, 4, LX + 4 + T.ondeUsei.length, 25, T.emConstrucao);
      } else {
        put(g, 3, LX + 3, 25, T.ondeEstudei);
        put(g, 2, LX + 4 + T.ondeEstudei.length, 25, T.cursoOuLeitura);
        put(g, 3, LX + 3, 26, T.naoPrecisei);
      }
    }

    // palco do general pato, em terra
    const kNow = Math.floor((f - SPAWN0) / PERIODO);
    let ativa = null;
    for (let k = Math.max(0, kNow - 1); k <= kNow; k++) {
      const ini = comecoDe(k, caps);
      if (!ini || f < ini.ts) continue;
      const v = captura(k, ini.ms);
      if (f - ini.ts < v.fim) {
        ativa = { k: k, ts: ini.ts, v: v };
        break;
      }
    }
    const ocupado = !!ativa;
    let gx = POST,
      face = olhandoTras(f) > 0.5 ? 1 : 0,
      anda = false,
      fala = null;
    if (ativa) {
      const v = ativa.v,
        e = f - ativa.ts,
        rumo = v.auto ? 0 : 1;
      if (e < v.ms) {
        face = rumo;
        fala = v.auto ? T.falas.auto : T.falas.atras;
      } else if (e < v.jarra - 1) {
        gx = POST + ((v.alvo - POST) * (e - v.ms)) / v.M;
        face = v.alvo < POST ? 0 : 1;
        anda = true;
        fala = v.auto ? T.falas.vai : T.falas.vaiAtras;
      } else if (e < v.t3) {
        gx = v.alvo;
        face = rumo;
        fala = e < v.jarra + 4 ? T.falas.capturando : T.falas.capturado;
      } else if (e < v.t4) {
        gx = v.alvo;
        face = rumo;
        fala = T.falas.frasco;
      } else {
        gx = v.alvo + ((POST - v.alvo) * (e - v.t4)) / v.M;
        face = v.alvo < POST ? 1 : 0;
        anda = true;
        fala = T.falas.volta;
      }
    }
    const ol = Math.max(olhandoTras(f), face === 1 ? 1 : 0);
    const dy = anda
      ? Math.floor(f / 3) % 2
        ? 1
        : 0
      : Math.floor(f / 9) % 2
        ? 1
        : 0;
    terra(g, f);
    pintar(g, pixGeneral(f, face, anda, 2 - dy), Math.round(gx), GR - 14);

    let nCap = 0;
    for (let q = 0; q <= kNow; q++) {
      const ini = comecoDe(q, caps);
      if (ini && f >= ini.ts + captura(q, ini.ms).jarra + 4) nCap++;
    }
    put(g, 3, SX0, 2, T.bugs);
    put(g, 1, SX0 + T.bugs.length + 1, 2, String(nCap));
    // o botão fica encostado na direita: o ")" é sempre a coluna 89
    const rx = 87 - T.rodar.length;
    put(g, 1, rx, 2, "(");
    put(g, 6, rx + 1, 2, "r");
    put(g, 2, rx + 2, 2, T.rodar);
    put(g, 1, 89, 2, ")");
    zonas.push({
      tipo: "b",
      x: rx,
      y: 2,
      w: T.rodar.length + 3,
      label: T.zonaRodar,
      pick: () => this.rodar(),
    });
    if (Math.floor(f / 40) % 5 !== 4) put(g, 4, 69, 26, T.tenta);

    // vistoria: um marcador percorre a lista enquanto o general vigia a lista
    if (!ocupado && !rodando && !selItem && face === 0 && L.total > 0) {
      const v = L.itens[Math.floor(f / 5) % L.total];
      if (v) put(g, 4, v.x + 2, v.y, "›");
    }
    if (fala == null) {
      if (face === 1) fala = T.falas.ouvi;
      else if (selItem)
        fala = selItem.st === "u" ? T.falas.usei : T.falas.conheco;
      else if (rodando) fala = T.falas.inspecionando;
      else fala = T.ocioso[Math.floor(f / 60) % T.ocioso.length];
    }
    put(
      g,
      3,
      cl(Math.round(gx + 12 - fala.length / 2), 48, 89 - fala.length),
      GR - 15,
      fala,
    );
    if (selItem) {
      const us = selItem.st === "u";
      const [selo, sx] = us ? T.seloUsei : T.seloConheco;
      box(g, us ? 1 : 4, 67, 2, 9, 3);
      put(g, us ? 1 : 4, sx, 3, selo);
    }

    // bugs: os da frente o general vê; os de trás somem quando ele olha
    for (let k = Math.max(0, kNow); k <= kNow; k++) {
      const spawn = SPAWN0 + k * PERIODO;
      if (f < spawn) continue;
      const ini = comecoDe(k, caps),
        v = captura(k, ini ? ini.ms : k % 2 === 0 ? 10 : 6);
      const ehAlvo = ativa && ativa.k === k;
      if (ini && !ehAlvo && f >= ini.ts + v.jarra + 4) continue;
      const pop = ease((f - spawn) / 4);
      const bx = (v.xb + 3) * CW + Math.sin(f / 6 + k) * CW * 0.6,
        by = GR * 16 - 16;
      if (ehAlvo) {
        const e = f - ativa.ts;
        if (e < v.jarra + 4) rectsBug(ex, bx, by, f, 1);
        if (e >= v.jarra - 1 && e < v.t4) {
          const u = e - (v.jarra - 1);
          rectsFrasco(ex, bx, GR * 16 - (u < 4 ? 170 * (1 - ease(u / 4)) : 0));
          if (u >= 3) rectsBug(ex, bx, GR * 16 - 26, f, 0.8);
        }
        if (v.auto && e < v.ms && !caps.some((c) => c.k === k))
          zonas.push({
            tipo: "b",
            x: bx / CW - 3,
            y: GR - 2,
            w: 6,
            h: 32,
            label: T.zonaBug,
            pick: () => this.chamar(k),
          });
      } else {
        const esc = pop * (v.auto ? 1 : 1 - ol);
        if (esc > 0.05) rectsBug(ex, bx, by, f, esc);
        if (esc > 0.7 && !ocupado)
          zonas.push({
            tipo: "b",
            x: bx / CW - 3,
            y: GR - 2,
            w: 6,
            h: 32,
            label: T.zonaBug,
            pick: () => this.chamar(k),
          });
      }
    }

    put(g, 0, 1, 29 - 2, "├" + "─".repeat(89) + "┤");
    legenda(
      g,
      LX,
      28,
      [...T.grupos.map((gr) => gr.tecla), "1", "2", "3", "r", "v"],
      null,
      T.legenda,
    );
    put(g, 1, SX0, 28, "•");
    put(g, 3, SX0 + 2, 28, T.legendaUsei);
    put(g, 4, SX0 + 8, 28, "s");
    put(g, 3, SX0 + 10, 28, T.legendaConheco);

    return { camadas: split(g, ex), zonas };
  }
}

const CONFIG = {
  tema: "pf-tema-testes",
  altura: 520,
  camadas: 13,
  ordemSvg: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  negrito: [6],
  brilho: [],
  linhas: false,
  intervalo: 33,
  nitido: true,
};

/**
 * @param {HTMLElement} raiz
 * @param {import("../i18n/idioma.js").Idioma} [idioma]
 */
export function montar(raiz, idioma = "pt") {
  const T = Object.hasOwn(TEXTOS, idioma) ? TEXTOS[idioma] : TEXTOS.pt;
  return montarTela(
    raiz,
    { ...CONFIG, aria: T.aria, descricao: T.descricao },
    new Testes(T),
  );
}
