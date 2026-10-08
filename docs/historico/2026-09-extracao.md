# Extração do desempenho dos motoristas — Setembro/2026

> Regras gerais em `docs/procedimento.md`. Aqui só o que é de setembro.

Fonte: `Bonus_Viagens__Premio_Media_09.2026.pdf` (94 págs., 1.556 lançamentos —
1.521 `M:`, 26 `O:`, 9 `E:` —, 92 motoristas). Fechamento de média 02/09–01/10/2026;
fechamento de viagens 01/09–30/09/2026. **Versão corrigida do PDF** (reemitida
no Rodopar para o 0720); a única diferença para a primeira versão é o bloco de
prêmio do 0720.

Primeiro mês rodado com os scripts (`scripts/1_extrair.py`, `2_planilha.py`,
`3_painel.py`). Teste de regressão: a planilha gerada para julho e agosto a partir
de `dados/` reproduz os totais publicados (R$ 268.181,88 e R$ 260.166,24 em
bonificações; média 2,1141 e 2,1300), e as colunas derivadas batem com as bases
originais em 100% dos campos.

## Totais do mês (92 motoristas)

| Indicador | Set/2026 | Ago/2026 | Var. |
|---|---|---|---|
| Frete cliente¹ | R$ 8.496.376,83 | R$ 7.729.187,77 | +9,9% |
| Bônus operacional | R$ 172.854,35 | R$ 156.703,54 | +10,3% |
| Valor economia | R$ 309.382,78 | R$ 306.025,86 | +1,1% |
| Prêmio por economia | R$ 92.071,85 | R$ 90.103,14 | +2,2% |
| Bônus por média | R$ 17.126,69 | R$ 13.359,56 | +28,2% |
| Total premiação | R$ 109.198,54 | R$ 103.462,70 | +5,5% |
| Total bonificações | R$ 282.052,89 | R$ 260.166,24 | +8,4% |
| % bonificação / frete | 3,32% | 3,37% | −0,05 p.p. |
| Viagens / viagem+vira | 706 / 731 | 656 / 674 | +7,6% / +8,5% |
| KM rodado | 656.081 | 654.202 | +0,3% |
| Média da frota (simples) | 2,1111 km/l | 2,1300 km/l | −0,9% |
| Motoristas premiados | 79 | 79 | = |

¹ Sem as viagens canceladas de 0521 e 0527 (ajuste autorizado, ver achado 2); pelo
resumo do PDF seria R$ 8.507.997,93.

Leitura: frete +9,9% com km praticamente igual (+0,3%) — mais frete por km
rodado (R$ 12,95/km contra R$ 11,81). A bonificação cresceu menos que o frete
(+8,4%), e o custo de bonificação por real faturado caiu de 3,37% para 3,32%. O
bônus operacional acompanha as viagens; o bônus por média subiu 28,2%.

## Achados da fonte (não corrigidos — mantido o valor do resumo)

