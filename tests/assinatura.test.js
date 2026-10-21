// Frase de assinatura em tamanhos mistos: escolha do tamanho e nada sobreposto.
import { describe, expect, it } from "vitest";
import {
  DEF_ASSINATURA,
  buildCfg,
  sigGrandeOf,
  sigOf,
} from "../src/sistema-solar/config.js";
import { at, ov } from "../src/sistema-solar/geometria.js";
import { GRANDE, fit, staticConflict } from "../src/sistema-solar/layout.js";

// Larguras a 100px medidas no Chrome com Familjen Grotesk 700 e letter-spacing -0.045em
// (21/10/2026); texto desconhecido cai numa estimativa de 50px por caractere.
const LARGURAS = {
  "problema,": 412.34,
  "solução.": 338.5,
  "problem,": 359.34,
  "solution.": 340.67,
};
/** @param {string} t */
const medirGrande = (t) =>
  LARGURAS[/** @type {keyof typeof LARGURAS} */ (t)] ?? t.length * 50;
/** @param {number} fs */
const cwOf = (fs) => fs * 0.6;
const opcoes = { agora: () => 0, medirGrande };

const EN = {
  pequeno1: "If I find a",
  grande1: "problem,",
  pequeno2: "I build the",
  grande2: "solution.",
  rodape: /** @type {[string, string]} */ (["End to end,", "no loose ends."]),
};

const ESPERADO = [
  [1100, 640, true, 14],
  [1200, 700, true, 15],
  [1280, 720, true, 16],
  [1340, 690, true, 17],
  [1440, 900, true, 18],
  [1536, 864, true, 19],
  [1920, 1080, true, 22],
  [766, 878, true, 14],
  [1024, 768, true, 13],
  [820, 1180, true, 15],
  [900, 900, true, 17],
  [600, 480, false, 10],
  [800, 367, false, 10],
];

describe("opções da assinatura", () => {
  it("padrão: composição em português e as mesmas quatro linhas pequenas de antes", () => {
    expect(sigGrandeOf({})).toEqual({
      pequeno1: "Se encontro um",
      grande1: "problema,",
      pequeno2: "desenvolvo a",
      grande2: "solução.",
      rodape: ["De ponta a ponta,", "sem deixar nada solto."],
    });
    expect(sigOf({})).toEqual([...DEF_ASSINATURA]);
  });
  it("objeto em inglês vira as linhas pequenas antigas em inglês", () => {
    expect(sigOf({ assinatura: EN })).toEqual([
      "If I find a problem,",
      "I build the solution.",
      "End to end,",
      "no loose ends.",
    ]);
  });
  it("string, lista e null ficam no modo pequeno", () => {
    expect(sigGrandeOf({ assinatura: "uma frase" })).toBeNull();
    expect(sigGrandeOf({ assinatura: ["a", "b"] })).toBeNull();
    expect(sigGrandeOf({ assinatura: null })).toBeNull();
  });
});

/**
 * Confere a caixa da frase contra cada planeta em todas as fases (passo de 1 grau) e
 * contra as linhas de órbita, com as mesmas folgas do layout.
 * @param {import('../src/sistema-solar/layout.js').Layout} L
 */
function sobreposicoes(L) {
  const sig = /** @type {NonNullable<typeof L.sig>} */ (L.sig);
  const achados = [];
  for (const o of L.orbits)
    for (const p of o.pl)
      for (let g = 0; g < 360; g++) {
        const P = at(o, p.a + g);
        if (ov(P.x, P.y, p.w, p.h, sig.cx, sig.cy, sig.w, sig.h))
          achados.push(`planeta ${p.t} em ${g} graus`);
      }
  const linhas = L.cons ? [...L.orbits, L.cons] : L.orbits;
  for (const o of linhas)
    for (let g = 0; g < 360; g++) {
      const P = at({ ...o, off: 0 }, g);
      if (
        Math.abs(P.x - sig.cx) < sig.w / 2 &&
        Math.abs(P.y - sig.cy) < sig.h / 2
      )
        achados.push(`linha em ${g} graus`);
    }
  if (sig.cx + sig.w / 2 > L.W - GRANDE.MARGEM_DIREITA + 0.001)
    achados.push("borda direita");
  if (sig.cy + sig.h / 2 > L.H - GRANDE.MARGEM_INFERIOR + 0.001)
    achados.push("borda inferior");
  return achados;
}

const resultados = [];
for (const [idioma, opts] of /** @type {const} */ ([
  ["pt", {}],
  ["en", { assinatura: EN }],
])) {
  describe(`composição em tamanhos mistos (${idioma})`, () => {
    const cfg = buildCfg(opts);
    it.each(ESPERADO)(
      "%ix%i: ok %s e fonte %i iguais ao modo pequeno",
      (W, H, ok, fs) => {
        const r = fit(cfg, 22, W, H, cwOf, opcoes);
        expect(r.ok).toBe(ok);
        expect(r.L.fs).toBe(fs);
        const g = r.L.sig?.grande;
        resultados.push({
          idioma,
          tamanho: `${W}x${H}`,
          ok: r.ok,
          fonteGrande: g ? +g.s.toFixed(1) : "pequena",
        });
        if (!g) return;
        expect(g.s).toBeGreaterThanOrEqual(GRANDE.MIN);
        expect(g.s).toBeLessThanOrEqual(GRANDE.MAX);
        expect(staticConflict(r.L)).toBe(false);
        expect(sobreposicoes(r.L)).toEqual([]);
      },
    );
  });
}

describe("relatório", () => {
  it("fonte grande por tamanho", () => {
    console.table(resultados);
    expect(resultados).toHaveLength(ESPERADO.length * 2);
  });
});

describe("caminhos de volta", () => {
  it("sem medirGrande, a frase fica pequena e o layout é o de antes", () => {
    const r = fit(buildCfg({}), 22, 1340, 690, cwOf, { agora: () => 0 });
    expect(r.L.sig?.grande).toBeUndefined();
  });
  it("palavra grande larga demais para 40px volta para a frase pequena", () => {
    const r = fit(buildCfg({}), 22, 1340, 690, cwOf, {
      agora: () => 0,
      medirGrande: () => 5000,
    });
    expect(r.ok).toBe(true);
    expect(r.L.sig?.grande).toBeUndefined();
    expect(r.L.sig?.lines).toEqual([...DEF_ASSINATURA]);
  });
  it("sem tempo, a frase fica pequena", () => {
    let t = 0;
    const r = fit(buildCfg({}), 22, 1920, 1080, cwOf, {
      agora: () => (t += 700),
      medirGrande,
    });
    expect(r.L.sig?.grande).toBeUndefined();
  });
});
