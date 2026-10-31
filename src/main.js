// Página de abertura: decide o idioma antes de qualquer desenho e monta o SistemaSolar
// com os rótulos desse idioma e os ajustes guardados no navegador.

import { SistemaSolar } from "./sistema-solar/index.js";
import { FAIXA, PADRAO } from "./sistema-solar/config.js";
import { PAGINAS, paginaDoHash } from "./paginas/index.js";
import { transicao } from "./transicao/index.js";
import { centroDoCorpo, zoom } from "./transicao/zoom.js";
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
      // valor fora da faixa (ou não finito) travaria o desenho a cada carga: prende na faixa
      if (Number.isFinite(salvo[k]))
        S[k] = Math.min(FAIXA[k][1], Math.max(FAIXA[k][0], salvo[k]));
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
/** Último destino pedido; difere de `aberta` enquanto a página carrega ou a transição roda. @type {string | null | undefined} */
let destino;
let primeira = true;
/** Camada onde as páginas em terminal são montadas, por cima da abertura. */
const camadaPaginas = /** @type {HTMLElement} */ (
  document.getElementById("paginas")
);
/** @type {{ destroy(): void } | null} */
let pagina = null;
/** @type {{ fim: Promise<void>, concluir(): void } | null} */
let emTransicao = null;

/** Fecha a transição em curso: sobra só o que `aberta` aponta. */
function assentar() {
  emTransicao?.concluir();
  emTransicao = null;
  if (aberta === null) {
    pagina?.destroy();
    pagina = null;
  } else {
    inst?.destroy();
    inst = null;
  }
}

/**
 * Abre a página do hash. Da abertura para uma página, a câmera mergulha no planeta e a tela
 * cresce de dentro dele; na volta é o inverso. Entre duas páginas roda o campo de caracteres.
 */
async function mostrar() {
  const id = paginaDoHash(location.hash);
  // pedir de novo o mesmo destino (hash repetido, placeholder) não interrompe o que está em curso
  if (id === destino) return;
  destino = id;
  const minha = ++versao;
  assentar();
  const de = aberta;
  /** @type {Awaited<ReturnType<(typeof PAGINAS)[keyof typeof PAGINAS]>> | null} */
  let modulo = null;
  if (id) {
    try {
      modulo = await PAGINAS[id]();
    } catch {
      // módulo que não carrega (sem rede): volta para a abertura em vez de deixar a tela vazia
      if (minha === versao) {
        destino = undefined;
        location.hash = "#inicio";
      }
      return;
    }
  }
  if (minha !== versao) return;

  const animar = !primeira;
  primeira = false;
  aberta = id;

  if (de === null && id && modulo) {
    // abertura -> página: mergulha no planeta
    const centro = centroDoCorpo(raiz, id);
    pagina = modulo.montar(camadaPaginas, idioma);
    if (animar) {
      emTransicao = zoom({
        inicio: raiz,
        paginas: camadaPaginas,
        centro,
        entrando: true,
      });
      await emTransicao.fim;
      if (minha !== versao) return;
      emTransicao.concluir();
      emTransicao = null;
    }
    inst?.destroy();
    inst = null;
  } else if (de !== null && !id) {
    // página -> abertura: sai do planeta
    montar();
    if (animar) {
      const centro = centroDoCorpo(raiz, de);
      emTransicao = zoom({
        inicio: raiz,
        paginas: camadaPaginas,
        centro,
        entrando: false,
      });
      await emTransicao.fim;
      if (minha !== versao) return;
      emTransicao.concluir();
      emTransicao = null;
    }
    pagina?.destroy();
    pagina = null;
  } else if (de !== null && id && modulo) {
    // página -> página: campo de caracteres
    pagina?.destroy();
    pagina = null;
    const tr = transicao(camadaPaginas, de, id, idioma);
    emTransicao = { fim: tr.fim, concluir: () => tr.destroy() };
    await tr.fim;
    if (minha !== versao) return;
    tr.destroy();
    emTransicao = null;
    pagina = modulo.montar(camadaPaginas, idioma);
  } else if (id && modulo) {
    pagina = modulo.montar(camadaPaginas, idioma);
  } else {
    montar();
  }
}

// perto do clique, o módulo da página já está carregado quando o zoom começa
raiz.addEventListener("pointerover", (e) => {
  const a = e.target instanceof Element ? e.target.closest("a[href]") : null;
  const id = a
    ? paginaDoHash(new URL(a.getAttribute("href") || "", "http://x/").hash)
    : null;
  if (id) PAGINAS[id]().catch(() => {});
});

aplicarDocumento(document, idioma);
addEventListener("hashchange", mostrar);
mostrar();
