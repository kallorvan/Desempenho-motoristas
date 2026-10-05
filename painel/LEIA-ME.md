# painel/

`base.html` é a casca (CSS, cabeçalho, as três abas, o rodapé) e `app.js` é a
lógica. O `3_painel.py` junta os dois: substitui `__DATASETS__` e `__TOTAIS__` em
`app.js` pelos dados reais (JSON) e depois `__APP_JS__` em `base.html` pelo
`app.js` resultante, gerando um HTML único.

Os dois arquivos foram recuperados do painel publicado (versão com julho e agosto
de 2026). A recomposição com os dados de `dados/` reproduz o script original
byte a byte, exceto o comentário do topo do `app.js`: no original ele tinha os
dados injetados por engano (o placeholder aparecia também no comentário). Agora o
comentário não contém os placeholders — use substituição simples sem medo.

Ao acrescentar um mês, além dos dados, atualizar `MLABEL`/`MSHORT` no `app.js`.
O `<title>` e o rodapé em `base.html` ainda citam julho/2026 como fonte — revisar
quando o `3_painel.py` for escrito.
