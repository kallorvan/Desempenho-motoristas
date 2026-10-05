# scripts/

Vazio de propósito. Os três scripts do pipeline precisam ser escritos na primeira
sessão do Claude Code, a partir de `docs/procedimento.md`:

- `1_extrair.py <pdf> <AAAA-MM>` — `pdftotext -layout`, quebra em blocos por
  `^ MOTORISTA: <nome> - COD.: <cod>`, lê os dois resumos, confere as linhas de
  lançamento contra eles e grava `dados/AAAA-MM.json`. Imprime o relatório de
  conferência: toda identidade que não fechar e todo frete que divergir.
- `2_planilha.py <AAAA-MM>` — monta o xlsx replicando o layout descrito em
  "Modelo da planilha" (25 colunas, duas abas, as cores e as fórmulas exatas).
- `3_painel.py` — lê todo `dados/*.json`, calcula os totais e as colunas derivadas,
  e injeta em `painel/app.js` + `painel/base.html`.

Escreva um de cada vez e confira o resultado contra `docs/historico/` antes de
seguir: julho e agosto de 2026 já têm os totais publicados ali, então servem de
teste de regressão. Se `1_extrair.py` rodar sobre o PDF de agosto e não reproduzir
R$ 7.729.187,77 de frete e 88 motoristas, tem algo errado no parser.
