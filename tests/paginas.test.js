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

describe("página ia: fluxo de três telas", () => {
  /** @param {Element} tela @param {string} key */
  const tecla = (tela, key) =>
    tela.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

  it("abre um projeto, pula a transição, mostra o detalhe e volta à principal", async () => {
    const { montar } = await PAGINAS.ia();
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const m = montar(raiz);
    const tela = /** @type {Element} */ (raiz.querySelector(".pf-tela"));
    const rotulos = () =>
      [...raiz.querySelectorAll(".pf-t-zona")].map((z) =>
        z.getAttribute("aria-label"),
      );

    expect(rotulos()).toContain("Abrir [projeto de IA 4]");
    expect(raiz.querySelector('a[href="#inicio"]')).not.toBeNull();

    tecla(tela, "3");
    expect(rotulos()).toEqual([]);

    tecla(tela, "x");
    expect(rotulos()).toContain("Voltar para os projetos");
    expect(raiz.querySelector('a[href="#inicio"]')).toBeNull();

    tecla(tela, "v");
    expect(raiz.querySelector('a[href="#inicio"]')).not.toBeNull();
    for (const k of ["1", "2", "4", "Escape"]) tecla(tela, k);

    m.destroy();
    expect(raiz.childElementCount).toBe(0);
    raiz.remove();
  });
});
