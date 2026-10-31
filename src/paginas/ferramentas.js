// Ferramentas: um BBS de fósforo verde com o pipeline em quatro etapas (código, integração,
// contêineres e entrega), o pato astronauta que desliza entre elas trocando de roupa e um
// terminal que mostra o que cada etapa faz. Portado da tela desenhada no quadro de design.
// @ts-nocheck: a cena foi portada como está do quadro; a tipagem fica para uma passada própria.

import { Cena, montarTela, movimentoReduzido } from "../terminal/tela.js";
import { CW, cl, criarGrade, ease, hash, quebrar } from "../terminal/grade.js";

const DARK = 10;
const { mk, put, box, split, legenda, pintar } = criarGrade({
  linhas: 28,
  camadas: 11,
});
function chip(g, ex, cx, y, txt, l) {
  ex.push({
    t: "q",
    l: l,
    x: cx * CW - 2,
    y: y * 16 + 1,
    w: txt.length * CW + 4,
    h: 14,
    r: 4,
  });
  put(g, DARK, cx, y, txt);
}
function barra(ex, cx, y, wc, p, l) {
  const x = cx * CW,
    w = wc * CW,
    yy = y * 16 + 6;
  ex.push({ t: "q", l: 9, x: x, y: yy, w: w, h: 4, r: 2 });
  if (p > 0)
    ex.push({
      t: "q",
      l: l,
      x: x,
      y: yy,
      w: Math.max(4, w * cl(p, 0, 1)),
      h: 4,
      r: 2,
    });
}
function cursor(ex, cx, y) {
  ex.push({
    t: "q",
    l: 4,
    x: cx * CW,
    y: y * 16 + 1,
    w: CW - 0.6,
    h: 14,
    r: 0.6,
  });
}
// camadas: 0 moldura verde-escura, 1 verde de fósforo, 2 texto claro, 3 texto secundário, 4 âmbar, 5 verde bem escuro (fundo do cartão),
// 6 verde em negrito, 7 verde claro (passou), 8 azul-ciano, 9 trilho apagado, 10 escuro (texto sobre etiqueta)
const PATO = [
  "........MMMM......",
  ".......MMMMMM.....",
  ".......WWKWWAAA...",
  ".......WWWWWAAAA..",
  ".......WWWWWAA....",
  "......WWWWWW......",
  "....WWWWWWWWWW....",
  "...WWWWWWWWWWWW...",
  "...WWWLLLLWWWWW...",
  "....WWLLLLLWWWW...",
  "....WWWWWWWWWW....",
  ".....LWWWWWWL.....",
  ".......AA..AA.....",
  ".......AAA.AAA....",
];
PATO.forEach((r, j) => {
  if (r.length !== 18)
    throw new Error("linha " + j + " do pato tem " + r.length);
});
const PCOR = { W: 2, L: 3, A: 4, K: DARK, M: 1, C: 8, T: 8, V: 7 };
// pato astronauta, cumulativo: 1 boné de missão, 2 capacete de vidro (troca o boné), 3 tanque de oxigênio, 4 propulsor aceso
const CAPACETE = [
  [0, 8],
  [0, 9],
  [0, 10],
  [0, 11],
  [0, 12],
  [0, 13],
  [0, 14],
  [1, 7],
  [1, 15],
  [2, 6],
  [3, 6],
  [4, 6],
  [2, 16],
  [3, 16],
  [4, 16],
]
  .map((p) => [p[0], p[1], "C"])
  .concat(
    [
      [5, 7],
      [5, 8],
      [5, 9],
      [5, 10],
      [5, 11],
      [5, 12],
      [5, 13],
      [5, 14],
      [5, 15],
    ].map((p) => [p[0], p[1], "L"]),
  );
const TANQUE = [
  [7, 0, "L"],
  [7, 1, "V"],
  [7, 2, "L"],
  [8, 0, "L"],
  [8, 1, "V"],
  [8, 2, "L"],
  [9, 0, "L"],
  [9, 1, "V"],
  [9, 2, "L"],
  [9, 3, "L"],
  [10, 0, "L"],
  [10, 1, "V"],
  [10, 2, "L"],
  [10, 3, "L"],
  [6, 3, "C"],
  [5, 4, "C"],
  [5, 5, "C"],
  [5, 6, "C"],
];
const CHAMA = [
  [
    [11, 1, "A"],
    [11, 2, "A"],
    [12, 1, "A"],
    [13, 1, "V"],
  ],
  [
    [11, 1, "A"],
    [11, 2, "A"],
    [12, 1, "A"],
    [12, 2, "A"],
    [13, 2, "V"],
  ],
];
const OFF = 2,
  PW = 18;
