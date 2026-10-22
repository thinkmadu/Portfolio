# Segurança e desempenho: práticas para não refazer

Registro do que as auditorias de segurança, qualidade e desempenho encontraram e das regras que saíram delas. Cada regra diz qual teste ou verificação a protege. Onde não há teste, está marcado como **revisão manual**.

Números medidos no Chromium 141 sem GPU (raster em software), então valem para comparar, não como valor absoluto.

## 1. Segurança

### Regras fixas

| Regra                                                                                                         | Por quê                                                                               | Quem protege                                             |
| ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| CSP por meta com `default-src 'none'` e só `'self'` para script, estilo, fonte e imagem                       | Bloqueia `eval`, script e estilo inline, `javascript:`, origem externa, frame, worker | `tests/seguranca.test.js` (meta e `dist/`)               |
| Nada de `style=` em HTML nem `<style>` inline; estilo dinâmico só por CSSOM (`el.style.x = ...`)              | A CSP não tem `unsafe-inline`                                                         | `tests/seguranca.test.js`, `tests/convencoes.test.js`    |
| Dois `innerHTML` só, e só com HTML de `campo()` (texto escapado por `esc()`)                                  | Fecha a superfície de XSS                                                             | inventário fechado em `seguranca.test.js` (`SUMIDOUROS`) |
| Texto de pessoa entra por `textContent` ou `el(..., { text })`, nunca como HTML                               | Idem                                                                                  | idem                                                     |
| Nunca `eval`, `new Function`, `setTimeout(string)`, `document.write`, `outerHTML`, `insertAdjacentHTML`       | Idem                                                                                  | idem                                                     |
| Todo `href` que vem de dado passa por `hrefSeguro` (só `https:`, `mailto:` e relativos)                       | Hoje todos são `#...`, mas `ia.js` ganhará `repo` e `demo`                            | `seguranca.test.js`                                      |
| Link com `target="_blank"` leva `rel="noopener noreferrer"`                                                   | Evita `window.opener` e vazamento de referrer                                         | `tela.js` + teste                                        |
| Hash da URL só vira página por `paginaDoHash` com `Object.hasOwn`                                             | `#__proto__`, `#constructor` não podem chegar a `PAGINAS`                             | testes do roteador                                       |
| Chave de objeto vinda de fora usa `Object.hasOwn`, nunca `x[k]` direto nem `k in obj`                         | Protótipo herdado                                                                     | `t()`, `transicao()`                                     |
| Valor lido do `localStorage` é validado e preso na faixa (`FAIXA` em `sistema-solar/config.js`)               | `fonte: 0.5` travava o site a cada recarga                                            | `seguranca.test.js`                                      |
| `mailto:` com destinatário constante; só `subject` e `body`, ambos por `encodeURIComponent(x.toWellFormed())` | Sem injeção de cabeçalho e sem `URIError` com surrogate solto                         | `seguranca.test.js`                                      |
| Texto digitado é cortado por ponto de código (`[...v]`), não por `slice`                                      | `slice` pode partir um emoji                                                          | `seguranca.test.js`                                      |
| Listener de `document` ou `window` criado em `montar()` é removido em `desmontar()`                           | Vazamento e atalho vivo em outra página                                               | testes da página de e-mail                               |
| `<meta name="referrer" content="no-referrer">`                                                                | Links externos futuros não vazam a origem                                             | `seguranca.test.js`                                      |

### Antes de adicionar algo novo

- **Novo `innerHTML`:** não. Se for inevitável, escape tudo com `esc()`, atualize `SUMIDOUROS` e `INNER_HTML_NO_BUNDLE` no teste e explique no PR.
- **Link externo:** passe por `hrefSeguro`, use `rel="noopener noreferrer"` e abra o `connect-src` só se houver `fetch` (hoje não há nenhum).
- **Dependência nova:** versão exata (sem `^` ou `~`), sem script de ciclo de vida, `npm audit` limpo. O bundle hoje não tem código de terceiros; manter assim.
- **Dado novo no `localStorage`:** valide o tipo e a faixa ao ler. Trate JSON quebrado, `null` e `getItem` que lança.
- **Nova entrada de texto:** pense em colagem com CR, controles e emoji.
- **Action nova no workflow:** fixe por SHA do commit da tag, sem `${{ ... }}` dentro de `run:`, sem `pull_request_target`, permissões mínimas por job.

