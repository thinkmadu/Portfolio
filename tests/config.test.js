import { describe, expect, it } from "vitest";
import {
  DEF_ASSINATURA,
  buildCfg,
  sigOf,
} from "../src/sistema-solar/config.js";

describe("sigOf", () => {
  it("padrão: as quatro linhas da frase", () => {
    expect(sigOf({})).toEqual([
      "Se encontro um problema,",
      "desenvolvo a solução.",
      "De ponta a ponta,",
      "sem deixar nada solto.",
    ]);
  });
  it("null e false tiram a frase; lista vazia também", () => {
    expect(sigOf({ assinatura: null })).toBeNull();
    expect(sigOf({ assinatura: false })).toBeNull();
    expect(sigOf({ assinatura: [] })).toBeNull();
  });
  it("string quebra em linhas de até 26 caracteres", () => {
    const linhas = sigOf({ assinatura: DEF_ASSINATURA.join(" ") });
    expect(linhas).not.toBeNull();
    for (const l of linhas ?? []) expect(l.length).toBeLessThanOrEqual(26);
    expect((linhas ?? []).join(" ")).toBe(DEF_ASSINATURA.join(" "));
  });
});

describe("buildCfg", () => {
  it("limita contatos a 4, áreas a 6 e nós a 4", () => {
    const item = (/** @type {number} */ i) => ({ rotulo: "x" + i });
    const cfg = buildCfg({
      contatos: Array.from({ length: 9 }, (_, i) => item(i)),
      areas: Array.from({ length: 9 }, (_, i) => item(i)),
      secundario: { nos: Array.from({ length: 9 }, (_, i) => item(i)) },
    });
    expect(cfg.big[0].pl).toHaveLength(4);
    expect(cfg.big[1].pl).toHaveLength(6);
    expect(cfg.cons?.nodes).toHaveLength(4);
  });
  it("texto do planeta entre parênteses e href padrão", () => {
    const cfg = buildCfg({ contatos: [{ rotulo: "github" }] });
    expect(cfg.big[0].pl[0]).toMatchObject({
      t: "(github)",
      href: "#",
      atual: false,
    });
    expect(cfg.sunG).toBe("(thinkmadu)");
  });
});
