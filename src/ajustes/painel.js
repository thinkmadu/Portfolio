// Painel de ajustes do fundo: ferramenta de teste da Madu, carregada só quando (ajustes) é clicado.

import { el } from "../util/dom.js";

/** @typedef {import('../sistema-solar/config.js').Ajustes} Ajustes */

/** @type {[keyof Ajustes, string, number, number, number][]} */
const CONTROLES = [
  ["fundo", "Fundo", 4, 60, 1],
  ["brilho", "Brilho", 0, 100, 1],
  ["orbitas", "Órbitas", 0, 200, 5],
  ["meteoros", "Meteoros", 0, 100, 1],
  ["fonte", "Fonte", 10, 30, 1],
];

/**
 * @param {Ajustes} S
 */
function leitura(S) {
  return `fundo ${S.fundo} · brilho ${S.brilho} · órbitas ${S.orbitas} · meteoros ${S.meteoros} · fonte ${S.fonte} · semente ${S.seed}`;
}

/**
 * Cria o painel (escondido) no fim do `body`.
 * @param {object} p
 * @param {Ajustes} p.ajustes estado compartilhado com a página; o painel altera no lugar
 * @param {() => void} p.aoMudar chamado depois de cada mudança
 * @returns {{ alternar(): void, fechar(): void, atualizar(): void }}
 */
export function criarPainel({ ajustes: S, aoMudar }) {
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let timer;
  const texto = el("p", {
    class: "pf-ajustes-leitura",
    attrs: { "aria-live": "polite" },
  });
  const rotulos = CONTROLES.map(([id, nome, min, max, passo]) => {
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
    return el("label", { attrs: { for: "s-" + id } }, [
      nome + " ",
      entrada,
      saida,
    ]);
  });
  const sortear = el("button", {
    text: "Sortear outro fundo",
    attrs: { type: "button" },
  });
  sortear.addEventListener("click", () => {
    S.seed = Math.floor(Math.random() * 9000) + 1;
    aoMudar();
  });
  const painel = el(
    "section",
    { class: "pf-ajustes", attrs: { "aria-label": "Ajustes do fundo" } },
    [...rotulos, sortear, texto],
  );
  painel.hidden = true;
  document.body.append(painel);

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
      texto.textContent = leitura(S);
    },
  };
}
