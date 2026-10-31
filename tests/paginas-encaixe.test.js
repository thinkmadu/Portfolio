// @vitest-environment jsdom
// Encaixe dos textos de cada idioma nas caixas e colunas das páginas em terminal. A grade tem
// largura fixa (92 colunas), então um texto mais comprido que a caixa onde é desenhado vaza
// por cima da moldura ou de outro texto. Os limites vêm do desenho de cada página e valem
// para os dois idiomas: o português é a medida, o inglês tem de caber nas mesmas caixas.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { quebrar } from "../src/terminal/grade.js";
import { PAGINAS } from "../src/paginas/index.js";
import { TEXTOS as sobre } from "../src/paginas/sobre.js";
import { TEXTOS as ia } from "../src/paginas/ia.js";
import { TEXTOS as ferramentas } from "../src/paginas/ferramentas.js";
import { TEXTOS as testes } from "../src/paginas/testes.js";
import { TEXTOS as email } from "../src/paginas/email.js";

/** @typedef {"pt" | "en"} Idioma */
const IDIOMAS = /** @type {Idioma[]} */ (["pt", "en"]);

/**
 * Os textos que passam do limite de colunas (vazio quando todos cabem).
 * @param {string[]} textos @param {number} max
 */
const alemDe = (textos, max) => textos.filter((t) => t.length > max);
/**
 * Os textos que, quebrados em `col` colunas, passam de `linhas` linhas.
 * @param {string[]} textos @param {number} col @param {number} linhas
 */
const linhasDemais = (textos, col, linhas) =>
  textos.filter((t) => quebrar(t, col).length > linhas);

describe.each(IDIOMAS)("encaixe: sobre (%s)", (i) => {
  const T = sobre[i];
  it("fala e botão do pato cabem na tela de baixo", () => {
    expect(alemDe([...Object.values(T.fala), T.falaCarinho], 18)).toEqual([]);
    expect(alemDe([T.botaoCarinho], 12)).toEqual([]);
  });
  it("as abas cabem na ficha e a tecla é a inicial do rótulo", () => {
    // cada aba é ┤rótulo├ mais um espaço, a partir da coluna 45; a ficha acaba na 90
    expect(T.abas.reduce((a, b) => a + b.rotulo.length + 3, 0)).toBeLessThan(
      48,
    );
    for (const a of T.abas) expect(a.rotulo[0]).toBe(a.tecla);
    expect(new Set(T.abas.map((a) => a.tecla)).size).toBe(T.abas.length);
  });
  it("os filtros dos certificados cabem nas duas linhas de chips", () => {
    const ids = /** @type {(keyof typeof T.areas)[]} */ (Object.keys(T.areas));
    /** @param {(keyof typeof T.areas)[]} fatia */
    const largura = (fatia) =>
      fatia.reduce((a, id) => a + T.areas[id].length + 5, -1);
    expect(largura(ids.slice(0, 4))).toBeLessThanOrEqual(46);
    expect(largura(ids.slice(4))).toBeLessThanOrEqual(46);
  });
  it("as linhas da ficha cabem nas 46 colunas", () => {
    const linhas = [
      T.ocupacaoAqui,
      T.lema1,
      T.lema2,
      T.formacao,
      T.curso1,
      T.curso2,
      T.instituicao,
      T.mostrando(6, 6),
      ...T.certs.map((c) => c + "  (pdf)"),
    ];
    expect(alemDe(linhas, 43)).toEqual([]);
  });
});

