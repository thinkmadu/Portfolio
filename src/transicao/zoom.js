// Zoom entre a abertura e as páginas: a câmera mergulha no planeta escolhido e a tela da página
// cresce de dentro dele; na volta, o caminho é o inverso. Os dois lados seguem a mesma câmera
// (um fator de escala só), então o planeta e a tela ficam sempre grudados.

import { movimentoReduzido } from "../terminal/tela.js";

/** Escala final da abertura (e inicial da tela é o inverso): 12 vezes. */
const ESCALA = 12;
const AMOSTRAS = 36;
const DURACAO = 950;

/** @param {number} t 0 a 1 */
const suave = (t) => (t < 0.5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2);
/** @param {number} v @param {number} a @param {number} b */
const rampa = (v, a, b) => Math.min(1, Math.max(0, (v - a) / (b - a)));

/**
 * Anima a câmera. `inicio` é o elemento da abertura, `paginas` a camada da tela; `centro` é
 * onde o planeta está, em px da janela. `fim` resolve quando termina (ou na hora, se não há
 * o que animar); `concluir` corta a animação e solta os estilos.
 * @param {{ inicio: HTMLElement, paginas: HTMLElement, centro: { x: number, y: number },
 *   entrando: boolean }} cfg
 * @returns {{ fim: Promise<void>, concluir(): void }}
 */
export function zoom({ inicio, paginas, centro, entrando }) {
  if (movimentoReduzido() || typeof inicio.animate !== "function")
    return { fim: Promise.resolve(), concluir() {} };

  const V = { x: innerWidth / 2, y: innerHeight / 2 };
  // origem da escala da abertura: leva o planeta de `centro` (escala 1) ao meio da janela (ESCALA)
  const O = {
    x: (V.x - centro.x * ESCALA) / (1 - ESCALA),
    y: (V.y - centro.y * ESCALA) / (1 - ESCALA),
  };

  const quadrosInicio = [];
  const quadrosPagina = [];
  for (let i = 0; i <= AMOSTRAS; i++) {
    const t = i / AMOSTRAS;
    // u = quanto já mergulhou: 0 na abertura, 1 na página
    const u = entrando ? suave(t) : 1 - suave(t);
    const S = ESCALA ** u;
    const px = O.x + (centro.x - O.x) * S;
    const py = O.y + (centro.y - O.y) * S;
    quadrosInicio.push({
      offset: t,
      transform: `scale(${S})`,
      opacity: 1 - rampa(u, 0.45, 0.85),
    });
    quadrosPagina.push({
      offset: t,
      transform: `translate(${(px - V.x).toFixed(2)}px, ${(py - V.y).toFixed(2)}px) scale(${(S / ESCALA).toFixed(4)})`,
      opacity: rampa(u, 0.15, 0.55),
    });
  }

  inicio.style.transformOrigin = `${O.x}px ${O.y}px`;
  inicio.style.willChange = "transform, opacity";
  inicio.classList.add("pf-em-zoom");
  paginas.style.pointerEvents = "none";
  /** @type {KeyframeAnimationOptions} */
  const opcoes = { duration: DURACAO, easing: "linear", fill: "both" };
  const animacoes = [
    inicio.animate(quadrosInicio, opcoes),
    paginas.animate(quadrosPagina, opcoes),
  ];

  const fim = Promise.all(
    animacoes.map((a) => a.finished.catch(() => {})),
  ).then(() => {});
  return {
    fim,
    concluir() {
      for (const a of animacoes) a.cancel();
      inicio.style.transformOrigin = "";
      inicio.style.willChange = "";
      inicio.classList.remove("pf-em-zoom");
      paginas.style.pointerEvents = "";
    },
  };
}

/**
 * Centro, em px da janela, do corpo da abertura que leva a `#id`; o meio da janela se não houver.
 * @param {ParentNode} inicio
 * @param {string} id
 */
export function centroDoCorpo(inicio, id) {
  const a = inicio.querySelector(`.pf-sys a[href="#${id}"]`);
  if (!a) return { x: innerWidth / 2, y: innerHeight / 2 };
  const r = a.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}
