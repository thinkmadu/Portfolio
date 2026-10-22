// @vitest-environment jsdom
// Zonas clicáveis: ao se mover, o elemento é o mesmo (clique e foco não se perdem).
import { afterEach, describe, expect, it, vi } from "vitest";
import { Cena, montarTela } from "../src/terminal/tela.js";

class Anda extends Cena {
  constructor() {
    super();
    this.n = 0;
    this.rotulo = "bug";
    this.cliques = 0;
  }
  tick() {
    this.n++;
  }
  quadro() {
    return {
      camadas: {},
      zonas: [
        {
          tipo: /** @type {const} */ ("b"),
          x: 10 + this.n,
          y: 5,
          w: 4,
          label: this.rotulo,
          pick: () => this.cliques++,
        },
      ],
    };
  }
}

const CONFIG = {
  tema: "pf-tema-ia",
  altura: 424,
  camadas: 1,
  ordemSvg: [],
  aria: "x",
  descricao: "x",
};

afterEach(() => vi.useRealTimers());

describe("zonas da tela", () => {
  it("mantêm o elemento e só mudam a posição quando o rótulo é o mesmo", () => {
    vi.useFakeTimers();
    const raiz = document.createElement("div");
    const cena = new Anda();
    const t = montarTela(raiz, CONFIG, cena);
    const antes = raiz.querySelector("button.pf-t-zona");
    const left = /** @type {HTMLElement} */ (antes).style.left;
    vi.advanceTimersByTime(33 * 3);
    const depois = raiz.querySelector("button.pf-t-zona");
    expect(depois).toBe(antes);
    expect(/** @type {HTMLElement} */ (depois).style.left).not.toBe(left);
    depois?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(cena.cliques).toBe(1);
    t.destroy();
  });

  it("recriam o elemento quando o rótulo muda", () => {
    vi.useFakeTimers();
    const raiz = document.createElement("div");
    const cena = new Anda();
    const t = montarTela(raiz, CONFIG, cena);
    const antes = raiz.querySelector("button.pf-t-zona");
    cena.rotulo = "outro";
    vi.advanceTimersByTime(33);
    const depois = raiz.querySelector("button.pf-t-zona");
    expect(depois).not.toBe(antes);
    expect(depois?.getAttribute("aria-label")).toBe("outro");
    t.destroy();
  });

  it("destroy para o relógio e limpa a raiz", () => {
    vi.useFakeTimers();
    const raiz = document.createElement("div");
    const t = montarTela(raiz, CONFIG, new Anda());
    t.destroy();
    expect(raiz.childElementCount).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });
});
