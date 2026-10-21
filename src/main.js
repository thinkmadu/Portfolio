// Página de abertura: monta o SistemaSolar com o idioma e os ajustes guardados no navegador.

import { SistemaSolar } from "./sistema-solar/index.js";
import { PADRAO } from "./sistema-solar/config.js";

const CHAVE = "sol-v5";
const ASSINATURA_EN = {
  pequeno1: "If I find a",
  grande1: "problem,",
  pequeno2: "I build the",
  grande2: "solution.",
  rodape: /** @type {[string, string]} */ (["End to end,", "no loose ends."]),
};

/** @type {import("./sistema-solar/config.js").Ajustes} */
const S = { ...PADRAO };
let lang = "português";
try {
  const salvo = JSON.parse(localStorage.getItem(CHAVE) || "null");
  if (salvo) {
    for (const k of /** @type {(keyof typeof S)[]} */ (Object.keys(S)))
      if (typeof salvo[k] === "number") S[k] = salvo[k];
    if (salvo.lang === "english" || salvo.lang === "português")
      lang = salvo.lang;
  }
} catch {
  // sem localStorage (modo privado, bloqueio): segue com o padrão
}

function salvar() {
  try {
    localStorage.setItem(CHAVE, JSON.stringify({ lang, ...S }));
  } catch {
    // idem
  }
}

const raiz = /** @type {HTMLElement} */ (document.getElementById("root"));
/** @type {{ destroy(): void } | null} */
let inst = null;
/** @type {Promise<ReturnType<typeof import("./ajustes/painel.js").criarPainel>> | null} */
let painel = null;

function abrirPainel() {
  painel ??= import("./ajustes/painel.js").then(({ criarPainel }) => {
    const p = criarPainel({
      ajustes: S,
      aoMudar: () => {
        salvar();
        montar();
      },
    });
    p.atualizar();
    return p;
  });
  painel.then((p) => p.alternar());
}

function montar() {
  if (inst) inst.destroy();
  inst = SistemaSolar.mount(raiz, {
    ...S,
    assinatura: lang === "english" ? ASSINATURA_EN : undefined,
    assinaturaIdioma: lang === "english" ? "en" : undefined,
    secundario: {
      centro: "ajustes",
      centroHref: "#ajustes",
      nos: [
        { rotulo: "português", href: "#pt", atual: lang === "português" },
        { rotulo: "english", href: "#en", atual: lang === "english" },
      ],
    },
    // ajustes e idioma ficam na página; o resto segue o href do link
    aoEscolher(r) {
      if (r === "ajustes") abrirPainel();
      else if (r === "português" || r === "english") {
        lang = r;
        salvar();
        montar();
      } else return false;
    },
  });
  if (painel) painel.then((p) => p.atualizar());
}

montar();
