# Conferência das três fontes — Julho/2026

> Regras gerais em `docs/procedimento.md`. Aqui só o que é de julho.

Arquivos confrontados: `Planilha_Produtividade_Motoristas_07_2026.pdf` (89 págs.),
`Indicadores_Produtividade_Motoristas_07_2026.xlsx` (aba "Base Motorista", OOXML *strict*)
e `Dashboard_Produtividade_Motoristas_07_2026.html` (base `const DATA` embutida).
Esse xlsx é o **modelo** que os meses seguintes replicam.

## Resultado

- **Universo idêntico**: 86 registros nos três (85 motoristas nomeados + 1 sem identificação). O Excel tem ainda a linha "TOTAL / MEDIA", corretamente fora da base do dashboard.
- **PDF × Excel**: 85 motoristas × 12 campos = 1.020 comparações. Única exceção: 4 diferenças de R$ 0,01 em "Total Premiação" (cód. 0208, 0223, 0304, 0752) — o PDF arredonda acima da soma das próprias parcelas; Excel e dashboard usam a soma.
- **Excel × Dashboard**: valores idênticos; as 9 colunas derivadas (part. %, rankings, frete/viagem, frete/km, bonif./km) foram recalculadas e conferem. Única diferença textual: motorista 0016 aparece como "(Desligado)" só no HTML.

## Totais (86 registros)

| Indicador | Valor |
|---|---|
| Frete cliente | R$ 7.465.076,54 |
| Bônus operacional | R$ 157.238,23 |
| Total premiação | R$ 110.943,65 |
| Total bonificações | R$ 268.181,88 (3,59% do frete) |
| Viagens / viagem+vira | 640 / 684 |
| KM rodado | 652.820 |
| Média (simples) | 2,1141 km/l — ponderada por km: 2,1027 |

## Achados na fonte (chegam iguais aos três arquivos)

1. **Carregamento +R$ 2.834,21** acima da soma dos lançamentos (resumos R$ 7.409,21 × linhas R$ 4.575,00), concentrado em 0501 Gabriel (1.138,49 × 325,00), 0797 Robison (1.970,72 × 50,00) e 0357 Thiago de Jesus (100,00 com quantidade 0).
2. **Vira de R$ 55,00 lançada e não paga** — 0727 Valdir, doc. 3-001-019590 de 03/07.
   *(Nota de set/2026: provavelmente a regra do Rodopar de que vira na mesma linha
   de um pagamento de viagem não é computada — ver `docs/procedimento.md`. Não
   reconferido: o PDF de julho não está no repositório.)*
3. **Prêmio de R$ 133,75 sem motorista identificado** (código `#VALUE!` no Excel; 780 km, média 2,1584).
4. **% do prêmio por economia varia dentro do mesmo grupo**: 30% (47), 25% (17), 20% (5), 45% (4), 50% (3). Critério não documentado nos arquivos.
5. **Contagem de viagens**: coluna VG soma 637 × 640 informados — mesmos três motoristas do item 1.
6. **Três manobristas** (0864, 0863, 0606) com bonificação e sem frete/km.
