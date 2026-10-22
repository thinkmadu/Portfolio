// E-mail: uma carta de papel no console, um pato carteiro que lê por cima do ombro, dobra, ensaca, sela e entrega, e abre o aplicativo de e-mail com a mensagem pronta. Portado da tela desenhada no quadro de design.

// @ts-nocheck: a cena foi portada como está do quadro; a tipagem fica para uma passada própria.

import { Cena, montarTela, movimentoReduzido } from "../terminal/tela.js";
import { CW, cl, criarGrade, ease, hash } from "../terminal/grade.js";

const { NL, mk, put, box, split, legenda, pintar } = criarGrade({
  linhas: 30,
  camadas: 15,
});

// camadas: 0 moldura, 1 âmbar, 2 texto, 3 secundário, 4 menta, 5 escuro, 6 âmbar negrito,
// 7 azul do correio, 8 vermelho, 9-12 degradê âmbar, 13 tinta, 14 margem vermelha suave
const ENDERECO = "mdr.bsilva1@gmail.com";
const LET = { x: 3, y: 3, w: 48, h: 20 };
const GR = 22,
  POST = 54,
  SX0 = 52;
const FIM_ENVIO = 58;

// pato carteiro: perfil, de pé, boné azul, bolsa a tiracolo e crachá
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
const CART = GEN.map((r) => Array.from(r.replace(/M/g, "B")));
CART[12][7] = "B";
CART[12][17] = "B";
CART[14][9] = "W";
for (let r = 18; r <= 22; r++)
  for (let c = 16; c <= 18; c++) if (CART[r][c] === "G") CART[r][c] = "W";
for (let t = 0; t < 5; t++) CART[13 + t][16 - t] = "A";
for (let c = 15; c <= 19; c++) CART[17][c] = "A";
for (let r = 18; r <= 21; r++) for (let c = 15; c <= 19; c++) CART[r][c] = "S";
const CORC = { W: 2, G: 3, A: 1, K: 5, B: 7, S: 3, R: 8 };
function pixCarteiro(f, face, anda, dy, tip, le) {
  const rows = CART.map((r) => r.slice());
  if (anda && Math.floor(f / 3) % 2) {
    rows[23] = Array.from("..........AA..AA........");
    rows[24] = rows[23].slice();
    rows[25] = Array.from("........AAAA..AAAA......");
  }
  if (f % 53 < 3 || le) {
    rows[6][10] = "W";
    if (le) rows[6][9] = "K";
  }
  const pix = Array.from({ length: 28 }, () => Array(24).fill(-1));
  rows.forEach((r, j) =>
    r.forEach((ch, i) => {
      if (ch === ".") return;
      const y = j + dy - (tip && j <= 4 ? 2 : 0);
      if (y >= 0 && y < 28) pix[y][face ? 23 - i : i] = CORC[ch];
    }),
  );
  return pix;
}
// envelope e selo
const ENV_FECHADO = [
  "WWWWWWWWWWWW",
  "WGWWWWWWWWGW",
  "WWGWWWWWWGWW",
  "WWWGWWWWGWWW",
  "WWWWGGGGWWWW",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
];
const ENV_ABERTO = [
  "....GGGG....",
  "..GGWWWWGG..",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
  "WWWWWWWWWWWW",
];
function rectsEnv(ex, cx, cy, esc, aberto, selo) {
  const q = aberto ? ENV_ABERTO : ENV_FECHADO,
    w = CW * esc,
    h = 8 * esc;
  q.forEach((r, j) => {
    for (let i = 0; i < 12; i++) {
      const c = r[i];
      if (c === ".") continue;
      const l =
        selo && !aberto && i >= 9 && i <= 10 && j <= 1 ? 8 : c === "G" ? 3 : 2;
      ex.push({
        t: "r",
        l: l,
        x: cx + (i - 6) * w,
        y: cy + (j - 4) * h,
        w: w,
        h: h,
      });
    }
  });
}
function rectsCaixa(ex, bandeira) {
  const x0 = 80 * CW,
    yb = GR * 16,
    by = yb - 88;
  ex.push({ t: "r", l: 3, x: 83 * CW, y: by + 40, w: 2 * CW, h: 48 });
  ex.push({ t: "r", l: 7, x: x0, y: by, w: 8 * CW, h: 40 });
  ex.push({ t: "r", l: 5, x: x0 + CW, y: by + 16, w: 6 * CW, h: 6 });
  ex.push({
    t: "r",
    l: 3,
    x: x0 + 8 * CW,
    y: by + 4,
    w: CW * 0.6,
    h: bandeira ? 36 : 12,
  });
  ex.push({
    t: "r",
    l: 8,
    x: x0 + 8 * CW,
    y: bandeira ? by - 12 : by + 4,
    w: 3 * CW,
    h: 12,
  });
}
// selo com um patinho (5 x 4 pixels)
const SELO = ["..WW.", ".WKWA", ".WWWA", "..WW."];
function pixSelo() {
  return SELO.map((r) =>
    Array.from(r).map((c) => (c === "." ? -1 : { W: 2, K: 5, A: 1 }[c])),
  );
}

