// @vitest-environment jsdom
// Páginas em terminal: roteamento pelo hash e montagem completa de cada página.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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

describe("página ia: tela principal", () => {
  /** @param {Element} tela @param {string} key */
  const tecla = (tela, key) =>
    tela.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

  // com os projetos em construção, os cartões não abrem e as teclas 1 a 4 ficam paradas
  it("projetos em construção: só o voltar é clicável e 1 a 4 não abrem nada", async () => {
    const { montar } = await PAGINAS.ia();
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const m = montar(raiz);
    const tela = /** @type {Element} */ (raiz.querySelector(".pf-tela"));
    const rotulos = () =>
      [...raiz.querySelectorAll(".pf-t-zona")].map((z) =>
        z.getAttribute("aria-label"),
      );

    expect(rotulos()).toEqual(["Voltar para o início"]);
    for (const k of ["1", "2", "3", "4"]) tecla(tela, k);
    expect(rotulos()).toEqual(["Voltar para o início"]);
    expect(raiz.querySelector('a[href="#inicio"]')).not.toBeNull();

    m.destroy();
    expect(raiz.childElementCount).toBe(0);
    raiz.remove();
  });
});

describe("páginas em inglês", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // o jsdom avisa "Not implemented: navigation" quando a página de e-mail abre o mailto
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  /** @param {Element} raiz */
  const texto = (raiz) =>
    [...raiz.querySelectorAll("pre.pf-t-texto")]
      .map((p) => p.textContent)
      .join("\n");
  /** @param {Element} raiz */
  const rotulos = (raiz) =>
    [...raiz.querySelectorAll(".pf-t-zona")].map(
      (z) => z.getAttribute("aria-label") ?? "",
    );
  /**
   * Monta a página no idioma, deixa 4 s correrem e devolve o que ela mostra.
   * @param {string} id @param {"pt" | "en"} idioma
   */
  async function ver(id, idioma) {
    const { montar } = await PAGINAS[id]();
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const m = montar(raiz, idioma);
    vi.advanceTimersByTime(4000);
    const tela = /** @type {Element} */ (raiz.querySelector(".pf-tela"));
    const visto = {
      texto: texto(raiz),
      rotulos: rotulos(raiz),
      aria: tela.getAttribute("aria-label") ?? "",
      descricao:
        raiz.querySelector(".pf-t-imagem")?.getAttribute("aria-label") ?? "",
    };
    m.destroy();
    raiz.remove();
    return visto;
  }

  // um trecho que só existe na versão em inglês de cada página
  const MARCA = {
    sobre: "about me",
    ia: "under construction",
    ferramentas: "integration",
    testes: "bugs captured:",
    email: "Dear Madu,",
  };

  it.each(Object.keys(PAGINAS))(
    "%s: texto em inglês e nenhum rótulo de zona em português",
    async (id) => {
      const pt = await ver(id, "pt");
      const en = await ver(id, "en");
      expect(en.texto).toContain(MARCA[/** @type {keyof typeof MARCA} */ (id)]);
      expect(pt.texto).not.toContain(
        MARCA[/** @type {keyof typeof MARCA} */ (id)],
      );
      expect(en.texto).toContain("keys:");
      expect(en.texto).not.toContain("navegação:");
      expect(en.rotulos).toContain("Back to home");
      expect(en.rotulos.length).toBeGreaterThan(0);
      for (const r of en.rotulos) {
        expect(r, r).not.toMatch(/Voltar|Abrir|Etapa|Aba |Grupo|Escrever/);
        expect(pt.rotulos, r).not.toContain(r);
      }
      expect(en.aria).not.toBe(pt.aria);
      expect(en.aria).not.toMatch(/Página|Teclas|volta/);
      expect(en.descricao).not.toBe(pt.descricao);
    },
  );

  it.each(Object.keys(PAGINAS))(
    "%s: sem idioma ou com idioma desconhecido, monta em português",
    async (id) => {
      const { montar } = await PAGINAS[id]();
      for (const args of [[], ["fr"], ["__proto__"]]) {
        const raiz = document.createElement("div");
        document.body.append(raiz);
        const m = montar(raiz, .../** @type {any} */ (args));
        expect(rotulos(raiz)).toContain("Voltar para o início");
        expect(texto(raiz)).toContain("navegação:");
        m.destroy();
        raiz.remove();
      }
    },
  );

  /** @param {Element} tela @param {string} key */
  const tecla = (tela, key) =>
    tela.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

  it("sobre: a tecla da aba é a inicial do rótulo em inglês (e abre education)", async () => {
    const { montar } = await PAGINAS.sobre();
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const m = montar(raiz, "en");
    const tela = /** @type {Element} */ (raiz.querySelector(".pf-tela"));
    // a legenda é escrita em duas camadas: o rótulo no texto secundário e as teclas no negrito
    const negrito = () => raiz.querySelector("pre.c6")?.textContent ?? "";
    expect(texto(raiz)).toContain("keys:");
    expect(negrito()).toMatch(/p\s+s\s+e\s+c\s+v/);
    tecla(tela, "e");
    vi.advanceTimersByTime(3000);
    expect(texto(raiz)).toContain("academic background");
    tecla(tela, "c");
    vi.advanceTimersByTime(3000);
    expect(texto(raiz)).toContain("showing 6 of 6");
    expect(texto(raiz)).toContain("filter:");
    expect(negrito()).toContain("1-6");
    m.destroy();
  });

  it("testes: t e m trocam de grupo em inglês", async () => {
    const { montar } = await PAGINAS.testes();
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const m = montar(raiz, "en");
    const tela = /** @type {Element} */ (raiz.querySelector(".pf-tela"));
    vi.advanceTimersByTime(500);
    expect(texto(raiz)).toContain("UI automation");
    tecla(tela, "m");
    vi.advanceTimersByTime(500);
    expect(texto(raiz)).toContain("test levels");
    expect(texto(raiz)).not.toContain("UI automation");
    tecla(tela, "t");
    vi.advanceTimersByTime(500);
    expect(texto(raiz)).toContain("UI automation");
    m.destroy();
  });

  it("email: o mailto sai em inglês (assunto padrão, saudação e fecho)", async () => {
    const { montar } = await PAGINAS.email();
    const raiz = document.createElement("div");
    document.body.append(raiz);
    const m = montar(raiz, "en");
    /** @param {string} k */
    const digita = (k) =>
      document.dispatchEvent(
        new KeyboardEvent("keydown", {
          key: k,
          bubbles: true,
          cancelable: true,
        }),
      );
    /** @type {HTMLElement} */ (
      raiz.querySelector('button[aria-label="Write the message"]')
    ).click();
    for (const k of "hello") digita(k);
    digita("Escape");
    digita("e");
    vi.advanceTimersByTime(8400);
    const href =
      raiz
        .querySelector('a[aria-label^="Open my email app"]')
        ?.getAttribute("href") ?? "";
    const url = new URL(href);
    expect(url.protocol).toBe("mailto:");
    expect(url.searchParams.get("subject")).toBe("Contact via portfolio");
    expect(url.searchParams.get("body")).toBe(
      "Dear Madu,\n\nhello\n\nBest regards,\n",
    );
    m.destroy();
  });
});
