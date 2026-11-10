# Outubro/2026 — fechamento

Fonte: `comissao_media_viagem_toliman (389) outubro 2026.pdf` + `.xlsx` do Rodopar
(fechamento de média e viagens). Período de viagens **30/09 a 31/10/2026**. Substitui a
prévia (`dados/2026-10.meta.json` apagado); o histórico das prévias segue em
`2026-10-previa.md`.

## Totais (84 motoristas, 1.558 lançamentos)

- Frete cliente R$ 9.336.529,14 · bônus operacional R$ 182.759,13 · total
  bonificações R$ 182.759,13 · 750 viagens · média da frota 2,1387 km/l (simples) ·
  % bonificação sobre frete 1,9575%.
- Planilha `Indicadores_Produtividade_Motoristas_10_2026.xlsx` recalculada no
  LibreOffice sem erros; VLOOKUP `$A$1:$B$8` (grupo novo).
- **PDF × xlsx: 100% iguais** — lançamentos campo a campo e resumos (0 diferenças).
  O `conferir_xlsx.py` acusa diferenças de resumo falsas no layout novo do xlsx (resumo
  numa linha só); a conferência dos resumos foi feita à parte.
- Identidades de bônus, premiação e bonificações fecham em 100% dos motoristas.

## Achados da fonte

1. **Premiação zerada para todos.** `VALOR ECONOMIA`, `PRÊMIO POR ECONOMIA`, `BÔNUS POR
   MÉDIA` e `TOTAL PREMIAÇÃO` vieram 0 nos 84 motoristas, no PDF e no xlsx, embora média,
   km, grupo e posição estejam preenchidos e 16 motoristas tenham `PERCENTUAL DE BÔNUS`
   diferente de zero. Mantido como veio; conferir com o Rodopar. No painel, premiação
   −100% e bonificações −35,2% × setembro.
2. **Grupo novo:** 54 GRUPO FH E OURO 6 (acrescentado em `comum.GRUPOS` e no painel).
3. **Período começa em 30/09:** 60 lançamentos (31 motoristas) do dia 30/09 já estavam no
   fechamento pago de setembro — bônus R$ 6.471,98, frete R$ 327.215,31, VG 29. 12 deles
   com valor de bônus diferente de setembro (mudança de taxa; ex.: 0304, 0400, 0426, 0729,
   0419 maiores em outubro, 0765 menor). As duas linhas do 0231 de 30/09 (R$ 258,20) não
   estavam em setembro. Nova regra `REPETIDO_MES_ANTERIOR` (alerta) marca esses casos.
   Maiores por motorista: 0720 R$ 378,34 · 0304 R$ 356,60 · 0742 R$ 335,25 · 0426
   R$ 304,65 · 0598 R$ 286,44.
4. **Frete do resumo × linhas:** 0765 ADILSON PEREIRA ASSIS +R$ 8.765,76 (o mesmo das
   prévias) e 0605 −R$ 0,01. Mantido o resumo.
5. **Eventos (`E:`) no carregamento:** 0616 e 0228 R$ 100,00; 0501 e 0659 R$ 813,49.
6. **CT-e duplicados:** os 7 pares agora têm o frete dividido (ex.: 01-1-135673 — 0605
   R$ 10.527,47 + 0611 R$ 7.018,32); o 01-1-135816 deixou de estar inteiro nos dois.
7. Nº RV `FERIAS`: 0757 (doc. 3-001-022630 e 1-001-078743). 15 lançamentos com RV `PEND.`.
8. Lona a R$ 15,00: 0606 e 0797.

## Quadro

- × 4ª prévia: não constam no fechamento 0932, 0950 (frete R$ 54.917,22), 0923, 0629
  (frete R$ 47.574,72), 0941, 0922, 0940.
- × setembro: ninguém entrou; saíram 0932, 0923, 0629, 0941, 0900, 0555, 0922, 0940.
- × 4ª prévia: frete R$ 8.914.925,72 → R$ 9.336.529,14; bônus operacional
  R$ 174.651,41 → R$ 182.759,13; viagens 708 → 750.

## Verificações

- **Pagamento indevido — 7 lançamentos, a recuperar R$ 506,37**, igual às prévias.
- 0752 ANANIAS: carregamento 2 × R$ 50,00 em 21/10 (doc. 1-001-078420), pendente de
  confirmação.

## Pendências com o usuário

- Premiação zerada (achado 1): confirmar com o Rodopar antes de pagar.
- Os 60 lançamentos de 30/09 (R$ 6.471,98) — pagar de novo ou estornar.
- 0752 (R$ 50,00), regra do frete dividido em CT-e compartilhado, acertos de setembro
  (V2/V3/V4) e os R$ 1.198,56 de pagamento indevido de setembro.