// espelho = true olha para a esquerda; dy sobe o pato em linhas de pixel; nivel 0 a 3 escolhe o que ele veste
function pixPato(f, espelho, anda, dy, nivel) {
  const rows = PATO.map((r) => Array.from(r));
  if (anda && Math.floor(f / 2) % 2) {
    rows[12] = Array.from("......AA....AA....");
    rows[13] = Array.from("......AAA...AAA...");
  }
  if (f % 53 < 3) rows[2][9] = "W";
  const pix = Array.from({ length: 16 }, () => Array(PW).fill(-1));
  const pt = (j, i, ch) => {
    const y = j + OFF + dy;
    if (y >= 0 && y < 16) pix[y][espelho ? PW - 1 - i : i] = PCOR[ch];
  };
  rows.forEach((r, j) =>
    r.forEach((ch, i) => {
      if (ch !== "." && !(nivel >= 1 && ch === "M")) pt(j, i, ch);
    }),
  );
  if (nivel >= 1) CAPACETE.forEach((p) => pt(p[0], p[1], p[2]));
  if (nivel >= 2) TANQUE.forEach((p) => pt(p[0], p[1], p[2]));
  if (nivel >= 3)
    CHAMA[Math.floor(f / 2) % 2].forEach((p) => pt(p[0], p[1], p[2]));
  return pix;
}

const CX0 = 3,
  CWID = 19,
  CGAP = 3,
  CY = 11;
