// @vitest-environment jsdom
// Página inteira (src/main.js) no jsdom: idioma inicial, troca pelo menu, escolha lembrada.
// O jsdom tem largura zero, então só o menu em texto aparece (como no modo compacto).
import { readFileSync } from "node:fs";
import { URL as NodeURL, fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHAVE, CHAVE_ANTIGA } from "../src/i18n/idioma.js";

// fileURLToPath do Node: o URL global aqui é o do jsdom
const corpo = readFileSync(
  fileURLToPath(new NodeURL("../index.html", import.meta.url)),
  "utf8",
)
  .split("<body>")[1]
  .split("</body>")[0];

/**
 * Carrega a página do zero, como numa recarga.
 * @param {string} busca
 */
async function abrir(busca) {
  document.documentElement.lang = "pt-BR";
  document.title = "Eduarda Silva (thinkmadu)";
  document.body.innerHTML = corpo; // index.html do próprio repositório
  history.replaceState(null, "", "/Portfolio/" + busca);
  vi.resetModules();
  await import("../src/main.js");
}

const menu = () =>
  [...document.querySelectorAll(".pf-menu a")].map((a) => a.textContent);
const canonical = () =>
  document.querySelector('link[rel="canonical"]')?.getAttribute("href");

/** @param {string} id */
function clicar(id) {
  const a = /** @type {HTMLElement} */ (
    document.querySelector(`.pf-menu a[data-r="${id}"]`)
  );
  a.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
}

beforeEach(() => localStorage.clear());
afterEach(() => document.body.replaceChildren());

describe("página", () => {
  it("?lang=en abre em inglês sem gravar escolha", async () => {
    await abrir("?lang=en");
    expect(document.documentElement.lang).toBe("en");
    expect(document.querySelector("h1")?.textContent).toBe(
      "Solar system: thinkmadu at the center, with contacts and areas in orbit",
    );
    expect(menu()[0]).toBe("about me");
    expect(canonical()).toBe("https://thinkmadu.github.io/Portfolio/?lang=en");
    expect(localStorage.getItem(CHAVE)).toBeNull();
  });

  it("troca pelo menu em texto: URL, escolha, documento e foco", async () => {
    await abrir("?lang=en");
    clicar("lang-pt");
    expect(location.search).toBe("?lang=pt");
    expect(localStorage.getItem(CHAVE)).toBe("pt");
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(menu()[0]).toBe("sobre mim");
    expect(
      document.querySelector('.pf-menu a[aria-current="true"]')?.textContent,
    ).toBe("português");
    expect(document.activeElement?.getAttribute("data-r")).toBe("lang-pt");
  });

  it("recarregar sem ?lang mantém a escolha salva", async () => {
    localStorage.setItem(CHAVE, "en");
    await abrir("");
    expect(document.documentElement.lang).toBe("en");
  });

  it("?lang= vence a escolha salva", async () => {
    localStorage.setItem(CHAVE, "en");
    await abrir("?lang=pt");
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  it("sem nada, segue o navegador (jsdom: en-US)", async () => {
    expect(navigator.languages[0]).toBe("en-US");
    await abrir("");
    expect(document.documentElement.lang).toBe("en");
  });

  it("escolha antiga em sol-v5 migra; ajustes não gravam idioma", async () => {
    localStorage.setItem(
      CHAVE_ANTIGA,
      JSON.stringify({ lang: "english", fundo: 20 }),
    );
    await abrir("?lang=pt");
    expect(localStorage.getItem(CHAVE)).toBe("en");
    expect(document.documentElement.lang).toBe("pt-BR"); // a URL vence
  });

  it("settings no menu abre o painel traduzido", async () => {
    await abrir("?lang=en");
    clicar("ajustes");
    await vi.waitFor(() => {
      const p = document.querySelector(".pf-ajustes");
      expect(p?.hasAttribute("hidden")).toBe(false);
    });
    const p = /** @type {HTMLElement} */ (
      document.querySelector(".pf-ajustes")
    );
    expect(p.getAttribute("aria-label")).toBe("Background settings");
    expect(p.querySelector("button")?.textContent).toBe("Shuffle background");
    expect(p.querySelector(".pf-ajustes-leitura")?.textContent).toMatch(
      /^background \d+ · glow/,
    );
    clicar("lang-pt");
    await vi.waitFor(() =>
      expect(p.querySelector("button")?.textContent).toBe(
        "Sortear outro fundo",
      ),
    );
    expect(p.getAttribute("aria-label")).toBe("Ajustes do fundo");
    const input = /** @type {HTMLInputElement} */ (p.querySelector("input"));
    input.value = "30";
    input.dispatchEvent(new Event("input"));
    await vi.waitFor(() =>
      expect(JSON.parse(localStorage.getItem(CHAVE_ANTIGA) || "{}").fundo).toBe(
        30,
      ),
    );
    expect(
      JSON.parse(localStorage.getItem(CHAVE_ANTIGA) || "{}"),
    ).not.toHaveProperty("lang");
    p.remove();
  });
});
