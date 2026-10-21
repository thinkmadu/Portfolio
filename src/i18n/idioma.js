// Escolha do idioma: funções puras (recebem o que leem) mais os acessos a storage e URL,
// sempre com try/catch (modo privado e storage bloqueado não podem derrubar a página).

export const SUPORTADOS = /** @type {const} */ (["pt", "en"]);
/** @type {Idioma} */
export const PADRAO = "pt";
/** Chave da escolha explícita de idioma no localStorage. */
export const CHAVE = "pf-lang";
/** Chave antiga, que guardava idioma e ajustes juntos (hoje só ajustes). */
export const CHAVE_ANTIGA = "sol-v5";

/** @typedef {typeof SUPORTADOS[number]} Idioma */
/** @typedef {"url" | "salvo" | "navegador" | "padrao"} Fonte */

/**
 * Código de idioma ("pt", "pt-BR", "EN-us") para um idioma suportado, ou null.
 * @param {unknown} v
 * @returns {Idioma | null}
 */
export function normalizar(v) {
  if (typeof v !== "string") return null;
  const base = v.trim().toLowerCase().split(/[-_]/)[0];
  return /** @type {readonly string[]} */ (SUPORTADOS).includes(base)
    ? /** @type {Idioma} */ (base)
    : null;
}

/**
 * Ordem (decisão da Madu, 21/10/2026): `?lang=` na URL > escolha salva > primeiro idioma
 * suportado do navegador > português. A URL vence porque link compartilhado, resultado de
 * busca e o menu em texto carregam o idioma nela. Valor inválido é ignorado.
 * @param {{ busca?: string, salvo?: unknown, navegador?: readonly string[] }} [entrada]
 * @returns {{ idioma: Idioma, fonte: Fonte }}
 */
export function resolverIdioma({ busca, salvo, navegador } = {}) {
  const u = normalizar(new URLSearchParams(busca || "").get("lang"));
  if (u) return { idioma: u, fonte: "url" };
  const s = normalizar(salvo);
  if (s) return { idioma: s, fonte: "salvo" };
  for (const n of navegador || []) {
    const x = normalizar(n);
    if (x) return { idioma: x, fonte: "navegador" };
  }
  return { idioma: PADRAO, fonte: "padrao" };
}

/**
 * Lê a escolha salva. A versão do commit 273064e guardava `lang` dentro de `sol-v5` como
 * "português" ou "english", e gravava "português" em qualquer mexida no painel, mesmo sem
 * escolha. Por isso só "english" conta como escolha antiga.
 * @param {Pick<Storage, "getItem"> | null | undefined} storage
 * @returns {Idioma | null}
 */
export function lerSalvo(storage) {
  try {
    if (!storage) return null;
    const v = normalizar(storage.getItem(CHAVE));
    if (v) return v;
    const antigo = JSON.parse(storage.getItem(CHAVE_ANTIGA) || "null");
    return antigo && antigo.lang === "english" ? "en" : null;
  } catch {
    return null;
  }
}

/**
 * Copia a escolha antiga ("english" em `sol-v5`) para a chave nova, porque o painel passa
 * a regravar `sol-v5` só com os ajustes e a escolha se perderia.
 * @param {Pick<Storage, "getItem" | "setItem"> | null | undefined} storage
 */
export function migrarAntigo(storage) {
  try {
    if (!storage || storage.getItem(CHAVE) != null) return;
    const v = lerSalvo(storage);
    if (v) storage.setItem(CHAVE, v);
  } catch {
    // idem
  }
}

/**
 * Grava a escolha explícita. Só deve ser chamada quando a pessoa escolhe um idioma.
 * @param {Pick<Storage, "setItem"> | null | undefined} storage
 * @param {Idioma} idioma
 */
export function salvar(storage, idioma) {
  try {
    if (storage) storage.setItem(CHAVE, idioma);
  } catch {
    // modo privado ou storage bloqueado: segue sem lembrar
  }
}

/**
 * Mesma URL com `?lang=` trocado, preservando os outros parâmetros e o hash.
 * @param {string} href
 * @param {Idioma} idioma
 */
export function urlComIdioma(href, idioma) {
  const u = new URL(href);
  u.searchParams.set("lang", idioma);
  return u.pathname + u.search + u.hash;
}

/**
 * localStorage, ou null quando o acesso lança (alguns navegadores bloqueiam o getter).
 * @param {Window} win
 * @returns {Storage | null}
 */
export function storageDe(win) {
  try {
    return win.localStorage;
  } catch {
    return null;
  }
}

/**
 * Idioma inicial a partir do ambiente do navegador; chamado uma vez, antes de montar a página.
 * @param {Window} [win]
 */
export function idiomaInicial(win = window) {
  const nav = win.navigator;
  return resolverIdioma({
    busca: win.location ? win.location.search : "",
    salvo: lerSalvo(storageDe(win)),
    navegador: nav
      ? nav.languages && nav.languages.length
        ? nav.languages
        : [nav.language]
      : [],
  });
}
