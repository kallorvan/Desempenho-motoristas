# Extração do desempenho dos motoristas — Setembro/2026

> Regras gerais em `docs/procedimento.md`. Aqui só o que é de setembro.

Fonte: `Bonus_Viagens__Premio_Media_09.2026.pdf` (94 págs., 1.556 lançamentos —
1.521 `M:`, 26 `O:`, 9 `E:` —, 92 motoristas). Fechamento de média 02/09–01/10/2026;
fechamento de viagens 01/09–30/09/2026.

Primeiro mês rodado com os scripts (`scripts/1_extrair.py`, `2_planilha.py`,
`3_painel.py`). Teste de regressão: a planilha gerada para julho e agosto a partir
de `dados/` reproduz os totais publicados (R$ 268.181,88 e R$ 260.166,24 em
bonificações; média 2,1141 e 2,1300), e as colunas derivadas batem com as bases
originais em 100% dos campos.

## Totais do mês (92 motoristas)

| Indicador | Set/2026 | Ago/2026 | Var. |
|---|---|---|---|
| Frete cliente | R$ 8.507.997,93 | R$ 7.729.187,77 | +10,1% |
| Bônus operacional | R$ 172.854,35 | R$ 156.703,54 | +10,3% |
| Valor economia | R$ 309.382,78 | R$ 306.025,86 | +1,1% |
| Prêmio por economia | R$ 89.844,28 | R$ 90.103,14 | −0,3% |
| Bônus por média | R$ 17.126,69 | R$ 13.359,56 | +28,2% |
| Total premiação | R$ 106.970,97 | R$ 103.462,70 | +3,4% |
| Total bonificações | R$ 279.825,32 | R$ 260.166,24 | +7,6% |
| % bonificação / frete | 3,29% | 3,37% | −0,08 p.p. |
| Viagens / viagem+vira | 706 / 731 | 656 / 674 | +7,6% / +8,5% |
| KM rodado | 656.081 | 654.202 | +0,3% |
| Média da frota (simples) | 2,1111 km/l | 2,1300 km/l | −0,9% |
| Motoristas premiados | 79 | 79 | = |

Leitura: frete +10,1% com km praticamente igual (+0,3%) — mais frete por km
rodado (R$ 12,97/km contra R$ 11,81). A bonificação cresceu menos que o frete
(+7,6%), e o custo de bonificação por real faturado caiu de 3,37% para 3,29%. O
bônus operacional acompanha as viagens; o bônus por média subiu 28,2%.

## Achados da fonte (não corrigidos — mantido o valor do resumo)

1. **0720 ADILSON DO NASCIMENTO — premiação em branco.** O bloco traz
   `BÔNUS POR MÉDIA: 445,51` (10% de R$ 4.455,14 de economia, 2º do grupo 48),
   mas `PRÊMIO POR ECONOMIA` e `TOTAL PREMIAÇÃO` estão vazios e o `TOTAL` impresso
   é **R$ 2.564,33** — só o bônus operacional. A planilha soma as parcelas
   (K = H+J), então ele aparece com **R$ 445,51** de premiação e **R$ 3.009,84**
   de total. **Confirmar com o RH se o bônus por média é devido**; se não for, o
   total do mês cai R$ 445,51 (R$ 279.379,81).
2. **Frete do resumo maior que a soma das linhas** em 3 motoristas (todas as
   linhas foram lidas — a diferença está na fonte):
   0752 ANANIAS DOS REIS ROSA CANDIDO (+R$ 11.804,52), 0521 FLAVIO CUSTODIO ALVES
   (+R$ 9.121,10) e 0527 ORLEAN FADINI GONÇALVES (+R$ 2.500,00).
   **Não afeta o pagamento:** o bônus de viagem (1,75%–1,85% do frete de cada
   linha) e a quantidade de viagens batem exatamente com as linhas nos três; o
   valor a mais aparece só no `TOTAL DE FRETE CLIENTE`. Afeta a coluna E da
   planilha e o que deriva dela (% bonificação/frete, frete por viagem e por km,
   participação, ranking de frete) e soma R$ 23.425,62 no frete da frota (pelas
   linhas, seria R$ 8.484.572,31).
   Confirmadas no export xlsx (ver abaixo): a diferença está no próprio relatório
   do Rodopar, não é efeito do PDF. Pista para 0752: a diferença é exatamente o
   valor do documento `M: 1-001-077350` de 0765 ADILSON PEREIRA ASSIS (6.015,71 +
   5.788,81, MACHADO x SANTOS, 13/09), que já está nas linhas e no resumo do 0765 —
   possível frete contado também no resumo do 0752. A de 0521 (2 × R$ 4.560,55)
   bate com cinco pares EXPOCACER diferentes de 15–16/09 (inclusive um do próprio
   0521), então não dá para atribuir. A de 0527 (R$ 2.500,00) não corresponde a
   nenhum lançamento do mês.
