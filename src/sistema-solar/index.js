// Componente SistemaSolar: o sol `(thinkmadu)` no centro, contatos e áreas em órbita,
// constelação de ajustes no alto à direita e a frase de assinatura no canto.
// É símbolo e menu: cada corpo é um link, e um menu em texto acompanha sempre.

import { D2R, TILT, at } from "./geometria.js";
import { fit } from "./layout.js";
import { campo } from "./fundo.js";
import {
  DEF_AREAS,
  DEF_CONTATOS,
  PADRAO,
  areasOf,
  buildCfg,
  contatosOf,
  nosOf,
  secOf,
  textosOf,
} from "./config.js";
import { el } from "../util/dom.js";

/** Rastro do meteoro, da cabeça para a cauda. */
const TR = ["*", "+", "+", ":", ":", ".", ".", ",", ",", "·"];
const MAX_METEOROS = 2;
/** Faixa de fontes medida de uma vez (o slider vai de 10 a 30). */
const FONTE_MIN = 10;
const FONTE_MAX = 30;

/**
 * @typedef {import('./config.js').Opcoes} Opcoes
 * @typedef {import('./layout.js').Layout} Layout
 * @typedef {import('./layout.js').Encaixe} Encaixe
 * @typedef {{ el: HTMLElement, cx: number, cy: number, o: import('./layout.js').Orbita | null, a: number }} Corpo
 */

/**
 * @param {Element} target
 * @param {Opcoes} [opts]
 * @returns {{ destroy(): void }}
 */
