# Fechamento mensal — produtividade dos motoristas

Tóliman Transportes (Grupo Dínamo). Transforma o PDF "Planilha de comissão" do
Rodopar em duas entregas: a planilha de indicadores no modelo fixo e o painel HTML
multimês.

## Comandos

| Comando | O que faz |
|---|---|
| `python3 scripts/1_extrair.py entrada/<arquivo>.pdf AAAA-MM` | Lê o PDF, confere lançamentos × resumos, grava `dados/AAAA-MM.json` e imprime o relatório de conferência (detalhe em `saida/conferencia_AAAA-MM.json`) |
| `python3 scripts/2_planilha.py AAAA-MM` | Gera `saida/Indicadores_Produtividade_Motoristas_MM_AAAA.xlsx` já recalculado pelo LibreOffice e conferido sem erros |
| `python3 scripts/regras.py AAAA-MM` | Roda as regras de verificação sobre as movimentações do mês (`dados/lancamentos/AAAA-MM.json`) e lista as ocorrências |
| `python3 scripts/comparar_versoes.py entrada/<pago>.pdf entrada/<novo>.pdf AAAA-MM` | Compara duas versões do PDF do mesmo mês (reemissão) e gera `saida/Comparativo_Versoes_PDF_MM_AAAA.xlsx` com o acerto por motorista e as diferenças lançamento a lançamento |
| `python3 scripts/3_painel.py` | Lê todo `dados/*.json` e gera `saida/Dashboard_Produtividade_Motoristas.html` |
| `soffice --headless --convert-to xlsx --outdir /tmp <arq>.xlsx` | Recalcula as fórmulas do xlsx (LibreOffice precisa estar instalado) |

Dependências: `python3`, `openpyxl`, `poppler-utils` (dá o `pdftotext`), LibreOffice.

```bash
pip install openpyxl
# Debian/Ubuntu: sudo apt install poppler-utils libreoffice-calc
# macOS:         brew install poppler && brew install --cask libreoffice
```

## Estrutura

```
entrada/   # o PDF do mês entra aqui
dados/     # uma base por mês, AAAA-MM.json — é a fonte do painel;
           # lancamentos/AAAA-MM.json = todas as movimentações do PDF; ajustes/ = exceções autorizadas
saida/     # planilha e painel gerados
painel/    # base.html (casca) + app.js (lógica) — o 3_painel.py junta os dois
modelo/    # xlsx de referência; o layout da planilha vem daqui
docs/      # procedimento completo e histórico mês a mês
```

## Regras que não mudam

Estas três identidades têm que fechar em **100%** dos motoristas. Se alguma não
fechar, é achado para reportar, não erro para corrigir em silêncio:

- `Subtotal bônus = viagens + viras + carregamento + lonas`
- `Total premiação = prêmio por economia + bônus por média`
- `Total bonificações = bônus operacional + total premiação`

Quando o resumo do PDF divergir da soma dos lançamentos, **vale o resumo** — é o
número oficial do fechamento. Reportar a diferença.

A planilha calcula `K = H+J` e `L = F+K`, ou seja, **soma as parcelas** em vez de
repetir o total impresso no PDF. O PDF arredonda R$ 0,01 em vários motoristas por
mês. Quando o usuário citar um total do PDF que cai nesse caso, avisar.

## Ao entregar

Sempre reportar em texto: os achados da fonte, quem entrou e quem saiu do quadro,
e qualquer diferença entre um número que o usuário citou e o que a planilha calcula.
Nunca ajustar um número em silêncio para bater com o esperado.

## Detalhes

O procedimento completo — passos, armadilhas do PDF, modelo da planilha coluna a
coluna, estrutura do painel — está em:

@docs/procedimento.md

O histórico de cada fechamento fica em `docs/historico/`. Leia o do mês anterior
antes de começar um mês novo; não precisa ler todos.