// chão de paralelepípedo: os mesmos caracteres homogêneos do solo dos testes, em tons de âmbar
const SOLO_BASE = "......····::::,,,'";
const SOLO_PALAVRAS = [
  ["inbox", 58, 1],
  ["mailto", 73, 2],
  ["smtp", 63, 3],
];
const SOLO_LINHAS = 3;
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
function chao(g, f) {
  const deriva = f * 0.02;
  for (let x = SX0; x <= 90; x++) {
    g[3][GR][x] = "▀";
    g[0][GR][x] = "▄";
    for (let d = 1; d <= SOLO_LINHAS; d++) {
      const v = ruidoSolo(x + deriva, d),
        prof = (d - 1) / SOLO_LINHAS;
      if (hash(x, d, 1) > 0.97 - prof * 0.18) continue;
      const pisca = hash(x, d, 11) < 0.1 ? Math.floor(f / 10) : 0;
      const ch =
        SOLO_BASE[Math.floor(hash(x, d, 5 + pisca) * SOLO_BASE.length)];
      const t = 0.45 * v + 0.55 * (1 - prof) - 0.1;
      put(
        g,
        ESCALA[
          cl(Math.floor((1 - t) * ESCALA.length * 0.95), 0, ESCALA.length - 1)
        ],
        x,
        GR + d,
        ch,
      );
    }
  }
  SOLO_PALAVRAS.forEach(([t, x, d]) => {
    const l =
      ESCALA[
        cl(
          Math.floor(((d - 1) / SOLO_LINHAS) * ESCALA.length * 0.8),
          0,
          ESCALA.length - 1,
        )
      ];
    for (let i = -1; i <= t.length; i++) {
      if (x + i < SX0 || x + i > 90) continue;
      for (let k = 0; k < NL; k++) g[k][GR + d][x + i] = " ";
    }
    for (let i = 0; i < t.length; i++)
      put(g, l === 1 ? 9 : l, x + i, GR + d, t[i]);
  });
}

