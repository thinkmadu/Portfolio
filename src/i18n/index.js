// Tradução da página: dicionários, t(), textos do documento e opções do SistemaSolar por idioma.
// Como adicionar uma língua: README, seção "Idiomas".

import pt from "./pt.js";
import en from "./en.js";

/** @typedef {import("./pt.js").Dicionario} Dicionario */
/** @typedef {keyof Dicionario} Chave */
/** @typedef {import("./idioma.js").Idioma} Idioma */

/** @type {Record<Idioma, Dicionario>} */
export const DICIONARIOS = { pt, en };

/** Nome de cada língua nela mesma: igual nas duas versões da página. @type {Record<Idioma, string>} */
export const ENDONIMOS = { pt: "português", en: "english" };

/** Endereço publicado; base do canonical (o hreflang está fixo no index.html). */
export const URL_PUBLICA = "https://thinkmadu.github.io/Portfolio/";

/**
 * Texto da chave no idioma, com `{variáveis}` trocadas. Chave ausente cai no português.
 * @param {Idioma} idioma
 * @param {Chave} chave
 * @param {Record<string, string | number>} [vars]
 */
export function t(idioma, chave, vars) {
  const dic = DICIONARIOS[idioma] || pt;
  const bruto =
    (Object.hasOwn(dic, chave) ? dic[chave] : undefined) ??
    (Object.hasOwn(pt, chave) ? pt[chave] : undefined) ??
    String(chave);
  if (!vars) return bruto;
  return bruto.replace(/\{(\w+)\}/g, (m, k) =>
    Object.hasOwn(vars, k) ? String(vars[k]) : m,
  );
}

/**
 * As peças da frase de assinatura, no formato da composição em tamanhos mistos.
 * @param {Idioma} idioma
 * @returns {import("../sistema-solar/config.js").AssinaturaGrande}
 */
export function assinatura(idioma) {
  return {
    pequeno1: t(idioma, "assinatura.pequeno1"),
    grande1: t(idioma, "assinatura.grande1"),
    pequeno2: t(idioma, "assinatura.pequeno2"),
    grande2: t(idioma, "assinatura.grande2"),
    rodape: [t(idioma, "assinatura.rodape1"), t(idioma, "assinatura.rodape2")],
  };
}

/**
 * A assinatura como frase corrida (meta description).
 * @param {Idioma} idioma
 */
export function frase(idioma) {
  const a = assinatura(idioma);
  return [a.pequeno1, a.grande1, a.pequeno2, a.grande2, ...a.rodape].join(" ");
}

const CONTATOS = ["github", "linkedin", "email"];
const AREAS = ["ia", "dados", "ferramentas", "full-stack", "testes"];

/**
 * Rótulos do SistemaSolar no idioma. `id` é estável entre idiomas e é o que `aoEscolher`
 * recebe; `rotulo` é o texto da tela; `lang` marca o texto dos nós de idioma.
 * @param {Idioma} idioma
 * @returns {import("../sistema-solar/config.js").Opcoes}
 */
export function opcoesDoSistema(idioma) {
  const item = (/** @type {string} */ id) => ({
    id,
    rotulo: t(idioma, /** @type {Chave} */ ("planeta." + id)),
    href: "#" + id,
  });
  return {
    contatos: CONTATOS.map(item),
    areas: AREAS.map(item),
    secundario: {
      id: "ajustes",
      centro: t(idioma, "ajustes.centro"),
      centroHref: "#ajustes",
      nos: /** @type {Idioma[]} */ (["pt", "en"]).map((l) => ({
        id: "lang-" + l,
        rotulo: ENDONIMOS[l],
        href: "?lang=" + l,
        lang: l,
        atual: l === idioma,
      })),
    },
    textos: {
      sobre: t(idioma, "sobre.texto"),
      sobreAria: t(idioma, "sobre.aria"),
      navSistema: t(idioma, "nav.sistema"),
      navMenu: t(idioma, "nav.menu"),
    },
    assinatura: assinatura(idioma),
  };
}

/**
 * Aplica o idioma ao que é fixo no index.html: `<html lang>`, título, description,
 * canonical e todo elemento com `data-i18n` (texto).
 * @param {Document} doc
 * @param {Idioma} idioma
 */
export function aplicarDocumento(doc, idioma) {
  doc.documentElement.lang = t(idioma, "html.lang");
  doc.title = t(idioma, "doc.titulo");
  doc
    .querySelector('meta[name="description"]')
    ?.setAttribute("content", frase(idioma));
  let canonical = doc.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = doc.createElement("link");
    canonical.setAttribute("rel", "canonical");
    doc.head.append(canonical);
  }
  canonical.setAttribute(
    "href",
    idioma === "pt" ? URL_PUBLICA : URL_PUBLICA + "?lang=" + idioma,
  );
  for (const el of doc.querySelectorAll("[data-i18n]"))
    el.textContent = t(
      idioma,
      /** @type {Chave} */ (el.getAttribute("data-i18n")),
    );
}
