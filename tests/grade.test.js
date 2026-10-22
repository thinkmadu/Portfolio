// Grade de caracteres das telas em terminal: escrita em camadas, formas e pixel art.
import { describe, expect, it } from "vitest";
import {
  COLUNAS,
  cl,
  criarGrade,
  ease,
  hash,
  quebrar,
} from "../src/terminal/grade.js";

const G = criarGrade({ linhas: 4, camadas: 3 });

describe("put", () => {
  it("escreve na camada e limpa as outras na mesma célula", () => {
    const g = G.mk();
    G.put(g, 0, 2, 1, "ab");
    G.put(g, 2, 3, 1, "x");
    expect(g[0][1][2]).toBe("a");
    expect(g[0][1][3]).toBe(" ");
    expect(g[2][1][3]).toBe("x");
  });
  it("espaço não apaga e o que sai da grade é ignorado", () => {
    const g = G.mk();
    G.put(g, 1, 0, 0, "a b");
    G.put(g, 2, 1, 0, " ");
    expect(g[1][0][0]).toBe("a");
    G.put(g, 1, COLUNAS - 1, 0, "xy");
    G.put(g, 1, 0, 9, "z");
    expect(g[1][0][COLUNAS - 1]).toBe("x");
  });
});

describe("box e vazio", () => {
  it("desenha cantos e laterais", () => {
    const g = G.mk();
    G.box(g, 0, 1, 0, 4, 3);
    expect(g[0][0].slice(1, 5).join("")).toBe("╭──╮");
    expect(g[0][1][1]).toBe("│");
    expect(g[0][2].slice(1, 5).join("")).toBe("╰──╯");
    expect(G.vazio(g, 0, 0)).toBe(true);
    expect(G.vazio(g, 1, 0)).toBe(false);
  });
});

describe("split", () => {
  it("separa texto, traços e preenchimentos por camada", () => {
    const g = G.mk();
    G.put(g, 0, 0, 0, "─a•█");
    const o = G.split(g);
    expect(o.l0.split("\n")[0].trimEnd()).toBe(" a");
    expect(o.s0).toContain("h7.8");
    expect(o.f0).toContain("a3 3");
    expect(o.f0).toContain("v16");
  });
  it("acrescenta as formas extras", () => {
    const o = G.split(G.mk(), [
      { t: "q", l: 1, x: 0, y: 0, w: 10, h: 6, r: 2 },
      { t: "r", l: 1, x: 1, y: 1, w: 2, h: 2 },
      { t: "s", l: 2, x1: 0, y1: 0, x2: 5, y2: 5 },
      { t: "c", l: 2, x: 5, y: 5, r: 2 },
    ]);
    expect(o.f1).toContain("a2 2");
    expect(o.f1).toContain("h2.0v2.0");
    expect(o.s2).toBe("M0.0 0.0L5.0 5.0");
    expect(o.f2).toContain("a2 2 0 1 0 4 0");
  });
});

describe("pintar", () => {
  it("duas linhas de pixel viram um meio-bloco ou um bloco", () => {
    const g = G.mk();
    G.pintar(
      g,
      [
        [1, 0, -1],
        [1, 2, -1],
      ],
      5,
      1,
    );
    expect(g[1][1][5]).toBe("█");
    expect(g[0][1][6]).toBe("▀");
    expect(g[2][1][6]).toBe("▄");
    expect(G.vazio(g, 7, 1)).toBe(true);
  });
  it("respeita os limites de colunas", () => {
    const g = G.mk();
    G.pintar(
      g,
      [
        [1, 1],
        [1, 1],
      ],
      0,
      0,
      1,
      1,
    );
    expect(G.vazio(g, 0, 0)).toBe(true);
    expect(g[1][0][1]).toBe("█");
  });
});

describe("legenda", () => {
  const G7 = criarGrade({ linhas: 1, camadas: 7 });
  it("põe as teclas em negrito, separadas por bolinhas", () => {
    const g = G7.mk();
    G7.legenda(g, 0, 0, ["1", "v"], ["aprovar", "a"]);
    expect(g[3][0].slice(0, 10).join("")).toBe("navegação:");
    expect(g[6][0][11]).toBe("1");
    expect(g[3][0][13]).toBe("•");
    expect(g[6][0][15]).toBe("v");
    expect(g[3][0].slice(19, 27).join("")).toBe("aprovar:");
    expect(g[6][0][28]).toBe("a");
  });
});

describe("utilidades", () => {
  it("cl, ease e hash", () => {
    expect(cl(5, 0, 3)).toBe(3);
    expect(ease(-1)).toBe(0);
    expect(ease(0.5)).toBe(0.5);
    expect(ease(2)).toBe(1);
    expect(hash(1, 2, 3)).toBe(hash(1, 2, 3));
    expect(hash(1, 2, 3)).not.toBe(hash(2, 1, 3));
    expect(hash(7, 7)).toBeLessThan(1);
  });
  it("quebrar não parte palavras", () => {
    expect(quebrar("um dois três quatro", 9)).toEqual([
      "um dois",
      "três",
      "quatro",
    ]);
    expect(quebrar("", 5)).toEqual([]);
  });
});
