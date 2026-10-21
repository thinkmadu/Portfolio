// Opções do componente e montagem da configuração que o layout consome.

/**
 * @typedef {object} Item
 * @property {string} rotulo texto na tela
 * @property {string} [id] identificador estável entre idiomas, devolvido a `aoEscolher`
 *   (sem ele, vai o rótulo)
 * @property {string} [href]
 * @property {boolean} [atual] item ativo (`aria-current`)
 * @property {string} [lang] idioma do texto, quando difere da página
 * @typedef {{ id?: string, centro?: string, centroHref?: string, nos?: Item[] }} Secundario
 *
 * @typedef {object} Textos textos fixos do componente, para traduzir
 * @property {string} [sobre] primeiro item do menu em texto
 * @property {string} [sobreAria] nome acessível do sol
 * @property {string} [navSistema] nome da navegação desenhada
 * @property {string} [navMenu] nome da navegação em texto
 *
 * @typedef {object} AssinaturaGrande frase em tamanhos mistos, na ordem de leitura
 * @property {string} pequeno1 linha pequena de cima
 * @property {string} grande1 palavra grande
 * @property {string} pequeno2 linha pequena recuada
 * @property {string} grande2 palavra grande recuada, na cor de acento
 * @property {[string, string]} rodape textos do rodapé, à esquerda e à direita
 *
 * @typedef {object} Opcoes
 * @property {string} [centro] texto do sol (padrão `thinkmadu`)
 * @property {string} [centroHref] destino do sol (padrão `#sobre`)
 * @property {Item[]} [contatos] órbita de dentro, até 4
 * @property {Item[]} [areas] órbita de fora, até 6
 * @property {Secundario | null} [secundario] constelação; `null` tira
 * @property {string | string[] | Partial<AssinaturaGrande> | null | false} [assinatura] frase do
 *   canto: objeto (ou omitida) para a composição em tamanhos mistos, string ou lista para as
 *   linhas pequenas, `null` tira
 * @property {string} [assinaturaIdioma] atributo `lang` da frase, quando difere da página
 * @property {number} [fundo] densidade do fundo, 4 a 60
 * @property {number} [brilho] brilho dos nomes, 0 a 100
 * @property {number} [orbitas] velocidade das órbitas, 0 a 200
 * @property {number} [meteoros] frequência dos meteoros, 0 a 100
 * @property {number} [fonte] fonte máxima dos nomes, 10 a 30
 * @property {number} [seed] semente do fundo
 * @property {Textos} [textos] textos fixos do componente (padrão em português)
 * @property {(id: string) => boolean | void} [aoEscolher] recebe o `id` (ou, sem ele, o
 *   rótulo) do corpo ou item clicado; devolver `false` deixa o link seguir o href
 */

/** Ângulo inicial dos planetas da órbita de dentro e da de fora, em graus. */
const IN_START = 205;
const OUT_START = 130;

/**
 * @typedef {{ fundo: number, brilho: number, orbitas: number, meteoros: number, fonte: number, seed: number }} Ajustes
 */

/** Configuração da Madu (decisão de 20/10/2026). @type {Readonly<Ajustes>} */
export const PADRAO = Object.freeze({
  fundo: 11,
  brilho: 49,
  orbitas: 85,
  meteoros: 100,
  fonte: 22,
  seed: 7,
});

/** @type {readonly Item[]} */
export const DEF_CONTATOS = Object.freeze([
  { rotulo: "github", href: "#github" },
  { rotulo: "linkedin", href: "#linkedin" },
  { rotulo: "email", href: "#email" },
]);

/** @type {readonly Item[]} */
export const DEF_AREAS = Object.freeze([
  { rotulo: "ia", href: "#ia" },
  { rotulo: "dados", href: "#dados" },
  { rotulo: "ferramentas", href: "#ferramentas" },
  { rotulo: "full-stack", href: "#full-stack" },
  { rotulo: "testes", href: "#testes" },
]);

/** @type {Secundario} */
export const DEF_SEC = {
  centro: "ajustes",
  centroHref: "#ajustes",
  nos: [
    { rotulo: "português", href: "#pt", atual: true },
    { rotulo: "english", href: "#en" },
  ],
};

/** @type {Readonly<Required<Textos>>} */
export const DEF_TEXTOS = Object.freeze({
  sobre: "sobre mim",
  sobreAria: "Sobre mim",
  navSistema: "Áreas",
  navMenu: "Áreas em texto",
});

/**
 * Textos fixos com os que faltarem vindos do padrão.
 * @param {Opcoes} opts
 * @returns {Required<Textos>}
 */
export function textosOf(opts) {
  return { ...DEF_TEXTOS, ...opts.textos };
}

