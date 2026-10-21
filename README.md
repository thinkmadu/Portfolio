# Portfolio

Site pessoal de Eduarda Silva (`thinkmadu`), com uma abertura em que o símbolo também é o menu.

A página de abertura é um sistema solar de caracteres: o sol `(thinkmadu)` leva ao Sobre mim, contatos e áreas giram em duas órbitas ovais, e uma constelação no alto à direita guarda `(ajustes)`, `(português)` e `(english)`. No canto inferior direito fica a frase de assinatura em tamanhos mistos: "problema," e "solução." em letra grande (Familjen Grotesk), o resto em letra pequena, até ler "Se encontro um problema, desenvolvo a solução. De ponta a ponta, sem deixar nada solto."

Site: https://thinkmadu.github.io/Portfolio/

## Situação

Protótipo da página de abertura. Os links dos planetas ainda apontam para âncoras (`#github`, `#ia` e assim por diante) e as outras páginas não existem. `CartaoProjeto` e `BlocoFechado` estão prontos para as páginas de projeto, ainda sem uso.

## Início rápido

Pré-requisitos: Node 22.13 ou mais novo (o `.nvmrc` pede o 24) e npm.

```bash
npm ci          # instala só ferramentas de desenvolvimento
npm run dev     # servidor local em http://localhost:5173/Portfolio/
```

Para conferir o que vai ao ar:

```bash
npm test        # testes do layout, do fundo, dos componentes e das regras da casa
npm run build   # gera dist/ com base /Portfolio/
npm run preview # serve dist/ em http://localhost:4173/Portfolio/
```

Saída do build nesta versão:

```text
dist/assets/favicon-In2PVXao.svg                               0.55 kB │ gzip: 0.32 kB
dist/index.html                                                2.12 kB │ gzip: 0.86 kB
dist/assets/familjen-grotesk-latin-700-normal-DP3KK2u2.woff2  11.82 kB
dist/assets/jetbrains-mono-latin-wght-normal-B9CIFXIH.woff2   40.40 kB
dist/assets/index-Cs2pDWTe.css                                 9.07 kB │ gzip: 2.56 kB
dist/assets/painel-BooK3g0T.js                                 1.32 kB │ gzip: 0.72 kB
dist/assets/index-BvkczjGN.js                                 22.09 kB │ gzip: 9.44 kB
```

> [!NOTE]
> O código-fonte também roda sem build: `index.html` usa caminhos relativos e módulos nativos, sem import de pacote. Servir a pasta (`python3 -m http.server`) funciona, só sem minificação.

## Scripts

| Script              | O que faz                                           |
| ------------------- | --------------------------------------------------- |
| `npm run dev`       | servidor do Vite com recarga                        |
| `npm run build`     | build de produção em `dist/`                        |
| `npm run preview`   | serve o `dist/`                                     |
| `npm run lint`      | ESLint e checagem do Prettier                       |
| `npm run format`    | formata tudo com o Prettier                         |
| `npm run typecheck` | confere os tipos escritos em JSDoc com o TypeScript |
| `npm test`          | Vitest                                              |
| `npm run bench`     | mede o tempo do `fit` nos 13 tamanhos de referência |

## Estrutura

```text
index.html                 estrutura e metadados, sem CSS nem JS embutidos
src/main.js                página de abertura: idioma, ajustes salvos, painel sob demanda
src/sistema-solar/
  geometria.js             elipses inclinadas, caixas, teste de sobreposição
  layout.js                layout, staticConflict, pairConflict, pickPhases, fit e a
                           escolha do tamanho da frase de assinatura
  config.js                opções, padrões e montagem da configuração
  fundo.js                 campo de caracteres com semente
  index.js                 componente SistemaSolar (DOM, animação, destroy)
src/ajustes/painel.js      painel de ajustes, carregado só ao clicar em (ajustes)
src/componentes/           CartaoProjeto e BlocoFechado
src/estilos/               tokens, fonte, base, componentes e painel
src/fonts/                 JetBrains Mono variável e Familjen Grotesk 700 (latim), com as licenças OFL
tests/                     Vitest; tests/fixtures guarda a referência do layout
scripts/medir-fit.js       medição de tempo do fit
```

## Como funciona

