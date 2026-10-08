# Procedimento — fechamento mensal de produtividade dos motoristas

Empresa: Tóliman Transportes (Grupo Dínamo). Fechamento mensal de bonificação de
motoristas, saído do Rodopar.

`docs/historico/` guarda o que é específico de cada mês; as regras que valem para
todos ficam aqui.

## Entradas e saídas

| Arquivo | Papel |
|---|---|
| `entrada/Planilha de comissão MM AAAA.pdf` | **Fonte.** ~90 págs., um bloco por motorista. É de onde tudo sai. |
| `dados/AAAA-MM.json` | Base extraída do mês. Fonte do painel, vai para o git. |
| `saida/Indicadores_Produtividade_Motoristas_MM_AAAA.xlsx` | **Entregável 1.** Modelo fixo, 25 colunas. |
| `saida/Dashboard_Produtividade_Motoristas.html` | **Entregável 2.** Painel multimês, um arquivo só (não é um por mês). |

O painel também existe publicado como artefato em
https://claude.ai/code/artifact/f57fd579-3b88-4aaa-a4ce-8c8ec21542af — republicar
o mesmo caminho de arquivo mantém a URL.

## Passos

1. **Extrair o texto do PDF** com layout preservado e área ampliada (o recorte
   padrão corta a coluna VIAGEM na borda direita):
   `pdftotext -layout -x 0 -y 0 -W 3000 -H 3000 entrada/<arquivo>.pdf /tmp/mes.txt`
   Um motorista por bloco, delimitado por `^ MOTORISTA: <nome> - COD.: <cod>`.
2. **Ler dois resumos por bloco**: `RESUMO DO BÔNUS` (quantidades à esquerda,
   valores à direita) e `RESUMO PRÊMIO POR MÉDIA` (média, grupo, posição,
   economia, prêmio, km).
3. **Se houver o export xlsx do Rodopar** (`Comissão Toliman.rpt`), rodar
   `python3 scripts/conferir_xlsx.py entrada/<export>.xlsx entrada/<arquivo>.pdf AAAA-MM`
   antes de fechar os achados: ele tem os valores sem arredondamento e separa
   divergência real da fonte de efeito do PDF (não traz o bloco de prêmio).
4. **Conferir contra os lançamentos** — somar as linhas de cada bloco e comparar
   com o resumo. Divergência aqui é achado, não erro de leitura: reportar e
   **manter o valor do resumo**, que é o oficial do fechamento. Exceção só com
   autorização do usuário, registrada em `dados/ajustes/AAAA-MM.json`
   (`{"<cod>": {"frete": "linhas", "motivo": "..."}}`) — o `1_extrair.py` aplica e
   lista no relatório. Ex.: set/2026, viagens canceladas de 0521 e 0527.
5. **Montar a planilha** no modelo abaixo e recalcular as fórmulas com LibreOffice
   até não sobrar nenhum erro.
6. **Atualizar o painel**: `python3 scripts/3_painel.py` lê todo `dados/*.json`;
   revisar o rodapé de `painel/base.html` (fontes e notas do mês).
7. **Rodar as verificações**: `python3 scripts/regras.py AAAA-MM` e levar os alertas ao
   usuário junto com os achados do mês.
8. **Registrar** um `docs/historico/AAAA-MM-extracao.md` com os achados do mês.

## Movimentações e regras de verificação

O `1_extrair.py` grava também `dados/lancamentos/AAAA-MM.json`: **todas** as
movimentações do PDF, por motorista e na ordem do PDF (documento, data, chegada,
container, cliente, origem/destino, frete, CT-e, Nº RV, VG, lona, vira,
carregamento, lona R$, viagem) e o período do fechamento. Em set/2026 as 1.556
linhas conferiram campo a campo com o export xlsx do Rodopar (o cliente vem
truncado no PDF; no xlsx vem completo).

As regras ficam em `scripts/regras.py` (lista `REGRAS` + função `verificar`) e rodam
a cada build do painel — criar ou ajustar uma regra **não** exige reler o PDF.
Nível `alerta` = precisa de conferência; `info` = situação conhecida, só registro.
Os parâmetros (taxas usuais do bônus de viagem, valor por lona) estão no topo do
arquivo. No painel: tabela de movimentações na ficha do motorista, com as
ocorrências logo abaixo de cada linha, e o resumo "Verificações das movimentações"
na Visão geral. Meses sem o arquivo de lançamentos (jul e ago/2026) mostram aviso.

**Relatório de verificações (.xlsx).** Botão no bloco "Verificações das movimentações"
da Visão geral: escolhe o período (um mês com movimentações ou todos) e se inclui os
informativos. O arquivo tem três abas — *Resumo* (contagem por regra), *Ocorrências*
(uma linha por lançamento × regra, com todas as colunas do PDF e o detalhe) e
*Frete x lançamentos* (motoristas cujo frete do fechamento difere da soma das linhas).
O .xlsx é gerado no próprio navegador, sem biblioteca externa (funciona offline). No
painel publicado, a entrega passa pelo recurso `downloads` da plataforma (o
visitante confirma); por isso a publicação declara `capabilities: {downloads: true}`.