// ---------- falas do carteiro ----------
const SUG = [
  [
    "e se você oferecesse a essa beldade a oportunidade de ganhar 80k sendo júnior?",
    "Tenho uma oportunidade para você: 80k de salário, para nível júnior.",
  ],
  [
    "que tal mencionar que o café do escritório é ilimitado?",
    "O café do nosso escritório é ilimitado.",
  ],
  [
    "diga que o stack é moderno (mesmo que seja só um jQuery).",
    "Nosso stack é moderníssimo.",
  ],
  [
    "pergunte se o projeto tem testes. o general vai querer saber.",
    "Antes de tudo: o projeto de vocês tem testes?",
  ],
  [
    '"ambiente jovem e dinâmico" sempre dá pontos extras.',
    "Nosso ambiente é jovem e dinâmico.",
  ],
  [
    'escreve "urgente". ninguém resiste a um urgente.',
    "URGENTE (mas sem pressa).",
  ],
  [
    "ofereça home office e um pato de estimação.",
    "Oferecemos home office e um pato de estimação.",
  ],
  [
    "prometa que todo bug é feature. funciona sempre.",
    "Prometo que todo bug é feature.",
  ],
];
const CHAVES = [
  [/vaga/, "uma vaga? vou ver se cabe no meu boné."],
  [/sal[aá]rio|remunera/, "falou em salário? agora sim eu prestei atenção."],
  [/remoto|home office/, "remoto é bom. igual a um lago: sem trânsito."],
  [/j[uú]nior/, "júnior com 5 anos de experiência? clássico."],
  [/s[eê]nior/, "sênior? e o pato, é o quê, estagiário?"],
  [/urgente/, "urgente? vou voando (a pé)."],
  [/obrigad/, "educado! o general aprova."],
  [/teste/, "testes! o general vai gostar disso."],
  [/\bbug/, "bug? não na minha bolsa de correio."],
  [/caf[eé]/, "café é a base de toda boa carta."],
  [/oportunidade/, "oportunidade? tô ouvindo, tô ouvindo."],
];
const LENDO = [
  "continua, tô lendo por cima do ombro.",
  "hmm, interessante...",
  "sem pressa, eu espero.",
  "capricha na letra!",
];
function quebra(txt, w) {
  const out = [];
  txt.split("\n").forEach((par) => {
    let linha = "";
    par.split(" ").forEach((pal) => {
      while (pal.length > w) {
        if (linha) {
          out.push(linha);
          linha = "";
        }
        out.push(pal.slice(0, w));
        pal = pal.slice(w);
      }
      if (!linha) linha = pal;
      else if ((linha + " " + pal).length <= w) linha += " " + pal;
      else {
        out.push(linha);
        linha = pal;
      }
    });
    out.push(linha);
  });
  return out;
}
const achaChaves = (t) =>
  CHAVES.filter((c) => c[0].test(t.toLowerCase())).map((c) => c[1]);

