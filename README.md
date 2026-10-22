# Portfolio

Site pessoal de Eduarda Silva (`thinkmadu`), com uma abertura em que o símbolo também é o menu.

A página de abertura é um sistema solar de caracteres: o sol `(thinkmadu)` leva ao Sobre mim, contatos e áreas giram em duas órbitas ovais, e uma constelação no alto à direita guarda `(ajustes)`, `(português)` e `(english)`. No canto inferior direito fica a frase de assinatura em tamanhos mistos: "problema," e "solução." em letra grande (Familjen Grotesk), o resto em letra pequena, até ler "Se encontro um problema, desenvolvo a solução. De ponta a ponta, sem deixar nada solto."

Site: https://thinkmadu.github.io/Portfolio/

## Situação

A abertura e cinco páginas em terminal estão no ar: sobre mim, IA, ferramentas, testes e e-mail, mais a transição entre elas. Os links dos planetas `(github)`, `(linkedin)`, `(dados)` e `(full-stack)` ainda apontam para âncoras, e a página de dados ainda não foi portada. As páginas em terminal estão só em português, e parte do conteúdo é provisório: as abas de sobre mim e de IA e os nomes das ferramentas e técnicas de testes ainda são marcadores entre colchetes. `CartaoProjeto` e `BlocoFechado` seguem prontos para as páginas de projeto, sem uso.

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
src/i18n/
  pt.js, en.js             dicionários (mesmas chaves; o pt.js define o tipo)
  idioma.js                escolha do idioma, localStorage e ?lang= na URL
  index.js                 t(), textos do documento e rótulos do SistemaSolar por idioma
src/sistema-solar/
  geometria.js             elipses inclinadas, caixas, teste de sobreposição
  layout.js                layout, staticConflict, pairConflict, pickPhases, fit e a
                           escolha do tamanho da frase de assinatura
  config.js                opções, padrões e montagem da configuração
  fundo.js                 campo de caracteres com semente
  index.js                 componente SistemaSolar (DOM, animação, destroy)
src/terminal/
  grade.js                 grade de 92 colunas em camadas: put, box, split, pintar, legenda
  tela.js                  Cena e montarTela: camadas, zonas clicáveis, teclado, escala
src/paginas/               índice por hash (#ferramentas) e uma cena por página em terminal
  sobre.js, ia.js, ferramentas.js, testes.js, email.js
src/transicao/index.js     campo de caracteres em onda entre uma página e outra
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

## Páginas em terminal

Cada página é uma cena sobre a grade de caracteres de `src/terminal`: 92 colunas de 7,8px por linhas de 16px, em camadas de cor. Letras saem como texto e caixas, blocos e setas saem como formas SVG, para a fonte não mudar o desenho. `montarTela` desenha a cena a 30 quadros por segundo (um quadro só com `prefers-reduced-motion`), cria uma zona clicável por botão ou link e encolhe a tela para caber na janela.

As páginas abrem pelo hash da URL: `#sobre` (o sol), `#ia`, `#ferramentas`, `#testes` e `#email`, os mesmos destinos dos planetas. `v` ou `‹ voltar` leva à abertura (`#inicio`). Entre duas páginas, a transição roda antes; clique ou tecla pulam. Cada módulo de página carrega sob demanda.

A página de IA (`src/paginas/ia.js`) é um fluxo de três telas numa só cena: a principal, com o robô-pato e os quatro projetos do GitHub (clique, foco ou teclas 1 a 4); a transição, em que o texto do projeto vira os nós de uma rede neural (qualquer tecla ou clique pula); e o detalhe, com a rede em quatro colunas (linguagem, ferramentas, conceitos, resultados) em que o ponteiro ou o foco num nó acende o caminho. `v` ou `Esc` volta uma tela, e na principal leva ao `#inicio`. Os nomes dos projetos e a rede do detalhe são placeholders no topo do arquivo (`PROJETOS`, `COLS3`); `repo` e `demo` de cada projeto viram links quando preenchidos. As letras em voo da transição andam em pixels, fora da grade, em elementos reaproveitados por cima da imagem.

Para criar uma página: uma classe que estende `Cena` (`tick`, `teclar`, `quadro`) em `src/paginas/`, a paleta das camadas numa classe `pf-tema-*` em `src/estilos/terminal.css`, e uma linha em `src/paginas/index.js` e em `INFO` (`src/transicao/index.js`). As cenas foram portadas do quadro de design sem tipos (`// @ts-nocheck`); a tipagem fica para uma passada própria.

## Idiomas

A página existe em português e em inglês, no mesmo endereço: `?lang=pt` ou `?lang=en`. O idioma é decidido antes de qualquer desenho, nesta ordem:

1. `?lang=` na URL (link compartilhado, resultado de busca, menu em texto);
2. a escolha salva (`localStorage`, chave `pf-lang`), gravada só quando alguém clica em `(português)` ou `(english)`;
3. o primeiro idioma suportado em `navigator.languages` (`pt*` vira português, `en*` vira inglês);
4. português.

Trocar pela constelação ou pelo menu em texto grava a escolha, reescreve a URL com `history.replaceState` (sem recarregar), traduz `<html lang>`, título, description, canonical, `<h1>`, menu, rótulos e painel de ajustes, e remonta o sistema. Os nós `(português)` e `(english)` ficam iguais nas duas versões (cada língua pelo próprio nome), com `lang="pt"` ou `lang="en"` e `aria-current` no idioma ativo. O `index.html` fixo é a versão em português e traz `hreflang` para as duas; o canonical entra pelo JS, um por idioma.

O componente recebe todo texto por opção (`contatos`, `areas`, `secundario`, `textos`, `assinatura`); cada item tem um `id` estável, que é o que `aoEscolher` recebe, para o rótulo poder mudar de língua.

Para adicionar uma língua:

1. Copie `src/i18n/en.js` para `src/i18n/<código>.js` e traduza os valores, mantendo as chaves. A anotação `@type` do arquivo faz `npm run typecheck` acusar chave faltando ou sobrando.
2. Registre o código em `SUPORTADOS` (`src/i18n/idioma.js`), o dicionário em `DICIONARIOS` e o nome da língua nela mesma em `ENDONIMOS` (`src/i18n/index.js`). A constelação comporta até quatro nós.
3. Acrescente a linha `hreflang` no `index.html`.
4. Meça as palavras grandes da assinatura no navegador (largura a 100px, como em `tests/assinatura.test.js`) e acrescente a coluna do idioma em `tests/idiomas-layout.test.js`; `npm run bench` mostra fonte e tempo por tamanho.
5. `npm test` confere chaves iguais, nenhuma string vazia e nenhum travessão.

Em inglês, os 13 tamanhos de referência encaixam como em português. A única fonte de nome que muda é a de 1536x864 (20 contra 19), porque o rótulo mais largo da órbita de fora passa de `(ferramentas)` a `(full-stack)`. A fonte grande da frase fica cerca de 0,6% menor, porque `solution.` é mais larga que `solução.`.

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

Não coleta dados nem usa analytics. A escolha de idioma (chave `pf-lang`) e os ajustes do fundo (chave `sol-v5`) ficam no `localStorage` do navegador.

## Licença

Ainda sem licença definida. As fontes JetBrains Mono e Familjen Grotesk seguem a SIL Open Font License 1.1 (`src/fonts/OFL-jetbrains-mono.txt` e `src/fonts/OFL-familjen-grotesk.txt`).