## Regras de validação (têm que fechar em 100% dos motoristas)

- `Subtotal bônus = viagens + viras + carregamento + lonas`
- `Total premiação = prêmio por economia + bônus por média`
- `Total bonificações = bônus operacional + total premiação`
- `Frete cliente do motorista = soma dos lançamentos do bloco` (exceções viram achado)
- `Total de viras = soma das viras das linhas sem pagamento de viagem` — **regra do
  Rodopar**: vira lançada na mesma linha de um pagamento de viagem (`VIAGEM > 0`)
  não é computada. Os scripts aplicam a regra (`comum.vira_nao_computada`) e listam
  as viras descartadas à parte, sem tratá-las como divergência. Confirmada em
  set/2026 nos 92 motoristas (0763, R$ 55,00). Provável explicação também do
  achado 2 de jul/2026 (0727 Valdir, vira de R$ 55,00 "lançada e não paga").

## Armadilhas conhecidas do PDF

- **Blocos de prêmio duplicados.** Alguns motoristas trazem dois
  `RESUMO PRÊMIO POR MÉDIA` — o segundo é sobra de paginação. Regra: vence o de
  **maior `TOTAL PREMIAÇÃO`**, desempatando por média e km. Em ago/2026 isso
  reproduziu exatamente os totais que o usuário pediu (Gabriel 0501 e Kauan 0865).
- **Nomes longos quebram a linha.** O nome do motorista pode ocupar uma linha e
  os números a seguinte. Casar as colunas pelo **fim da linha** (VG, LONA, VIRA,
  CARREGAMENTO, LONA, VIAGEM), nunca pelo começo.
- **Destino longo quebra a linha depois dos números** (ex.: `SAO SEBASTIAO DO
  PARAISO/MG` na linha seguinte). Procurar o bloco numérico em cada linha física
  do lançamento, não só na junção.
- **Nº RV com texto** (`PEND.`, `FERIAS`) ou em branco (linhas `E:`).
- **Prêmio em branco.** Em set/2026 o 0720 trouxe `BÔNUS POR MÉDIA` preenchido com
  `PRÊMIO POR ECONOMIA` e `TOTAL PREMIAÇÃO` vazios, e o `TOTAL` sem o bônus. A
  planilha soma as parcelas; reportar como achado.
- **Sem grupo / KM 1.** Motorista sem média vem com `GRUPO DE MAIOR KM: 0`, nome
  vazio e `KM RODADO: 1`. Entra na tabela de classificação como `0 → SEM GRUPO`.
- **Container com espaço no campo CT-e.** Nas linhas de vira (`O:`), o campo CT-e
  traz um container do tipo `MRSU 306.229-7`, com espaço — um `\S+` no regex
  desalinha tudo. Foi a causa de vários falsos positivos de conferência.
- **Incentivo entra como carregamento.** Documentos `E: 1-EVE-…` (R$ 813,49 em
  ago/2026) caem na rubrica de carregamento e inflam esse total.
- **Arredondamento de R$ 0,01.** O PDF imprime um `TOTAL` arredondado que difere
  da soma das próprias parcelas — 4 casos em jul/2026, 23 em ago/2026. **A
  planilha e o painel sempre usam a soma**, porque as colunas K e L do modelo são
  fórmulas. Avisar o usuário quando ele citar um total do PDF que cai nesse caso.
- **Manobristas.** Motoristas sem frete faturado: a coluna R mostra `Manobrista`
  e os rankings de frete ficam vazios. Continuam no denominador das médias.

## Modelo da planilha

O modelo está em `modelo/`. **Não redesenhar** — replicar. Duas abas:

- **`Base Motorista`** — 25 colunas (A–Y), uma linha por motorista, linha
  `TOTAL / MEDIA` no fim. Cabeçalho `#1F3864` com texto branco; dados vindos do
  PDF em **fonte azul** (`#0000FF`); colunas calculadas (S–Y) em preto; colunas
  L (`Total Bonificações`) e R (`% Bonificação Sobre Total Frete Cliente`) com
  **fundo verde** `#00B050` e texto branco. Arial 10; linha de total Arial 11
  negrito, fundo `#D9E1F2`.
- **`Base Classificação Motorista`** — código do grupo → nome, sem cabeçalho.
  Alimenta o `VLOOKUP` da coluna D. **Ajustar o intervalo do VLOOKUP** quando
  entrar grupo novo (foi `$A$1:$B$6` em julho, `$A$1:$B$7` em agosto).