function legenda2(g, x, y, rotulo, teclas) {
  put(g, 3, x, y, rotulo);
  let cx = x + rotulo.length + 1;
  teclas.forEach((k, i) => {
    if (i > 0) {
      put(g, 3, cx, y, "•");
      cx += 2;
    }
    put(g, 6, cx, y, k);
    cx += k.length + (i < teclas.length - 1 ? 1 : 0);
  });
}
class Email extends Cena {
  montar() {
    this.ini = Date.now();
    this.kd = (e) => this.tecla(e);
    this.cola = (e) => this.colar(e);
    document.addEventListener("keydown", this.kd);
    document.addEventListener("paste", this.cola);
    if (movimentoReduzido()) this.setState({ f: 400 });
  }
  desmontar() {
    document.removeEventListener("keydown", this.kd);
    document.removeEventListener("paste", this.cola);
  }
  agora() {
    return (this.state && this.state.f) || 0;
  }
  tick() {
    const f = (Date.now() - this.ini) / 140;
    const s = this.state || {};
    if (s.env && f - s.env.t >= 46 && this.abriu !== s.env.t) {
      this.abriu = s.env.t;
      window.location.href = this.mailto(s);
    }
    this.setState({ f: f });
  }
  mailto(s) {
    const assunto = (s.assunto || "").trim() || "Contato pelo portfólio";
    const corpo =
      "Prezada Madu,\n\n" +
      (s.msg || "") +
      "\n\nAtenciosamente,\n" +
      (s.nome || "");
    return (
      "mailto:" +
      ENDERECO +
      "?subject=" +
      encodeURIComponent(assunto.toWellFormed()) +
      "&body=" +
      encodeURIComponent(corpo.toWellFormed())
    );
  }
  enviando() {
    const s = this.state || {};
    return !!(s.env && this.agora() - s.env.t < FIM_ENVIO);
  }
  enviar() {
    const s = this.state || {};
    if (this.enviando() || s.env) return;
    if (!(s.msg || "").trim()) {
      this.setState({ erroT: this.agora(), foco: false });
      return;
    }
    this.setState({ env: { t: this.agora() }, foco: false });
  }
  limpar() {
    this.setState({ assunto: "", msg: "", nome: "", campo: 2, rem: null });
  }
  nova() {
    this.setState({
      env: null,
      assunto: "",
      msg: "",
      nome: "",
      campo: 2,
      sugT: this.agora(),
      rem: null,
    });
    this.abriu = null;
  }
  focar(c) {
    if (this.state && this.state.env) return;
    this.setState({ foco: true, campo: c });
  }
  usar(i) {
    const s = this.state || {};
    const t = SUG[i][1];
    const m = s.msg || "";
    this.setState({
      msg: (m && !m.endsWith("\n") ? m + " " : m) + t,
      sugT: this.agora(),
      sugI: i + 1,
      rem: { t: this.agora(), txt: "boa! anotei na carta." },
      lastKey: this.agora(),
    });
  }
  outra() {
    const s = this.state || {};
    const i = (s.sugI || 0) + Math.floor((this.agora() - (s.sugT || 0)) / 22);
    this.setState({ sugI: i + 1, sugT: this.agora() });
  }
  tirar() {
    this.setState({ tipT: this.agora() });
  }
  edita(fn) {
    const s = this.state || {};
    if (s.env) return;
    const c = s.campo == null ? 2 : s.campo;
    const chave = ["nome", "assunto", "msg"][c],
      lim = [40, 60, 600][c];
    const antes =
      (s.assunto || "") + " " + (s.msg || "") + " " + (s.nome || "");
    let v = fn(s[chave] || "");
    if (v.length > lim) v = [...v].slice(0, lim).join("");
    const novo = {};
    novo[chave] = v;
    const depois =
      ((chave === "assunto" ? v : s.assunto) || "") +
      " " +
      ((chave === "msg" ? v : s.msg) || "") +
      " " +
      ((chave === "nome" ? v : s.nome) || "");
    const a = achaChaves(antes),
      b = achaChaves(depois).filter((x) => a.indexOf(x) < 0);
    const f = this.agora();
    novo.lastKey = f;
    novo.erroT = -99;
    if (b.length) novo.rem = { t: f, txt: b[0] };
    this.setState(novo);
  }
  tecla(e) {
    const s = this.state || {};
    if (!s.foco) {
      const k = String(e.key || "").toLowerCase();
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (k === "v") {
        location.hash = "#inicio";
      }
      if (k === "e") this.enviar();
      if (k === "l") this.limpar();
      return;
    }
    if (e.key === "Escape") {
      this.setState({ foco: false });
      return;
    }
    if (e.key === "Tab") {
      e.preventDefault();
      this.setState({
        campo: ((s.campo == null ? 2 : s.campo) + (e.shiftKey ? 2 : 1)) % 3,
      });
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        this.enviar();
        return;
      }
      if ((s.campo == null ? 2 : s.campo) === 2) this.edita((v) => v + "\n");
      else this.setState({ campo: ((s.campo == null ? 2 : s.campo) + 1) % 3 });
      return;
    }
    if (e.key === "Backspace") {
      e.preventDefault();
      this.edita((v) => [...v].slice(0, -1).join(""));
      return;
    }
    if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
      e.preventDefault();
      this.edita((v) => v + e.key);
    }
  }
  colar(e) {
    const s = this.state || {};
    if (!s.foco) return;
    const t = (e.clipboardData && e.clipboardData.getData("text")) || "";
    if (t) {
      e.preventDefault();
      this.edita(
        (v) =>
          v +
          ((s.campo == null ? 2 : s.campo) === 2
            ? t.replace(/\r\n?/g, "\n")
            : t.replace(/\p{Cc}+/gu, " ")),
      );
    }
  }
  quadro() {
    const s = this.state || {};
    const f = s.f || 0;
    const assunto = s.assunto || "",
      msg = s.msg || "",
      nome = s.nome || "";
    const campo = s.campo == null ? 2 : s.campo,
      foco = !!s.foco;
    const env = s.env || null,
      S = env ? f - env.t : -1,
      enviado = env && S >= FIM_ENVIO;
    const erro = f - (s.erroT == null ? -99 : s.erroT) < 10 ? 1 : 0;
    const g = mk(),
      ex = [],
      zonas = [];
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
    put(g, 0, 12, 0, "│");
    put(g, 2, 14, 0, "(e-mail)");
    box(g, 0, 1, 1, 91, 29);

    // ---------- a carta: papel que dobra em três ----------
    const off = erro ? (Math.floor((f - s.erroT) * 1.2) % 2 ? 1 : -1) : 0;
    const mostra = !env || S < 1.5;

    const X = LET.x + off;
    if (mostra) {
      put(g, 14, X + 1, 4, "│");
      for (let y = 4; y <= 21; y++) put(g, 14, X + 1, y, "│");
      const data = new Date().toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
      put(g, 3, X + 3, 4, data);
      // selo com patinho
      box(g, 1, X + 39, 4, 8, 5);
      pintar(g, pixSelo(), X + 41, 5);
      // remetente e assunto
      put(g, 3, X + 3, 6, "remetente:");
      const rem1 = nome.slice(-24);
      if (rem1) put(g, 13, X + 14, 6, rem1);
      else put(g, 11, X + 14, 6, "[seu nome]");
      put(g, 3, X + 3, 7, "assunto:");
      const ass = assunto.slice(-26);
      if (ass) put(g, 13, X + 12, 7, ass);
      else put(g, 11, X + 12, 7, "[assunto]");
      // saudação, corpo, fecho e assinatura
      put(g, 3, X + 3, 9, "Prezada Madu,");
      const L = quebra(msg, 40),
        vis = L.slice(-8);
      if (!msg) put(g, 11, X + 3, 10, "escreva sua mensagem aqui...");
      vis.forEach((ln, i) => put(g, 13, X + 3, 10 + i, ln));
      put(g, 3, X + 3, 19, "Atenciosamente,");
      if (nome) put(g, 13, X + 3, 20, nome.slice(-28));
      else put(g, 11, X + 3, 20, "[seu nome]");
      // pauta fininha sob as linhas de escrita
      [
        [6, X + 14, X + 37],
        [7, X + 12, X + 37],
        [10, X + 3, X + 44],
        [11, X + 3, X + 44],
        [12, X + 3, X + 44],
        [13, X + 3, X + 44],
        [14, X + 3, X + 44],
        [15, X + 3, X + 44],
        [16, X + 3, X + 44],
        [17, X + 3, X + 44],
        [20, X + 3, X + 30],
      ].forEach((r) => {
        for (let x = r[1]; x <= r[2]; x++) g[12][r[0]][x] = "▁";
      });
      // cursor e marcador do campo ativo
      if (foco && !env) {
        const my =
          campo === 0
            ? 6
            : campo === 1
              ? 7
              : 10 + Math.min(7, Math.max(0, L.length - 1));
        const mx =
          campo === 0
            ? X + 14 + rem1.length
            : campo === 1
              ? X + 12 + ass.length
              : X + 3 + (vis.length ? vis[vis.length - 1].length : 0);
        put(g, 1, X + 2, my, "›");
        if (Math.floor(f / 3) % 2 === 0) put(g, 6, mx, my, "█");
      }
      // aviso (o limite de caracteres existe, mas não aparece)
      if (erro || (s.erroT != null && f - s.erroT < 40))
        put(g, 8, X + 3, 22, "escreva a mensagem antes de enviar");
      zonas.push({
        tipo: "b",
        x: X + 3,
        y: 6,
        w: 34,
        label: "Escrever o remetente",
        pick: () => this.focar(0),
      });
      zonas.push({
        tipo: "b",
        x: X + 3,
        y: 7,
        w: 34,
        label: "Escrever o assunto",
        pick: () => this.focar(1),
      });
      zonas.push({
        tipo: "b",
        x: X + 3,
        y: 10,
        w: 42,
        h: 128,
        label: "Escrever a mensagem",
        pick: () => this.focar(2),
      });
    }
    // carta enviada: o papel não volta, só a indicação e as ações
    if (enviado) {
      put(g, 4, LET.x + 8, 9, "carta enviada!");
      put(g, 3, LET.x + 8, 11, "seu app de e-mail deve abrir");
      put(g, 3, LET.x + 8, 12, "com a carta pronta.");
      put(g, 1, LET.x + 8, 14, "(abrir meu app de e-mail)");
      zonas.push({
        tipo: "a",
        x: LET.x + 8,
        y: 14,
        w: 25,
        href: this.mailto(s),
        alvo: "_self",
        label: "Abrir meu app de e-mail com a carta pronta",
      });
      put(g, 1, LET.x + 8, 16, "(escrever outra carta)");
      zonas.push({
        tipo: "b",
        x: LET.x + 8,
        y: 16,
        w: 22,
        label: "Escrever outra carta",
        pick: () => this.nova(),
      });
    }
    // botões
    if (!env) {
      put(g, 1, 5, 24, "(");
      put(g, 6, 6, 24, "e");
      put(g, 2, 7, 24, "nviar carta");
      put(g, 1, 18, 24, ")");
      zonas.push({
        tipo: "b",
        x: 5,
        y: 24,
        w: 14,
        label: "Enviar a carta (tecla e)",
        pick: () => this.enviar(),
      });
      put(g, 1, 21, 24, "(");
      put(g, 6, 22, 24, "l");
      put(g, 2, 23, 24, "impar");
      put(g, 1, 28, 24, ")");
      zonas.push({
        tipo: "b",
        x: 21,
        y: 24,
        w: 8,
        label: "Limpar a carta (tecla l)",
        pick: () => this.limpar(),
      });
    }

    // ---------- palco: o pato carteiro ----------
    let gx = POST,
      face = 0,
      anda = false,
      hop = 0,
      aberto = false,
      selo = false,
      envPos = null,
      bandeira = false;
    const cx0 = (LET.x + LET.w / 2) * CW,
      cy0 = (LET.y + LET.h / 2) * 16;
    const wingY = (GR - 7) * 16,
      slotX = 84 * CW,
      slotY = GR * 16 - 88 + 17;
    let fase = "";
    if (env && !enviado) {
      if (S < 21) {
        fase = S < 10 ? "dobra" : S < 19 ? "ensaca" : "sela";
      }
      if (S >= 15 && S < 21) {
        aberto = S < 17;
        selo = S >= 19;
        envPos = { x: cx0, y: cy0, e: ease((S - 15) / 2) };
      }
      if (S >= 21 && S < 31) {
        const p = ease((S - 21) / 10);
        const tx = (POST + 9) * CW;
        envPos = {
          x: cx0 + (tx - cx0) * p,
          y: cy0 + (wingY - cy0) * p - Math.sin(Math.PI * p) * 60,
          e: 1 - 0.35 * p,
        };
        selo = true;
        fase = "pega";
      }
      if (S >= 31 && S < 37) {
        const p = (S - 31) / 6;
        gx = POST + 7 * p;
        face = 1;
        anda = true;
        envPos = { x: (gx + 15) * CW, y: wingY, e: 0.65 };
        selo = true;
        fase = "anda";
      }
      if (S >= 37 && S < 39) {
        gx = POST + 7;
        face = 1;
        envPos = { x: (gx + 15) * CW, y: wingY, e: 0.65 };
        selo = true;
        fase = "anda";
      }
      if (S >= 39 && S < 45) {
        const p = ease((S - 39) / 6);
        gx = POST + 7;
        face = 1;
        envPos = {
          x: (gx + 15) * CW + (slotX - (gx + 15) * CW) * p,
          y: wingY + (slotY - wingY) * p,
          e: 0.65 - 0.45 * p,
        };
        selo = true;
        fase = "entrega";
      }
      if (S >= 45) bandeira = true;
      if (S >= 45 && S < 51) {
        gx = POST + 7;
        face = 1;
        hop = Math.round(Math.abs(Math.sin((S - 45) / 1.2)) * 2);
        fase = "festa";
      }
      if (S >= 51) {
        const p = (S - 51) / 7;
        gx = POST + 7 - 7 * p;
        face = 0;
        anda = true;
        bandeira = true;
        fase = "volta";
      }
    }
    if (enviado) bandeira = true;
    // caixa e bandeira
    rectsCaixa(ex, bandeira);
    chao(g, f);
    const tip = f - (s.tipT == null ? -99 : s.tipT) < 10;
    const digitando = f - (s.lastKey == null ? -99 : s.lastKey) < 6;
    const dy = anda
      ? Math.floor(f / 3) % 2
        ? 1
        : 0
      : Math.floor(f / 9) % 2
        ? 1
        : 0;
    let face2 = face;
    if (erro) face2 = Math.floor((f - s.erroT) * 1.5) % 2 ? 1 : 0;
    pintar(
      g,
      pixCarteiro(f, face2, anda, 2 - dy + hop * 0, tip, digitando && !env),
      Math.round(gx),
      GR - 14 - hop,
    );
    if (envPos) rectsEnv(ex, envPos.x, envPos.y, envPos.e, aberto, selo);
    zonas.push({
      tipo: "b",
      x: Math.round(gx),
      y: GR - 14,
      w: 24,
      h: 224,
      label: "Fazer o carteiro tirar o boné",
      pick: () => this.tirar(),
    });

    // balão de fala: sugestões engraçadinhas, comentários e fases do envio
    let texto,
      acoes = false,
      idx = 0;
    const rem = s.rem && f - s.rem.t < 16 ? s.rem.txt : null;
    if (env && !enviado)
      texto =
        {
          dobra: "dobrando a carta em três...",
          ensaca: "pro envelope, bem direitinho.",
          sela: "selando! (um selo de pato, claro)",
          pega: "dá aqui que eu levo!",
          anda: "a caminho da caixa de correio!",
          entrega: "plim! pra dentro.",
          festa: "entregue! (sem taxa extra)",
          volta: "missão cumprida. volto ao posto.",
        }[fase] || "...";
    else if (enviado) texto = "missão cumprida!";
    else if (erro) texto = "carta vazia? não levo!";
    else if (tip) texto = "quá! (tirei o boné)";
    else if (rem) texto = rem;
    else if (digitando)
      texto =
        msg.length > 260
          ? "textão! vou precisar de uma bolsa maior."
          : LENDO[Math.floor(msg.length / 14) % LENDO.length];
    else if (!msg && !foco && f < 30)
      texto = "clica na carta e escreve! (ou aceita uma sugestão minha)";
    else if (msg.length >= 20 && Math.floor(f / 30) % 2 === 0)
      texto = "pronta? é só mandar (enviar carta).";
    else {
      idx = ((s.sugI || 0) + Math.floor((f - (s.sugT || 0)) / 22)) % SUG.length;
      texto = SUG[idx][0];
      acoes = true;
    }
    const ls = quebra(texto, acoes ? 36 : 28).slice(0, 3);
    if (acoes) {
      ls.forEach((ln, i) => put(g, 3, SX0 + 2, 3 + i, ln));
      const ay = 3 + ls.length;
      put(g, 1, SX0 + 2, ay, "(");
      put(g, 6, SX0 + 3, ay, "u");
      put(g, 2, SX0 + 4, ay, "sar na carta");
      put(g, 1, SX0 + 16, ay, ")");
      zonas.push({
        tipo: "b",
        x: SX0 + 2,
        y: ay,
        w: 15,
        label: "Usar a sugestão na carta",
        pick: () => this.usar(idx),
      });
      put(g, 1, SX0 + 20, ay, "(");
      put(g, 2, SX0 + 21, ay, "outra");
      put(g, 1, SX0 + 26, ay, ")");
      zonas.push({
        tipo: "b",
        x: SX0 + 20,
        y: ay,
        w: 7,
        label: "Outra sugestão",
        pick: () => this.outra(),
      });
    } else {
      ls.forEach((ln, i) =>
        put(
          g,
          3,
          cl(Math.round(gx + 12 - ln.length / 2), SX0 + 2, 89 - ln.length),
          GR - 14 - ls.length + i,
          ln,
        ),
      );
    }

    put(g, 0, 1, 27, "├" + "─".repeat(89) + "┤");
    legenda(g, 3, 28, ["v", "e", "l"]);
    legenda2(g, 34, 28, "escrevendo:", ["tab", "ctrl+enter", "esc"]);

    return { camadas: split(g, ex), zonas };
  }
}

const CONFIG = {
  tema: "pf-tema-email",
  altura: 520,
  camadas: 15,
  ordemSvg: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14],
  negrito: [6],
  brilho: [],
  linhas: false,
  intervalo: 33,
  nitido: true,
  aria: "Página de e-mail. Digite a mensagem, v volta (fora dos campos)",
  descricao:
    "Carta de papel que se escreve sozinha enquanto você digita, com um pato carteiro que lê por cima do ombro, dobra a carta, ensaca, sela e entrega na caixa de correio",
};

/** @param {HTMLElement} raiz */
export function montar(raiz) {
  return montarTela(raiz, CONFIG, new Email());
}