describe.each(IDIOMAS)("encaixe: ia (%s)", (i) => {
  const T = ia[i];
  it("os cartões (23 colunas de texto) comportam o aviso e o placeholder", () => {
    const p = T.projeto;
    expect(alemDe([T.emConstrucao, T.voltaEmBreve, p.faz], 23)).toEqual([]);
    expect(alemDe([`${p.linguagem} · ${p.data}`], 21)).toEqual([]);
  });
  it("as falas do robô cabem na tela", () => {
    expect(
      alemDe([T.falaConstrucao, T.falaEscolhido, T.falaEscolha], 60),
    ).toEqual([]);
  });
  it("os nós e títulos do detalhe cabem antes da coluna seguinte", () => {
    const xs = [3, 20, 37, 53];
    T.colunas.forEach((c, ci) => {
      const folga = ci < 3 ? xs[ci + 1] - xs[ci] : 30;
      expect(alemDe(c.n, folga - 3), c.t).toEqual([]);
      expect(alemDe([c.t], folga)).toEqual([]);
    });
    // (repositório) vai da coluna 3 até antes de (demo), na 18
    expect(alemDe([T.repositorio], 14)).toEqual([]);
    expect(alemDe([T.dica], 66)).toEqual([]);
  });
});

describe.each(IDIOMAS)("encaixe: ferramentas (%s)", (i) => {
  const T = ferramentas[i];
  it("o nome da etapa cabe no cartão (11 colunas, antes do ✓)", () => {
    expect(alemDe(T.nomes, 11)).toEqual([]);
  });
  it("as ferramentas cabem no painel esquerdo (37 colunas)", () => {
    expect(
      alemDe(
        T.dados.flatMap((d) => d.itens.map((x) => x[0])),
        37,
      ),
    ).toEqual([]);
  });
  it("as falas do pato quebram em no máximo duas linhas de 28 colunas", () => {
    const falas = T.dados.flatMap((d) => [d.intro, d.fim, ...d.extras]);
    expect(linhasDemais([...falas, T.decolando], 28, 2)).toEqual([]);
  });
  it("a saída do terminal cabe no painel direito", () => {
    expect(alemDe(T.steps, 17)).toEqual([]);
    expect(alemDe([T.concluido, T.containerNoAr, T.noAr], 40)).toEqual([]);
    expect(alemDe([T.gate, T.aprovado, T.bemVinda], 40)).toEqual([]);
    expect(alemDe([T.aguardando], 14)).toEqual([]);
    expect(alemDe(T.ambientes, 5)).toEqual([]);
    // mensagem de commit mais a etiqueta do galho (main, develop, feature/login)
    const c = T.commits;
    expect(alemDe([c.merge], 24)).toEqual([]);
    expect(alemDe([c.release], 25)).toEqual([]);
    expect(alemDe([c.feat], 18)).toEqual([]);
    expect(alemDe([c.teste, c.base], 33)).toEqual([]);
  });
  it("avisos e legenda cabem", () => {
    expect(alemDe([T.emConstrucao], 42)).toEqual([]);
    expect(alemDe([T.decolou, T.recomecar], 20)).toEqual([]);
    expect(alemDe([T.legendaUsei], 5)).toEqual([]);
  });
});

describe.each(IDIOMAS)("encaixe: testes (%s)", (i) => {
  const T = testes[i];
  it("as abas e os filtros cabem na coluna da lista (42 colunas)", () => {
    expect(T.grupos.reduce((a, g) => a + g.rotulo.length + 4, 0)).toBeLessThan(
      43,
    );
    for (const g of T.grupos) expect(g.rotulo[0]).toBe(g.tecla);
    expect(new Set(T.grupos.map((g) => g.tecla)).size).toBe(T.grupos.length);
    expect(T.filtros.reduce((a, f) => a + f.length + 5, -1)).toBeLessThan(43);
  });
  it("grupos e itens cabem na lista", () => {
    const grupos = Object.values(T.dados).flat();
    expect(
      alemDe(
        grupos.map((g) => g.g),
        36,
      ),
    ).toEqual([]);
    expect(
      alemDe(
        grupos.flatMap((g) => g.it.map((x) => x[0])),
        14,
      ),
    ).toEqual([]);
  });
  it("carregamento, comentários e falas do general cabem", () => {
    expect(alemDe(T.carga, 42)).toEqual([]);
    expect(alemDe([...T.ocioso, ...Object.values(T.falas)], 41)).toEqual([]);
  });
  it("o detalhe do item cabe na lista", () => {
    expect(alemDe([T.ondeUsei + " " + T.emConstrucao], 38)).toEqual([]);
    expect(alemDe([T.ondeEstudei + " " + T.cursoOuLeitura], 38)).toEqual([]);
    expect(alemDe([T.naoPrecisei], 40)).toEqual([]);
  });
  it("o selo e o botão do canto cabem", () => {
    for (const [txt, x] of [T.seloUsei, T.seloConheco])
      expect(Number(x) + String(txt).length).toBeLessThanOrEqual(75);
    // o botão encosta na direita (")" na coluna 89) e não toca o selo, que acaba na 75
    expect(87 - T.rodar.length).toBeGreaterThan(76);
    expect(alemDe([T.bugs], 28)).toEqual([]);
    expect(alemDe([T.tenta], 21)).toEqual([]);
  });
});

