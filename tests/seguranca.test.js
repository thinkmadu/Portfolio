// @vitest-environment jsdom
// Segurança: as garantias que a auditoria provou e que continuam valendo. Cada grupo guarda
// uma delas (CSP sem inline, roteador por hash, mailto, sumidouros de HTML, links, storage,
// cadeia de suprimentos, cabeçalhos). Achado ainda aberto aparece como `it.todo`, com o
// código S-n do relatório da auditoria.
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { URL as NodeURL, fileURLToPath } from "node:url";
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import { montar as montarEmail } from "../src/paginas/email.js";
import { PAGINAS, paginaDoHash } from "../src/paginas/index.js";
import { SistemaSolar } from "../src/sistema-solar/index.js";
import { campo } from "../src/sistema-solar/fundo.js";
import { PADRAO } from "../src/sistema-solar/config.js";
import { Cena, montarTela } from "../src/terminal/tela.js";
import { CartaoProjeto } from "../src/componentes/cartao-projeto.js";
import {
  DICIONARIOS,
  aplicarDocumento,
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
  storageDe,
  urlComIdioma,
} from "../src/i18n/idioma.js";
import { el, esc, hrefSeguro } from "../src/util/dom.js";
import { transicao as transicaoDe } from "../src/transicao/index.js";

// os testes da página de e-mail avançam segundos do relógio falso quadro a quadro
vi.setConfig({ testTimeout: 30_000 });

// fileURLToPath do Node: o URL global aqui é o do jsdom
const raiz = fileURLToPath(new NodeURL("..", import.meta.url));
/** @param {string} f */
const ler = (f) => readFileSync(join(raiz, f), "utf8");
/** @param {string} dir @param {RegExp} ext @returns {string[]} */
const arquivos = (dir, ext) =>
  readdirSync(join(raiz, dir), { recursive: true, encoding: "utf8" })
    .filter((f) => ext.test(f))
    .map((f) => join(dir, f));
/** @param {string} texto */
const parse = (texto) => new DOMParser().parseFromString(texto, "text/html");
const esperar = (/** @type {number} */ ms) =>
  new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------------------
// 1. CSP e HTML estático
// ---------------------------------------------------------------------------------------

/** Diretivas da CSP: nome para fontes. @param {string} politica */
function diretivas(politica) {
  /** @type {Record<string, string[]>} */
  const o = {};
  for (const d of politica.split(";")) {
    const [nome, ...fontes] = d.trim().split(/\s+/);
    if (nome) o[nome] = fontes;
  }
  return o;
}
/** @param {Document} doc */
const cspDe = (doc) =>
  doc
    .querySelector('meta[http-equiv="Content-Security-Policy"]')
    ?.getAttribute("content") ?? "";

/**
 * Tudo o que uma CSP sem `unsafe-inline` derrubaria ou que abre caminho para injeção.
 * @param {Document} doc
 */
function problemasInline(doc) {
  /** @type {string[]} */
  const p = [];
  for (const s of doc.querySelectorAll("script")) {
    if (!s.getAttribute("src") || (s.textContent ?? "").trim())
      p.push("script inline");
    if (s.getAttribute("type") !== "module") p.push("script que não é módulo");
  }
  if (doc.querySelector("style")) p.push("<style>");
  for (const t of [
    "iframe",
    "frame",
    "object",
    "embed",
    "applet",
    "base",
    "form",
  ])
    if (doc.querySelector(t)) p.push(`<${t}>`);
  for (const e of doc.querySelectorAll("*"))
    for (const a of e.attributes) {
      if (/^on/i.test(a.name)) p.push(`${e.localName}[${a.name}]`);
      if (a.name === "style") p.push(`${e.localName}[style]`);
      if (/^\s*(javascript|vbscript|data):/i.test(a.value))
        p.push(`${e.localName}[${a.name}] com URL perigosa`);
    }
  return p;
}