1. **0720 ADILSON DO NASCIMENTO — premiação em branco (RESOLVIDO).** Na primeira
   versão do PDF o bloco trazia
   `BÔNUS POR MÉDIA: 445,51` (10% de R$ 4.455,14 de economia, 2º do grupo 48),
   mas `PRÊMIO POR ECONOMIA` e `TOTAL PREMIAÇÃO` estão vazios e o `TOTAL` impresso
   é **R$ 2.564,33** — só o bônus operacional. A planilha soma as parcelas
   (K = H+J), então ele aparece com **R$ 445,51** de premiação e **R$ 3.009,84**
   de total. **Resposta do usuário:** o PDF está sendo corrigido no Rodopar para
   trazer os dados certos. **Pendente:** reprocessar setembro quando o PDF novo
   chegar (`1_extrair.py` → `2_planilha.py` → `3_painel.py`) e conferir o bloco do
   0720.
   **PDF corrigido recebido e reprocessado:** `PRÊMIO POR ECONOMIA: 2.227,57`
   (50% de R$ 4.455,14), `BÔNUS POR MÉDIA: 445,51`, `TOTAL PREMIAÇÃO: 2.673,08` e
   `TOTAL: 5.237,41` — as identidades fecham. Na planilha: premiação R$ 2.673,08 e
   total R$ 5.237,41 (era R$ 3.009,84); ranking de bonificação 42º → 8º. Total do
   mês: premiação R$ 109.198,54, bonificações R$ 282.052,89. Nenhum outro
   motorista mudou.
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
   **Explicado pelo usuário:**
   - 0752: as viagens do doc. `M: 1-001-077350` foram anuladas para ele e passadas
     para 0765 ADILSON PEREIRA ASSIS (que recebeu o bônus de viagem), mas o frete
     ficou no total do 0752 porque foi ele quem carregou. Ficou devido a ele
     **R$ 50,00**, que será pago no fechamento de outubro (ver Pendências).
   - 0521 e 0527: os valores a mais são de **viagens canceladas** que ficaram no
     `TOTAL DE FRETE CLIENTE`.
   **Ajuste autorizado pelo usuário:** para 0521 e 0527 a planilha e o painel usam
   o frete das viagens listadas, sem as canceladas — 0521 R$ 141.257,48 (era
   150.378,58) e 0527 R$ 97.139,33 (era 99.639,33). Fica em
   `dados/ajustes/2026-09.json` e o `1_extrair.py` reaplica a cada execução.
   Frete da frota: R$ 8.496.376,83. Ranking de frete: 0521 passa de 4º para 5º,
   0527 de 53º para 55º (0136, 0757 e 0231 sobem uma posição). Bonificações não
   mudam. O 0752 segue com o frete do resumo (o frete é dele, que carregou).
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

## Verificações das movimentações (regras iniciais — a validar com o usuário)

`python3 scripts/regras.py 2026-09` sobre as 1.556 movimentações:

- **CT-e com frete em mais de um lançamento — 20 CT-e, 40 lançamentos, 21 motoristas.**
  Cada lançamento gerou bônus de viagem. Casos no mesmo motorista: 0757 (CT-e
  05-1-018855, docs 5-001-036314 e 5-001-036477, R$ 6.750,00 cada) e 0763 (CT-e
  03-1-021407, docs 3-001-021679 e 1-001-077860, R$ 7.394,10 cada). Os demais são
  pares entre motoristas (ex.: 0228 × 0245, 0419 × 0521, 0135 × 0615). Possível frete
  e bônus contados em dobro — conferir.
- **Nº RV "FERIAS" — 5 lançamentos:** 0228 EDUARDO JOSE DA SILVA (2 linhas, frete
  R$ 13.092,02, bônus R$ 229,11) e 0629 FLAVIANO APARECIDO DE LIMA (3 linhas).
- **Apuração de pagamento indevido de viagem — 11 motoristas, 15 lançamentos:**
  bônus de viagem pago R$ 1.488,56, carregamento devido R$ 350,00 (R$ 25,00 × 14),
  **a recuperar R$ 1.138,56**; 12 viagens contadas a mais (VG). Inclui a ordem
  cancelada paga do 0757 DENILSON (CT-e 05-1-018855, doc. 5-001-036477, R$ 138,38): o
  usuário informou que a ordem cancelada não entra na contagem nem no pagamento; a
  contagem confere (VG 0), mas o PDF mostra o bônus pago nas duas ordens e o resumo do
  0757 (R$ 1.819,39) soma as duas.
- **Valor de viagem em rota de carregamento (regra do usuário) — 14 lançamentos, 10
  motoristas, R$ 1.350,18 de bônus de viagem**, 12 deles também contados como viagem
  (VG 1): 0039, 0251 (2), 0304 (2), 0554, 0606 (2), 0720, 0765, 0900, 0922 (2) e 0923.
  Em 7 dos 20 CT-e duplicados, um dos lançamentos é essa perna local com valor de
  viagem e o outro é a viagem real (Machado → Santos) — a regra explica boa parte das
  duplicidades.
- **Bônus de viagem fora das taxas usuais (1,75 / 1,85 / 2,05%):** 0765, doc.
  1-001-077226, 2,16%.
