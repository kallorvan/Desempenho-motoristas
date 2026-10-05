# Fechamento de produtividade dos motoristas — Tóliman

Pipeline do fechamento mensal de bonificação, a partir do PDF "Planilha de
comissão" do Rodopar.

## Primeira vez

1. Instale o Claude Code (ver abaixo) e as dependências listadas no `CLAUDE.md`.
2. `git init && git add -A && git commit -m "estado inicial"` — ter histórico
   importa, porque os números mudam e você vai querer comparar versões.
3. Abra a pasta: `cd fechamento-motoristas && claude`

## Todo mês

1. Coloque o PDF do mês em `entrada/`.
2. No Claude Code: *"faça o fechamento de setembro, o PDF está em entrada/"*.
3. Confira o relatório de conferência antes de aceitar a planilha.
4. Commite `dados/AAAA-MM.json` e o doc novo em `docs/historico/`.

## Estado atual

Os scripts em `scripts/` ainda **não existem** — precisam ser escritos na primeira
sessão, seguindo `docs/procedimento.md`, que descreve o formato do PDF, as regras
de validação e o layout exato da planilha.

As bases de julho e agosto de 2026 também precisam ser recuperadas: elas estão
embutidas no `Dashboard_Produtividade_Motoristas.html` que você já baixou, dentro
da variável `const DATASETS`. Coloque esse HTML na raiz da pasta e peça ao Claude
Code para extrair os dois meses para `dados/2026-07.json` e `dados/2026-08.json`.
