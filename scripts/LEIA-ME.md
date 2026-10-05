# scripts/

- `1_extrair.py <pdf> <AAAA-MM>` — lê o PDF, confere lançamentos × resumos, grava
  `dados/AAAA-MM.json` e imprime o relatório de conferência.
- `2_planilha.py <AAAA-MM>` — gera o xlsx no modelo, recalcula no LibreOffice e
  falha se sobrar célula com erro.
- `3_painel.py` — junta `painel/base.html` + `painel/app.js` com todo `dados/*.json`.
- `comum.py` — tabela de grupos e as contas das colunas derivadas (R–Y) e da linha
  de total, compartilhadas pelos três.

Teste de regressão: `2_planilha.py 2026-07` e `2026-08` têm que dar R$ 268.181,88 e
R$ 260.166,24 de bonificações, e `comum.derivar` tem que reproduzir as colunas
derivadas de `dados/2026-07.json` e `2026-08.json` sem diferença.
