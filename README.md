# Portfolio

Site pessoal de Eduarda Silva (`thinkmadu`). A página de abertura é um sistema solar de caracteres que também funciona como menu: o sol `(thinkmadu)` leva ao Sobre mim, contatos e áreas giram em órbita, e uma constelação à parte guarda `(ajustes)`, `(português)` e `(english)`. No canto inferior direito fica a frase de assinatura: "Se encontro um problema, desenvolvo a solução. De ponta a ponta, sem deixar nada solto."

Site: https://thinkmadu.github.io/Portfolio/

## Estado

Protótipo da página de abertura. Os links dos planetas ainda apontam para âncoras (`#github`, `#ia` e assim por diante) e as outras páginas não existem.

## Como rodar

Não há build nem dependência. Abra `index.html` no navegador ou sirva a pasta:

```bash
python3 -m http.server 8000
```

## Estrutura

- `index.html`: a página inteira, com CSS e JavaScript embutidos (componente `SistemaSolar` em JavaScript puro, sem biblioteca). Clicar em `(ajustes)` abre o painel de ajustes do fundo.
- `.nojekyll`: o GitHub Pages serve os arquivos como estão, sem processar com Jekyll.

## Publicação

GitHub Pages, a partir da raiz da branch `main`. Cada push na `main` publica de novo.

## Detalhes do desenho

- Só tema escuro. Tipografia em JetBrains Mono, carregada do Google Fonts.
- O componente simula o movimento todo antes de desenhar e garante que nenhum nome, linha de órbita ou a frase de assinatura se sobreponha. Em janela pequena demais, mostra só o sol e deixa a navegação com o menu em texto.
- Com `prefers-reduced-motion`, órbita, brilho e meteoros ficam parados.
