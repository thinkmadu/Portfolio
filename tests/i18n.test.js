// Dicionários, escolha do idioma e textos do documento.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import pt from "../src/i18n/pt.js";
import en from "../src/i18n/en.js";
import {
  DICIONARIOS,
  ENDONIMOS,
  URL_PUBLICA,
  aplicarDocumento,
  frase,
  opcoesDoSistema,
  t,
} from "../src/i18n/index.js";
import {
  CHAVE,
  CHAVE_ANTIGA,
  lerSalvo,
  migrarAntigo,
  normalizar,
  resolverIdioma,
  salvar,
  urlComIdioma,
} from "../src/i18n/idioma.js";

// montado por código para este arquivo não conter o caractere
const TRAVESSAO = String.fromCharCode(0x2014);
const IDIOMAS = /** @type {(keyof typeof DICIONARIOS)[]} */ (
  Object.keys(DICIONARIOS)
);

describe("dicionários", () => {
  it("pt e en têm exatamente as mesmas chaves", () => {
    const a = Object.keys(pt);
    const b = Object.keys(en);
    expect(b.filter((k) => !a.includes(k))).toEqual([]); // sobrando no en
    expect(a.filter((k) => !b.includes(k))).toEqual([]); // faltando no en
  });

  it.each(IDIOMAS)("%s: nenhuma string vazia", (l) => {
    const vazias = Object.entries(DICIONARIOS[l]).filter(
      ([, v]) => typeof v !== "string" || v.trim() === "",
    );
    expect(vazias).toEqual([]);
  });

  it.each(IDIOMAS)("%s: nenhum travessão", (l) => {
    const com = Object.entries(DICIONARIOS[l]).filter(([, v]) =>
      v.includes(TRAVESSAO),
    );
    expect(com).toEqual([]);
  });

  it("endônimos iguais nas duas versões", () => {
    expect(ENDONIMOS).toEqual({ pt: "português", en: "english" });
  });

  it("as {variáveis} de cada texto batem entre os idiomas", () => {
    const vars = (/** @type {string} */ s) =>
      (s.match(/\{\w+\}/g) || []).sort();
    for (const k of /** @type {(keyof typeof pt)[]} */ (Object.keys(pt)))
      expect([k, vars(en[k])]).toEqual([k, vars(pt[k])]);
  });

  it("t() interpola e cai no português se o idioma não existir", () => {
    const S = { fundo: 1, brilho: 2, orbitas: 3, meteoros: 4, fonte: 5 };
    expect(t("en", "painel.leitura", { ...S, seed: 6 })).toBe(
      "background 1 · glow 2 · orbits 3 · meteors 4 · font 5 · seed 6",
    );
    expect(t(/** @type {any} */ ("xx"), "planeta.ia")).toBe("ia");
  });

  it("frase da assinatura nos dois idiomas", () => {
    expect(frase("pt")).toBe(
      "Se encontro um problema, desenvolvo a solução. De ponta a ponta, sem deixar nada solto.",
    );
    expect(frase("en")).toBe(
      "If I find a problem, I build the solution. End to end, no loose ends.",
    );
  });
});

describe("index.html fixo é a versão em português", () => {
  const html = readFileSync(
    new URL("../index.html", import.meta.url),
    "utf8",
  ).replace(/\s+/g, " ");
  it("description, og:description, título e h1 batem com o dicionário", () => {
    expect(html).toContain(`name="description" content="${frase("pt")}"`);
    expect(html).toContain(
      `property="og:description" content="${frase("pt")}"`,
    );
    expect(html).toContain(`<title>${pt["doc.titulo"]}</title>`);
    expect(html).toContain(`data-i18n="doc.h1"> ${pt["doc.h1"]} </h1>`);
    expect(html).toContain('<html lang="pt-BR">');
  });
  it("hreflang com URL absoluta para cada idioma", () => {
    for (const [l, href] of [
      ["pt-BR", URL_PUBLICA],
      ["en", URL_PUBLICA + "?lang=en"],
      ["x-default", URL_PUBLICA],
    ])
      expect(html).toContain(`hreflang="${l}" href="${href}"`);
  });
});

describe("opções do SistemaSolar", () => {
  it("ids estáveis, rótulos traduzidos e nós de idioma com lang", () => {
    const o = opcoesDoSistema("en");
    expect(o.areas?.map((a) => [a.id, a.rotulo])).toEqual([
      ["ia", "ai"],
      ["dados", "data"],
      ["ferramentas", "tools"],
      ["full-stack", "full-stack"],
      ["testes", "testing"],
    ]);
    expect(o.secundario?.centro).toBe("settings");
    expect(o.secundario?.id).toBe("ajustes");
    expect(
      o.secundario?.nos?.map((n) => [n.id, n.rotulo, n.lang, n.href, n.atual]),
    ).toEqual([
      ["lang-pt", "português", "pt", "?lang=pt", false],
      ["lang-en", "english", "en", "?lang=en", true],
    ]);
    expect(o.textos).toEqual({
      sobre: "about me",
      sobreAria: "About me",
      navSistema: "Areas",
      navMenu: "Areas as text",
    });
  });
});

