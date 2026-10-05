# painel/

`base.html` é a casca (CSS, cabeçalho, as três abas, o rodapé) e `app.js` é a
lógica. O `3_painel.py` substitui em `app.js` os placeholders `__DATASETS__`,
`__TOTAIS__`, `__MLABEL__` e `__MSHORT__` (montados de `dados/*.json`) e depois
`__APP_JS__` em `base.html`, gerando um HTML único.

Recuperados do `Dashboard_Produtividade_Motoristas.html` de agosto/2026. O
rodapé de `base.html` (fontes e notas por mês) é editado à mão a cada fechamento.