describe.each(IDIOMAS)("encaixe: email (%s)", (i) => {
  const T = email[i];
  it("o balão do pato cabe em três linhas (28 colunas; 36 com as sugestões)", () => {
    const falas = [
      ...Object.values(T.fases),
      ...T.lendo,
      ...T.chaves.map((c) => c[1]),
      T.anotei,
      T.fimEnvio,
      T.vazia,
      T.bone,
      T.textao,
      T.clica,
      T.pronta,
    ];
    expect(linhasDemais(falas, 28, 3)).toEqual([]);
    expect(
      linhasDemais(
        T.sug.map((s) => s[0]),
        36,
        3,
      ),
    ).toEqual([]);
  });
  it("os campos da carta cabem antes do selo", () => {
    // o nome tem até 24 letras e o assunto até 26; o selo começa 36 colunas depois do papel
    expect(4 + T.remetente.length + 24).toBeLessThan(39);
    expect(4 + T.assunto.length + 26).toBeLessThan(39);
    expect(alemDe([T.seuNome, T.seuAssunto], 24)).toEqual([]);
    expect(alemDe([T.escrevaAqui, T.avisoVazia], 40)).toEqual([]);
  });
  it("os botões e a tela de carta enviada cabem", () => {
    const larg = (/** @type {string[]} */ b) => b.join("").length + 2;
    // enviar, 2 espaços, limpar: dentro do papel (colunas 5 a 50)
    expect(5 + larg(T.btnEnviar) + 2 + larg(T.btnLimpar)).toBeLessThan(51);
    // usar, 3 espaços, outra: dentro do balão (a partir da coluna 54)
    expect(larg(T.btnUsar)).toBeLessThanOrEqual(18);
    expect(alemDe([T.enviada, T.appDeveAbrir, T.cartaPronta], 34)).toEqual([]);
    expect(alemDe([T.abrirApp, T.outraCarta], 34)).toEqual([]);
  });
  it("a legenda cabe no rodapé", () => {
    expect(
      34 + T.escrevendo.length + 1 + "tab • ctrl+enter • esc".length,
    ).toBeLessThan(91);
  });
});

// Nenhuma letra pode cair na coluna 91, onde fica a moldura (que sai como forma, não texto).
// A grade corta o que passa dela, então o vazamento só aparece aqui.
describe.each(IDIOMAS)("encaixe na tela montada (%s)", (i) => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });
  it.each(Object.keys(PAGINAS))(
    "%s: a coluna 91 fica vazia",
    async (id) => {
      const { montar } = await PAGINAS[id]();
      const raiz = document.createElement("div");
      document.body.append(raiz);
      const m = montar(raiz, i);
      const tela = /** @type {Element} */ (raiz.querySelector(".pf-tela"));
      for (let passo = 0; passo < 8; passo++) {
        // as teclas 1 a 4 percorrem etapas, filtros e certificados e deixam o relógio correr
        tela.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: String((passo % 4) + 1),
            bubbles: true,
          }),
        );
        vi.advanceTimersByTime(2000);
        for (const pre of raiz.querySelectorAll("pre.pf-t-texto"))
          for (const linha of (pre.textContent ?? "").split("\n"))
            expect(linha.charAt(91).trim(), linha).toBe("");
      }
      m.destroy();
    },
    30_000,
  );
});
