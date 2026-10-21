// Encaixe com os rótulos de cada idioma, como a página monta (src/i18n).
// Em português o arranjo tem de ser o da referência (tests/fixtures/layout-referencia.json,
// conferida em layout.test.js com buildCfg({})): só id, lang e href podem mudar.
import { describe, expect, it } from "vitest";
import { buildCfg } from "../src/sistema-solar/config.js";
import {
  fit,
  pairConflict,
  staticConflict,
} from "../src/sistema-solar/layout.js";
import { opcoesDoSistema } from "../src/i18n/index.js";

// Larguras a 100px medidas no Chrome (Familjen Grotesk 700, letter-spacing -0.045em),
// as mesmas de tests/assinatura.test.js.
/** @type {Record<string, number>} */
const LARGURAS = {
  "problema,": 412.34,
  "solução.": 338.5,
  "problem,": 359.34,
  "solution.": 340.67,
};
const medirGrande = (/** @type {string} */ t) => LARGURAS[t] ?? t.length * 50;
const cwOf = (/** @type {number} */ fs) => fs * 0.6;
const relogioParado = () => 0;

// [W, H, ok, fonte PT, fonte EN, fonte grande PT, fonte grande EN]
// Única diferença de fonte: 1536x864, porque em inglês o rótulo mais largo da órbita de fora
// é (full-stack), 12 caracteres, contra (ferramentas), 13. A fonte grande em inglês fica
// cerca de 0,6% menor porque `solution.` (340,67) é mais larga que `solução.` (338,5).
const ESPERADO = [
  [1100, 640, true, 14, 14, 54.4, 54.1],
  [1200, 700, true, 15, 15, 59.3, 59.0],
  [1280, 720, true, 16, 16, 63.3, 62.9],
  [1340, 690, true, 17, 17, 66.3, 65.8],
  [1440, 900, true, 18, 18, 71.2, 70.8],
  [1536, 864, true, 19, 20, 76.0, 75.5],
  [1920, 1080, true, 22, 22, 95.0, 94.3],
  [766, 878, true, 14, 14, 40.0, 40.0],
  [1024, 768, true, 13, 13, 50.6, 50.3],
  [820, 1180, true, 15, 15, 40.6, 40.3],
  [900, 900, true, 17, 17, 44.5, 44.2],
  [600, 480, false, 10, 10, null, null],
  [800, 367, false, 10, 10, null, null],
];

/** JSON do layout sem os campos que só a página define. */
const semIds = (/** @type {unknown} */ L) =>
  JSON.stringify(L, (k, v) =>
    k === "id" || k === "lang" || k === "href" ? undefined : v,
  );

describe("português da página = referência", () => {
  for (const medir of [undefined, medirGrande]) {
    const nome = medir ? "com fonte grande" : "só frase pequena";
    it.each(ESPERADO.map(([W, H]) => [W, H]))(`${nome} %ix%i`, (W, H) => {
      const opcoes = { agora: relogioParado, medirGrande: medir };
      const ref = fit(buildCfg({}), 22, W, H, cwOf, opcoes);
      const pagina = fit(
        buildCfg(opcoesDoSistema("pt")),
        22,
        W,
        H,
        cwOf,
        opcoes,
      );
      expect(semIds(pagina.L)).toBe(semIds(ref.L));
      expect(pagina.ok).toBe(ref.ok);
    });
  }
});

describe.each([
  ["pt", 0],
  ["en", 1],
])("encaixe em %s", (idioma, col) => {
  const cfg = buildCfg(opcoesDoSistema(/** @type {"pt" | "en"} */ (idioma)));
  it.each(ESPERADO)("%ix%i", (W, H, ok, ...resto) => {
    const r = fit(cfg, 22, W, H, cwOf, {
      agora: relogioParado,
      medirGrande,
    });
    const g = r.L.sig?.grande;
    expect({
      ok: r.ok,
      fonte: r.L.fs,
      grande: g ? +g.s.toFixed(1) : null,
    }).toEqual({ ok, fonte: resto[col], grande: resto[2 + col] });
    if (!r.ok) return;
    expect(staticConflict(r.L)).toBe(false);
    const o = r.L.orbits;
    for (let i = 0; i < o.length; i++)
      for (let j = i + 1; j < o.length; j++)
        expect(pairConflict(o[i], o[j])).toBe(false);
  });
});
