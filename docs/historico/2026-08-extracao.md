# Extração do desempenho dos motoristas — Agosto/2026

> Regras gerais em `docs/procedimento.md`. Aqui só o que é de agosto.

Fonte: `Planilha de comissão 08 2026.pdf` (90 págs., 1.317 lançamentos, 88 motoristas).

Entregáveis: `Indicadores_Produtividade_Motoristas_08_2026.xlsx` (no modelo de
julho, mais uma aba `Conferência`) e o `Dashboard_Produtividade_Motoristas.html`,
que passou a ser multimês nesta rodada.

## Ajustes solicitados pelo usuário (blocos de prêmio duplicados)

Os únicos dois motoristas com dois blocos "RESUMO PRÊMIO POR MÉDIA" no PDF:

| Motorista | Bloco considerado | Bloco desconsiderado |
|---|---|---|
| 0501 GABRIEL DA SILVA GONCALVES | total **R$ 1.882,90** (média 1,9998 · 1.730 km · prêmio 90,49) | R$ 1.792,40 (média 0,0000) |
| 0865 KAUAN FELIPE PEREIRA | total **R$ 2.074,02** (média 2,8739 · 2.935 km · prêmio 838,24) | R$ 1.313,48 (média 2,2466 · 419 km) |

A regra do parser (maior `TOTAL PREMIAÇÃO`) selecionou exatamente esses dois blocos.

**Atenção ao citar esses números:** a coluna L é fórmula (`=F+K`), então Gabriel
aparece na planilha como **R$ 1.882,89** — a soma das parcelas (1.792,40 + 90,49).
O PDF imprime 1.882,90 porque arredonda. Aconteceu em 23 dos 88 motoristas neste
mês; no agregado dá R$ 0,01 em Total Bonificações e R$ 0,03 em Total Premiação.

## Totais do mês (88 motoristas)

| Indicador | Ago/2026 | Jul/2026 | Var. |
|---|---|---|---|
| Frete cliente | R$ 7.729.187,77 | R$ 7.465.076,54 | +3,5% |
| Bônus operacional | R$ 156.703,54 | R$ 157.238,23 | −0,3% |
| Prêmio por economia | R$ 90.103,14 | R$ 94.722,18 | −4,9% |
| Bônus por média | R$ 13.359,56 | R$ 16.221,47 | −17,6% |
| Total premiação | R$ 103.462,70 | R$ 110.943,65 | −6,7% |
| Total bonificações | R$ 260.166,24 | R$ 268.181,88 | −3,0% |
| % bonificação / frete | 3,37% | 3,59% | −0,22 p.p. |
| Viagens / viagem+vira | 656 / 674 | 640 / 684 | +2,5% / −1,5% |
| KM rodado | 654.202 | 652.820 | +0,2% |
| Média da frota (simples) | 2,1300 km/l | 2,1141 km/l | +0,8% |
| Motoristas premiados | 79 | 76 | +3 |

Leitura: frete subiu 3,5% e a bonificação caiu 3,0% — o custo de bonificação por
real faturado recuou de 3,59% para 3,37%. A queda vem toda da premiação por
economia (bônus por média −17,6%), não do bônus operacional.

## Achados da fonte (não corrigidos — mantido o valor do resumo)

1. **Frete do resumo maior que a soma das linhas** em 3 motoristas:
   0686 FABIO FERNANDES NOGUEIRA (+R$ 12.913,86), 0494 MAURICIO DE OLIVEIRA
   (+R$ 10.291,44), 0606 MARCELO APARECIDO DE SOUZA (+R$ 3.995,00).
   Nenhuma linha de lançamento ficou fora da leitura — a diferença está na fonte.
2. **Arredondamento de R$ 0,03/0,04** no total de viagens de 0028 LUIZ ADALTON DA
   SILVA e 0304 CARLOS ALBERTO DOS SANTOS.
3. **Incentivo de R$ 813,49** (doc. `E: 1-EVE-…`) na rubrica de carregamento.
4. **Dois manobristas**: ALAN ANDRADE JUSTINO e RAFAEL DA SILVA GONCALVES.

## Movimentação do quadro

- Entraram (6): FABIO AUGUSTO FERREIRA, JEFFERSON JUSTIMIANO, JONATHAS BERNARDES DE
  AGUIAR, JOSE ROBERTO DE SOUZA, RAFAEL DA SILVA GONCALVES, REGINALDO SILVA CARVALHO.
- Não constam em agosto (4): CARLOS EDUARDO DA ROCHA (desligado), LEONARDO PEREIRA
  DA SILVA, VALDIR DA SILVA PEREIRA e a linha "MOTORISTA NAO IDENTIFICADO" de julho.
- Grupo novo: **GRUPO VOLVO BI TRUCK** (cód. 18) — o VLOOKUP passou a `$A$1:$B$7`.
  `GRUPO METEOR VW` (49) ficou sem motoristas no mês, mas seguiu na tabela.
