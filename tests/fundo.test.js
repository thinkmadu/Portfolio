import { describe, expect, it } from "vitest";
import { campo } from "../src/sistema-solar/fundo.js";

const base = { C: 60, R: 20, Cv: 58, seed: 7, sois: [{ x: 30, y: 10 }] };

describe("campo de caracteres", () => {
  it("a mesma semente desenha o mesmo fundo", () => {
    expect(campo(base)).toEqual(campo(base));
    expect(campo({ ...base, seed: 8 }).html).not.toBe(campo(base).html);
  });
  it("uma linha de texto por linha do campo, com C caracteres cada", () => {
    const linhas = campo(base).html.split("\n");
    expect(linhas).toHaveLength(base.R);
    for (const l of linhas)
      expect(l.replace(/<[^>]+>/g, "").replace(/&[a-z]+;/g, "x")).toHaveLength(
        base.C,
      );
  });
  it("sem atributo style no HTML (CSP); um atraso por estrela que pisca", () => {
    const { html, piscadas } = campo(base);
    expect(html).not.toMatch(/style=/);
    expect(html.match(/class="pf-tw"/g)?.length ?? 0).toBe(piscadas.length);
  });
});
