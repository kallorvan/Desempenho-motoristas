# dados/

Uma base por mês, `AAAA-MM.json`: uma lista de objetos, um por motorista, com as
chaves `cod nome grupo frete bonusOp econ premio pctMedia bMedia premTot bonif
viag vira km media pos pctBF fpv bpv fkm bkm part rF rB`.

Esta pasta é a fonte do painel. Commite todo mês.

**Julho e agosto de 2026 já estão aqui**, extraídos da `const DATASETS` do painel
publicado (artefato citado em `docs/procedimento.md`). Conferido: julho tem 86
motoristas e R$ 7.465.076,54 de frete; agosto tem 88 e R$ 7.729.187,77. As
identidades `premTot = premio + bMedia` e `bonif = bonusOp + premTot` fecham em
todos os registros dos dois meses.
