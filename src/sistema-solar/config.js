// Opções do componente e montagem da configuração que o layout consome.

/**
 * @typedef {{ rotulo: string, href?: string, atual?: boolean }} Item
 * @typedef {{ centro?: string, centroHref?: string, nos?: Item[] }} Secundario
 *
 * @typedef {object} Opcoes
 * @property {string} [centro] texto do sol (padrão `thinkmadu`)
 * @property {string} [centroHref] destino do sol (padrão `#sobre`)
 * @property {Item[]} [contatos] órbita de dentro, até 4
 * @property {Item[]} [areas] órbita de fora, até 6
 * @property {Secundario | null} [secundario] constelação; `null` tira
 * @property {string | string[] | null | false} [assinatura] frase do canto; `null` tira
 * @property {number} [fundo] densidade do fundo, 4 a 60
 * @property {number} [brilho] brilho dos nomes, 0 a 100
 * @property {number} [orbitas] velocidade das órbitas, 0 a 200
 * @property {number} [meteoros] frequência dos meteoros, 0 a 100
 * @property {number} [fonte] fonte máxima dos nomes, 10 a 30
 * @property {number} [seed] semente do fundo
 * @property {(rotulo: string) => boolean | void} [aoEscolher] recebe o rótulo do corpo ou item
 *   clicado; devolver `false` deixa o link seguir o href
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

export const DEF_ASSINATURA = Object.freeze([
  "Se encontro um problema,",
  "desenvolvo a solução.",
  "De ponta a ponta,",
  "sem deixar nada solto.",
]);

/**
 * Linhas da frase de assinatura. String vira linhas de até 26 caracteres.
 * @param {Opcoes} opts
 * @returns {string[] | null}
 */
export function sigOf(opts) {
  const a = opts.assinatura;
  if (a === null || a === false) return null;
  if (a == null) return [...DEF_ASSINATURA];
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
  };
}
