// Página de abertura: decide o idioma antes de qualquer desenho e monta o SistemaSolar
// com os rótulos desse idioma e os ajustes guardados no navegador.

import { SistemaSolar } from "./sistema-solar/index.js";
import { PADRAO } from "./sistema-solar/config.js";
import { PAGINAS, paginaDoHash } from "./paginas/index.js";
import { transicao } from "./transicao/index.js";
import { aplicarDocumento, opcoesDoSistema, t } from "./i18n/index.js";
import {
  CHAVE_ANTIGA,
  idiomaInicial,
  migrarAntigo,
  normalizar,
  salvar,
  storageDe,
  urlComIdioma,
} from "./i18n/idioma.js";

/** @typedef {import("./i18n/idioma.js").Idioma} Idioma */

const storage = storageDe(window);
migrarAntigo(storage);

/** @type {import("./sistema-solar/config.js").Ajustes} */
const S = { ...PADRAO };
try {
  const salvo = JSON.parse(storage?.getItem(CHAVE_ANTIGA) || "null");
  if (salvo)
    for (const k of /** @type {(keyof typeof S)[]} */ (Object.keys(S)))
      if (typeof salvo[k] === "number") S[k] = salvo[k];
} catch {
  // sem localStorage (modo privado, bloqueio): segue com o padrão
}

/** Só os ajustes do fundo; o idioma tem chave própria e só é gravado por escolha explícita. */
function salvarAjustes() {
  try {
    storage?.setItem(CHAVE_ANTIGA, JSON.stringify(S));
  } catch {
    // idem
  }
}

let idioma = idiomaInicial().idioma;
/** @param {import("./i18n/index.js").Chave} chave @param {Record<string, string | number>} [vars] */
const tr = (chave, vars) => t(idioma, chave, vars);

const raiz = /** @type {HTMLElement} */ (document.getElementById("root"));
/** @type {{ destroy(): void } | null} */
let inst = null;
/** @type {Promise<ReturnType<typeof import("./ajustes/painel.js").criarPainel>> | null} */
let painel = null;

function abrirPainel() {
  painel ??= import("./ajustes/painel.js").then(({ criarPainel }) => {
    const p = criarPainel({
      ajustes: S,
      t: tr,
      aoMudar: () => {
        salvarAjustes();
        montar();
      },
    });
    p.atualizar();
    return p;
  });
  painel.then((p) => p.alternar());
}

/**
 * Troca o idioma sem recarregar: grava a escolha, põe `?lang=` na URL, traduz o
 * documento e o painel, remonta o sistema e devolve o foco ao idioma escolhido.
 * @param {Idioma} novo
 */
function trocarIdioma(novo) {
  const id = "lang-" + novo;
  salvar(storage, novo);
  try {
    history.replaceState(history.state, "", urlComIdioma(location.href, novo));
  } catch {
    // URL que o navegador recusa trocar (file://, sandbox): segue sem atualizar
  }
  if (novo !== idioma) {
    idioma = novo;
    aplicarDocumento(document, idioma);
    montar();
    if (painel) painel.then((p) => p.traduzir(tr));
  }
  // a remontagem destrói o link que tinha o foco
  const alvo = /** @type {HTMLElement | null} */ (
    raiz.querySelector(`.pf-sys a[data-r="${id}"]`) ||
      raiz.querySelector(`.pf-menu a[data-r="${id}"]`)
  );
  alvo?.focus({ preventScroll: true });
}

function montar() {
  if (inst) inst.destroy();
  inst = SistemaSolar.mount(raiz, {
    ...S,
    ...opcoesDoSistema(idioma),
    // ajustes e idioma ficam na página; o resto segue o href do link
    aoEscolher(id) {
      if (id === "ajustes") abrirPainel();
      else if (id.startsWith("lang-")) {
        const novo = normalizar(id.slice(5));
        if (!novo) return false;
        trocarIdioma(novo);
      } else return false;
    },
  });
  if (painel) painel.then((p) => p.atualizar());
}

/** Id da página em terminal aberta agora, ou null na abertura. @type {string | null} */
let aberta = null;
let versao = 0;
let primeira = true;
/** @type {{ destroy(): void } | null} */
let emTransicao = null;

/**
 * Abre a página do hash: a abertura (sistema solar) ou uma das páginas em terminal.
 * Entre duas páginas, o campo de caracteres da transição roda antes (clique ou tecla pula).
 */
async function mostrar() {
  const id = paginaDoHash(location.hash);
  if (id === aberta && (id || inst)) return;
  const de = aberta ?? "inicio";
  aberta = id;
  const minha = ++versao;
  emTransicao?.destroy();
  emTransicao = null;
  if (inst) inst.destroy();
  inst = null;
  // o módulo da página carrega enquanto a transição roda
  const carregando = id ? PAGINAS[id]() : null;
  if (!primeira) {
    const tr = transicao(raiz, de, id ?? "inicio");
    emTransicao = tr;
    await tr.fim;
    if (minha !== versao) return;
    tr.destroy();
    emTransicao = null;
  }
  primeira = false;
  if (!id) {
    montar();
    return;
  }
  const { montar: montarPagina } =
    await /** @type {NonNullable<typeof carregando>} */ (carregando);
  if (minha !== versao) return;
  inst = montarPagina(raiz);
}

aplicarDocumento(document, idioma);
addEventListener("hashchange", mostrar);
mostrar();