### O que o GitHub Pages não deixa fazer

`X-Frame-Options`, `frame-ancestors`, `Permissions-Policy`, `Referrer-Policy` e `X-Content-Type-Options` não são configuráveis, e via `<meta>` não valem. O risco é baixo (a pior ação possível é abrir um rascunho de e-mail), mas é real: o site pode ser embutido em iframe de outra origem. A correção de verdade é hospedar onde se controlam cabeçalhos (Cloudflare Pages ou Netlify com `_headers`) e pôr `frame-ancestors 'none'`, `nosniff` e `Permissions-Policy`. **Frame-busting por JS não resolve.**

### Fora do alcance dos testes (revisão manual)

- Proteção de branch, regras do environment `github-pages`, 2FA da conta, "Enforce HTTPS" no Pages.
- Firefox e Safari: as provas de CSP foram só em Chromium.
- Como cada cliente de e-mail trata caracteres raros no `mailto:`.

## 2. Desempenho

### Regras fixas

| Regra                                                                                                  | Medição que a justifica                                                                                       | Onde está                                             |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| Não reescrever DOM quando o valor não mudou (`textContent` e `setAttribute("d")` só se a string mudou) | 75 a 99% das escritas eram idênticas; CPU das páginas −45% a −53%, layouts de 303 para 29 a 85 em 10 s        | `terminal/tela.js` (`anterior`)                       |
| Zonas clicáveis mantêm o elemento; só a posição muda                                                   | Em testes eram recriadas em 219 de 900 quadros (clique e foco perdidos)                                       | `terminal/tela.js` + `tests/tela.test.js`             |
| Só calcular traço SVG para caractere que vira forma                                                    | `split`+`tracado` eram ~65% do JS do quadro                                                                   | `terminal/grade.js` (`viraForma`)                     |
| Janela escondida: o relógio da cena segue, o desenho não                                               | ~79 ms/s de JS sem ninguém ver                                                                                | `terminal/tela.js` (`visibilitychange`)               |
| Animação infinita em muitos elementos pequenos vira uma camada por elemento: evitar                    | O fundo de estrelas animado nas páginas levou sobre de 13% para 90% de CPU (4 para 160 camadas)               | `.pf-fundo-pagina .pf-tw` parado em `terminal.css`    |
| Nada de `text-shadow` grande (blur de dezenas de px) animado, nem escalado                             | O pulso dos planetas é ~78% da CPU da home (201% para 45% sem ele); no zoom de 12x o blur vira mais de mil px | `.pf-em-zoom` desliga pulso e brilho durante a câmera |
| Medida de texto em DOM divide pela escala dos ancestrais                                               | O zoom escalava `getBoundingClientRect` e quebrava o encaixe (modo compacto)                                  | `sistema-solar/index.js` (`escalaDoCeu`)              |
| Posição animada por `transform`, não por `left`/`top`                                                  | Meteoros por `left`/`top` somam CLS de ~0,0015 por segundo                                                    | **pendente** (ver abaixo)                             |
| Página carrega por `import()` e o módulo é pedido já no `pointerover` do planeta                       | Entrada inicial de 39 kB; páginas de 5 a 14 kB cada                                                           | `main.js`, `paginas/index.js`                         |

### Orçamentos (para notar regressão)

| Item                           | Hoje                                                       |
| ------------------------------ | ---------------------------------------------------------- |
| JS de entrada                  | 41,8 kB bruto (~17 kB gzip)                                |
| Chunk de página                | 5 a 14 kB bruto                                            |
| CSS                            | ~14 kB (3,9 kB gzip), 92 de 92 regras usadas               |
| Fontes                         | 52,6 kB gzip (JetBrains Mono 40,6 + Familjen Grotesk 12,0) |
| Requisições na carga           | 6                                                          |
| Quadro de cena (jsdom, CPU 1x) | 2 a 3 ms de JS contra 33 ms de orçamento                   |
| Heap em 30 navegações          | estável (~1,8 MB pós-GC), sem vazamento de listener ou nó  |

### Antes de adicionar algo novo

