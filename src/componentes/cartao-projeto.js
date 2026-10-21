// CartaoProjeto: grade de cartões de projeto. Ainda sem página que o use.

import { el } from "../util/dom.js";

/**
 * @typedef {object} Projeto
 * @property {string} titulo
 * @property {string} resumo
 * @property {string[]} [tecnologias] até 4 aparecem
 * @property {string} [casoHref]
 * @property {string} [repoHref] ignorado quando `fechado`
 * @property {boolean} [fechado] código privado
 */

/**
 * @param {Element} target
 * @param {Projeto[]} projetos
 */
function mount(target, projetos) {
  target.classList.add("pf-cartoes");
  target.replaceChildren(
    ...projetos.map((p) => {
      const links = [
        el("a", { text: "Ver o caso", attrs: { href: p.casoHref || "#" } }),
      ];
      if (!p.fechado && p.repoHref)
        links.push(
          el("a", { text: "Abrir o repositório", attrs: { href: p.repoHref } }),
        );
      const filhos = [
        el("h3", { text: p.titulo }),
        el("p", { text: p.resumo }),
        el(
          "div",
          { class: "pf-tags" },
          (p.tecnologias || []).slice(0, 4).map((t) => el("span", { text: t })),
        ),
        el("div", { class: "pf-links" }, links),
      ];
      if (p.fechado)
        filhos.push(el("div", { class: "pf-privado", text: "código privado" }));
      return el("article", { class: "pf-cartao" }, filhos);
    }),
  );
}

export const CartaoProjeto = Object.freeze({ mount });