O componente simula o movimento todo antes de desenhar. Para cada fonte e escala, `layout` posiciona sol, órbitas, constelação e frase; `staticConflict` confere cada planeta em todas as voltas contra borda, corpos fixos, vizinhos e frase, e as linhas de órbita contra a frase e a constelação; `pickPhases` escolhe a fase das órbitas para que nenhum par se cruze no período comum. `fit` desce a fonte e a escala até achar um arranjo. Sem arranjo com a constelação, tenta sem ela; sem nenhum, entra no modo compacto (`pf-compacto`): só o sol, o menu em texto e a frase em texto.

A frase de assinatura entra por último. Com o sistema já encaixado, `comAssinaturaGrande` tenta a composição em tamanhos mistos no canto inferior direito (margem de 12px à direita e 10px embaixo): a caixa começa com 27% da largura do céu (fonte grande entre 40 e 104px) e a fonte grande desce 10% por tentativa até que `staticConflict` aprove, com a caixa no lugar da frase pequena, e nenhuma linha da constelação a toque. Sem tamanho que caiba a partir de 40px, a frase volta para as quatro linhas pequenas; no modo compacto, vira um parágrafo. As larguras das palavras grandes são medidas no navegador, a 100px, e medidas de novo quando a fonte carrega.

| Tamanho do céu | Fonte dos nomes | Fonte grande da frase |
| -------------- | --------------- | --------------------- |
| 1920x1080      | 22              | 95                    |
| 1340x690       | 17              | 66,3                  |
| 1024x768       | 13              | 50,6                  |
| 766x878        | 14              | 40                    |
| 600x480        | compacto        | parágrafo             |

Valores de `npm run bench`, com a largura do caractere estimada em 0,6 da fonte e as larguras das palavras grandes medidas no Chrome; no navegador, 1340x690 deu 66,27px e 768x1024 deu 40px.

O teste `tests/layout.test.js` compara o resultado com uma referência gerada pelo código anterior à refatoração (commit `273064e`): treze tamanhos de tela e cinco configurações, pelo SHA-256 do layout inteiro.

## Acessibilidade

- Menu em texto sempre no DOM: lido por leitor de tela, alcançável por teclado (aparece ao receber foco) e visível no modo compacto, com alvos de 44px.
- Passar o mouse ou focar um planeta pausa o sistema todo.
- Com `prefers-reduced-motion`, órbita, brilho, piscada e meteoros param.
- A frase em tamanhos mistos fica num único parágrafo, com cada trecho na ordem de leitura; o leitor de tela lê a frase inteira.

## Publicação

O workflow `.github/workflows/pages.yml` roda lint, tipos, testes e build em todo push e PR, e publica `dist/` no GitHub Pages a partir da `main`. Ele exige, em Settings > Pages, a origem "GitHub Actions".

## Decisões

- **Sem dependência em tempo de execução.** O site é JavaScript puro; Vite, ESLint, Prettier, Vitest, jsdom e TypeScript são só de desenvolvimento.
- **Vite para o build** porque junta CSS e JS num arquivo cada, minifica, põe hash nos nomes e separa o painel de ajustes num pedaço carregado sob demanda.
- **Tipos em JSDoc, não TypeScript.** O código continua rodando direto no navegador; `npm run typecheck` confere os tipos.
- **Fontes no repositório**, não no Google Fonts: nenhuma requisição a terceiros, JetBrains Mono variável (40 kB) e Familjen Grotesk 700 (12 kB), as duas com preload e `font-display: swap`.
- **CSP por `<meta>`** com tudo em `'self'`: nada de script ou estilo embutido. Estilo dinâmico entra por CSSOM.
- **Cor só por token** (`src/estilos/tokens.css`). A única cor literal fora dele é o `theme-color` do `index.html`, que o navegador lê antes do CSS.

## O que não faz

Não coleta dados nem usa analytics. Idioma e ajustes ficam no `localStorage` do navegador (chave `sol-v5`). O idioma `english` troca só a frase de assinatura por enquanto.

## Licença

Ainda sem licença definida. As fontes JetBrains Mono e Familjen Grotesk seguem a SIL Open Font License 1.1 (`src/fonts/OFL-jetbrains-mono.txt` e `src/fonts/OFL-familjen-grotesk.txt`).
