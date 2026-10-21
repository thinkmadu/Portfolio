// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { SistemaSolar } from "../src/sistema-solar/index.js";
import { CartaoProjeto } from "../src/componentes/cartao-projeto.js";
import { BlocoFechado } from "../src/componentes/bloco-fechado.js";

afterEach(() => document.body.replaceChildren());

function alvo() {
  const d = document.createElement("div");
  document.body.append(d);
  return d;
}

describe("SistemaSolar.mount", () => {
  it("menu em texto sempre presente, com todos os destinos", () => {
    const t = alvo();
    const inst = SistemaSolar.mount(t, {});
    const links = [...t.querySelectorAll(".pf-menu a")].map(
      (a) => a.textContent,
    );
    expect(links).toEqual([
      "sobre mim",
      "github",
      "linkedin",
      "email",
      "ia",
      "dados",
      "ferramentas",
      "full-stack",
      "testes",
      "ajustes",
      "português",
      "english",
    ]);
    expect(
      t.querySelector('.pf-menu a[aria-current="true"]')?.textContent,
    ).toBe("português");
    expect(t.querySelector(".pf-assina-txt")?.textContent).toBe(
      "Se encontro um problema, desenvolvo a solução. De ponta a ponta, sem deixar nada solto.",
    );
    inst.destroy();
  });

  it("rótulo com HTML vira texto, nunca marcação", () => {
    const t = alvo();
    const inst = SistemaSolar.mount(t, {
      contatos: [{ rotulo: '<img src=x onerror="alert(1)">', href: "#x" }],
    });
    expect(t.querySelector("img")).toBeNull();
    expect(t.querySelector(".pf-menu")?.textContent).toContain("<img");
    inst.destroy();
  });

  it("aoEscolher recebe o rótulo do menu; false deixa o link seguir", () => {
    const t = alvo();
    const aoEscolher = vi.fn((r) => (r === "english" ? undefined : false));
    const inst = SistemaSolar.mount(t, { aoEscolher });
    const en = /** @type {HTMLAnchorElement} */ (
      t.querySelector('.pf-menu a[data-r="english"]')
    );
    const ev = new MouseEvent("click", { bubbles: true, cancelable: true });
    en.dispatchEvent(ev);
    expect(aoEscolher).toHaveBeenCalledWith("english");
    expect(ev.defaultPrevented).toBe(true);
    const gh = /** @type {HTMLAnchorElement} */ (
      t.querySelector('.pf-menu a[data-r="github"]')
    );
    const ev2 = new MouseEvent("click", { bubbles: true, cancelable: true });
    gh.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(false);
    inst.destroy();
  });

  it("destroy limpa o alvo", () => {
    const t = alvo();
    const inst = SistemaSolar.mount(t, {});
    inst.destroy();
    expect(t.childElementCount).toBe(0);
    expect(t.classList.contains("pf-solar")).toBe(false);
  });
});

describe("CartaoProjeto e BlocoFechado", () => {
  it("cartão fechado não mostra repositório", () => {
    const t = alvo();
    CartaoProjeto.mount(t, [
      {
        titulo: "A",
        resumo: "r",
        tecnologias: ["a", "b", "c", "d", "e"],
        repoHref: "https://x",
        fechado: true,
      },
    ]);
    expect(t.querySelectorAll(".pf-tags span")).toHaveLength(4);
    expect(t.textContent).not.toContain("Abrir o repositório");
    expect(t.querySelector(".pf-privado")?.textContent).toBe("código privado");
  });
  it("bloco com título padrão e itens", () => {
    const t = alvo();
    BlocoFechado.mount(t, {
      itens: [{ rotulo: "k", texto: "<b>v</b>", link: "ver" }],
    });
    expect(t.querySelector("h2")?.textContent).toBe(
      "O que está fechado neste projeto",
    );
    expect(t.querySelector("b")).toBeNull();
  });
});
