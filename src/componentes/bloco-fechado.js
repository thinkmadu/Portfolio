// BlocoFechado: lista do que está fechado num projeto (rótulo, texto, link). Ainda sem página que o use.

import { el } from "../util/dom.js";

/**
 * @typedef {{ rotulo: string, texto: string, link: string, href?: string }} ItemFechado
 */

/**
 * @param {Element} target
 * @param {{ titulo?: string, itens: ItemFechado[] }} opts
 */
function mount(target, opts) {
  target.classList.add("pf-bloco");
  target.replaceChildren(
    el("h2", { text: opts.titulo || "O que está fechado neste projeto" }),
    ...opts.itens.map((i) =>
      el("div", { class: "pf-item" }, [
        el("span", { class: "pf-k", text: i.rotulo }),
        el("span", { class: "pf-v", text: i.texto }),
        el("a", { text: i.link, attrs: { href: i.href || "#" } }),
      ]),
    ),
  );
}

export const BlocoFechado = Object.freeze({ mount });