function mount(target, opts = {}) {
  const S = {
    fundo: opts.fundo ?? PADRAO.fundo,
    brilho: opts.brilho ?? PADRAO.brilho,
    orbitas: opts.orbitas ?? PADRAO.orbitas,
    meteoros: opts.meteoros ?? PADRAO.meteoros,
    fonte: opts.fonte ?? PADRAO.fonte,
    seed: opts.seed ?? PADRAO.seed,
  };
  const cfg = buildCfg(opts);
  const sec = secOf(opts);
  const sobreHref = opts.centroHref || "#sobre";
  const textos = textosOf(opts);

  // ---------- estrutura ----------
  /** @param {import('./config.js').Item} a */
  const itemMenu = (a) =>
    el("li", {}, [
      el("a", {
        text: a.rotulo,
        attrs: {
          href: a.href || "#",
          "data-r": a.id ?? a.rotulo,
          ...(a.atual ? { "aria-current": "true" } : {}),
          ...(a.lang ? { lang: a.lang } : {}),
        },
      }),
    ]);
  const itens = [
    el("li", {}, [el("a", { text: textos.sobre, attrs: { href: sobreHref } })]),
    ...contatosOf(opts).map(itemMenu),
    ...areasOf(opts).map(itemMenu),
  ];
  if (sec) {
    itens.push(
      itemMenu({
        id: sec.id,
        rotulo: sec.centro || "ajustes",
        href: sec.centroHref || "#ajustes",
      }),
      ...nosOf(sec).map(itemMenu),
    );
  }
  const haloG = el("div", {
    class: "pf-halo",
    attrs: { "aria-hidden": "true" },
  });
  const haloM = el("div", {
    class: "pf-halo",
    attrs: { "aria-hidden": "true" },
  });
  const field = el("pre", {
    class: "pf-field",
    attrs: { "aria-hidden": "true" },
  });
  const trk = el("div", { class: "pf-trk", attrs: { "aria-hidden": "true" } });
  const fx = el("div", { class: "pf-fx", attrs: { "aria-hidden": "true" } });
  const sys = el("nav", {
    class: "pf-sys",
    attrs: { "aria-label": textos.navSistema },
  });
  const skyEl = el("div", { class: "pf-solar-sky" }, [
    haloG,
    haloM,
    field,
    trk,
    fx,
    sys,
  ]);
  const menu = el(
    "nav",
    { class: "pf-menu", attrs: { "aria-label": textos.navMenu } },
    [el("ul", {}, itens)],
  );
  const filhos = [skyEl, menu];
  if (cfg.sig)
    filhos.push(
      el("p", {
        class: "pf-assina-txt",
        text: cfg.sig.join(" "),
        attrs: opts.assinaturaIdioma ? { lang: opts.assinaturaIdioma } : {},
      }),
    );
  target.classList.add("pf-solar");
  target.replaceChildren(...filhos);
  skyEl.style.setProperty("--pf-fb", String(S.fundo / 100));
  skyEl.style.setProperty("--pf-gl", String(S.brilho / 50));

  // ---------- estado ----------
  const mq = window.matchMedia
    ? window.matchMedia("(prefers-reduced-motion: reduce)")
    : null;
  let RM = !!(mq && mq.matches);
  let clock = 0;
  let hold = false;
  /** @type {Corpo[]} */
  let bodies = [];
  let geo = { cw: 10, lh: 20, Cv: 0, Rv: 0 };
  /** @type {Record<number, number>} */
  let cwCache = {};
  /** @type {Record<string, Encaixe>} */
  let fitCache = {};
  /** @type {Record<string, number>} */
  let grandeCache = {};
  let alive = true;
  let rafId = 0;
  let ultimaChave = "";

  /** Escala que algum ancestral aplica ao céu (o zoom do início); as medidas são em px do CSS. */
  const escalaDoCeu = () => {
    const w = skyEl.offsetWidth;
    return w ? skyEl.getBoundingClientRect().width / w : 1;
  };

  /**
   * Largura de um caractere em cada fonte. Mede a faixa inteira numa leitura só,
   * para forçar um único cálculo de layout em vez de um por fonte.
   * @param {number} fs
   */
  function charWidth(fs) {
    if (cwCache[fs]) return cwCache[fs];
    const fontes = [];
    for (let f = FONTE_MIN; f <= Math.max(FONTE_MAX, fs); f++)
      if (!cwCache[f]) fontes.push(f);
    if (!fontes.includes(fs)) fontes.push(fs);
    const amostra = "M".repeat(100);
    const spans = fontes.map((f) => {
      const s = el("span", { text: amostra });
      s.style.cssText = `position:absolute;visibility:hidden;white-space:pre;font-size:${f}px;line-height:1;font-family:inherit`;
      return s;
    });
    skyEl.append(...spans);
    const k = escalaDoCeu();
    fontes.forEach((f, i) => {
      const w = spans[i].getBoundingClientRect().width / k / 100;
      cwCache[f] = w || f * 0.6;
    });
    for (const s of spans) s.remove();
    return cwCache[fs];
  }

  /**
   * Largura de um texto nas palavras grandes da assinatura, a 100px, com o mesmo
   * espaçamento de letra do CSS.
   * @param {string} texto
   */
  function larguraGrande(texto) {
    if (grandeCache[texto]) return grandeCache[texto];
    const s = el("span", { class: "pf-ag-medida", text: texto });
    skyEl.append(s);
    const w = s.getBoundingClientRect().width / escalaDoCeu();
    s.remove();
    return (grandeCache[texto] = w || texto.length * 55);
  }

  function place() {
    for (const b of bodies) {
      let x = b.cx;
      let y = b.cy;
      if (b.o) {
        const P = at(b.o, b.a + (360 * clock) / b.o.T);
        x = P.x;
        y = P.y;
      }
      b.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    }
  }

  /**
   * Halo atrás de um sistema, do tamanho do oval dele.
   * @param {HTMLElement} halo
   * @param {{ rx: number, ry: number } | null} o
   * @param {{ cx: number, cy: number } | null} sun
   */
  function halo(halo, o, sun) {
    if (!o || !sun) {
      halo.style.display = "none";
      return;
    }
    const w = o.rx * 2.5;
    const hh = o.ry * 2.5;
    Object.assign(halo.style, {
      display: "",
      width: w.toFixed(0) + "px",
      height: hh.toFixed(0) + "px",
      left: (sun.cx - w / 2).toFixed(0) + "px",
      top: (sun.cy - hh / 2).toFixed(0) + "px",
      transform: `rotate(${TILT / D2R}deg)`,
    });
  }

  /**
   * Pontos do tracejado: órbitas inteiras e linhas da constelação, um a cada 1,4 caracteres.
   * @param {Layout} L
   * @param {number} cw
   */
  function tracejado(L, cw) {
    const frag = document.createDocumentFragment();
    /**
     * @param {number} px
     * @param {number} py
     */
    const dot = (px, py) => {
      const s = el("span", { text: "·" });
      s.style.left = px.toFixed(1) + "px";
      s.style.top = py.toFixed(1) + "px";
      frag.append(s);
    };
    /**
     * @param {{ x: number, y: number }} a
     * @param {{ x: number, y: number }} b
     */
    const segment = (a, b) => {
      const len = Math.sqrt(
        (b.x - a.x) * (b.x - a.x) + (b.y - a.y) * (b.y - a.y),
      );
      const n = Math.max(2, Math.round(len / (cw * 1.4)));
      for (let j = 1; j < n; j++)
        dot(a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n);
    };
    for (const o of L.orbits) {
      const per =
        Math.PI *
        (3 * (o.rx + o.ry) - Math.sqrt((3 * o.rx + o.ry) * (o.rx + 3 * o.ry)));
      const n = Math.max(24, Math.round(per / (cw * 1.4)));
      for (let j = 0; j < n; j++) {
        const P = at(o, (360 * j) / n);
        dot(P.x, P.y);
      }
    }
    if (L.hasCons && L.cons) {
      const hub = { x: L.cons.hub.cx, y: L.cons.hub.cy };
      const nd = L.cons.nodes.map((n) => ({ x: n.cx, y: n.cy }));
      for (const n of nd) segment(hub, n);
      for (let i = 0; i + 1 < nd.length; i++) segment(nd[i], nd[i + 1]);
      if (nd.length > 2) segment(nd[nd.length - 1], nd[0]);
    }
    trk.replaceChildren(frag);
  }

  /**
   * Link de um corpo celeste.
   * @param {object} p
   * @param {string} p.classe
   * @param {string} p.href
   * @param {string} p.texto
   * @param {string} [p.rotulo] devolvido a `aoEscolher` (o id do item, ou o rótulo)
   * @param {string} [p.ariaLabel]
   * @param {string} [p.lang] idioma do texto
   * @param {boolean} [p.atual]
   * @param {string} [p.fonte]
   * @param {string} p.atraso
   */
  function corpo({
    classe,
    href,
    texto,
    rotulo,
    ariaLabel,
    lang,
    atual,
    fonte,
    atraso,
  }) {
    const a = el("a", {
      class: "pf-pl" + (classe ? " " + classe : "") + (atual ? " pf-on" : ""),
      text: texto,
      attrs: { href },
    });
    if (rotulo != null) a.dataset.r = rotulo;
    if (ariaLabel) a.setAttribute("aria-label", ariaLabel);
    if (lang) a.lang = lang;
    if (atual) a.setAttribute("aria-current", "true");
    if (fonte) a.style.fontSize = fonte;
    a.style.animationDelay = atraso;
    return a;
  }

  /**
   * Frase em tamanhos mistos: cada trecho num span, na ordem de leitura e com espaço entre
   * eles, para o leitor de tela ler a frase inteira. Caixa e medidas vêm do layout.
   * @param {import('./layout.js').Assinatura} sig
   * @param {import('./layout.js').MedidasGrande} m
   */
  function assinaturaGrande(sig, m) {
    const t = m.textos;
    const px = (/** @type {number} */ v) => v.toFixed(2) + "px";
    const p = el("p", { class: "pf-assina pf-assina-g" }, [
      el("span", { class: "pf-ag-p", text: t.pequeno1 }),
      " ",
      el("span", { class: "pf-ag-g", text: t.grande1 }),
      " ",
      el("span", { class: "pf-ag-p", text: t.pequeno2 }),
      " ",
      el("span", {
        class: "pf-ag-g pf-ag-acento",
        text: t.grande2,
      }),
      " ",
      el("span", { class: "pf-ag-rodape" }, [
        el("span", { text: t.rodape[0] }),
        " ",
        el("span", { text: t.rodape[1] }),
      ]),
    ]);
    if (opts.assinaturaIdioma) p.lang = opts.assinaturaIdioma;
    const st = p.style;
    st.left = px(sig.cx - sig.w / 2);
    st.top = px(sig.cy - sig.h / 2);
    st.width = px(sig.w);
    st.height = px(sig.h);
    st.setProperty("--pf-ag", px(m.s));
    st.setProperty("--pf-ap", px(m.ap));
    st.setProperty("--pf-ag-descida", px(m.descida));
    st.setProperty("--pf-ag-folga", px(m.folga));
    st.setProperty("--pf-ap-respiro", px(m.respiro));
    return p;
  }

  /**
   * Corpos e frase de assinatura.
   * @param {Layout} L
   */
  function corpos(L) {
    const miniPx = (L.fs * L.mem).toFixed(2);
    /** @type {Corpo[]} */
    const lista = [];
    /** @type {HTMLElement[]} */
    const nos = [];
    /**
     * @param {HTMLElement} e
     * @param {number} cx
     * @param {number} cy
     * @param {import('./layout.js').Orbita | null} o
     * @param {number} a
     */
    const add = (e, cx, cy, o, a) => {
      if (o) {
        // passar o mouse ou focar um planeta pausa o sistema todo
        const pausa = () => (hold = true);
        const segue = () => (hold = false);
        e.addEventListener("mouseenter", pausa);
        e.addEventListener("focus", pausa);
        e.addEventListener("mouseleave", segue);
        e.addEventListener("blur", segue);
      }
      nos.push(e);
      lista.push({ el: e, cx, cy, o, a });
    };
    add(
      corpo({
        classe: "pf-sun",
        href: sobreHref,
        texto: cfg.sunG,
        ariaLabel: textos.sobreAria,
        atraso: "-1s",
      }),
      L.suns[0].cx,
      L.suns[0].cy,
      null,
      0,
    );
    if (L.hasCons && L.cons && cfg.cons) {
      const centro = (sec && sec.centro) || "ajustes";
      add(
        corpo({
          classe: "pf-minisun",
          href: (sec && sec.centroHref) || "#ajustes",
          texto: cfg.cons.sunM,
          rotulo: (sec && sec.id) ?? centro,
          ariaLabel: centro,
          fonte: (Number(miniPx) * 1.1).toFixed(2) + "px",
          atraso: "-2s",
        }),
        L.cons.hub.cx,
        L.cons.hub.cy,
        null,
        0,
      );
      L.cons.nodes.forEach((n, k) =>
        add(
          corpo({
            classe: "",
            href: n.href,
            texto: n.t,
            rotulo: n.id ?? n.rotulo,
            lang: n.lang,
            atual: n.atual,
            fonte: miniPx + "px",
            atraso: (-(1 + k * 0.9)).toFixed(1) + "s",
          }),
          n.cx,
          n.cy,
          null,
          0,
        ),
      );
    }
    let n2 = 0;
    for (const o of L.orbits)
      for (const p of o.pl)
        add(
          corpo({
            classe: "",
            href: p.href,
            texto: p.t,
            rotulo: p.id ?? p.rotulo,
            lang: p.lang,
            atual: p.atual,
            atraso: (-(n2++ * 0.7)).toFixed(1) + "s",
          }),
          0,
          0,
          o,
          p.a,
        );
    if (L.sig && L.sig.grande) nos.push(assinaturaGrande(L.sig, L.sig.grande));
    else if (L.sig) {
      const p = el("p", { class: "pf-assina", text: L.sig.lines.join("\n") });
      p.style.fontSize = miniPx + "px";
      p.style.left =
        (L.sig.cx + L.sig.w / 2 - 0.35 * L.sig.cwm).toFixed(1) + "px";
      p.style.top = L.sig.cy.toFixed(1) + "px";
      if (opts.assinaturaIdioma) p.lang = opts.assinaturaIdioma;
      nos.push(p);
    }
    sys.replaceChildren(...nos);
    bodies = lista;
    hold = false;
  }

  function draw() {
    const W = skyEl.clientWidth;
    const H = skyEl.clientHeight;
    if (!W || !H) return;
    const fs = S.fonte;
    const cw = charWidth(fs);
    const key = fs + "x" + W + "x" + H;
    ultimaChave = key;
    const F =
      fitCache[key] ||
      (fitCache[key] = fit(cfg, fs, W, H, charWidth, {
        medirGrande: larguraGrande,
      }));
    /** @type {Layout} */
    let L = F.L;
    // sem arranjo sem sobreposição (janela pequena demais): só o sol sobre o fundo,
    // e o menu em texto vira a navegação
    target.classList.toggle("pf-compacto", !F.ok);
    if (!F.ok)
      L = {
        ...L,
        fs: Math.min(fs, 16),
        mem: 0.72,
        orbits: [],
        cons: null,
        hasCons: false,
        sig: null,
        suns: [{ cx: W / 2, cy: H / 2, w: 0, h: 0 }],
        fixed: [],
      };
    const lh = fs * 1.17;
    for (const e of [field, trk, fx]) e.style.fontSize = fs + "px";
    sys.style.fontSize = L.fs + "px";
    const Cv = Math.max(24, Math.floor(W / cw));
    const Rv = Math.max(10, Math.floor(H / lh));
    geo = { cw, lh, Cv, Rv };
    const { html, piscadas } = campo({
      C: Cv + 2,
      R: Rv + 2,
      Cv,
      seed: S.seed,
      sois: L.suns.map((s) => ({ x: s.cx / cw, y: s.cy / lh })),
    });
    // o HTML do campo só tem caracteres fixos escapados e classes; atraso e duração
    // das piscadas entram por CSSOM
    field.innerHTML = html;
    field.querySelectorAll(".pf-tw").forEach((e, i) => {
      const s = /** @type {HTMLElement} */ (e).style;
      s.animationDelay = piscadas[i].atraso;
      s.animationDuration = piscadas[i].duracao;
    });
    tracejado(L, cw);
    const gOut = L.orbits.length ? L.orbits[L.orbits.length - 1] : null;
    halo(haloG, gOut, L.suns[0]);
    halo(
      haloM,
      L.hasCons ? L.cons : null,
      L.hasCons && L.cons ? L.cons.hub : null,
    );
    corpos(L);
    place();
  }

  // ---------- meteoros ----------
  /** @type {{ x: number, y: number, vx: number, vy: number, t0: number }[]} */
  let met = [];
  let nextAt = 0;
  let lastT = 0;
  let lastFrame = 0;
  // rastro reaproveitado: no máximo MAX_METEOROS x TR.length spans, sem recriar a cada quadro
  const rastro = Array.from({ length: MAX_METEOROS * TR.length }, () => {
    const s = el("span");
    s.hidden = true;
    return s;
  });
  fx.append(...rastro);
  let visiveis = 0;

  /** @param {number} now */
  function meteoros(now) {
    if (
      S.meteoros > 0 &&
      now > nextAt &&
      met.length < MAX_METEOROS &&
      geo.Cv > 0
    ) {
      const dir = Math.random() < 0.5 ? 1 : -1;
      met.push({
        x:
          dir > 0
            ? Math.random() * geo.Cv * 0.8
            : geo.Cv - Math.random() * geo.Cv * 0.8,
        y: -3,
        vx: dir * (34 + Math.random() * 14),
        vy: 17 + Math.random() * 7,
        t0: now,
      });
      nextAt =
        now + (2500 + Math.random() * 6500) * (50 / Math.max(5, S.meteoros));
    }
    if (!met.length && !visiveis) return;
    let usados = 0;
    met = met.filter((m) => {
      const t = (now - m.t0) / 1000;
      const hy = m.y + m.vy * t;
      if (hy > geo.Rv + 12) return false;
      for (let k = 0; k < TR.length; k++) {
        const tt = t - k * 0.03;
        const px = Math.round(m.x + m.vx * tt);
        const py = Math.round(m.y + m.vy * tt);
        if (px < 0 || px >= geo.Cv || py < 0 || py >= geo.Rv) continue;
        const s = rastro[usados++];
        s.className = k === 0 ? "pf-mh" : "";
        s.textContent = TR[k];
        s.style.left = (px * geo.cw).toFixed(1) + "px";
        s.style.top = (py * geo.lh).toFixed(1) + "px";
        s.style.opacity = (1 - k / TR.length).toFixed(2);
        s.hidden = false;
      }
      return true;
    });
    for (let i = usados; i < visiveis; i++) rastro[i].hidden = true;
    visiveis = usados;
  }

  /** @param {number} now */
  function frame(now) {
    if (!alive) return;
    if (!target.isConnected) {
      alive = false;
      return;
    }
    if (RM) {
      rafId = 0;
      return;
    }
    rafId = requestAnimationFrame(frame);
    const dt = lastFrame ? Math.min(0.1, (now - lastFrame) / 1000) : 0;
    lastFrame = now;
    if (dt > 0 && bodies.length && !hold) {
      clock += dt * (S.orbitas / 100);
      place();
    }
    if (now - lastT < 33) return;
    lastT = now;
    meteoros(now);
  }

  function ligarLaco() {
    if (alive && !RM && !rafId) {
      lastFrame = 0;
      rafId = requestAnimationFrame(frame);
    }
  }

  // com movimento reduzido, nada se mexe: some o meteoro em curso e o laço para
  /** @param {MediaQueryListEvent} e */
  function aoMudarMovimento(e) {
    RM = e.matches;
    if (RM) {
      met = [];
      for (const s of rastro) s.hidden = true;
      visiveis = 0;
    } else ligarLaco();
  }
  if (mq) mq.addEventListener("change", aoMudarMovimento);

  // clique num corpo ou no item do menu em texto: `aoEscolher` recebe o id (ou o rótulo); se devolver
  // `false`, o link segue o href normalmente
  /** @param {MouseEvent} e */
  function aoClicar(e) {
    const alvo =
      e.target instanceof Element ? e.target.closest("a[data-r]") : null;
    if (alvo && opts.aoEscolher) {
      if (opts.aoEscolher(alvo.getAttribute("data-r") || "") !== false)
        e.preventDefault();
    }
  }
  if (opts.aoEscolher) {
    sys.addEventListener("click", aoClicar);
    menu.addEventListener("click", aoClicar);
  }

  // redesenha só quando o tamanho muda, com espera de 120ms para não refazer o encaixe a cada pixel
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  function redraw() {
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (!alive) return;
      if (
        S.fonte + "x" + skyEl.clientWidth + "x" + skyEl.clientHeight !==
        ultimaChave
      )
        draw();
    }, 120);
  }
  /** @type {ResizeObserver | null} */
  let ro = null;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(redraw);
    ro.observe(skyEl);
  } else window.addEventListener("resize", redraw);

  draw();

  // com as fontes carregadas, as larguras podem mudar: mede de novo e só refaz se mudou
  function conferirFontes() {
    if (!alive) return;
    const antes = cwCache[S.fonte];
    const textos = cfg.sigGrande
      ? [cfg.sigGrande.grande1, cfg.sigGrande.grande2]
      : [];
    const antesG = textos.map((t) => grandeCache[t]);
    cwCache = {};
    grandeCache = {};
    const mudou =
      charWidth(S.fonte) !== antes ||
      textos.some((t, i) => larguraGrande(t) !== antesG[i]);
    if (mudou) {
      fitCache = {};
      draw();
    }
  }
  if (document.fonts && document.fonts.ready) {
    /** @type {Promise<unknown>[]} */
    const cargas = [document.fonts.ready];
    // pede a fonte das palavras grandes explicitamente: o ready pode resolver antes de ela entrar na fila
    if (cfg.sigGrande)
      cargas.push(
        document.fonts
          .load(
            '700 100px "Familjen Grotesk"',
            cfg.sigGrande.grande1 + cfg.sigGrande.grande2,
          )
          .catch(() => []),
      );
    Promise.all(cargas).then(conferirFontes);
  }
  ligarLaco();

  return {
    destroy() {
      alive = false;
      cancelAnimationFrame(rafId);
      clearTimeout(timer);
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", redraw);
      if (mq) mq.removeEventListener("change", aoMudarMovimento);
      sys.removeEventListener("click", aoClicar);
      menu.removeEventListener("click", aoClicar);
      target.replaceChildren();
      target.classList.remove("pf-solar", "pf-compacto");
    },
  };
}

export const SistemaSolar = Object.freeze({
  areas: DEF_AREAS,
  contatos: DEF_CONTATOS,
  mount,
});