const cardX = (i) => CX0 + i * (CWID + CGAP);
const DUCKX = (i) => cardX(i);
// Comandos de cada etapa: iguais nos dois idiomas (o tempo de digitação depende deles).
const CMDS = [
  "git log --graph --oneline",
  "gh run watch",
  "docker build -t portfolio .",
  "gh workflow run deploy.yml",
];
// Textos por idioma. u = usei, c = conheço (no dado, as letras são as mesmas nos dois).
// As falas do pato quebram em 28 colunas e precisam caber em duas linhas.
export const TEXTOS = {
  pt: {
    zonaVoltar: "Voltar para o início",
    voltar: "oltar",
    titulo: "(ferramentas)",
    legenda: "navegação:",
    nomes: ["código", "integração", "contêineres", "entrega"],
    zonaEtapa: (/** @type {number} */ n, /** @type {string} */ nome) =>
      "Etapa " + n + ": " + nome + " (tecla " + n + ")",
    zonaPato: "Pato: clique para ouvir outra fala",
    zonaRecomecar: "Recomeçar o pipeline (tecla r)",
    zonaAprovar: "Aprovar o deploy (tecla a)",
    usei: " (usei)",
    conheco: " (conheço)",
    legendaUsei: "usei:",
    legendaConheco: "conheço:",
    painelFerramentas: " ferramentas ",
    painelTerminal: " terminal ",
    emConstrucao: "projetos: em construção",
    decolou: "o pato decolou.",
    recomecar: "(recomeçar)",
    recomecarLegenda: "recomeçar",
    aprovarLegenda: "aprovar",
    decolando: "missão cumprida. decolando.",
    bemVinda: "bem-vinda ao BBS do thinkmadu",
    commits: {
      release: "release 1.0",
      merge: "merge: feature/login",
      teste: "test: cobre o login",
      feat: "feat: login",
      base: "chore: base da develop",
    },
    steps: [
      "checkout",
      "setup node 20",
      "npm ci",
      "lint",
      "testes",
      "build",
      "deploy → vercel",
    ],
    concluido: "workflow concluído em 2:24",
    containerNoAr: "container no ar · porta 3000",
    ambientes: ["dev", "hml", "prod"],
    aguardando: "aguardando",
    aprovarDeploy: "(aprovar deploy)",
    gate: "gate manual antes de produção",
    aprovado: "aprovado por você",
    noAr: "em produção · rollback pronto",
    dados: [
      {
        itens: [
          ["git", "u"],
          ["github", "u"],
          ["gitflow", "u"],
          ["pull requests e code review", "u"],
          ["conventional commits", "u"],
          ["gitlab", "u"],
          ["git hooks (husky, pre-commit)", "c"],
          ["branch protection", "c"],
        ],
        intro: "branch nova, histórico limpo.",
        fim: "merge sem conflito. milagre.",
        extras: [
          "git push --force? só no meu galho.",
          "commit pequeno, vida longa.",
          "no gitflow, release sai da develop.",
        ],
      },
      {
        itens: [
          ["github actions", "u"],
          ["azure devops (repos e boards)", "u"],
          ["dependabot", "u"],
          ["secrets e variáveis de ambiente", "u"],
          ["azure pipelines", "c"],
          ["gitlab ci", "c"],
        ],
        intro: "vamos ver se o pipeline fica verde.",
        fim: "tudo verde. desconfio.",
        extras: [
          "na minha máquina funcionava.",
          "teste que falha está funcionando.",
          "cache do npm: meu melhor amigo.",
        ],
      },
      {
        itens: [
          ["docker", "u"],
          ["docker compose", "u"],
          ["dockerfile multi-stage", "c"],
          ["docker hub", "c"],
          ["kubernetes", "c"],
        ],
        intro: "empacotando o ambiente inteiro.",
        fim: "no meu container funciona. no seu também.",
        extras: [
          "camada no começo refaz tudo.",
          "imagem leve, deploy feliz.",
          "no compose, o pato orquestra.",
        ],
      },
      {
        itens: [
          ["aws", "u"],
          ["gcp", "u"],
          ["vercel / netlify / github pages", "u"],
          ["ambientes dev, hml e prod", "u"],
          ["gates de aprovação", "u"],
          ["azure (app service, functions)", "c"],
          ["terraform", "c"],
          ["observabilidade", "c"],
        ],
        intro: "sexta-feira? só com gate manual.",
        fim: "decolou. no ar.",
        extras: [
          "rollback é meu plano b.",
          "dev, hml, prod: nessa ordem.",
          "aprovação pendente, pato esperando.",
        ],
      },
    ],
    aria: "Página de ferramentas. Teclas 1 a 4 trocam de etapa, a aprova o deploy, r recomeça depois que o pato decola, v volta",
    descricao:
      "Terminal verde de um BBS dos anos 90: um modem disca e conecta, e abre um pipeline de quatro etapas (código, integração, contêineres e entrega) com um pato astronauta que anda entre elas e um terminal que mostra o que cada etapa faz",
  },
  en: {
    zonaVoltar: "Back to home",
    voltar: " back",
    titulo: "(tools)",
    legenda: "keys:",
    nomes: ["code", "integration", "containers", "delivery"],
    zonaEtapa: (/** @type {number} */ n, /** @type {string} */ nome) =>
      "Stage " + n + ": " + nome + " (key " + n + ")",
    zonaPato: "Duck: click to hear another line",
    zonaRecomecar: "Restart the pipeline (key r)",
    zonaAprovar: "Approve the deploy (key a)",
    usei: " (used)",
    conheco: " (know)",
    legendaUsei: "used:",
    legendaConheco: "know:",
    painelFerramentas: " tools ",
    painelTerminal: " terminal ",
    emConstrucao: "projects: under construction",
    decolou: "the duck took off.",
    recomecar: "(restart)",
    recomecarLegenda: "restart",
    aprovarLegenda: "approve",
    decolando: "mission done. taking off.",
    bemVinda: "welcome to thinkmadu's BBS",
    commits: {
      release: "release 1.0",
      merge: "merge: feature/login",
      teste: "test: cover login",
      feat: "feat: login",
      base: "chore: develop base",
    },
    steps: [
      "checkout",
      "setup node 20",
      "npm ci",
      "lint",
      "tests",
      "build",
      "deploy → vercel",
    ],
    concluido: "workflow done in 2:24",
    containerNoAr: "container up · port 3000",
    ambientes: ["dev", "stg", "prod"],
    aguardando: "waiting",
    aprovarDeploy: "(approve deploy)",
    gate: "manual gate before production",
    aprovado: "approved by you",
    noAr: "live · rollback ready",
    dados: [
      {
        itens: [
          ["git", "u"],
          ["github", "u"],
          ["gitflow", "u"],
          ["pull requests and code review", "u"],
          ["conventional commits", "u"],
          ["gitlab", "u"],
          ["git hooks (husky, pre-commit)", "c"],
          ["branch protection", "c"],
        ],
        intro: "fresh branch, clean history.",
        fim: "merge without conflicts. a miracle.",
        extras: [
          "git push --force? only on my own branch.",
          "small commits, long life.",
          "in gitflow, releases branch off develop.",
        ],
      },
      {
        itens: [
          ["github actions", "u"],
          ["azure devops (repos and boards)", "u"],
          ["dependabot", "u"],
          ["secrets and environment variables", "u"],
          ["azure pipelines", "c"],
          ["gitlab ci", "c"],
        ],
        intro: "let's see if the pipeline goes green.",
        fim: "all green. suspicious.",
        extras: [
          "worked on my machine.",
          "a failing test is a working test.",
          "npm cache: my best friend.",
        ],
      },
      {
        itens: [
          ["docker", "u"],
          ["docker compose", "u"],
          ["dockerfile multi-stage", "c"],
          ["docker hub", "c"],
          ["kubernetes", "c"],
        ],
        intro: "packing up the whole environment.",
        fim: "works in my container. and in yours.",
        extras: [
          "change an early layer, rebuild everything.",
          "light image, happy deploy.",
          "in compose, the duck orchestrates.",
        ],
      },
      {
        itens: [
          ["aws", "u"],
          ["gcp", "u"],
          ["vercel / netlify / github pages", "u"],
          ["dev, stg and prod environments", "u"],
          ["approval gates", "u"],
          ["azure (app service, functions)", "c"],
          ["terraform", "c"],
          ["observability", "c"],
        ],
        intro: "friday? only with a manual gate.",
        fim: "lift off. we're live.",
        extras: [
          "rollback is my plan b.",
          "dev, stg, prod: in that order.",
          "approval pending, duck waiting.",
        ],
      },
    ],
    aria: "Tools page. Keys 1 to 4 switch stage, a approves the deploy, r restarts after the duck takes off, v goes back",
    descricao:
      "Green phosphor terminal of a 90s BBS: a modem dials and connects, then opens a four-stage pipeline (code, integration, containers and delivery) with an astronaut duck that walks between them and a terminal that shows what each stage does",
  },
};
const osDe = (c) => 2 + Math.ceil(CMDS[c].length / 1.8) + 2;
// duração (em passos) e tempo mostrado de cada passo; o nome vem de `TEXTOS[...].steps`
const STEPS = [
  [3, "0:02"],
  [3, "0:06"],
  [6, "0:21"],
  [4, "0:09"],
  [14, "0:48"],
  [8, "0:31"],
  [8, "0:27"],
];
const STEPS_TOT = STEPS.reduce((a, p) => a + p[0], 0);
const CAM = [
  ["FROM node:20-alpine", 52],
  ["COPY package*.json ./", 1],
  ["RUN npm ci", 38],
  ["COPY . .", 6],
  ["RUN npm run build", 21],
];
const OX = 48,
  ENTRADA = 28;