Cabeçalhos, na ordem: Cod. Motorista(Rodopar) · Motorista · Grupo de Maior KM ·
Descrição Grupo · Total Frete Cliente (R$) · Total Bonus Operacional (R$) ·
Valor Economia (R$) · Premio por Economia (R$) · % Bonus por Media ·
Bonus por Media (R$) · Total Premiacao (R$) · Total Bonificações (R$) ·
Qtd Viagens · Qtd Viagem+Vira · KM Rodado · Media (km/l) · Posicao no Grupo ·
% Bonificacao Sobre Total Frete Cliente · Frete Medio p/ Viagem (R$) ·
Bonificacao Media p/ Viagem (R$) · Frete por KM (R$/km) ·
Bonificacao por KM (R$/km) · Part. % no Frete Total · Ranking Frete ·
Ranking Bonificacao

Fórmulas por linha (`r` = número da linha):

```
D: =VLOOKUP(Cr,'Base Classificação Motorista'!$A$1:$B$7,2,FALSE())
K: =Hr+Jr                          L: =Fr+Kr
R: =IFERROR(Lr/Er,"Manobrista")    S: =IFERROR(Er/Mr,"")
T: =IFERROR(Lr/Nr,"")              U: =IFERROR(Er/Or,"")
V: =IFERROR(Lr/Or,"")              W: =IFERROR(Er/$E$<total>,"")
X: =IF(Er=0,"",RANK(Er,$E$2:$E$<ult>))
Y: =IF(Lr=0,"",RANK(Lr,$L$2:$L$<ult>))
```

Linha de total: `SUM` nas colunas E–O, `AVERAGEIFS(P…,P…,">0")` na média
(média **simples** entre os que têm consumo, não ponderada por km), e as mesmas
razões das colunas R–W apontando para a própria linha de total. C, I, Q, X e Y
ficam vazias.

**Grupos conhecidos:** 17 Scania/Volvo 440 · 18 Volvo Bi-Truck · 20 Volvo/Scania
480·510·540 · 21 Volvo/Scania Tampa Baixa · 48 Volvo/Scania Caçamba · 49 Meteor VW ·
50 Volvo/Scania Graneleiro. Manter todos na tabela mesmo sem motoristas no mês.

## Painel

Arquivo único, multimês. `DATASETS` e `TOTAIS` são objetos indexados por mês
(`"2026-07"`, `"2026-08"`). O `3_painel.py` monta os dois, e também `MLABEL`/`MSHORT`,
a partir de `dados/*.json` — acrescentar um mês é só gravar o JSON e rodar o script. Seletor de mês, aba **Evolução**, KPIs
comparativos e o histórico do painel individual passam a considerar o mês novo
sozinhos.

**Critério de avaliação — 4.000 km.** Regra da empresa: só é avaliado quem rodou
ao menos 4.000 km no mês (`comum.KM_MIN`). É a mesma regra do Rodopar: em jul–set/2026,
`POSIÇÃO NO GRUPO > 0` ⇔ km ≥ 4.000, sem exceção. Abaixo disso (manobristas, novos,
lançamento sem km) o motorista fica **fora dos rankings e das comparações** do
painel (ranking top 12, posição de frete/bonificação, "comparado à frota", média
de referência), com etiqueta "fora do critério" e um card próprio na Visão geral
com o que foi pago a eles. **Os totais da frota continuam com todos** (foi pago).
A planilha não muda — segue o modelo.

Abas: **Visão geral** (KPIs, composição, grupos, ranking, tabela) · **Por
motorista** (ficha individual, comparação com a frota, histórico mês a mês) ·
**Evolução** (frota mês a mês e variação por motorista). Identidade visual
Dínamo/Tóliman — navy `#1C2543`, coral `#DD4663`, mauve `#AE82B1`, areia `#F4D38D`.

## Gotchas técnicos

- **O xlsx de origem é OOXML *strict*** — `openpyxl` abre com `sheetnames: []`.
  Converter antes:
  `soffice --headless --convert-to xlsx:"Calc MS Excel 2007 XML" --outdir conv arquivo.xlsx`
- **Cor de tema no XML.** No arquivo original, `theme 0` = branco. O openpyxl
  devolve isso como "sem cor" — conferir no `xl/styles.xml` antes de concluir que
  uma célula está sem formatação.
- **Código de motorista `#VALUE!`** (linha sem motorista identificado em julho)
  vira erro de fórmula se escrito direto numa célula. Substituir por texto.
- **Média da frota** = média simples dos que têm consumo > 0. Em jul/2026 deu
  2,1141 (a ponderada por km daria 2,1027) — usar sempre a simples, é o que o
  modelo calcula.
- **LibreOffice precisa do Calc.** Só o `libreoffice-core` não abre planilha
  ("source file could not be loaded"): instalar `libreoffice-calc`.
- **`openpyxl` não cacheia resultados de fórmula.** Depois de gerar o xlsx,
  recalcular com LibreOffice; antes disso toda fórmula lê como `None`.

## Ao entregar

Sempre reportar ao usuário, em texto: os achados da fonte do mês, a movimentação
do quadro (quem entrou, quem saiu) e qualquer diferença entre um número que ele
citou e o que a planilha calcula. Nunca ajustar um número em silêncio para bater
com o esperado.
