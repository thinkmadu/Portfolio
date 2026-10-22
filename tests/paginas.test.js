// @vitest-environment jsdom
// Páginas em terminal: roteamento pelo hash e montagem completa de cada página.
import { describe, expect, it } from "vitest";
import { PAGINAS, paginaDoHash } from "../src/paginas/index.js";

describe("paginaDoHash", () => {
  it("reconhece as páginas e manda o resto para a abertura", () => {
    expect(paginaDoHash("#ferramentas")).toBe("ferramentas");
    expect(paginaDoHash("ferramentas")).toBe("ferramentas");
    expect(paginaDoHash("")).toBeNull();
    expect(paginaDoHash("#inicio")).toBeNull();
    expect(paginaDoHash("#ajustes")).toBeNull();
    expect(paginaDoHash("#constructor")).toBeNull();
  });
});

describe.each(Object.keys(PAGINAS))("página %s", (id) => {
  it("monta, desenha as camadas, oferece o voltar e se desmonta", async () => {
    const { montar } = await PAGINAS[id]();
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const m = montar(raiz);
    expect(raiz.querySelector(".pf-tela")).not.toBeNull();
    expect(raiz.querySelectorAll("pre.pf-t-texto").length).toBeGreaterThan(5);
    const voltar = raiz.querySelector('a[href="#inicio"]');
    expect(voltar?.getAttribute("target")).toBe("_self");
    expect(raiz.querySelector("pre")?.textContent).toBeDefined();
    m.destroy();
    expect(raiz.childElementCount).toBe(0);
    raiz.remove();
  });
});