- **Valor de lona fora do padrão (R$ 30 / R$ 35):** 0642 (R$ 15,00 por 1 lona),
  0659 (R$ 30,00 por 2) e 0763 (R$ 35,00 por 2).
- Informativos: 25 lançamentos com Nº RV "PEND.", 9 eventos, 41 lançamentos sem
  valor, 1 vira não computada (0763).

## Motoristas abaixo de 4.000 km (fora do critério)

Informado pelo usuário: os lançamentos com frete e sem média (0923, 0606, 0922 —
`KM RODADO: 1`) foram lançamento e pagamento errados; são manobristas ou
motoristas novos, e a empresa só considera para avaliação quem passa de 4.000 km.
Não há mais como ajustar o pagamento. Tratamento: no painel, os 15 motoristas
abaixo de 4.000 km em set/2026 ficam fora dos rankings e das comparações, com
card próprio — R$ 10.555,78 pagos a eles (3,7% do total), sendo R$ 8.882,43 de
bônus operacional e R$ 1.673,35 de premiação. Totais da frota mantidos com todos.
(Jul/2026: 12 motoristas; ago/2026: 13.)

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

## Versão 2 do PDF (reemitida depois do pagamento)

Em out/2026 o Rodopar reemitiu o PDF de setembro (`..._Versao_2.pdf`) **depois** de o
mês ter sido pago com a versão anterior. O fechamento (planilha, painel, apuração)
**continua na versão paga**; a versão 2 só entra no comparativo
(`scripts/comparar_versoes.py` → `saida/Comparativo_Versoes_PDF_09_2026.xlsx`).

- Bônus operacional e bonificações: R$ 282.052,89 → R$ 280.852,18 (**−R$ 1.200,71**);
  premiação igual. Viagens 706 → 697. Frete dos resumos −R$ 101.166,56 (sem ajustes).
- 10 motoristas mudam: 9 com bonificação menor (pago a mais R$ 1.250,71) e 1 maior
  (0648, +R$ 50,00 de carregamento em 2 lançamentos novos — pago a menos).
  0752 só tem o frete do resumo corrigido para a soma das linhas (bônus igual).
- 0521: taxa do bônus de viagem baixou de 1,85% para 1,75% em 21 linhas e a viagem
  do doc. 1-001-077389 (CT-e 133843/133842) virou carregamento (−R$ 283,36 no total).
- Viagens retiradas/convertidas em carregamento: 0923, 0251, 0606, 0922 (rotas de
  carregamento, já na apuração) e 0135, 0337 (CT-e duplicados de Confrontos).
  0757: retirada a ordem duplicada do CT-e 05-1-018855 (bônus + lona, −R$ 198,38).
- **Apuração de pagamento indevido × versão 2:** dos R$ 1.138,56 apurados, a versão 2
  recupera R$ 571,07. Seguem **não corrigidos** os 7 lançamentos de
  Machado x Varginha (0720, 0765, 0304 ×2, 0900, 0039, 0554 — R$ 552,49 a recuperar).
  Onde corrigiu, a versão 2 lança carregamento de R$ 50,00 em alguns casos (0606,
  0922) em vez dos R$ 25,00 da apuração.
- 31 lançamentos mudaram só o Nº RV (PEND./FERIAS → número): sem efeito em valor.

## Pendências para o próximo fechamento

- **Out/2026 — 0752 ANANIAS DOS REIS ROSA CANDIDO:** conferir se entraram os
  **R$ 50,00** devidos por ter carregado as viagens do doc. `M: 1-001-077350`
  (set/2026), passadas para o 0765. Reportar se não aparecer.
- ~~Set/2026 — 0720: reprocessar com o PDF corrigido~~ — feito.
- **Out/2026 — acerto da versão 2 de setembro:** definir com o usuário se o acerto
  (−R$ 1.250,71 de 9 motoristas, +R$ 50,00 do 0648) e os R$ 552,49 de Machado x
  Varginha que a versão 2 não corrigiu entram no fechamento de outubro.
