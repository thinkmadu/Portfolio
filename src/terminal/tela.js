// Tela em terminal: desenha as camadas de uma cena na grade de caracteres, cuida da animação
// (30 quadros por segundo, ou um quadro só com movimento reduzido), das zonas clicáveis e do teclado.
// A cena decide o que cada quadro mostra; este arquivo só o põe na tela.

import { el } from "../util/dom.js";
import { LARGURA, MARGEM } from "./grade.js";

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
      class: `pf-tela ${cfg.tema}`,
      attrs: { tabindex: "0", "aria-label": cfg.aria },
      style: { height: cfg.altura + "px" },
    },
    [imagem, zonasEl],
  );
  const escala = el("div", { class: "pf-escala" }, [tela]);
  const palco = el("div", { class: "pf-palco" }, [escala]);
  raiz.replaceChildren(palco);

  function ajustar() {
    const k = Math.min(1, innerWidth / LARGURA, innerHeight / cfg.altura);
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
    const sig = JSON.stringify(
      q.zonas.map((z) => [z.tipo, z.x, z.y, z.w, z.h, z.label, z.href, z.alvo]),
    );
    if (sig !== assinatura) {
      assinatura = sig;
      zonasEl.replaceChildren(
        ...q.zonas.map((z, i) => {
          const pos = {
            left: Math.round(MARGEM.x + z.x * 7.8) - 2 + "px",
            top: MARGEM.y + z.y * 16 + "px",
            width: Math.round(z.w * 7.8) + 4 + "px",
            height: (z.h ?? 16) + "px",
          };
          if (z.tipo === "a")
            return el("a", {
              class: "pf-t-zona",
              attrs: {
                href: z.href || "#",
                target: z.alvo || "_self",
                rel: "noopener",
                "aria-label": z.label,
              },
              style: pos,
            });
          const b = el("button", {
            class: "pf-t-zona",
            attrs: {
              type: "button",
              "aria-label": z.label,
              "data-z": String(i),
            },
            style: pos,
          });
          return b;
        }),
      );
    }
    zonasAtuais = q.zonas;
  }
  /** @type {Zona[]} */
  let zonasAtuais = [];

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
      cena.desmontar();
      raiz.replaceChildren();
    },
  };
}
