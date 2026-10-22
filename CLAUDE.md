# Instruções para o repositório

- Português do Brasil, sem travessão (U+2014), sem emoji.
- Antes de qualquer mudança em segurança, CSP, animação ou carregamento, leia `docs/seguranca-e-desempenho.md`: as regras fixas, os orçamentos e as pendências estão lá.
- Verificações obrigatórias: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`.
- Sem estilo inline, sem `innerHTML` novo, sem cor hex fora de linhas `--var:` em CSS (há testes).
- Só se publica a partir da `main`.
