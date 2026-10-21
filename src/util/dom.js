/**
 * Cria um elemento pela DOM API: texto entra por `textContent`, nunca como HTML.
 * Estilo entra por CSSOM (`el.style`), compatível com a CSP sem `unsafe-inline`.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {{ class?: string, text?: string, attrs?: Record<string, string>, style?: Record<string, string> }} [o]
 * @param {(Node | string)[]} [filhos]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function el(tag, o = {}, filhos = []) {
  const e = document.createElement(tag);
  if (o.class) e.className = o.class;
  if (o.text != null) e.textContent = o.text;
  if (o.attrs)
    for (const [k, v] of Object.entries(o.attrs)) e.setAttribute(k, v);
  if (o.style)
    for (const [k, v] of Object.entries(o.style)) e.style.setProperty(k, v);
  if (filhos.length) e.append(...filhos);
  return e;
}

/**
 * Escapa texto para HTML. Só para o fundo de caracteres, montado como string por desempenho.
 * @param {string} s
 */
export function esc(s) {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
