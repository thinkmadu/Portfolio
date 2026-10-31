// Páginas em terminal, abertas pelo hash da URL (`#ferramentas`). Cada módulo é carregado
// só quando a página é aberta e exporta `montar(raiz, idioma)`, que devolve `{ destroy }`.
// O idioma vale na montagem: trocá-lo com a página aberta não a remonta.

/** @typedef {{ destroy(): void }} Montada */
/** @typedef {import("../i18n/idioma.js").Idioma} Idioma */
/** @typedef {(raiz: HTMLElement, idioma?: Idioma) => Montada} Montar */

/** @type {Record<string, () => Promise<{ montar: Montar }>>} */
export const PAGINAS = {
  sobre: () => import("./sobre.js"),
  ia: () => import("./ia.js"),
  ferramentas: () => import("./ferramentas.js"),
  testes: () => import("./testes.js"),
  email: () => import("./email.js"),
};

/**
 * Id da página pedida pelo hash, ou null para a abertura.
 * @param {string} hash
 */
export function paginaDoHash(hash) {
  const id = hash.replace(/^#/, "");
  return Object.hasOwn(PAGINAS, id) ? id : null;
}
