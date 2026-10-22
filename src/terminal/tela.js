// Tela em terminal: desenha as camadas de uma cena na grade de caracteres, cuida da animação
// (30 quadros por segundo, ou um quadro só com movimento reduzido), das zonas clicáveis e do teclado.
// A cena decide o que cada quadro mostra; este arquivo só o põe na tela.

import { el, hrefSeguro } from "../util/dom.js";
import { CW, LARGURA, LH, MARGEM } from "./grade.js";
import { PADRAO } from "../sistema-solar/config.js";
import { campo } from "../sistema-solar/fundo.js";

/** @typedef {import("./grade.js").Camadas} Camadas */
/**
 * Zona clicável, em colunas e linhas da grade. `a` é um link, `b` um botão.
 * @typedef {{ tipo: "a" | "b", x: number, y: number, w: number, h?: number, label: string,
 *   href?: string, alvo?: string, pick?: () => void }} Zona
 */
/** @typedef {{ camadas: Camadas, zonas: Zona[] }} Quadro */
/**
 * @typedef {Object} Config
 * @property {string} tema classe de cor da página, em estilos/terminal.css
 * @property {number} altura altura da tela em px
 * @property {number} camadas quantas camadas de cor a cena usa
 * @property {number[]} ordemSvg ordem de desenho das camadas de forma (fundos primeiro)
 * @property {number[]} [negrito] camadas em negrito
 * @property {number[]} [brilho] camadas com brilho de fósforo
 * @property {boolean} [linhas] linhas de varredura por cima
 * @property {boolean} [nitido] formas de borda seca, para pixel art sem emendas
 * @property {number} [intervalo] ms entre quadros (padrão 33)
 * @property {string} aria descrição da página para leitor de tela
 * @property {string} descricao descrição da imagem
 */

/** Estado e ciclo de vida de uma cena; `setState` só marca que o quadro mudou. */
export class Cena {
  constructor() {
    /** @type {Record<string, any>} */
    this.state = {};
    this.sujo = true;
  }
  /** @param {Record<string, any>} u */
  setState(u) {
    Object.assign(this.state, u);
    this.sujo = true;
  }
  /** Chamada ao entrar na tela. */
  montar() {}
  /** Chamada ao sair da tela. */
  desmontar() {}
  /** Avança o relógio; chamada a cada quadro. */
  tick() {}
  /** @param {KeyboardEvent} _e */
  // eslint-disable-next-line no-unused-vars
  teclar(_e) {}
  /** @returns {Quadro} */
  quadro() {
    return { camadas: {}, zonas: [] };
  }
}

const NS = "http://www.w3.org/2000/svg";

/**
 * Fundo das páginas: o mesmo campo de caracteres da abertura (mesma semente e corpo de fonte),
 * com o brilho no centro da tela, refeito quando a janela muda de tamanho.
 * @param {HTMLElement} fundo
 * @returns {() => void} remove o que foi ligado
 */
function fundoDePagina(fundo) {
  const halo = el("div", {
    class: "pf-halo",
    attrs: { "aria-hidden": "true" },
  });
  const campoEl = el("pre", {
    class: "pf-field",
    attrs: { "aria-hidden": "true" },
  });
  fundo.append(halo, campoEl);
  const fs = PADRAO.fonte;
  campoEl.style.fontSize = fs + "px";
  const cw = fs * 0.6;
  const lh = fs * 1.17;
  function desenhar() {
    const W = innerWidth;
    const H = innerHeight;
    const Cv = Math.max(24, Math.floor(W / cw));
    const Rv = Math.max(10, Math.floor(H / lh));
    const { html, piscadas } = campo({
      C: Cv + 2,
      R: Rv + 2,
      Cv,
      seed: PADRAO.seed,
      sois: [{ x: W / 2 / cw, y: H / 2 / lh }],
    });
    // só caracteres escapados e classes; atraso e duração das piscadas entram por CSSOM
    campoEl.innerHTML = html;
    campoEl.querySelectorAll(".pf-tw").forEach((e, i) => {
      const st = /** @type {HTMLElement} */ (e).style;
      st.animationDelay = piscadas[i].atraso;
      st.animationDuration = piscadas[i].duracao;
    });
    const r = Math.hypot(W, H) * 0.42;
    halo.style.left = W / 2 - r + "px";
    halo.style.top = H / 2 - r + "px";
    halo.style.width = halo.style.height = r * 2 + "px";
  }
  desenhar();
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let espera;
  const aoRedimensionar = () => {
    clearTimeout(espera);
    espera = setTimeout(desenhar, 120);
  };
  addEventListener("resize", aoRedimensionar);
  return () => {
    clearTimeout(espera);
    removeEventListener("resize", aoRedimensionar);
  };
}

/** A pessoa pediu menos movimento? As cenas mostram o estado final. */
export const movimentoReduzido = () =>
  typeof matchMedia === "function" &&
  matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * Monta a tela em `raiz` e devolve `destroy`.
 * @param {HTMLElement} raiz
 * @param {Config} cfg
 * @param {Cena} cena
 */