describe("CSP por meta no index.html", () => {
  const html = ler("index.html");
  const doc = parse(html);
  const d = diretivas(cspDe(doc));

  it("existe e vem antes de qualquer script, estilo ou pré-carga", () => {
    const meta = doc.querySelector(
      'meta[http-equiv="Content-Security-Policy"]',
    );
    expect(meta).not.toBeNull();
    const recurso = doc.querySelector(
      "script, link[rel=stylesheet], link[rel=preload], link[rel=icon]",
    );
    expect(recurso).not.toBeNull();
    expect(
      /** @type {Node} */ (meta).compareDocumentPosition(
        /** @type {Node} */ (recurso),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("script, estilo, fonte, imagem e conexão só aceitam 'self'", () => {
    expect(d["default-src"]).toEqual(["'none'"]);
    for (const k of ["script-src", "style-src", "font-src", "img-src"])
      expect(d[k], k).toEqual(["'self'"]);
  });

  it("object-src, base-uri e form-action são 'none'", () => {
    for (const k of [
      "object-src",
      "base-uri",
      "form-action",
      "connect-src",
      "frame-src",
      "worker-src",
      "manifest-src",
      "media-src",
    ])
      expect(d[k], k).toEqual(["'none'"]);
  });

  it("nenhuma fonte libera inline, eval, curinga, data:, blob: ou outra origem", () => {
    for (const [k, fontes] of Object.entries(d))
      for (const f of fontes) {
        expect(f, `${k} ${f}`).not.toMatch(
          /unsafe-|^\*$|\*\.|^data:|^blob:|^https?:|^wss?:|^filesystem:|nonce-|strict-dynamic/i,
        );
      }
  });

  it("não usa diretivas que o navegador ignora quando vêm por meta", () => {
    // frame-ancestors, report-uri, report-to e sandbox só valem em cabeçalho HTTP
    for (const k of ["frame-ancestors", "report-uri", "report-to", "sandbox"])
      expect(Object.keys(d), k).not.toContain(k);
  });

  it("não há outro http-equiv (X-Frame-Options e afins seriam ignorados)", () => {
    const outros = [...doc.querySelectorAll("meta[http-equiv]")].map((m) =>
      (m.getAttribute("http-equiv") ?? "").toLowerCase(),
    );
    expect(outros).toEqual(["content-security-policy"]);
  });

  it("o HTML de origem não tem script ou estilo embutido, manipulador on*, style=, nem URL javascript:", () => {
    expect(problemasInline(doc)).toEqual([]);
  });

  it("todo src e href do index.html fica na origem do site", () => {
    const base = "https://thinkmadu.github.io/Portfolio/";
    for (const e of doc.querySelectorAll("[src], [href]")) {
      const v = e.getAttribute("src") ?? e.getAttribute("href") ?? "";
      expect(new URL(v, base).origin, v).toBe("https://thinkmadu.github.io");
    }
  });
});

describe("dist gerado agora por vite build (pasta temporária)", () => {
  const dist = mkdtempSync(join(tmpdir(), "pf-seguranca-"));
  /** Quantos `.innerHTML =` o bundle pode ter: campo da abertura e fundo das páginas. */
  const INNER_HTML_NO_BUNDLE = 2;

  beforeAll(() => {
    execFileSync(
      process.execPath,
      [
        join(raiz, "node_modules/vite/bin/vite.js"),
        "build",
        "--outDir",
        dist,
        "--emptyOutDir",
        "--logLevel",
        "silent",
      ],
      { cwd: raiz, env: { ...process.env, NODE_ENV: "production" } },
    );
  }, 120_000);
  afterAll(() => rmSync(dist, { recursive: true, force: true }));

  const lista = () =>
    readdirSync(dist, { recursive: true, encoding: "utf8" }).filter((f) =>
      extname(f),
    );
  const doDist = (/** @type {RegExp} */ ext) =>
    lista()
      .filter((f) => ext.test(f))
      .map((f) => readFileSync(join(dist, f), "utf8"));

  it("index.html gerado continua sem inline e com a mesma CSP do original", () => {
    const gerado = parse(readFileSync(join(dist, "index.html"), "utf8"));
    expect(problemasInline(gerado)).toEqual([]);
    expect(cspDe(gerado)).toBe(cspDe(parse(ler("index.html"))));
  });

  it("scripts, estilos e pré-cargas apontam só para /Portfolio/assets/", () => {
    const gerado = parse(readFileSync(join(dist, "index.html"), "utf8"));
    const alvos = [
      ...gerado.querySelectorAll(
        "script[src], link[rel=stylesheet], link[rel=preload], link[rel=icon]",
      ),
    ].map((e) => e.getAttribute("src") ?? e.getAttribute("href") ?? "");
    expect(alvos.length).toBeGreaterThan(4);
    for (const a of alvos) expect(a).toMatch(/^\/Portfolio\/assets\/[\w.-]+$/);
  });

  it("só saem arquivos esperados e nenhum source map", () => {
    const exts = new Set(lista().map((f) => extname(f)));
    expect([...exts].sort()).toEqual([
      ".css",
      ".html",
      ".js",
      ".svg",
      ".woff2",
    ]);
    expect(lista().filter((f) => f.endsWith(".map"))).toEqual([]);
  });

  it("o JavaScript do bundle não tem eval, Function, document.write nem URL perigosa", () => {
    const js = doDist(/\.js$/);
    expect(js.length).toBeGreaterThan(5);
    const perigos = [
      /(?<![.\w$])eval\s*\(/,
      /\bnew\s+Function\b/,
      /(?<![.\w$])Function\s*\(/,
      /document\s*\.\s*write(ln)?\s*\(/,
      /\.insertAdjacentHTML\b/,
      /\.outerHTML\b/,
      /\.srcdoc\b/,
      /importScripts/,
      /["'`]\s*javascript:/i,
      /data:text\/javascript/i,
      /set(Timeout|Interval)\s*\(\s*["'`]/,
    ];
    for (const src of js)
      for (const re of perigos) expect(src, String(re)).not.toMatch(re);
  });

  it("o bundle tem exatamente os innerHTML conhecidos (campo de caracteres)", () => {
    const n = doDist(/\.js$/)
      .map((s) => (s.match(/\.innerHTML\b/g) ?? []).length)
      .reduce((a, b) => a + b, 0);
    expect(n).toBe(INNER_HTML_NO_BUNDLE);
  });

  it("o CSS só referencia fontes e imagens locais, sem @import nem data:", () => {
    for (const css of doDist(/\.css$/)) {
      expect(css).not.toMatch(/@import/i);
      expect(css).not.toMatch(/data:/i);
      expect(css).not.toMatch(/expression\s*\(|behavior\s*:|-moz-binding/i);
      for (const [, u] of css.matchAll(/url\(\s*["']?([^"')]*)["']?\s*\)/g))
        expect(u).toMatch(/^\/Portfolio\/assets\/[\w.-]+$/);
    }
  });

  it("o favicon SVG não tem script, manipulador, foreignObject nem referência externa", () => {
    const svg = doDist(/\.svg$/).join("\n");
    expect(svg).not.toMatch(
      /<script|<foreignObject|\son\w+\s*=|xlink:href|\shref\s*=|<image|<use\b/i,
    );
    expect(svg).not.toMatch(/url\(\s*["']?(https?:|\/\/)/i);
  });
});

describe("CSS de origem", () => {
  it.each(arquivos("src/estilos", /\.css$/))(
    "%s: só url() local de ../fonts, sem @import externo, expression ou javascript:",
    (f) => {
      const css = ler(f);
      expect(css).not.toMatch(/@import\s+(url\()?\s*["']?(https?:|\/\/)/i);
      expect(css).not.toMatch(
        /expression\s*\(|javascript:|data:|-moz-binding/i,
      );
      for (const [, u] of css.matchAll(/url\(\s*["']?([^"')]*)["']?\s*\)/g))
        expect(u).toMatch(/^\.\.\/fonts\/[\w.-]+\.woff2$/);
    },
  );
});

// ---------------------------------------------------------------------------------------
// 2. Roteador por hash
// ---------------------------------------------------------------------------------------

const CHAVES_DE_PROTOTIPO = [
  "__proto__",
  "constructor",
  "prototype",
  "toString",
  "valueOf",
  "hasOwnProperty",
  "isPrototypeOf",
  "propertyIsEnumerable",
  "toLocaleString",
  "__defineGetter__",
  "__defineSetter__",
  "__lookupGetter__",
  "__lookupSetter__",
];

describe("roteador: paginaDoHash", () => {
  it("só conhece as páginas declaradas, e nenhuma vem do protótipo", () => {
    expect(Object.keys(PAGINAS).sort()).toEqual([
      "email",
      "ferramentas",
      "ia",
      "sobre",
      "testes",
    ]);
    expect(Object.getPrototypeOf(PAGINAS)).toBe(Object.prototype);
    for (const k of Object.keys(PAGINAS))
      expect(typeof PAGINAS[k]).toBe("function");
  });

  it.each(CHAVES_DE_PROTOTIPO)("#%s leva à abertura", (k) => {
    expect(paginaDoHash("#" + k)).toBeNull();
    expect(paginaDoHash(k)).toBeNull();
  });

  it.each([
    "#EMAIL",
    "#Email",
    "#email ",
    "# email",
    "#email/",
    "#email?x=1",
    "#email#ia",
    "#email%00",
    "#email%0d%0a",
    "#email\0",
    "#email\r\n",
    "#%65mail",
    "#\u0435mail",
    "#e\u200Bmail",
    "#<img src=x onerror=alert(1)>",
    '#"><script>alert(1)</script>',
    "#javascript:alert(1)",
    "#data:text/html,<script>alert(1)</script>",
    "#//evil.example",
    "#..%2f..%2fetc%2fpasswd",
    "##email",
    "#",
    "",
    "#inicio",
    "#ajustes",
  ])("hash hostil %j leva à abertura", (h) => {
    expect(paginaDoHash(h)).toBeNull();
  });

  it("hashes enormes e cheios de caracteres de controle terminam e dão null", () => {
    const controle = Array.from({ length: 32 }, (_, i) =>
      String.fromCharCode(i),
    ).join("");
    for (const h of [
      "#" + "a".repeat(2_000_000),
      "#" + "%".repeat(2_000_000),
      "#" + "email".repeat(400_000),
      "#" + controle.repeat(50_000),
      "#" + "\n".repeat(1_000_000) + "email",
    ])
      expect(paginaDoHash(h)).toBeNull();
  });

  it("reconhece as cinco páginas, com e sem #", () => {
    for (const k of Object.keys(PAGINAS)) {
      expect(paginaDoHash("#" + k)).toBe(k);
      expect(paginaDoHash(k)).toBe(k);
    }
  });

  it("nada disso polui Object.prototype", () => {
    for (const k of CHAVES_DE_PROTOTIPO) paginaDoHash("#" + k);
    expect(Object.keys(Object.prototype)).toEqual([]);
    expect(/** @type {any} */ ({}).polluted).toBeUndefined();
  });
});

const corpoDoIndex = ler("index.html").split("<body>")[1].split("</body>")[0];

/**
 * Carrega src/main.js do zero, como numa recarga, com a URL dada.
 * @param {string} url
 * @param {() => void} [antes]
 */
async function abrir(url, antes) {
  document.documentElement.lang = "pt-BR";
  document.body.innerHTML = corpoDoIndex; // index.html do próprio repositório
  history.replaceState(null, "", url);
  vi.resetModules();
  antes?.();
  await import("../src/main.js");
  await esperar(0);
}

const HASHES_XSS = [
  "<img src=x onerror=window.__xss=1>",
  '"><script>window.__xss=1</script>',
  "<svg onload=window.__xss=1>",
  "javascript:window.__xss=1",
  "__proto__",
  "constructor",
  "toString",
  "email%0d%0aSet-Cookie:x=1",
  "x".repeat(300_000),
];

describe("roteador: página inteira (src/main.js)", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    document.body.replaceChildren();
    history.replaceState(null, "", "/");
    delete (/** @type {any} */ (window).__xss);
  });

  it("controle: #email abre a página em terminal", async () => {
    await abrir("/Portfolio/#email");
    await vi.waitFor(() =>
      expect(document.querySelector(".pf-tela")).not.toBeNull(),
    );
  });

  it.each(HASHES_XSS)(
    "abrir com #%.40s mostra a abertura e não injeta nada",
    async (h) => {
      await abrir("/Portfolio/#" + h);
      expect(document.querySelector(".pf-solar")).not.toBeNull();
      expect(document.querySelector(".pf-tela")).toBeNull();
      expect(
        document.querySelector(
          "img, iframe, object, embed, base, form, body script",
        ),
      ).toBeNull();
      expect(/** @type {any} */ (window).__xss).toBeUndefined();
      expect(document.documentElement.outerHTML).not.toContain("__xss");
      expect(Object.keys(Object.prototype)).toEqual([]);
    },
  );

  it("hash hostil depois de carregada não remonta nem altera a abertura", async () => {
    await abrir("/Portfolio/");
    const antes = document.querySelector(".pf-solar");
    expect(antes).not.toBeNull();
    for (const h of HASHES_XSS.slice(0, 7)) {
      location.hash = h;
      await esperar(20);
      expect(document.querySelector(".pf-solar")).toBe(antes);
      expect(document.querySelector(".pf-tela")).toBeNull();
    }
    expect(/** @type {any} */ (window).__xss).toBeUndefined();
  });

  it("S-8: carga inicial em #pagina cujo chunk falha mostra a abertura", async () => {
    vi.doMock("../src/paginas/index.js", async (original) => {
      const m = /** @type {any} */ (await original());
      return {
        ...m,
        PAGINAS: {
          ...m.PAGINAS,
          email: () => Promise.reject(new Error("off")),
        },
      };
    });
    try {
      await abrir("/Portfolio/#email");
      await esperar(50);
      expect(location.hash).toBe("#inicio");
      expect(document.querySelector(".pf-solar")).not.toBeNull();
      expect(document.querySelectorAll(".pf-menu a").length).toBeGreaterThan(0);
    } finally {
      vi.doUnmock("../src/paginas/index.js");
    }
  });

  it("de uma página para um hash hostil, volta para a abertura", async () => {
    await abrir("/Portfolio/#email");
    await vi.waitFor(() =>
      expect(document.querySelector(".pf-tela")).not.toBeNull(),
    );
    location.hash = "__proto__";
    await vi.waitFor(
      () => {
        expect(document.querySelector(".pf-solar")).not.toBeNull();
        expect(document.querySelector(".pf-tela")).toBeNull();
      },
      { timeout: 5000 },
    );
  });
});

// ---------------------------------------------------------------------------------------
// 3. Página de e-mail: entrada da pessoa, mailto, ciclo de vida
// ---------------------------------------------------------------------------------------

/** @param {string} key @param {KeyboardEventInit} [extra] */
function tecla(key, extra = {}) {
  const e = new KeyboardEvent("keydown", {
    key,
    bubbles: true,
    cancelable: true,
    ...extra,
  });
  document.dispatchEvent(e);
  return e;
}
/** @param {string} texto */
function colar(texto) {
  const e = /** @type {any} */ (
    new Event("paste", { bubbles: true, cancelable: true })
  );
  e.clipboardData = { getData: () => texto };
  document.dispatchEvent(e);
  return /** @type {Event} */ (e);
}
/** @param {string} rotulo */
function focarCampo(rotulo) {
  document
    .querySelector(`button[aria-label="${rotulo}"]`)
    ?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}
const REMETENTE = "Escrever o remetente";
const ASSUNTO = "Escrever o assunto";
const MENSAGEM = "Escrever a mensagem";
const DESTINATARIO = "mdr.bsilva1@gmail.com";

describe("página de e-mail", () => {
  /** @type {HTMLElement} */ let alvo;
  /** @type {{ destroy(): void }[]} */ let montadas;
  /** Monta a página e garante o destroy no fim, mesmo se o teste falhar no meio. */
  const montar = () => {
    const m = montarEmail(alvo);
    montadas.push(m);
    return m;
  };
  beforeEach(() => {
    montadas = [];
    vi.useFakeTimers();
    // o jsdom avisa "Not implemented: navigation" quando a página abre o mailto
    vi.spyOn(console, "error").mockImplementation(() => {});
    alvo = document.createElement("div");
    document.body.append(alvo);
  });
  afterEach(() => {
    for (const m of montadas) m.destroy();
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
    history.replaceState(null, "", "/");
  });

  /** Envia a carta e devolve o href do link "abrir meu app de e-mail". */
  function enviarEPegarHref() {
    tecla("Escape");
    tecla("e");
    vi.advanceTimersByTime(8400);
    return (
      alvo
        .querySelector('a[aria-label^="Abrir meu app"]')
        ?.getAttribute("href") ?? null
    );
  }

  it("mailto: destinatário fixo e só os parâmetros subject e body, mesmo com texto hostil", () => {
    const m = montar();
    focarCampo(REMETENTE);
    colar("Eve&cc=a@evil.example\r\nBcc: v@evil.example");
    focarCampo(ASSUNTO);
    colar("Oi\r\nCc: a@x.y&bcc=b@x.y?to=c@x.y%0ABcc:z");
    focarCampo(MENSAGEM);
    colar(
      "corpo&cc=d@evil.example&subject=hack&body=x#frag\r\n?to=e@evil.example\u2028Bcc: f@evil.example",
    );
    const href = enviarEPegarHref();
    expect(href).not.toBeNull();
    const u = new URL(/** @type {string} */ (href));
    expect(u.protocol).toBe("mailto:");
    expect(decodeURIComponent(u.pathname)).toBe(DESTINATARIO);
    expect([...u.searchParams.keys()]).toEqual(["subject", "body"]);
    expect(u.hash).toBe("");
    // o texto hostil chega literal, como texto, dentro dos dois parâmetros
    expect(u.searchParams.get("subject")).toContain(
      "&bcc=b@x.y?to=c@x.y%0ABcc:z",
    );
    expect(u.searchParams.get("body")).toContain(
      "&cc=d@evil.example&subject=hack&body=x#frag",
    );
    // nenhum caractere sensível sobrou sem codificar no URI inteiro
    const resto = /** @type {string} */ (href).slice(
      "mailto:".length + DESTINATARIO.length,
    );
    expect(resto).toMatch(/^\?subject=[\w.~%-]*&body=[\w.~%-]*$/);
    m.destroy();
  });

  it("o assunto nunca recebe quebra de linha (LF) vinda de colar ou do teclado", () => {
    const m = montar();
    focarCampo(ASSUNTO);
    colar("a\nb\r\nc\n\n\nd");
    tecla("Enter"); // no assunto, Enter só passa de campo
    const href = enviarEPegarHref();
    // sem mensagem a carta não sai; com mensagem, o assunto já está limpo de LF
    expect(href).toBeNull();
    m.destroy();

    const m2 = montar();
    focarCampo(ASSUNTO);
    colar("a\nb\r\nc\n\n\nd");
    focarCampo(MENSAGEM);
    colar("texto");
    const href2 = enviarEPegarHref();
    const subject = new URL(/** @type {string} */ (href2)).searchParams.get(
      "subject",
    );
    expect(subject).not.toContain("\n");
    m2.destroy();
  });

  it("limites de tamanho: nome 40, assunto 60, mensagem 600, e o URI fica curto no pior caso", () => {
    const m = montar();
    // euro: 3 bytes em UTF-8, o pior caso de expansão para um caractere de um code unit
    const pior = "\u20AC".repeat(100_000);
    focarCampo(REMETENTE);
    colar(pior);
    focarCampo(ASSUNTO);
    colar(pior);
    focarCampo(MENSAGEM);
    colar(pior);
    const href = /** @type {string} */ (enviarEPegarHref());
    const u = new URL(href);
    expect(u.searchParams.get("subject")?.length).toBe(60);
    const corpo = /** @type {string} */ (u.searchParams.get("body"));
    expect(corpo).toBe(
      "Prezada Madu,\n\n" +
        "\u20AC".repeat(600) +
        "\n\nAtenciosamente,\n" +
        "\u20AC".repeat(40),
    );
    expect(href.length).toBeLessThan(8000);
    m.destroy();
  });

  it("colar fora de um campo é ignorado e não é interceptado", () => {
    const m = montar();
    const e = colar("texto que não deve entrar");
    expect(e.defaultPrevented).toBe(false);
    const camadas = [...alvo.querySelectorAll("pre.pf-t-texto")]
      .map((p) => p.textContent)
      .join("\n");
    expect(camadas).not.toContain("texto");
    expect(camadas).toContain("escreva");
    m.destroy();
  });

  it("carta vazia ou só com espaços não envia", () => {
    const m = montar();
    focarCampo(MENSAGEM);
    colar("   \n  ");
    expect(enviarEPegarHref()).toBeNull();
    m.destroy();
  });

  it("teclas com Ctrl, Alt ou Meta não disparam os atalhos de enviar, limpar e voltar", () => {
    const m = montar();
    history.replaceState(null, "", "/Portfolio/#email");
    focarCampo(MENSAGEM);
    colar("texto");
    tecla("Escape");
    for (const k of ["e", "l", "v"])
      for (const mod of ["ctrlKey", "altKey", "metaKey"])
        tecla(k, { [mod]: true });
    vi.advanceTimersByTime(9000);
    expect(alvo.querySelector('a[aria-label^="Abrir meu app"]')).toBeNull();
    expect(location.hash).toBe("#email");
    m.destroy();
  });

  it("nada navega sozinho: sem pedir o envio, nenhum link de mailto aparece", () => {
    const m = montar();
    focarCampo(MENSAGEM);
    colar("texto");
    tecla("Escape");
    vi.advanceTimersByTime(12_000);
    expect(alvo.querySelector('a[href^="mailto:"]')).toBeNull();
    expect(document.querySelector('a[href^="mailto:"]')).toBeNull();
    m.destroy();
  });

  it("o texto digitado entra como texto, nunca como HTML", () => {
    const m = montar();
    focarCampo(MENSAGEM);
    const carga = '<img src=x onerror="window.__xss=1"><script>1</script>';
    for (const ch of carga) tecla(ch);
    colar("<iframe srcdoc='x'></iframe>");
    vi.advanceTimersByTime(200); // deixa o quadro seguinte desenhar a carta
    expect(alvo.querySelector("img, script, iframe")).toBeNull();
    const texto = [...alvo.querySelectorAll("pre.pf-t-texto")]
      .map((p) => p.textContent)
      .join("\n");
    expect(texto).toContain("<img");
    expect(/** @type {any} */ (window).__xss).toBeUndefined();
    m.destroy();
  });

  it("listeners de document: os mesmos que entram saem no destroy", () => {
    const add = vi.spyOn(document, "addEventListener");
    const rem = vi.spyOn(document, "removeEventListener");
    const m = montar();
    const entraram = add.mock.calls.filter(
      ([t]) => t === "keydown" || t === "paste",
    );
    expect(entraram.map(([t]) => t).sort()).toEqual(["keydown", "paste"]);
    m.destroy();
    for (const [tipo, fn] of entraram)
      expect(rem).toHaveBeenCalledWith(tipo, fn);
  });

  it("depois do destroy, teclas e colagens não fazem mais nada e o relógio da tela para", () => {
    history.replaceState(null, "", "/Portfolio/#email");
    const intervalos = vi.spyOn(globalThis, "setInterval");
    const limpos = vi.spyOn(globalThis, "clearInterval");
    const m = montar();
    // vivo: o atalho v (fora dos campos) leva a #inicio
    tecla("v");
    expect(location.hash).toBe("#inicio");
    history.replaceState(null, "", "/Portfolio/#email");
    m.destroy();
    const ids = intervalos.mock.results.map((r) => r.value);
    expect(ids.length).toBeGreaterThan(0);
    for (const id of ids) expect(limpos).toHaveBeenCalledWith(id);
    tecla("v");
    tecla("e");
    const e = colar("x");
    vi.advanceTimersByTime(5000);
    expect(location.hash).toBe("#email");
    expect(e.defaultPrevented).toBe(false);
    expect(alvo.childElementCount).toBe(0);
  });

  it("25 montagens e desmontagens seguidas não acumulam listeners nem intervalos", () => {
    const add = vi.spyOn(document, "addEventListener");
    const rem = vi.spyOn(document, "removeEventListener");
    const intervalos = vi.spyOn(globalThis, "setInterval");
    const limpos = vi.spyOn(globalThis, "clearInterval");
    for (let i = 0; i < 25; i++) montar().destroy();
    const conta = (/** @type {import("vitest").MockInstance} */ s) =>
      s.mock.calls.filter(([t]) => t === "keydown" || t === "paste").length;
    expect(conta(add)).toBe(50);
    expect(conta(rem)).toBe(50);
    const ids = intervalos.mock.results.map((r) => r.value);
    expect(ids.length).toBe(25);
    for (const id of ids) expect(limpos).toHaveBeenCalledWith(id);
  });

  it("S-2: CR e controles colados no assunto e no nome viram espaço; no corpo só sobra LF", () => {
    const m = montar();
    focarCampo(ASSUNTO);
    colar("Oi\r\nCc: a@x\u0007");
    focarCampo(MENSAGEM);
    colar("linha1\r\nlinha2\rlinha3");
    const u = new URL(/** @type {string} */ (enviarEPegarHref()));
    const assunto = /** @type {string} */ (u.searchParams.get("subject"));
    expect(assunto).not.toMatch(/\p{Cc}/u);
    expect(assunto).toContain("Oi Cc: a@x");
    expect(u.searchParams.get("body")).not.toContain("\r");
    expect(u.searchParams.get("body")).toContain("linha1\nlinha2\nlinha3");
    m.destroy();
  });

  it("S-3: cortar no limite ou apagar com Backspace não deixa surrogate solto", () => {
    const m = montar();
    focarCampo(MENSAGEM);
    colar("a".repeat(599) + "\u{1F986}");
    colar("\u{1F986}\u{1F986}"); // passa do limite: o corte é por ponto de código
    expect(enviarEPegarHref()).not.toBeNull();
    m.destroy();
  });

  it("S-3: Backspace depois de um emoji apaga o emoji inteiro", () => {
    const m = montar();
    focarCampo(MENSAGEM);
    colar("oi \u{1F986}");
    tecla("Backspace");
    const u = new URL(/** @type {string} */ (enviarEPegarHref()));
    expect(u.searchParams.get("body")).toContain("oi \n");
    expect(u.searchParams.get("body")).not.toContain("\u{1F986}");
    m.destroy();
  });
});

// ---------------------------------------------------------------------------------------
// 4. Sumidouros de HTML e de execução em src/
// ---------------------------------------------------------------------------------------

/** Tira comentários para a busca não se enganar com documentação. @param {string} txt */
const semComentarios = (txt) =>
  txt
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`\\])\/\/.*$/gm, "$1");

/** @type {[string, RegExp, Record<string, number>][]} nome, padrão e onde (e quantas vezes) é permitido */
const SUMIDOUROS = [
  [
    "innerHTML",
    /\.innerHTML\b/g,
    { "src/sistema-solar/index.js": 1, "src/terminal/tela.js": 1 },
  ],
  ["outerHTML", /\.outerHTML\b/g, {}],
  ["insertAdjacentHTML", /insertAdjacentHTML/g, {}],
  ["document.write", /document\s*\.\s*write(ln)?\s*\(/g, {}],
  [
    "createContextualFragment / DOMParser",
    /createContextualFragment|DOMParser/g,
    {},
  ],
  ["eval", /(?<![.\w$])eval\s*\(/g, {}],
  [
    "Function como construtor",
    /\bnew\s+Function\b|(?<![.\w$])Function\s*\(/g,
    {},
  ],
  [
    "setTimeout/setInterval com string",
    /\bset(?:Timeout|Interval)\s*\(\s*["'`]/g,
    {},
  ],
  ["srcdoc", /\.srcdoc\b|\bsrcdoc\s*[:=]/g, {}],
  [
    "workers e service workers",
    /importScripts|\bnew\s+(?:Shared)?Worker\b|serviceWorker/g,
    {},
  ],
  ["import() com argumento não literal", /\bimport\s*\(\s*(?!["'])/g, {}],
  [
    "setAttribute de style ou on*",
    /setAttribute\(\s*["'`](?:on\w+|style)["'`]/gi,
    {},
  ],
  ["propriedade on* atribuída", /\.on[a-z]+\s*=(?!=)/g, {}],
  [
    "URL javascript:, data: ou vbscript: em string",
    /["'`]\s*(?:javascript|vbscript|data)\s*:/gi,
    {},
  ],
  [
    "window.open",
    /\bwindow\s*\.\s*open\s*\(|(?<![.\w$])open\s*\(\s*["'`]http/g,
    {},
  ],
  [
    "location.href, assign ou replace",
    /\blocation\s*\.\s*(?:href\s*=(?!=)|assign\s*\(|replace\s*\()/g,
    { "src/paginas/email.js": 1 },
  ],
  [
    "rede: fetch, XHR, WebSocket, EventSource, sendBeacon, postMessage",
    /(?<![.\w$])(?:fetch\s*\(|XMLHttpRequest|WebSocket|EventSource)|sendBeacon|postMessage/g,
    {},
  ],
  ["document.cookie", /document\s*\.\s*cookie/g, {}],
  [
    "storage além do localStorage de idioma.js",
    /sessionStorage|indexedDB|\bcaches\b\s*\./g,
    {},
  ],
  ["localStorage", /localStorage/g, { "src/i18n/idioma.js": 1 }],
  ["target _blank", /["']_blank["']/g, { "src/paginas/ia.js": 1 }],
];

describe("sumidouros em src/ (inventário fechado)", () => {
  const fontes = arquivos("src", /\.js$/).map((f) => [
    f,
    semComentarios(ler(f)),
  ]);

  it.each(SUMIDOUROS)(
    "%s só aparece onde foi auditado",
    (_nome, re, permitido) => {
      /** @type {Record<string, number>} */
      const achados = {};
      for (const [f, txt] of fontes) {
        const n = (txt.match(re) ?? []).length;
        if (n) achados[f] = n;
      }
      expect(achados).toEqual(permitido);
    },
  );

  it("todo location.hash recebe só #inicio", () => {
    const rhs = fontes.flatMap(([, txt]) =>
      [...txt.matchAll(/\blocation\s*\.\s*hash\s*=(?!=)\s*([^;]+);/g)].map(
        (m) => m[1].trim(),
      ),
    );
    expect(rhs.length).toBeGreaterThan(3);
    expect(new Set(rhs)).toEqual(new Set(['"#inicio"']));
  });

  it("window.location.href só recebe o mailto montado por this.mailto(s)", () => {
    const txt = semComentarios(ler("src/paginas/email.js"));
    const rhs = [
      ...txt.matchAll(/location\s*\.\s*href\s*=(?!=)\s*([^;]+);/g),
    ].map((m) => m[1].trim());
    expect(rhs).toEqual(["this.mailto(s)"]);
  });

  it("o endereço do mailto é constante do módulo e a URL só junta codificados (encodeURIComponent)", () => {
    const txt = semComentarios(ler("src/paginas/email.js"));
    expect(txt).toMatch(/const ENDERECO = "[^"]+@[^"]+";/);
    const corpo = txt.slice(
      txt.indexOf("mailto(s) {"),
      txt.indexOf("enviando()"),
    );
    expect(corpo).toMatch(/"mailto:" \+\s*ENDERECO/);
    expect(corpo).toMatch(/encodeURIComponent\(assunto\.toWellFormed\(\)\)/);
    expect(corpo).toMatch(/encodeURIComponent\(corpo\.toWellFormed\(\)\)/);
  });

  it.each(["src/sistema-solar/index.js", "src/terminal/tela.js"])(
    "%s: o innerHTML recebe só o HTML de campo(), a função que escapa o texto",
    (f) => {
      const txt = semComentarios(ler(f));
      expect(txt).toMatch(/const \{ html, piscadas \} = campo\(/);
      expect(txt).toMatch(/\.innerHTML = html;/);
    },
  );

  it("o campo de caracteres só tem span com classe fixa e texto de um alfabeto fechado", () => {
    const permitidos = new Set(".·:+*,'`-~\n".split(""));
    for (const seed of [7, 0, -1, 2 ** 53, Number.NaN, Infinity, "<script>"]) {
      const { html } = campo({
        C: 90,
        R: 30,
        Cv: 88,
        seed,
        sois: [{ x: 40, y: 15 }],
      });
      const pre = parse("<pre>" + html + "</pre>").querySelector("pre");
      for (const e of /** @type {HTMLElement} */ (pre).querySelectorAll("*")) {
        expect(e.localName).toBe("span");
        expect(e.getAttributeNames()).toEqual(["class"]);
        expect(e.className).toMatch(/^pf-(?:l[012]|tw)$/);
      }
      for (const ch of pre?.textContent ?? "")
        expect(permitidos.has(ch), ch).toBe(true);
    }
  });

  it("esc neutraliza os quatro caracteres de HTML", () => {
    expect(esc("<img src=\"x\" onerror='a'>&")).toBe(
      "&lt;img src=&quot;x&quot; onerror='a'&gt;&amp;",
    );
    expect(esc("<script>")).not.toContain("<");
  });

  it("el(): texto vai por textContent, atributo por setAttribute, estilo por CSSOM", () => {
    const e = el("div", {
      text: "<img src=x onerror=1>",
      attrs: { title: '"><b>' },
      style: { color: "red" },
    });
    expect(e.children.length).toBe(0);
    expect(e.textContent).toBe("<img src=x onerror=1>");
    expect(e.getAttribute("title")).toBe('"><b>');
    expect(e.style.color).toBe("red");
  });

  it("CartaoProjeto escreve título, resumo e tecnologias como texto", () => {
    const t = document.createElement("div");
    CartaoProjeto.mount(t, [
      {
        titulo: "<img src=x onerror=1>",
        resumo: "<script>1</script>",
        tecnologias: ["<b>x</b>"],
      },
    ]);
    expect(t.querySelector("img, script, b")).toBeNull();
    expect(t.textContent).toContain("<img src=x onerror=1>");
  });
});

// ---------------------------------------------------------------------------------------
// 5. Links
// ---------------------------------------------------------------------------------------

/** Destinos que o site aceita hoje: âncora de hash, troca de idioma ou o mailto do e-mail. */
const HREF_SEGURO =
  /^(?:#[\w-]*|\?lang=(?:pt|en)|mailto:mdr\.bsilva1@gmail\.com\?[\w.~%&=-]*)$/;

describe("links", () => {
  afterEach(() => document.body.replaceChildren());

  it.each(["pt", "en"])(
    "abertura em %s: todo href é hash ou ?lang=, sem target",
    (l) => {
      const t = document.createElement("div");
      document.body.append(t);
      const inst = SistemaSolar.mount(
        t,
        opcoesDoSistema(/** @type {"pt" | "en"} */ (l)),
      );
      const links = [...t.querySelectorAll("a[href]")];
      expect(links.length).toBeGreaterThan(10);
      for (const a of links) {
        expect(a.getAttribute("href"), a.textContent ?? "").toMatch(
          HREF_SEGURO,
        );
        expect(a.hasAttribute("target")).toBe(false);
      }
      inst.destroy();
    },
  );

  it.each(Object.keys(PAGINAS))(
    "página %s: todo link é hash e, se abrir outra aba, tem noopener",
    async (id) => {
      vi.useFakeTimers();
      const { montar } = await PAGINAS[id]();
      const t = document.createElement("div");
      document.body.append(t);
      const m = montar(t);
      const links = [...t.querySelectorAll("a[href]")];
      expect(links.length).toBeGreaterThan(0);
      for (const a of links) {
        expect(
          a.getAttribute("href"),
          a.getAttribute("aria-label") ?? "",
        ).toMatch(HREF_SEGURO);
        if (a.getAttribute("target") === "_blank")
          expect(a.getAttribute("rel") ?? "").toContain("noopener");
      }
      m.destroy();
      vi.useRealTimers();
    },
  );

  it("tela.js dá rel=noopener a qualquer link, inclusive os de target _blank", () => {
    class Teste extends Cena {
      quadro() {
        return {
          camadas: {},
          zonas: [
            {
              tipo: /** @type {const} */ ("a"),
              x: 1,
              y: 1,
              w: 4,
              label: "a",
              href: "https://example.com/",
              alvo: "_blank",
            },
            {
              tipo: /** @type {const} */ ("a"),
              x: 1,
              y: 2,
              w: 4,
              label: "b",
              href: "#inicio",
            },
          ],
        };
      }
    }
    const t = document.createElement("div");
    const m = montarTela(
      t,
      {
        tema: "t",
        altura: 100,
        camadas: 1,
        ordemSvg: [0],
        aria: "a",
        descricao: "d",
      },
      new Teste(),
    );
    for (const a of t.querySelectorAll("a"))
      expect(a.getAttribute("rel")).toContain("noopener");
    m.destroy();
  });

  it("textos do dicionário não parecem marcação nem URL perigosa", () => {
    for (const [idioma, dic] of Object.entries(DICIONARIOS))
      for (const [k, v] of Object.entries(dic)) {
        expect(typeof v, `${idioma}.${k}`).toBe("string");
        expect(v, `${idioma}.${k}`).not.toMatch(/[<>]|javascript:|data:/i);
      }
  });

  it("aplicarDocumento escreve o texto traduzido como texto", () => {
    const doc = parse('<h1 data-i18n="doc.h1"></h1>');
    aplicarDocumento(doc, "en");
    const h1 = /** @type {HTMLElement} */ (doc.querySelector("h1"));
    expect(h1.children.length).toBe(0);
    expect(h1.textContent).toBe(DICIONARIOS.en["doc.h1"]);
  });

  it("S-9: transicao e t() ignoram chaves herdadas do protótipo", async () => {
    for (const chave of ["__proto__", "constructor", "toString"]) {
      const tr = transicaoDe(document.createElement("div"), chave, "ia");
      await tr.fim;
      expect(t("pt", /** @type {any} */ (chave))).toBe(chave);
      expect(t("pt", /** @type {any} */ ("sobre.x"), {})).toBeTypeOf("string");
    }
    expect(t("pt", /** @type {any} */ ("{constructor}"), { a: "x" })).toBe(
      "{constructor}",
    );
  });

  it("S-5: href passa por allowlist de esquema e a tela usa noreferrer", () => {
    expect(hrefSeguro("https://github.com/x")).toBe("https://github.com/x");
    expect(hrefSeguro("mailto:a@b.c")).toBe("mailto:a@b.c");
    expect(hrefSeguro("#sobre")).toBe("#sobre");
    expect(hrefSeguro("?lang=en")).toBe("?lang=en");
    for (const ruim of [
      "javascript:alert(1)",
      "JaVaScRiPt:alert(1)",
      "data:text/html,x",
      "vbscript:x",
      "http://x.y",
      "blob:https://x.y/1",
    ])
      expect(hrefSeguro(ruim), ruim).toBe("#");
    class Z extends Cena {
      quadro() {
        return {
          camadas: {},
          zonas: [
            {
              tipo: /** @type {const} */ ("a"),
              x: 1,
              y: 1,
              w: 5,
              label: "x",
              href: "javascript:alert(1)",
              alvo: "_blank",
            },
          ],
        };
      }
    }
    const caixa = document.createElement("div");
    const m = montarTela(
      caixa,
      {
        tema: "pf-tema-ia",
        altura: 424,
        camadas: 1,
        ordemSvg: [],
        aria: "x",
        descricao: "x",
      },
      new Z(),
    );
    const a = caixa.querySelector("a.pf-t-zona");
    expect(a?.getAttribute("href")).toBe("#");
    expect(a?.getAttribute("rel")).toBe("noopener noreferrer");
    m.destroy();
  });
});

// ---------------------------------------------------------------------------------------
// 6. localStorage e URL
// ---------------------------------------------------------------------------------------

describe("idioma: nada que vem de fora entra sem validação", () => {
  it("normalizar só devolve pt ou en", () => {
    for (const v of [
      undefined,
      null,
      0,
      5,
      {},
      ["en"],
      "",
      "  ",
      "__proto__",
      "constructor",
      "en\0",
      "<script>",
      "fr",
      "english-",
    ])
      expect(normalizar(v), String(v)).toBeNull();
    expect(normalizar(" EN-us ")).toBe("en");
    expect(normalizar("pt_BR")).toBe("pt");
  });

  it("resolverIdioma ignora ?lang= inválido e cai para a escolha salva, o navegador ou o padrão", () => {
    expect(resolverIdioma({ busca: "?lang=__proto__&lang=en" }).idioma).toBe(
      "pt",
    );
    expect(resolverIdioma({ busca: "?lang[]=en" }).idioma).toBe("pt");
    expect(resolverIdioma({ busca: "?lang=<script>", salvo: "en" })).toEqual({
      idioma: "en",
      fonte: "salvo",
    });
    expect(
      resolverIdioma({
        busca: "?lang=x",
        salvo: "y",
        navegador: ["fr", "en-US"],
      }),
    ).toEqual({ idioma: "en", fonte: "navegador" });
  });

  it("lerSalvo sobrevive a storage que lança, JSON quebrado e __proto__ no JSON", () => {
    expect(
      lerSalvo({
        getItem: () => {
          throw new Error("bloqueado");
        },
      }),
    ).toBeNull();
    expect(
      lerSalvo({ getItem: (k) => (k === CHAVE ? null : "{quebrado") }),
    ).toBeNull();
    expect(
      lerSalvo({ getItem: (k) => (k === CHAVE ? null : '[1,"2"]') }),
    ).toBeNull();
    expect(
      lerSalvo({
        getItem: (k) =>
          k === CHAVE ? null : '{"lang":"english","__proto__":{"polluted":1}}',
      }),
    ).toBe("en");
    expect(/** @type {any} */ ({}).polluted).toBeUndefined();
    expect(
      lerSalvo({ getItem: (k) => (k === CHAVE ? "<img src=x>" : null) }),
    ).toBeNull();
  });

  it("storageDe, salvar e migrarAntigo engolem erro de storage bloqueado", () => {
    const bloqueado = {
      get localStorage() {
        throw new Error("bloqueado");
      },
    };
    expect(storageDe(/** @type {any} */ (bloqueado))).toBeNull();
    const quebra = {
      getItem: () => {
        throw new Error("x");
      },
      setItem: () => {
        throw new Error("x");
      },
    };
    expect(() => salvar(quebra, "en")).not.toThrow();
    expect(() => migrarAntigo(quebra)).not.toThrow();
  });

  it("urlComIdioma devolve caminho relativo à origem e preserva a query e o hash", () => {
    expect(
      urlComIdioma("https://thinkmadu.github.io/Portfolio/?a=1#email", "en"),
    ).toBe("/Portfolio/?a=1&lang=en#email");
    expect(
      urlComIdioma("https://thinkmadu.github.io/Portfolio/?lang=pt", "en"),
    ).toBe("/Portfolio/?lang=en");
  });
});

describe("ajustes lidos do localStorage (sol-v5) em src/main.js", () => {
  /** @type {Record<string, any>[]} */
  let montagens;
  beforeEach(() => {
    localStorage.clear();
    montagens = [];
    vi.doMock("../src/sistema-solar/index.js", async (original) => {
      const m = /** @type {typeof import("../src/sistema-solar/index.js")} */ (
        await original()
      );
      return {
        ...m,
        SistemaSolar: {
          ...m.SistemaSolar,
          /** @param {Element} t @param {Record<string, any>} o */
          mount: (t, o) => {
            montagens.push(o);
            return m.SistemaSolar.mount(t, o);
          },
        },
      };
    });
  });
  afterEach(() => {
    vi.doUnmock("../src/sistema-solar/index.js");
    document.body.replaceChildren();
    history.replaceState(null, "", "/");
    vi.restoreAllMocks();
  });

  /** @param {string} valor */
  const abrirCom = (valor) =>
    abrir("/Portfolio/", () => localStorage.setItem(CHAVE_ANTIGA, valor));
  const AJUSTES = ["fundo", "brilho", "orbitas", "meteoros", "fonte", "seed"];
  /** @param {Record<string, any>} o */
  const so = (o) => Object.fromEntries(AJUSTES.map((k) => [k, o[k]]));

  it("controle: números válidos passam", async () => {
    await abrirCom('{"fonte":18,"fundo":30}');
    expect(so(montagens[0])).toEqual({ ...PADRAO, fonte: 18, fundo: 30 });
  });

  it("tipos que não são número são ignorados (texto, null, objeto, lista, booleano)", async () => {
    await abrirCom(
      '{"fonte":"22","fundo":null,"brilho":[1],"orbitas":{"a":1},"meteoros":true,"seed":"7"}',
    );
    expect(so(montagens[0])).toEqual({ ...PADRAO });
  });

  it("chaves desconhecidas e __proto__ não entram nas opções nem poluem o protótipo", async () => {
    await abrirCom(
      '{"__proto__":{"polluted":1},"evil":1,"constructor":{"x":1},"seed":3}',
    );
    expect(montagens[0].seed).toBe(3);
    expect(montagens[0]).not.toHaveProperty("evil");
    expect(montagens[0].polluted).toBeUndefined();
    expect(Object.keys(Object.prototype)).toEqual([]);
    expect(/** @type {any} */ ({}).polluted).toBeUndefined();
  });

  it.each([
    ["{quebrado"],
    ["[1,2,3]"],
    ['"texto"'],
    ["null"],
    ["42"],
    ["true"],
    [""],
  ])("valor %j no storage: a página abre com o padrão", async (v) => {
    await abrirCom(v);
    expect(document.querySelector(".pf-solar")).not.toBeNull();
    expect(so(montagens[0])).toEqual({ ...PADRAO });
  });

  it("storage que lança no getItem: a página abre com o padrão", async () => {
    await abrir("/Portfolio/", () => {
      vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
        throw new Error("bloqueado");
      });
    });
    expect(document.querySelector(".pf-solar")).not.toBeNull();
    expect(so(montagens[0])).toEqual({ ...PADRAO });
  });

  it("S-1: números fora da faixa são presos na faixa do painel", async () => {
    await abrirCom('{"fonte":0.5,"brilho":1e5,"fundo":-9,"orbitas":1e9}');
    expect(so(montagens[0])).toMatchObject({
      fonte: 10,
      brilho: 100,
      fundo: 4,
      orbitas: 200,
    });
  });

  it("S-1: Infinity (1e999) é ignorado e vale o padrão", async () => {
    await abrirCom('{"fonte":1e999,"seed":1e999}');
    expect(so(montagens[0])).toMatchObject({
      fonte: PADRAO.fonte,
      seed: PADRAO.seed,
    });
  });
});

// ---------------------------------------------------------------------------------------
// 7. Cadeia de suprimentos
// ---------------------------------------------------------------------------------------

describe("package.json e package-lock.json", () => {
  const pkg = JSON.parse(ler("package.json"));
  const lock = JSON.parse(ler("package-lock.json"));
  const EXATA = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;

  it("toda dependência declarada tem versão exata, sem ^, ~, intervalo, tag, git ou arquivo", () => {
    for (const grupo of [
      "dependencies",
      "devDependencies",
      "optionalDependencies",
      "peerDependencies",
    ])
      for (const [nome, v] of Object.entries(pkg[grupo] ?? {}))
        expect(v, `${grupo}.${nome}`).toMatch(EXATA);
  });

  it("não há script de ciclo de vida que roda sozinho na instalação ou na publicação", () => {
    const ciclo = [
      "preinstall",
      "install",
      "postinstall",
      "prepare",
      "preprepare",
      "postprepare",
      "prepublish",
      "prepublishOnly",
      "publish",
      "postpublish",
    ];
    for (const s of ciclo) expect(Object.keys(pkg.scripts), s).not.toContain(s);
  });

  it("nenhum script baixa ou executa código remoto", () => {
    for (const [nome, cmd] of Object.entries(pkg.scripts))
      expect(String(cmd), nome).not.toMatch(
        /\bcurl\b|\bwget\b|\|\s*(?:ba)?sh\b|\bnpx\s+(?:-y|--yes)\b|base64|\beval\b|https?:\/\//,
      );
  });

  it("o package.json é privado (não publica sem querer)", () => {
    expect(pkg.private).toBe(true);
  });

  it("o lockfile traz integridade de todo pacote e só resolve no registro oficial do npm", () => {
    expect(lock.lockfileVersion).toBeGreaterThanOrEqual(3);
    const pacotes = Object.entries(lock.packages).filter(
      ([k, v]) => k && !(/** @type {any} */ (v).link),
    );
    expect(pacotes.length).toBeGreaterThan(50);
    for (const [k, v] of pacotes) {
      const p = /** @type {any} */ (v);
      expect(p.integrity, k).toMatch(/^sha(?:256|384|512)-[A-Za-z0-9+/]+=*$/);
      expect(p.resolved, k).toMatch(/^https:\/\/registry\.npmjs\.org\//);
    }
  });

  it("só o fsevents (opcional, só macOS) tem script de instalação no lockfile", () => {
    const comScript = Object.entries(lock.packages)
      .filter(([, v]) => /** @type {any} */ (v).hasInstallScript)
      .map(([k]) => k);
    expect(comScript).toEqual(["node_modules/fsevents"]);
    expect(lock.packages["node_modules/fsevents"].optional).toBe(true);
  });

  it("o lockfile concorda com o package.json e com as versões exatas", () => {
    const raizLock = lock.packages[""];
    expect(raizLock.devDependencies).toEqual(pkg.devDependencies);
    expect(raizLock.dependencies ?? {}).toEqual(pkg.dependencies ?? {});
    for (const [nome, v] of Object.entries({
      ...pkg.devDependencies,
      ...pkg.dependencies,
    }))
      expect(lock.packages["node_modules/" + nome]?.version, nome).toBe(v);
  });

  it("não há .npmrc que mude o registro, nem arquivo .env no repositório", () => {
    if (existsSync(join(raiz, ".npmrc")))
      expect(ler(".npmrc")).not.toMatch(
        /registry\s*=\s*http:|_authToken|_auth\s*=|always-auth/i,
      );
    const topo = readdirSync(raiz);
    expect(topo.filter((f) => /^\.env/.test(f))).toEqual([]);
  });

  it("não há segredo conhecido no código, na documentação nem no workflow", () => {
    const alvos = [
      ...arquivos("src", /\.(js|css|svg)$/),
      ...arquivos("scripts", /\.js$/),
      ...arquivos(".github", /\.ya?ml$/),
      "index.html",
      "README.md",
      "package.json",
    ];
    const padroes = [
      /gh[pousr]_[A-Za-z0-9]{36,}/,
      /github_pat_[A-Za-z0-9_]{50,}/,
      /AKIA[0-9A-Z]{16}/,
      /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/,
      /xox[baprs]-[A-Za-z0-9-]{10,}/,
      /AIza[0-9A-Za-z_-]{35}/,
      /sk_live_[0-9a-zA-Z]{24,}/,
      /npm_[A-Za-z0-9]{36}/,
    ];
    for (const f of alvos)
      for (const re of padroes) expect(ler(f), `${f} ${re}`).not.toMatch(re);
  });
});

describe("workflow do GitHub Actions (.github/workflows/pages.yml)", () => {
  const yml = ler(".github/workflows/pages.yml");
  const linhas = yml.split("\n");
  const semComentario = linhas.map((l) => l.replace(/(^|\s)#.*$/, ""));

  it("permissões padrão do token: só leitura do conteúdo", () => {
    const i = semComentario.findIndex((l) => /^permissions:\s*$/.test(l));
    expect(i).toBeGreaterThan(-1);
    const bloco = [];
    for (let j = i + 1; /^\s+\S/.test(semComentario[j] ?? ""); j++)
      bloco.push(semComentario[j].trim());
    expect(bloco).toEqual(["contents: read"]);
    expect(yml).not.toMatch(/write-all|read-all/);
  });

  it("escrita em Pages e id-token só no job de publicação, nunca no topo nem no job de verificação", () => {
    const antes = semComentario
      .slice(
        0,
        semComentario.findIndex((l) => /^jobs:/.test(l)),
      )
      .join("\n");
    expect(antes).not.toMatch(/write/);
    const verificar = semComentario
      .slice(
        semComentario.findIndex((l) => /^ {2}verificar:/.test(l)),
        semComentario.findIndex((l) => /^ {2}publicar:/.test(l)),
      )
      .join("\n");
    expect(verificar).not.toMatch(/write|permissions:/);
    const publicar = semComentario
      .slice(semComentario.findIndex((l) => /^ {2}publicar:/.test(l)))
      .join("\n");
    expect(publicar).toMatch(/pages: write/);
    expect(publicar).toMatch(/id-token: write/);
  });

  it("toda action está fixada em SHA de 40 hexadecimais, com a versão no comentário", () => {
    const usos = linhas.filter((l) => /^\s*-?\s*uses:/.test(l));
    expect(usos.length).toBeGreaterThanOrEqual(5);
    for (const l of usos)
      expect(l, l).toMatch(
        /uses:\s+[\w.-]+\/[\w./-]+@[0-9a-f]{40}\s+#\s*v\d+\.\d+\.\d+\s*$/,
      );
  });

  it("gatilhos seguros: sem pull_request_target, workflow_run nem eventos de comentário", () => {
    expect(semComentario.join("\n")).not.toMatch(
      /pull_request_target|workflow_run|issue_comment|issues:|discussion|pull_request_review/,
    );
    const on = semComentario
      .slice(
        semComentario.findIndex((l) => /^on:/.test(l)) + 1,
        semComentario.findIndex((l) => /^permissions:/.test(l)),
      )
      .join("\n");
    expect(on).toMatch(/push:/);
    expect(on).toMatch(/pull_request:/);
  });

  it("nenhuma expressão ${{ }} entra em comando run: (injeção de script)", () => {
    for (let i = 0; i < semComentario.length; i++) {
      const m = semComentario[i].match(/^(\s*)-?\s*run:\s*(.*)$/);
      if (!m) continue;
      const bloco = [m[2]];
      if (/^[|>]/.test(m[2]))
        for (
          let j = i + 1;
          semComentario[j] !== undefined &&
          (semComentario[j].trim() === "" ||
            semComentario[j].search(/\S/) > m[1].length);
          j++
        )
          bloco.push(semComentario[j]);
      expect(bloco.join("\n"), `run na linha ${i + 1}`).not.toContain("${{");
    }
  });

  it("as únicas expressões do arquivo são metadados fixos (ref, event_name, saída do deploy)", () => {
    const expr = [
      ...semComentario.join("\n").matchAll(/\$\{\{([^}]*)\}\}/g),
    ].map((m) => m[1].trim());
    expect(expr.length).toBeGreaterThan(0);
    for (const e of expr)
      expect(e).toMatch(
        /^(?:github\.ref|github\.event_name|steps\.deploy\.outputs\.page_url)(?:\s*(?:==|!=)\s*'[^']*')?$/,
      );
    expect(yml).not.toMatch(
      /github\.event\.(?:pull_request|issue|comment|head_commit|commits)|github\.head_ref|secrets\./,
    );
  });

  it("checkout não deixa credencial no disco e o runner é o do GitHub", () => {
    expect(yml).toMatch(
      /actions\/checkout@[0-9a-f]{40}[^\n]*\n\s+with:\n\s+persist-credentials: false/,
    );
    expect(yml).not.toMatch(/self-hosted/);
  });

  it("a publicação só roda fora de PR, na main, e depende da verificação", () => {
    const publicar = semComentario
      .slice(semComentario.findIndex((l) => /^ {2}publicar:/.test(l)))
      .join("\n");
    expect(publicar).toMatch(/needs: verificar/);
    expect(publicar).toMatch(
      /if: github\.event_name != 'pull_request' && github\.ref == 'refs\/heads\/main'/,
    );
    expect(publicar).toMatch(/environment:\s*\n\s+name: github-pages/);
  });
});

// ---------------------------------------------------------------------------------------
// 8. Cabeçalhos que o GitHub Pages não deixa configurar
// ---------------------------------------------------------------------------------------

describe("cabeçalhos: o que a meta cobre e o que não cobre", () => {
  it("a página não finge proteção por meta que o navegador ignora (X-Frame-Options, Permissions-Policy)", () => {
    const html = ler("index.html");
    expect(html).not.toMatch(
      /http-equiv="X-Frame-Options"|http-equiv="Permissions-Policy"|http-equiv="Strict-Transport|http-equiv="X-Content-Type/i,
    );
  });

  it("não há frame-busting por script (inútil contra iframe sandbox e frágil)", () => {
    const todo = arquivos("src", /\.js$/)
      .map((f) => semComentarios(ler(f)))
      .join("\n");
    expect(todo).not.toMatch(
      /top\s*(?:\.location)?\s*[!=]==?\s*(?:self|window)|window\.top\b|parent\.location/,
    );
  });

  it("S-4: a política de referrer é no-referrer (vale por meta)", () => {
    expect(ler("index.html")).toMatch(
      /<meta\s+name="referrer"\s+content="no-referrer"\s*\/>/,
    );
  });
});
