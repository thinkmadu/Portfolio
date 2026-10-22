// Páginas em terminal, abertas pelo hash da URL (`#ferramentas`). Cada módulo é carregado
// só quando a página é aberta e exporta `montar(raiz)`, que devolve `{ destroy }`.

/** @typedef {{ destroy(): void }} Montada */
/** @typedef {(raiz: HTMLElement) => Montada} Montar */

/** @type {Record<string, () => Promise<{ montar: Montar }>>} */
export const PAGINAS = {};

/**
 * Id da página pedida pelo hash, ou null para a abertura.
 * @param {string} hash
 */
export function paginaDoHash(hash) {
  const id = hash.replace(/^#/, "");
  return Object.hasOwn(PAGINAS, id) ? id : null;
}
