// O algoritmo de encaixe não pode mudar de resultado com a refatoração.
// A referência (tests/fixtures/layout-referencia.json) foi gerada rodando o código original
// do index.html (commit 273064e) com a mesma largura de caractere (fs * 0.6): cada caso
// guarda ok, fonte, fases e o SHA-256 do layout inteiro serializado.

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildCfg } from "../src/sistema-solar/config.js";
import {
  fit,
  pairConflict,
  staticConflict,
} from "../src/sistema-solar/layout.js";

const referencia = JSON.parse(
  readFileSync(
    new URL("./fixtures/layout-referencia.json", import.meta.url),
    "utf8",
  ),
);

/** @param {number} fs */
const cwOf = (fs) => fs * 0.6;
/** relógio parado: o orçamento de tempo nunca estoura e o teste fica determinístico */
const relogioParado = () => 0;

const CASOS = {
  padrao: {},
  ingles: {
    assinatura: [
      "If I find a problem,",
      "I build the solution.",
      "End to end,",
      "no loose ends.",
    ],
  },
  semConstelacao: { secundario: null },
  semAssinatura: { assinatura: null },
  semContatos: { contatos: [] },
};

// Tabela combinada com a Madu: tamanho, ok esperado e fonte dos nomes.
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

/** @param {unknown} L */
const sha = (L) => createHash("sha256").update(JSON.stringify(L)).digest("hex");

describe("fit com a configuração padrão", () => {
  const cfg = buildCfg({});
  it.each(ESPERADO)("%ix%i: ok %s, fonte %i", (W, H, ok, fs) => {
    const r = fit(cfg, 22, W, H, cwOf);
    expect(r.ok).toBe(ok);
    expect(r.L.fs).toBe(fs);
  });
});

describe.each(Object.entries(CASOS))(
  "layout idêntico ao original: %s",
  (nome, opts) => {
    const cfg = buildCfg(opts);
    it.each(referencia.casos[nome].map((r) => [`${r.W}x${r.H}`, r]))(
      "%s",
      (_, ref) => {
        const r = fit(cfg, 22, ref.W, ref.H, cwOf, { agora: relogioParado });
        expect({
          ok: r.ok,
          fs: r.L.fs,
          constelacao: r.L.hasCons,
          fases: r.L.orbits.map((o) => o.off),
        }).toEqual({
          ok: ref.ok,
          fs: ref.fs,
          constelacao: ref.constelacao,
          fases: ref.fases,
        });
        expect(sha(r.L)).toBe(ref.sha256);
      },
    );
  },
);

describe("nada sobreposto quando ok", () => {
  for (const [nome, opts] of Object.entries(CASOS)) {
    const cfg = buildCfg(opts);
    for (const [W, H] of ESPERADO) {
      const r = fit(cfg, 22, W, H, cwOf, { agora: relogioParado });
      if (!r.ok) continue;
      it(`${nome} ${W}x${H}`, () => {
        expect(staticConflict(r.L)).toBe(false);
        const o = r.L.orbits;
        for (let i = 0; i < o.length; i++)
          for (let j = i + 1; j < o.length; j++)
            expect(pairConflict(o[i], o[j])).toBe(false);
      });
    }
  }
});

describe("casos de borda", () => {
  it("sem constelação: nenhum nó fixo além do sol e da assinatura", () => {
    const r = fit(buildCfg({ secundario: null }), 22, 1340, 690, cwOf);
    expect(r.ok).toBe(true);
    expect(r.L.hasCons).toBe(false);
    expect(r.L.cons).toBeNull();
    expect(r.L.fixed).toHaveLength(2);
  });
  it("sem frase de assinatura", () => {
    const r = fit(buildCfg({ assinatura: null }), 22, 1340, 690, cwOf);
    expect(r.ok).toBe(true);
    expect(r.L.sig).toBeNull();
  });
  it("contatos vazio: só a órbita das áreas", () => {
    const r = fit(buildCfg({ contatos: [] }), 22, 1340, 690, cwOf);
    expect(r.ok).toBe(true);
    expect(r.L.orbits).toHaveLength(1);
    expect(r.L.orbits[0].pl.map((p) => p.rotulo)).toEqual([
      "ia",
      "dados",
      "ferramentas",
      "full-stack",
      "testes",
    ]);
  });
  it("sem arranjo com a constelação, tenta sem ela antes de desistir", () => {
    // relógio que avança 1s por leitura: o primeiro encaixe estoura o orçamento na hora
    let t = 0;
    const relogio = () => (t += 1000);
    const r = fit(buildCfg({}), 22, 1340, 690, cwOf, { agora: relogio });
    expect(r.ok).toBe(false);
    expect(r.L.fs).toBe(10);
  });
});