function tempos(s) {
  const c = s.sel,
    from = s.de,
    to = DUCKX(c);
  const dur = Math.max(6, Math.abs(to - from) / 1.6);
  const os = osDe(c);
  let fim;
  if (c === 0) fim = os + 16;
  else if (c === 1) fim = os + STEPS_TOT + 2;
  else if (c === 2) fim = os + 29;
  else fim = s.apr != null && s.apr >= s.t0 ? s.apr - s.t0 + 10 : Infinity;
  return { dur: dur, os: os, fim: Math.max(fim, dur + 3) };
}

function discar(T, g, ex, f) {
  const X = OX;
  let cx = X,
    cy = 15;
  const dg = (txt, ini, vel, y, l) => {
    const n = cl(Math.floor((f - ini) * vel), 0, txt.length);
    if (n > 0) {
      put(g, l, X, y, txt.slice(0, n));
      cx = X + n;
      cy = y;
    }
  };
  dg("ATDT 0800-GITHUB", 0, 2.4, 15, 2);
  if (f >= 7) {
    const pts = cl(Math.floor(f - 7), 0, 8);
    put(g, 3, X, 16, "RINGING" + ".".repeat(pts));
    cx = X + 7 + pts;
    cy = 16;
  }
  if (f >= 15) {
    put(g, 1, X, 17, "CONNECT 2400");
    cx = X + 12;
    cy = 17;
  }
  if (f >= 15 && f < 21) {
    let r = "";
    for (let x = 0; x < 40; x++)
      r += "~^-_=."[Math.floor(hash(x, Math.floor(f * 3), 5) * 6)];
    put(g, 0, X, 18, r);
  }
  dg(T.bemVinda, 19, 3, 19, 2);
  if (Math.floor(f / 4) % 2) cursor(ex, cx, cy);
}
function saida0(T, g, ex, t, X, Y) {
  const R = [
    { s: [["◉", 1]], txt: T.commits.release, chip: ["main", 1] },
    {
      s: [
        ["├", 1],
        ["─", 8],
        ["╮", 8],
      ],
    },
    {
      s: [
        ["│", 1],
        [" ", 0],
        ["●", 8],
      ],
      txt: T.commits.merge,
      chip: ["develop", 8],
    },
    {
      s: [
        ["│", 1],
        [" ", 0],
        ["├", 8],
        ["─", 4],
        ["╮", 4],
      ],
    },
    {
      s: [
        ["│", 1],
        [" ", 0],
        ["│", 8],
        [" ", 0],
        ["●", 4],
      ],
      txt: T.commits.teste,
    },
    {
      s: [
        ["│", 1],
        [" ", 0],
        ["│", 8],
        [" ", 0],
        ["●", 4],
      ],
      txt: T.commits.feat,
      chip: ["feature/login", 4],
    },
    {
      s: [
        ["│", 1],
        [" ", 0],
        ["├", 8],
        ["─", 4],
        ["╯", 4],
      ],
    },
    {
      s: [
        ["│", 1],
        [" ", 0],
        ["●", 8],
      ],
      txt: T.commits.base,
    },
  ];
  R.forEach((r, i) => {
    if (t < i * 2) return;
    let cx = X;
    r.s.forEach((p) => {
      if (p[0] !== " ") put(g, p[1], cx, Y + i, p[0]);
      cx += p[0].length;
    });
    if (r.txt) {
      put(g, 2, X + 8, Y + i, r.txt);
      if (r.chip)
        chip(g, ex, X + 8 + r.txt.length + 2, Y + i, r.chip[0], r.chip[1]);
    }
  });
}
function saida1(T, g, ex, t, X, Y, f) {
  let st = 0;
  STEPS.forEach((p, i) => {
    const y = Y + i,
      a = st,
      b = st + p[0],
      nome = T.steps[i];
    st = b;
    if (t < a) {
      put(g, 3, X, y, "·");
      put(g, 3, X + 2, y, nome);
      return;
    }
    if (t >= b) {
      put(g, 7, X, y, "✓");
      put(g, 2, X + 2, y, nome);
      put(g, 3, X + 42 - p[1].length, y, p[1]);
      return;
    }
    const q = (t - a) / p[0];
    put(g, Math.floor(f / 3) % 2 ? 4 : 3, X, y, "•");
    put(g, 2, X + 2, y, nome);
    barra(ex, X + 19, y, 12, q, 4);
    put(g, 3, X + 33, y, Math.round(q * 100) + "%");
  });
  if (t >= STEPS_TOT + 1) {
    put(g, 7, X, Y + 7, "✓");
    put(g, 7, X + 2, Y + 7, T.concluido);
  }
}
function saida2(T, g, ex, t, X, Y, f) {
  CAM.forEach((c, i) => {
    const a = i * 5;
    if (t < a) return;
    const p = cl((t - a) / 5, 0, 1),
      y = Y + i,
      done = p >= 1;
    if (done) put(g, 7, X, y, "✓");
    else put(g, Math.floor(f / 3) % 2 ? 4 : 3, X, y, "•");
    put(g, done ? 3 : 2, X + 2, y, c[0]);
    barra(ex, X + 25, y, 10, (c[1] / 52) * p, 8);
    const sz = c[1] + " MB";
    put(g, 3, X + 42 - sz.length, y, sz);
  });
  if (t >= 26) {
    put(g, 7, X, Y + 6, "✓");
    put(g, 2, X + 2, Y + 6, "portfolio:latest");
    put(g, 3, X + 36, Y + 6, "118 MB");
  }
  if (t >= 29) {
    put(g, Math.floor(f / 5) % 2 ? 7 : 3, X, Y + 7, "•");
    put(g, 3, X + 2, Y + 7, T.containerNoAr);
  }
}
function saida3(T, g, ex, t, X, Y, f, ar) {
  const pd = cl(t / 8, 0, 1),
    ph = cl((t - 8) / 8, 0, 1);
  let pp = 0.6 * cl((t - 16) / 6, 0, 1);
  if (ar != null) pp = 0.6 + 0.4 * cl((t - ar) / 8, 0, 1);
  const ps = [pd, ph, pp],
    nomes = T.ambientes;
  const espera = ar == null && t >= 22;
  nomes.forEach((n, i) => {
    const y = Y + i;
    if (ps[i] <= 0 && t < 16 * (i > 1 ? 1 : 0) + i * 8) {
      put(g, 3, X, y, n);
      return;
    }
    put(g, i === 2 ? 1 : 2, X, y, n);
    barra(ex, X + 6, y, 18, ps[i], i === 2 && espera ? 4 : 7);
    if (ps[i] >= 1) {
      put(g, 7, X + 26, y, "✓");
      put(g, 3, X + 28, y, "v1.0.0");
    } else if (i === 2 && espera) {
      put(g, Math.floor(f / 4) % 2 ? 4 : 3, X + 26, y, "•");
      put(g, 4, X + 28, y, T.aguardando);
    }
  });
  if (espera) {
    put(g, 1, X, Y + 4, T.aprovarDeploy);
    put(g, 3, X, Y + 6, T.gate);
  }
  if (ar != null) {
    put(g, 7, X, Y + 4, "✓");
    put(g, 3, X + 2, Y + 4, T.aprovado);
  }
  if (ar != null && t >= ar + 8) {
    put(g, 7, X, Y + 7, "✓");
    put(g, 7, X + 2, Y + 7, T.noAr);
  }
}