describe("resolução do idioma", () => {
  // ordem (decisão da Madu, 21/10/2026): ?lang= > salvo > navegador > pt
  it.each([
    ["sem nada", {}, "pt", "padrao"],
    ["?lang=en", { busca: "?lang=en" }, "en", "url"],
    [
      "?lang=pt com navegador en-US",
      { busca: "?lang=pt", navegador: ["en-US"] },
      "pt",
      "url",
    ],
    [
      "salvo pt com ?lang=en: a URL vence",
      { salvo: "pt", busca: "?lang=en" },
      "en",
      "url",
    ],
    [
      "salvo en com ?lang=pt: a URL vence",
      { salvo: "en", busca: "?lang=pt" },
      "pt",
      "url",
    ],
    [
      "salvo en com navegador pt-BR",
      { salvo: "en", navegador: ["pt-BR"] },
      "en",
      "salvo",
    ],
    ["navegador en-US", { navegador: ["en-US", "en"] }, "en", "navegador"],
    ["navegador pt-PT", { navegador: ["pt-PT"] }, "pt", "navegador"],
    [
      "navegador fr, depois en",
      { navegador: ["fr-FR", "en-GB"] },
      "en",
      "navegador",
    ],
    ["navegador só fr", { navegador: ["fr-FR"] }, "pt", "padrao"],
    [
      "?lang=xx inválido cai no salvo",
      { busca: "?lang=xx", salvo: "en" },
      "en",
      "salvo",
    ],
    [
      "?lang=xx inválido cai no navegador",
      { busca: "?lang=xx", navegador: ["en-US"] },
      "en",
      "navegador",
    ],
    [
      "salvo inválido",
      { salvo: "klingon", navegador: ["en"] },
      "en",
      "navegador",
    ],
    ["?lang= vazio", { busca: "?lang=" }, "pt", "padrao"],
    ["maiúsculas ?lang=EN", { busca: "?lang=EN" }, "en", "url"],
  ])("%s", (_nome, entrada, idioma, fonte) => {
    expect(resolverIdioma(entrada)).toEqual({ idioma, fonte });
  });

  it("normalizar recusa o que não é texto", () => {
    expect(normalizar(null)).toBe(null);
    expect(normalizar(42)).toBe(null);
    expect(normalizar("pt_BR")).toBe("pt");
  });
});

describe("storage e URL", () => {
  /** @param {Record<string, string>} [init] */
  const mem = (init = {}) => {
    /** @type {Record<string, string>} */
    const d = { ...init };
    return {
      getItem: (/** @type {string} */ k) => (k in d ? d[k] : null),
      setItem: (/** @type {string} */ k, /** @type {string} */ v) =>
        void (d[k] = String(v)),
      d,
    };
  };

  it("salva e lê", () => {
    const s = mem();
    salvar(s, "en");
    expect(s.d[CHAVE]).toBe("en");
    expect(lerSalvo(s)).toBe("en");
  });

  it("da chave antiga sol-v5 só 'english' conta como escolha", () => {
    const antigo = (/** @type {object} */ v) =>
      mem({ [CHAVE_ANTIGA]: JSON.stringify(v) });
    expect(lerSalvo(antigo({ lang: "english", fundo: 11 }))).toBe("en");
    expect(lerSalvo(antigo({ lang: "português" }))).toBe(null);
    expect(lerSalvo(mem({ [CHAVE_ANTIGA]: "{quebrado" }))).toBe(null);
  });

  it("migrarAntigo copia 'english' para a chave nova uma vez", () => {
    const s = mem({ [CHAVE_ANTIGA]: JSON.stringify({ lang: "english" }) });
    migrarAntigo(s);
    expect(s.d[CHAVE]).toBe("en");
    const s2 = mem({
      [CHAVE]: "pt",
      [CHAVE_ANTIGA]: JSON.stringify({ lang: "english" }),
    });
    migrarAntigo(s2);
    expect(s2.d[CHAVE]).toBe("pt");
    const s3 = mem({ [CHAVE_ANTIGA]: JSON.stringify({ lang: "português" }) });
    migrarAntigo(s3);
    expect(s3.d[CHAVE]).toBeUndefined();
  });

  it("storage que lança não derruba nada", () => {
    const ruim = {
      getItem() {
        throw new Error("SecurityError");
      },
      setItem() {
        throw new Error("QuotaExceeded");
      },
    };
    expect(lerSalvo(ruim)).toBe(null);
    expect(() => salvar(ruim, "en")).not.toThrow();
    expect(() => migrarAntigo(ruim)).not.toThrow();
    expect(lerSalvo(null)).toBe(null);
  });

  it("urlComIdioma troca só lang e preserva o resto", () => {
    expect(urlComIdioma(URL_PUBLICA, "en")).toBe("/Portfolio/?lang=en");
    expect(urlComIdioma(URL_PUBLICA + "?lang=en&x=1#ajustes", "pt")).toBe(
      "/Portfolio/?lang=pt&x=1#ajustes",
    );
  });
});

describe("aplicarDocumento", () => {
  it("troca lang, título, description, canonical e data-i18n", async () => {
    const { JSDOM } = await import("jsdom");
    const { window } = new JSDOM(
      `<!doctype html><html lang="pt-BR"><head><title>x</title><meta name="description" content="x"></head>
       <body><h1 data-i18n="doc.h1">x</h1></body></html>`,
    );
    const doc = window.document;
    const canonical = () =>
      doc.querySelector('link[rel="canonical"]')?.getAttribute("href");
    aplicarDocumento(doc, "en");
    expect(doc.documentElement.lang).toBe("en");
    expect(doc.title).toBe("Eduarda Silva (thinkmadu)");
    expect(
      doc.querySelector('meta[name="description"]')?.getAttribute("content"),
    ).toBe(frase("en"));
    expect(doc.querySelector("h1")?.textContent).toBe(en["doc.h1"]);
    expect(canonical()).toBe(URL_PUBLICA + "?lang=en");
    aplicarDocumento(doc, "pt");
    expect(doc.documentElement.lang).toBe("pt-BR");
    expect(doc.querySelector("h1")?.textContent).toBe(pt["doc.h1"]);
    expect(canonical()).toBe(URL_PUBLICA);
    expect(doc.querySelectorAll('link[rel="canonical"]')).toHaveLength(1);
  });
});