export function montarTela(raiz, cfg, cena) {
  const camadas = Array.from({ length: cfg.camadas }, (_, k) => k);

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("width", String(LARGURA));
  svg.setAttribute("height", String(cfg.altura));
  svg.classList.add("pf-t-svg");
  const g = document.createElementNS(NS, "g");
  g.setAttribute("transform", `translate(${MARGEM.x} ${MARGEM.y})`);
  svg.append(g);
  /** @type {Record<string, SVGPathElement>} */
  const tracos = {};
  for (const k of cfg.ordemSvg) {
    for (const [pre, cls] of /** @type {const} */ ([
      ["s", "pf-t-traco"],
      ["f", "pf-t-forma"],
    ])) {
      const p = document.createElementNS(NS, "path");
      p.setAttribute("class", `${cls} c${k}`);
      g.append(p);
      tracos[pre + k] = p;
    }
  }

  /** @type {Record<string, HTMLElement>} */
  const textos = {};
  const pres = camadas.map((k) => {
    const cls = ["pf-t-texto", "c" + k];
    if (cfg.negrito?.includes(k)) cls.push("neg");
    if (cfg.brilho?.includes(k)) cls.push("bri");
    const pre = el("pre", {
      class: cls.join(" "),
      attrs: { "aria-hidden": "true" },
    });
    textos["l" + k] = pre;
    return pre;
  });

  const zonasEl = el("div", { class: "pf-t-zonas" });
  const imagem = el(
    "div",
    {
      class: "pf-t-imagem",
      attrs: { role: "img", "aria-label": cfg.descricao },
    },
    [svg, ...pres],
  );
  if (cfg.linhas)
    imagem.append(
      el("div", { class: "pf-t-linhas", attrs: { "aria-hidden": "true" } }),
    );

  const tela = el(
    "div",
    {
      class: `pf-tela ${cfg.tema}${cfg.nitido ? " nitido" : ""}`,
      attrs: { tabindex: "0", "aria-label": cfg.aria },
      style: { height: cfg.altura + "px" },
    },
    [imagem, zonasEl],
  );
  const escala = el("div", { class: "pf-escala" }, [tela]);
  const fundo = el("div", {
    class: "pf-fundo-pagina",
    attrs: { "aria-hidden": "true" },
  });
  const palco = el("div", { class: `pf-palco ${cfg.tema}` }, [fundo, escala]);
  raiz.replaceChildren(palco);
  const soltarFundo = fundoDePagina(fundo);

  function ajustar() {
    // preenche a janela inteira, sem passar da proporção da tela
    const k = Math.min(innerWidth / LARGURA, innerHeight / cfg.altura);
    escala.style.width = LARGURA * k + "px";
    escala.style.height = cfg.altura * k + "px";
    tela.style.transform = `scale(${k})`;
  }
  ajustar();
  addEventListener("resize", ajustar);

  let assinatura = "";
  function desenhar() {
    const q = cena.quadro();
    cena.sujo = false;
    for (const k in q.camadas) {
      const v = q.camadas[k];
      const alvo = k[0] === "l" ? textos[k] : tracos[k];
      if (!alvo) continue;
      if (k[0] === "l") alvo.textContent = v;
      else alvo.setAttribute("d", v);
    }
    // a estrutura (tipo, rótulo, destino) decide se os elementos são recriados; só a posição
    // muda no quadro a quadro, e então os mesmos elementos são movidos (clique e foco não se perdem)
    const sig = JSON.stringify(
      q.zonas.map((z) => [z.tipo, z.label, z.href, z.alvo]),
    );
    const caixas = q.zonas.map((z) => ({
      left: Math.round(MARGEM.x + z.x * CW) - 2 + "px",
      top: MARGEM.y + z.y * LH + "px",
      width: Math.round(z.w * CW) + 4 + "px",
      height: (z.h ?? LH) + "px",
    }));
    if (sig !== assinatura) {
      assinatura = sig;
      zonasEl.replaceChildren(
        ...q.zonas.map((z, i) => {
          if (z.tipo === "a")
            return el("a", {
              class: "pf-t-zona",
              attrs: {
                href: hrefSeguro(z.href || "#"),
                target: z.alvo || "_self",
                rel: "noopener noreferrer",
                "aria-label": z.label,
              },
              style: caixas[i],
            });
          return el("button", {
            class: "pf-t-zona",
            attrs: {
              type: "button",
              "aria-label": z.label,
              "data-z": String(i),
            },
            style: caixas[i],
          });
        }),
      );
      caixasAtuais = caixas;
    } else {
      q.zonas.forEach((_, i) => {
        const e = /** @type {HTMLElement} */ (zonasEl.children[i]);
        for (const k of /** @type {const} */ ([
          "left",
          "top",
          "width",
          "height",
        ]))
          if (caixas[i][k] !== caixasAtuais[i][k]) e.style[k] = caixas[i][k];
      });
      caixasAtuais = caixas;
    }
    zonasAtuais = q.zonas;
  }
  /** @type {Zona[]} */
  let zonasAtuais = [];
  /** @type {Record<"left" | "top" | "width" | "height", string>[]} */
  let caixasAtuais = [];

  zonasEl.addEventListener("click", (e) => {
    const b = /** @type {HTMLElement} */ (e.target).closest("button[data-z]");
    if (!b) return;
    zonasAtuais[Number(b.getAttribute("data-z"))]?.pick?.();
    if (cena.sujo) desenhar();
  });
  tela.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    cena.teclar(e);
    if (cena.sujo) desenhar();
  });

  cena.montar();
  desenhar();
  const parado = movimentoReduzido();
  const timer = parado
    ? 0
    : setInterval(() => {
        cena.tick();
        desenhar();
      }, cfg.intervalo ?? 33);
  tela.focus({ preventScroll: true });

  return {
    destroy() {
      clearInterval(timer);
      removeEventListener("resize", ajustar);
      soltarFundo();
      cena.desmontar();
      raiz.replaceChildren();
    },
  };
}