class Ferramentas extends Cena {
  /** @param {typeof TEXTOS.pt} T */
  constructor(T) {
    super();
    this.T = T;
  }
  montar() {
    if (movimentoReduzido()) {
      this.setState({
        f: 900,
        t0: 0,
        sel: 0,
        de: DUCKX(0),
        ok: [1, 0, 0, 0],
        apr: 1,
      });
      return;
    }
    this.ini = Date.now();
  }
  agora() {
    return (this.state && this.state.f) || 0;
  }
  est() {
    const s = this.state || {};
    return {
      sel: s.sel || 0,
      t0: s.t0 == null ? ENTRADA : s.t0,
      de: s.de == null ? -18 : s.de,
      apr: s.apr == null ? null : s.apr,
      ok: s.ok || [0, 0, 0, 0],
    };
  }
  tick() {
    const f = (Date.now() - this.ini) / 140;
    const s = Object.assign({}, this.state || {}, this.est());
    const ns = { f: f };
    if (!s.ok[s.sel] && f - s.t0 >= tempos(s).fim) {
      const ok = s.ok.slice();
      ok[s.sel] = 1;
      ns.ok = ok;
      // quatro etapas feitas: o pato decola (e só volta quando a pessoa recomeça)
      if (ok.every(Boolean) && s.voo == null) ns.voo = f;
    }
    this.setState(ns);
  }
  pos(s, f) {
    const T = tempos(s),
      to = DUCKX(s.sel);
    const p = ease((f - s.t0) / T.dur);
    return { x: s.de + (to - s.de) * p, anda: p < 1 && f >= s.t0, T: T };
  }
  ir(i) {
    const s = this.est(),
      f = this.agora();
    if (this.state && this.state.voo != null) {
      // recomeço: o pato desce do céu pela direita ainda equipado e tira tudo ao pousar
      this.setState({
        sel: i,
        t0: f,
        de: 92,
        clk: null,
        ant: 3,
        ok: [0, 0, 0, 0],
        apr: null,
        voo: null,
        volta: f,
      });
      return;
    }
    const x = this.pos(s, f).x;
    this.setState({ sel: i, t0: f, de: x, clk: null, ant: s.sel });
  }
  aprovar() {
    const s = this.est(),
      f = this.agora(),
      T = tempos(s);
    if (s.sel !== 3 || (s.apr != null && s.apr >= s.t0)) return;
    if (f - s.t0 < T.os + 22) return;
    this.setState({ apr: f });
  }
  falar() {
    const s = this.state || {};
    this.setState({
      clk: { t: this.agora(), i: s.clk ? s.clk.i + 1 : 0, sel: s.sel || 0 },
    });
  }
  marcar(i) {
    const s = this.state || {};
    this.setState({ det: s.det === i ? -1 : i });
  }
  teclar(e) {
    const k = String((e && e.key) || "").toLowerCase();
    if (k === "v") {
      location.hash = "#inicio";
      return;
    }
    if (k >= "1" && k <= "4") this.ir(Number(k) - 1);
    if (k === "a") this.aprovar();
    if (k === "r" && this.state && this.state.voo != null) this.ir(0);
  }
  quadro() {
    const TX = this.T;
    const s0 = this.state || {};
    const f = s0.f || 0;
    const s = Object.assign({}, s0, this.est());
    const c = s.sel,
      D = TX.dados[c];
    const g = mk(),
      ex = [];
    const zonas = [];
    const P = this.pos(s, f),
      T = P.T;
    const rel = f - s.t0;
    zonas.push({
      tipo: "a",
      x: 2,
      y: 0,
      w: 8,
      href: "#inicio",
      alvo: "_self",
      label: TX.zonaVoltar,
    });
    put(g, 1, 2, 0, "‹");
    put(g, 6, 4, 0, "v");
    put(g, 1, 5, 0, TX.voltar);
    put(g, 0, 12, 0, "│");
    put(g, 2, 14, 0, TX.titulo);
    const on = f >= 15 || rel >= 0;
    const td = f < 7 || (rel >= 2 && rel < 2 + Math.ceil(CMDS[c].length / 1.8));
    const rd = (f >= 15 && f < 21) || (rel >= T.os && rel < T.fim);
    const led = (x, nome, lig) => {
      put(g, 3, x, 0, nome);
      put(
        g,
        lig && Math.floor(f / 2) % 2 === 0 ? 1 : lig ? 6 : 9,
        x + 3,
        0,
        "•",
      );
    };
    put(g, 3, 64, 0, "2400 bps");
    led(74, "CD", on);
    led(79, "RD", rd);
    led(84, "TD", td);
    box(g, 0, 1, 1, 91, 27);

    // pipeline: quatro etapas que viram cartões
    for (let i = 0; i < 4; i++) {
      const x = cardX(i),
        on = i === c;
      if (on)
        ex.push({
          t: "q",
          l: 5,
          x: (x + 1) * CW,
          y: CY * 16 + 17,
          w: (CWID - 2) * CW,
          h: 14,
          r: 4,
        });
      box(g, on ? 1 : 0, x, CY, CWID, 3);
      put(g, on ? 6 : 3, x + 2, CY + 1, String(i + 1));
      put(g, on ? 2 : 3, x + 4, CY + 1, TX.nomes[i]);
      const feito = s.ok[i] || (on && rel >= T.fim);
      if (feito) put(g, 7, x + CWID - 3, CY + 1, "✓");
      else if (on)
        put(g, Math.floor(f / 3) % 2 ? 4 : 3, x + CWID - 3, CY + 1, "•");
      if (i < 3)
        put(
          g,
          s.ok[i] && (s.ok[i + 1] || c === i + 1) ? 7 : 0,
          x + CWID,
          CY + 1,
          "───",
        );
      zonas.push({
        tipo: "b",
        x: x,
        y: CY,
        w: CWID,
        h: 48,
        label: TX.zonaEtapa(i + 1, TX.nomes[i]),
        pick: () => this.ir(i),
      });
    }

    // pato: anda até a etapa, para e comemora quando a etapa termina; com as quatro
    // feitas, decola para o alto à direita; no recomeço, desce de lá e tira o equipamento
    const esp = DUCKX(c) < s.de;
    const hop = rel - T.fim;
    const voo = s0.voo != null ? f - s0.voo - 6 : -1;
    const descendo = s0.volta != null && s0.volta === s.t0 && rel < T.dur;
    let dy = 0;
    if (hop >= 0 && hop < 6 && voo <= 0)
      dy = -[2, 3, 3, 2, 1, 0][Math.floor(hop)];
    let oy = 3;
    if (voo > 0) oy -= Math.floor(voo * 0.5);
    if (descendo) oy -= Math.round((1 - rel / T.dur) * 6);
    const dx = Math.round(P.x + (voo > 0 ? voo * 1.4 : 0));
    const chegou = rel >= T.dur,
      nivel = voo > 0 || descendo ? 3 : chegou || s0.ant == null ? c : s0.ant;
    const pix = pixPato(f, esp, P.anda && !descendo, dy, nivel);
    // a moldura e o cabeçalho ficam por cima: o pato some atrás deles
    for (let r = 0; r < 8; r++)
      if (oy + r < 2) {
        pix[2 * r].fill(-1);
        pix[2 * r + 1].fill(-1);
      }
    const sumiu = voo > 0 && (dx > 90 || oy + 8 <= 2);
    if (!sumiu) pintar(g, pix, dx, oy, 2, 90);
    if (sumiu) {
      put(g, 3, 36, 5, TX.decolou);
      put(g, 1, 36, 7, TX.recomecar);
      zonas.push({
        tipo: "b",
        x: 36,
        y: 7,
        w: TX.recomecar.length,
        label: TX.zonaRecomecar,
        pick: () => this.ir(0),
      });
    }
    if (s0.ant != null && s0.ant !== c && rel >= T.dur && rel < T.dur + 4) {
      const k = Math.floor((rel - T.dur) * 2);
      for (let q = 0; q < 7; q++)
        put(
          g,
          4,
          dx + 1 + Math.floor(hash(q, k, 3) * 16),
          4 + Math.floor(hash(q, k, 7) * 7),
          "+*·"[Math.floor(hash(q, k, 11) * 3)],
        );
    }
    if (dx >= 2 && voo <= 0 && !descendo)
      zonas.push({
        tipo: "b",
        x: dx,
        y: 4,
        w: Math.min(18, 91 - dx),
        h: 112,
        label: TX.zonaPato,
        pick: () => this.falar(),
      });

    // fala solta acima da cabeça
    let fala = null;
    if (s0.voo != null) {
      if (voo < 10) fala = TX.decolando;
    } else if (descendo) {
      fala = null;
    } else if (s0.clk && s0.clk.sel === c && s0.clk.t >= s.t0) {
      fala = D.extras[s0.clk.i % D.extras.length];
    } else if (rel >= T.fim) {
      fala = D.fim;
    } else if (rel >= Math.max(4, T.dur * 0.5)) {
      fala = D.intro;
    }
    if (fala) {
      const ls = quebrar(fala, 28),
        mx = Math.max(...ls.map((l) => l.length)),
        px = cl(Math.round(dx + 9 - mx / 2), 3, 89 - mx);
      ls.forEach((ln, i) => put(g, 3, px, 4 - ls.length + i, ln));
    }

    // painel esquerdo: ferramentas da etapa
    put(g, 0, 1, 14, "├" + "─".repeat(89) + "┤");
    for (let y = 15; y < 25; y++) put(g, 0, 46, y, "│");
    put(g, 0, 46, 14, "┬");
    put(g, 3, 3, 14, TX.painelFerramentas);
    let sel = s.det == null ? -1 : s.det;
    D.itens.forEach((it, i) => {
      const y = 15 + i;
      if (rel < 1 + i * 1.2) return;
      put(g, 0, 3, y, i === D.itens.length - 1 ? "╚═" : "╠═");
      if (it[1] === "u") put(g, 1, 6, y, "•");
      else put(g, 4, 6, y, "s");
      put(g, sel === i ? 1 : 2, 8, y, it[0]);
      zonas.push({
        tipo: "b",
        x: 3,
        y: y,
        w: 5 + it[0].length,
        label: it[0] + (it[1] === "u" ? TX.usei : TX.conheco),
        pick: () => this.marcar(i),
      });
    });
    if (sel >= 0 && sel < D.itens.length && rel >= 1 + sel * 1.2)
      put(g, 4, 3, 24, TX.emConstrucao);

    // painel direito: terminal
    put(g, 3, 48, 14, TX.painelTerminal);
    const cmd = CMDS[c],
      nc = cl(Math.floor((rel - 2) * 1.8), 0, cmd.length);
    const t = rel - T.os;
    if (rel < 0) discar(TX, g, ex, f);
    else {
      put(g, 1, OX, 15, "❯");
      put(g, 2, OX + 2, 15, cmd.slice(0, nc));
      if (nc < cmd.length || Math.floor(f / 4) % 2) cursor(ex, OX + 2 + nc, 15);
    }
    if (t >= 0) {
      if (c === 0) saida0(TX, g, ex, t, OX, 16);
      else if (c === 1) saida1(TX, g, ex, t, OX, 16, f);
      else if (c === 2) saida2(TX, g, ex, t, OX, 16, f);
      else {
        const ar = s.apr != null && s.apr >= s.t0 ? s.apr - s.t0 - T.os : null;
        saida3(TX, g, ex, t, OX, 16, f, ar);
        if (ar == null && t >= 22)
          zonas.push({
            tipo: "b",
            x: OX,
            y: 20,
            w: TX.aprovarDeploy.length,
            label: TX.zonaAprovar,
            pick: () => this.aprovar(),
          });
      }
    }

    put(g, 0, 1, 25, "├" + "─".repeat(89) + "┤");
    put(g, 0, 46, 25, "┴");
    legenda(
      g,
      3,
      26,
      ["1", "2", "3", "4", "v"],
      sumiu
        ? [TX.recomecarLegenda, "r"]
        : c === 3 && t >= 22 && !(s.apr != null && s.apr >= s.t0)
          ? [TX.aprovarLegenda, "a"]
          : null,
      TX.legenda,
    );
    put(g, 3, 48, 26, TX.legendaUsei);
    put(g, 1, 54, 26, "•");
    put(g, 3, 57, 26, TX.legendaConheco);
    put(g, 4, 58 + TX.legendaConheco.length, 26, "s");

    return { camadas: split(g, ex), zonas };
  }
}

const CONFIG = {
  tema: "pf-tema-ferramentas",
  altura: 488,
  camadas: 11,
  ordemSvg: [5, 9, 0, 1, 2, 3, 4, 6, 7, 8, 10],
  negrito: [6, 10],
  brilho: [1, 2, 6],
  linhas: true,
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
    new Ferramentas(T),
  );
}
