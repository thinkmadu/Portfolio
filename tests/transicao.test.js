// @vitest-environment jsdom
// Transição entre páginas: cobre todas as páginas e termina sozinha ou pulada.
import { describe, expect, it } from "vitest";
import { PAGINAS } from "../src/paginas/index.js";
import { INFO, transicao } from "../src/transicao/index.js";

describe("transição", () => {
  it("tem título, legenda e cor para a abertura e para cada página", () => {
    for (const id of ["inicio", ...Object.keys(PAGINAS)]) {
      expect(INFO[id], id).toBeDefined();
      expect(INFO[id].c).toMatch(/^#[0-9a-f]{6}$/i);
      expect(INFO[id].t.length).toBeGreaterThan(0);
    }
  });

  it("resolve na hora quando não há o que mostrar", async () => {
    const raiz = document.createElement("div");
    await transicao(raiz, "ia", "ia").fim;
    await transicao(raiz, "ia", "desconhecida").fim;
    expect(raiz.childElementCount).toBe(0);
  });

  it("desenha o campo e o título e é pulada por clique", async () => {
    const raiz = document.createElement("div");
    const tr = transicao(raiz, "inicio", "ferramentas");
    expect(raiz.querySelectorAll("pre.pf-tr-campo")).toHaveLength(4);
    expect(
      raiz.querySelector(".pf-tr-titulo")?.textContent?.length,
    ).toBeGreaterThan(0);
    raiz.querySelector(".pf-tr-palco")?.dispatchEvent(new Event("pointerdown"));
    await tr.fim;
    tr.destroy();
    expect(raiz.childElementCount).toBe(0);
  });
});
