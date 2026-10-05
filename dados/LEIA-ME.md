# dados/

Uma base por mês, `AAAA-MM.json`: uma lista de objetos, um por motorista, com as
chaves `cod nome grupo frete bonusOp econ premio pctMedia bMedia premTot bonif
viag vira km media pos pctBF fpv bpv fkm bkm part rF rB`.

Esta pasta é a fonte do painel. Commite todo mês.

**Julho e agosto de 2026 precisam ser recuperados.** Estão embutidos no
`Dashboard_Produtividade_Motoristas.html` que você baixou, na variável
`const DATASETS = {"2026-07": [...], "2026-08": [...]}`. Coloque o HTML na raiz
e peça ao Claude Code para extrair os dois para cá.

Confira depois: julho tem 86 motoristas e R$ 7.465.076,54 de frete; agosto tem 88
e R$ 7.729.187,77.