- **Animação nova:** prefira `transform` e `opacity`, em poucos elementos. Evite `box-shadow`/`text-shadow`/`filter` animados e blur grande. Respeite `prefers-reduced-motion`.
- **Cena nova em terminal:** ela herda o relógio e o dedupe de `montarTela`. Não crie `setInterval` próprio. Se precisar de elemento sobreposto (como as letras em voo da IA), reaproveite os nós em vez de recriar por quadro.
- **Laço de animação:** `requestAnimationFrame` na home; nas páginas, o intervalo da cena. Nada deve rodar a 30 Hz com a janela escondida.
- **Fonte nova:** subset latin, `woff2`, `font-display: swap` e `<link rel="preload">` só das usadas na primeira tela.
- **Leitura de layout no meio de escrita:** agrupe as leituras (como `charWidth` mede a faixa inteira de uma vez).

### Como medir

- Build e preview: `npm run build && npx vite preview`.
- Playwright com o Chromium já instalado (`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`); throttling de CPU 4x e rede 4G via CDP.
- Compare por tempo de CPU do processo (`SystemInfo.getProcessInfo`), intercalando A e B e usando a mediana de 3 rodadas. O fps isolado oscila demais com outra carga na máquina.
- Sem GPU o zoom de 12x fica lento no headless; confirme em máquina real antes de concluir que há regressão.
- `npm run bench` mede o encaixe do layout (`scripts/medir-fit.js`).

### Pendências conhecidas (precisam de decisão visual)

1. **Pulso dos planetas** (`@property --pf-pulse`, `sistema-solar.css`): ~78% da CPU da home. Opções: `steps(12)` (CPU 201% para 75%) ou sombra fixa no máximo com `opacity` animada.
2. **Meteoros por `transform`:** zera o CLS, sem ganho de CPU; pode mudar o antialiasing em menos de 1 px.
3. **Fontes menores:** JetBrains Mono só com `wght` 400 a 700 (40,4 para 30,6 kB) e Familjen Grotesk só com as letras da frase (11,8 para 1,8 kB): −19,8 kB.
4. **Zoom em máquina fraca:** alternativas são congelar um instantâneo da abertura, recortar o escopo ao planeta ou montar a página só depois do `finished`.
5. **Segunda montagem do campo em 4G** (`conferirFontes`): long task de ~280 ms quando as fontes chegam.
6. **Estrelas da abertura** (`.pf-tw`, ~120 spans animados): adiar a animação para depois do primeiro paint rende −190 ms de FCP com CPU 4x.
7. **`prefers-reduced-motion` nas páginas** é lido uma vez; só a abertura reage à mudança em tempo de execução.

## 3. Qualidade (para o refator futuro)

Ordem recomendada pela auditoria de qualidade, ainda não aplicada:

1. **Rede de proteção visual:** exportar a cena de cada página e comparar `sha256(JSON.stringify(cena.quadro()))` em ~12 quadros com uma referência gerada antes do refator. É pré-requisito dos itens abaixo.
2. **ESLint mais estrito:** `eqeqeq` com `smart`, `prefer-const`, `no-var`, `no-shadow`, `no-unused-vars` com `args: all`, `consistent-return`, `no-use-before-define`.
3. **Utilitários compartilhados das cinco páginas** em `src/terminal/`: cabeçalho "voltar", abas, botões, sprites de pixel, solo e ruído. Hoje cada página repete.
4. **Remover `// @ts-nocheck` das páginas** (323 erros do `tsc`: 265 de `noImplicitAny` e 58 reais, resolvidos com poucos padrões de tipo).
5. **Dividir `mount()` de `sistema-solar/index.js`** (686 linhas, 18 variáveis de estado) depois de testar com tamanho simulado.
6. **Cobertura:** instalar `@vitest/coverage-v8` e fixar um piso (hoje ~68% das linhas, 49% dos ramos).

## 4. Checklist de PR

- [ ] `npm run lint`, `npm run typecheck`, `npm test` e `npm run build` passam.
- [ ] Sem `innerHTML` novo, sem estilo inline, sem travessão (U+2014), sem cor hex fora de linhas `--var:`.
- [ ] Todo listener, timer e `ResizeObserver` criado tem o par de remoção no `destroy`.
- [ ] Todo valor vindo de fora (URL, storage, clipboard, dado de config) é validado.
- [ ] Animação nova medida: sem camada por elemento, sem blur grande, com `prefers-reduced-motion`.
- [ ] Bundle de entrada e fontes dentro dos orçamentos acima.
- [ ] Se tocou em CSP, workflow ou dependência: rodou `npm audit` e conferiu `tests/seguranca.test.js`.
