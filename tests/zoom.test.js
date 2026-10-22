// @vitest-environment jsdom
// Zoom entre a abertura e as páginas: uma câmera só, que se desfaz ao concluir.
import { describe, expect, it, vi } from "vitest";
import { centroDoCorpo, zoom } from "../src/transicao/zoom.js";

/** Elemento com `animate` falso, para ver o que o zoom pede sem depender de um navegador. */
function falso() {
  const el = document.createElement("div");
  const animacoes = [];
  el.animate = vi.fn((quadros) => {
    const a = { quadros, finished: Promise.resolve(), cancel: vi.fn() };
    animacoes.push(a);
    return a;
  });
  return { el, animacoes };
}

describe("zoom", () => {
  it("resolve na hora quando o navegador não anima", async () => {
    const inicio = document.createElement("div");
    const paginas = document.createElement("div");
    const z = zoom({
      inicio,
      paginas,
      centro: { x: 10, y: 10 },
      entrando: true,
    });
    await z.fim;
    z.concluir();
    expect(inicio.style.transformOrigin).toBe("");
  });

  it("anima a abertura e a página juntas, com o mesmo número de quadros", async () => {
    const a = falso();
    const b = falso();
    const z = zoom({
      inicio: a.el,
      paginas: b.el,
      centro: { x: 300, y: 200 },
      entrando: true,
    });
    await z.fim;
    const [qa] = a.animacoes.map((x) => x.quadros);
    const [qb] = b.animacoes.map((x) => x.quadros);
    expect(qa.length).toBe(qb.length);
    // começa na abertura inteira e termina na página inteira
    expect(qa[0].transform).toBe("scale(1)");
    expect(qa[0].opacity).toBe(1);
    expect(qb[0].opacity).toBe(0);
    expect(qa.at(-1).opacity).toBe(0);
    expect(qb.at(-1).opacity).toBe(1);
    expect(qb.at(-1).transform).toMatch(
      /^translate\(-?0\.00px, -?0\.00px\) scale\(1\.0000\)$/,
    );
    expect(a.el.style.transformOrigin).not.toBe("");
    z.concluir();
    expect(a.animacoes[0].cancel).toHaveBeenCalled();
    expect(a.el.style.transformOrigin).toBe("");
    expect(b.el.style.pointerEvents).toBe("");
  });

  it("na volta, o primeiro quadro é a página e o último é a abertura", () => {
    const a = falso();
    const b = falso();
    zoom({
      inicio: a.el,
      paginas: b.el,
      centro: { x: 300, y: 200 },
      entrando: false,
    });
    const qa = a.animacoes[0].quadros;
    expect(qa[0].opacity).toBe(0);
    expect(qa.at(-1).transform).toBe("scale(1)");
    expect(qa.at(-1).opacity).toBe(1);
  });
});

describe("centroDoCorpo", () => {
  it("cai no meio da janela quando o corpo não existe", () => {
    const c = centroDoCorpo(document.createElement("div"), "ia");
    expect(c).toEqual({ x: innerWidth / 2, y: innerHeight / 2 });
  });
});
