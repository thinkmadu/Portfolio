// Painel de ajustes do fundo: ferramenta de teste da Madu, carregada só quando (ajustes) é clicado.

import { el } from "../util/dom.js";

/** @typedef {import('../sistema-solar/config.js').Ajustes} Ajustes */
/** @typedef {import('../i18n/index.js').Chave} Chave */
/** @typedef {(chave: Chave, vars?: Record<string, string | number>) => string} Traduz */

/** @type {[keyof Ajustes, Chave, number, number, number][]} */
const CONTROLES = [
  ["fundo", "painel.fundo", 4, 60, 1],
  ["brilho", "painel.brilho", 0, 100, 1],
  ["orbitas", "painel.orbitas", 0, 200, 5],
  ["meteoros", "painel.meteoros", 0, 100, 1],
  ["fonte", "painel.fonte", 10, 30, 1],
];

/**
 * Cria o painel (escondido) no fim do `body`.
 * @param {object} p
 * @param {Ajustes} p.ajustes estado compartilhado com a página; o painel altera no lugar
 * @param {() => void} p.aoMudar chamado depois de cada mudança
 * @param {Traduz} p.t textos no idioma da página
 * @returns {{ alternar(): void, fechar(): void, atualizar(): void, traduzir(t: Traduz): void }}
 */
export function criarPainel({ ajustes: S, aoMudar, t }) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const texto = el("p", {
    class: "pf-ajustes-leitura",
    attrs: { "aria-live": "polite" },
  });
  /** @type {[HTMLElement, Chave][]} */
  const nomes = [];
  const rotulos = CONTROLES.map(([id, chave, min, max, passo]) => {
    const entrada = el("input", {
      attrs: {
        id: "s-" + id,
        type: "range",
        min: String(min),
        max: String(max),
        step: String(passo),
      },
    });
    entrada.value = String(S[id]);
    const saida = el("output", {
      text: String(S[id]),
      attrs: { for: "s-" + id },
    });
    entrada.addEventListener("input", () => {
      S[id] = Number(entrada.value);
      saida.textContent = String(S[id]);
      clearTimeout(timer);
      timer = setTimeout(aoMudar, 80);
    });
    const nome = el("span");
    nomes.push([nome, chave]);
    return el("label", { attrs: { for: "s-" + id } }, [
      nome,
      " ",
      entrada,
      saida,
    ]);
  });
  const sortear = el("button", { attrs: { type: "button" } });
  nomes.push([sortear, "painel.sortear"]);
  sortear.addEventListener("click", () => {
    S.seed = Math.floor(Math.random() * 9000) + 1;
    aoMudar();
  });
  const painel = el("section", { class: "pf-ajustes" }, [
    ...rotulos,
    sortear,
    texto,
  ]);
  painel.hidden = true;
  document.body.append(painel);

  /** @param {Traduz} novo */
  function traduzir(novo) {
    t = novo;
    painel.setAttribute("aria-label", t("painel.aria"));
    for (const [e, chave] of nomes) e.textContent = t(chave);
    texto.textContent = t("painel.leitura", S);
  }
  traduzir(t);

  function fechar() {
    painel.hidden = true;
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") fechar();
  });

  return {
    alternar() {
      painel.hidden = !painel.hidden;
      if (!painel.hidden)
        /** @type {HTMLElement} */ (painel.querySelector("input")).focus();
    },
    fechar,
    atualizar() {
      texto.textContent = t("painel.leitura", S);
    },
    traduzir,
  };
}
