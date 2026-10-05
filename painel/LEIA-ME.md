# painel/

`base.html` é a casca (CSS, cabeçalho, as três abas, o rodapé) e `app.js` é a
lógica. O `3_painel.py` junta os dois substituindo `__DATASETS__` e `__TOTAIS__`
em `app.js` pelos dados reais e concatenando tudo num HTML único.

Estes dois arquivos **não vieram** nesta pasta — o ambiente da nuvem onde foram
escritos é efêmero e foi reciclado. Para recuperá-los, abra o
`Dashboard_Produtividade_Motoristas.html` que você já baixou: ele é exatamente a
junção dos dois, e dá para separá-lo de volta (o `<script>` final é o `app.js`,
com `const DATASETS = {...}` e `const TOTAIS = {...}` no topo; todo o resto é a
`base.html`).