export const DEF_ASSINATURA = Object.freeze([
  "Se encontro um problema,",
  "desenvolvo a solução.",
  "De ponta a ponta,",
  "sem deixar nada solto.",
]);

/** @type {Readonly<AssinaturaGrande>} */
export const DEF_ASSINATURA_GRANDE = Object.freeze({
  pequeno1: "Se encontro um",
  grande1: "problema,",
  pequeno2: "desenvolvo a",
  grande2: "solução.",
  rodape: /** @type {[string, string]} */ ([
    "De ponta a ponta,",
    "sem deixar nada solto.",
  ]),
});

/**
 * Objeto de assinatura (e não string ou lista)?
 * @param {unknown} a
 * @returns {a is Partial<AssinaturaGrande>}
 */
function ehComposicao(a) {
  return typeof a === "object" && a !== null && !Array.isArray(a);
}

/**
 * Textos da composição em tamanhos mistos; `null` quando a frase é só de linhas pequenas.
 * Campos ausentes no objeto vêm do padrão.
 * @param {Opcoes} opts
 * @returns {AssinaturaGrande | null}
 */
export function sigGrandeOf(opts) {
  const a = opts.assinatura;
  if (a === undefined) return { ...DEF_ASSINATURA_GRANDE };
  if (!ehComposicao(a)) return null;
  return { ...DEF_ASSINATURA_GRANDE, ...a };
}

/**
 * Linhas da frase de assinatura no modo pequeno (e o caminho de volta da composição).
 * Objeto vira quatro linhas: pequeno1 + grande1, pequeno2 + grande2 e o rodapé.
 * String vira linhas de até 26 caracteres.
 * @param {Opcoes} opts
 * @returns {string[] | null}
 */
export function sigOf(opts) {
  const a = opts.assinatura;
  if (a === null || a === false) return null;
  if (a == null) return [...DEF_ASSINATURA];
  if (ehComposicao(a)) {
    const g = { ...DEF_ASSINATURA_GRANDE, ...a };
    return [
      g.pequeno1 + " " + g.grande1,
      g.pequeno2 + " " + g.grande2,
      ...g.rodape,
    ];
  }
  if (typeof a === "string") {
    /** @type {string[]} */
    const out = [];
    let cur = "";
    for (const w of a.split(/\s+/)) {
      if (cur && (cur + " " + w).length > 26) {
        out.push(cur);
        cur = w;
      } else cur = cur ? cur + " " + w : w;
    }
    if (cur) out.push(cur);
    return out;
  }
  return a.length ? a : null;
}

/** @param {Opcoes} opts */
export function secOf(opts) {
  return opts.secundario === null ? null : opts.secundario || DEF_SEC;
}

/** @param {Opcoes} opts */
export function contatosOf(opts) {
  return (opts.contatos || DEF_CONTATOS).slice(0, 4);
}

/** @param {Opcoes} opts */
export function areasOf(opts) {
  return (opts.areas || DEF_AREAS).slice(0, 6);
}

/** @param {Secundario | null} sec */
export function nosOf(sec) {
  return sec && sec.nos ? sec.nos.slice(0, 4) : [];
}

/**
 * @param {number} start
 * @param {number} n
 * @param {number} k
 */
function spread(start, n, k) {
  return start + (360 / n) * k;
}

/**
 * @param {Item} x
 * @param {number} ang
 * @returns {import('./layout.js').PlanetaCfg}
 */
function planet(x, ang) {
  return {
    t: "(" + x.rotulo + ")",
    rotulo: x.rotulo,
    href: x.href || "#",
    atual: !!x.atual,
    a: ang,
    id: x.id,
    lang: x.lang,
  };
}

/**
 * Monta a configuração do layout a partir das opções.
 * @param {Opcoes} opts
 * @returns {import('./layout.js').Cfg}
 */
export function buildCfg(opts) {
  const sec = secOf(opts);
  /** @type {import('./layout.js').OrbitaCfg[]} */
  const big = [];
  /** @type {[readonly Item[], number, number, boolean][]} */
  const aneis = [
    [contatosOf(opts), IN_START, 110, true],
    [areasOf(opts), OUT_START, 220, false],
  ];
  for (const [itens, inicio, periodo, dentro] of aneis) {
    if (!itens.length) continue;
    big.push({
      T: periodo,
      inner: dentro,
      pl: itens.map((x, k) => planet(x, spread(inicio, itens.length, k))),
    });
  }
  let cons = null;
  const nos = nosOf(sec);
  if (sec && nos.length) {
    cons = {
      sunM: "(" + (sec.centro || "ajustes") + ")",
      nodes: nos.map((x) => planet(x, 0)),
    };
  }
  return {
    big,
    cons,
    sunG: "(" + (opts.centro || "thinkmadu") + ")",
    sig: sigOf(opts),
    sigGrande: sigGrandeOf(opts),
  };
}