3. ~~Vira de 0763~~ — **explicado, não é divergência.** 0763 ALEXSANDRO DONIZETE
   PEREIRA tem R$ 155,00 de vira nas linhas e R$ 100,00 no resumo. Regra informada
   pelo usuário: vira lançada junto com pagamento de viagem não é computada. A vira
   de R$ 55,00 do doc. `M: 3-001-021679` (26/09, GUARUJA x MACHADO) está na mesma
   linha de uma viagem de R$ 25,85. Aplicada a regra, a vira fecha nos 92
   motoristas, e essa é a única linha do mês com vira e viagem juntas.
4. **KM RODADO = 1** com frete faturado: 0923 FERNANDO DOS SANTOS MARQUES
   (R$ 4.520,79), 0606 MARCELO APARECIDO DE SOUZA (R$ 9.922,38) e 0922 RAFAEL DA
   SILVA GONCALVES (R$ 9.690,15), todos com média 0,0000. O km 1 vem do PDF; as
   razões por km desses três (frete/km, bonif./km) ficam distorcidas na planilha e
   no ranking do painel.
5. **Eventos (`E:`) na rubrica de carregamento**: R$ 813,49 "AJUDA COM OS
   MANOBRAS" para 0501 GABRIEL e 0659 GLEYSON; R$ 55,89 de INCENTIVO para 0493,
   0573, 0686, 0258 e 0728; R$ 125,00 para 0648 JOSE APRIGIO.
6. **Arredondamento de R$ 0,01**: 19 motoristas com `TOTAL` impresso diferente da
   soma das parcelas, 2 deles também no `TOTAL PREMIAÇÃO` (0763 e 0019). Planilha
   e painel usam a soma. O xlsx não explica esses casos (o bônus sem arredondamento
   + premiação dá o mesmo valor da planilha); a diferença está no cálculo do prêmio,
   que o xlsx não traz. Nas rubricas de viagem, 64 motoristas têm diferença de até
   R$ 0,04 entre o resumo e a soma das linhas do PDF — **resolvido pelo xlsx**: com
   os valores sem arredondamento, as linhas somam exatamente o resumo.
7. Nenhum bloco de prêmio duplicado neste mês; as três identidades fecham em 100%
   dos motoristas.

## Confronto com o export xlsx do Rodopar

Arquivo: `comissao_toliman_setembro_2026.xlsx` (relatório `Comissão Toliman.rpt`),
conferido com `scripts/conferir_xlsx.py`. Traz os mesmos lançamentos e o
`RESUMO DO BÔNUS`, com valores sem arredondamento, mas **não traz o
`RESUMO PRÊMIO POR MÉDIA`** (média, km, economia, prêmio, bônus por média).

- Universo idêntico: 92 motoristas, 1.556 lançamentos.
- Resumos do bônus idênticos ao PDF nos 92 (frete, viagens, viras, carregamento,
  lonas, quantidades, subtotal) e linhas idênticas uma a uma.
- Com os valores sem arredondamento, as linhas somam exatamente o resumo em todos
  os motoristas, **exceto** o frete de 0752, 0521 e 0527 — que, portanto, vem do
  sistema, não do PDF. (A vira de 0763 é explicada pela regra da vira com viagem.)
- Não se aplica aos achados de premiação: 0720 (premiação em branco), KM = 1 e o
  arredondamento do `TOTAL` dependem do bloco de prêmio, que só existe no PDF.
- Nenhum número da planilha ou do painel mudou com o confronto.

## Movimentação do quadro

- Entraram (5): 0932 ESTEVAO DA SILVA MOTA, 0923 FERNANDO DOS SANTOS MARQUES,
  0924 JEDER GABRIEL DA SILVEIRA, 0941 JOAO PAULO D ANDREA DOMINGUES,
  0940 WALMIR RIZZO DE PAULA.
- Não consta em setembro (1): 0864 ALAN ANDRADE JUSTINO (manobrista em agosto).
- Sem frete faturado (manobristas): 0863 BRUNO EMMANUEL MORAIS SANTOS, 0932, 0941
  e 0940.
- **Sem grupo**: 0606 e 0940 vêm com `GRUPO DE MAIOR KM: 0` e nome em branco. A
  aba de classificação ganhou a linha `0 → SEM GRUPO` (VLOOKUP `$A$1:$B$8`) para
  não sobrar `#N/A`.
- `GRUPO VOLVO BI TRUCK` (18) e `GRUPO METEOR VW` (49) ficaram sem motoristas no
  mês; seguem na tabela.
