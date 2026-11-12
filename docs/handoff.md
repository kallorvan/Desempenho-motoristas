# Handoff — situação em 12/11/2026

Para continuar em outra sessão: ler `CLAUDE.md`, `docs/procedimento.md` e
`docs/historico/2026-10-extracao.md` (último mês fechado). Este arquivo resume o que
está feito, o que ficou em aberto e o que foi só discutido.

## Estado

- **Meses no painel:** jul, ago, set e out/2026 (out = fechamento, não prévia).
  `dados/*.json` + `dados/lancamentos/2026-09.json` e `2026-10.json` (jul e ago sem
  movimentações).
- **Painel publicado:** https://claude.ai/artifact/XKHh5g1TCnweh6y7U1XBvv (privado, com
  os recursos `db`, `room`, `user` e `downloads`; regra `config` → `write: admin`).
  Republicar com `python3 scripts/3_painel.py` e publicar o mesmo arquivo
  `saida/Dashboard_Produtividade_Motoristas.html` nessa URL **sem** passar
  `capabilities` (são mantidas da versão anterior).
- **Confrontos (12/11):** abre no filtro "Precisam de conferência" (só CT-e fora da
  divisão 60/40); as viagens divididas ficam no filtro próprio e em "Todos". O link "ver
  lado a lado" escolhe o filtro conforme o CT-e. Em out/2026 a aba abre vazia com aviso
  (os 7 CT-e são viagem dividida).
- **Pagamento indevido (12/11):** KPIs do topo alinhados (rótulo no alto, valor na base).
- **Modo pasta do Teams:** o HTML aberto no Edge/Chrome conecta a uma pasta sincronizada
  e grava em `painel-dados/` (usuários, registro, online). Ver `docs/procedimento.md`.
- **Entradas e saídas não vão para o git** (`entrada/`, `saida/` ignorados: dados de
  folha). O container é efêmero — PDF/xlsx precisam ser reenviados pelo usuário.

## Regras do usuário implantadas (`scripts/regras.py`)

- Rotas de carregamento (Machado x Machado / Pouso Alegre / Varginha) sem valor de viagem;
  devido R$ 25,00 de carregamento por lançamento.
- Ordem cancelada (mesmo CT-e, trecho e motorista, VG 0): estorna tudo o que a linha
  pagou e entrou no resumo.
- `REPETIDO_MES_ANTERIOR`: mesmo motorista + documento + CT-e já no mês anterior.
- `VIAGEM_DIVIDIDA` (nov/2026): 2 motoristas no mesmo CT-e, Nº RV diferentes, frete
  60%/40% da soma (tol. R$ 0,01), trecho igual ou não → info; demais CT-e repetidos
  seguem como alerta. Setembro **não** se mexe (mês fechado, 20 CT-e com frete inteiro).

## Pendências com o usuário (decisões dele)

1. Outubro — **premiação zerada** para todos (economia 0 no PDF e no xlsx): confirmar
   com o Rodopar antes de pagar.
2. Outubro — 60 lançamentos de 30/09 já pagos em setembro (bônus R$ 6.471,98): pagar
   de novo ou estornar.
3. 0752 ANANIAS — carregamento 2 × R$ 50,00 em 21/10 (doc. 1-001-078420).
4. Setembro — acertos das versões V2/V3/V4 do PDF e R$ 1.198,56 de pagamento indevido.
5. Outubro — pagamento indevido R$ 506,37 (7 lançamentos).

## Discutido e **não** implantado (usuário pediu para deixar como está)

Painel autônomo: o administrador carregaria o xlsx do Rodopar no próprio painel, que
leria o arquivo no navegador, mostraria a conferência e gravaria o mês (banco do painel
e/ou pasta do Teams). Viável — o xlsx de fechamento de out/2026 traz lançamentos, resumo
do bônus e bloco de prêmio. Impactos levantados: portar extração e regras para JS e
validar contra out/2026; `.xls` das prévias não abre sem biblioteca; perde a conferência
PDF × xlsx; `dados/` no git deixa de ser atualizado sozinho (botão de baixar a base);
planilha de 25 colunas gerada no navegador sem a checagem do LibreOffice; telas para
exceções autorizadas e reemissões. Proposta: duas etapas (carga + conferência + gravação;
depois planilha, exceções e comparação de versões). Decisões em aberto: onde guardar,
`.xls`, xlsx como fonte única.

## Próximo mês (nov/2026)

1. `python3 scripts/1_extrair.py entrada/<arquivo>.pdf 2026-11` (prévia é detectada
   sozinha). Se vier o xlsx, conferir; o `conferir_xlsx.py` acusa diferenças de resumo
   falsas no layout novo (resumo numa linha só) — conferir os resumos à parte ou ajustar o
   script.
2. `python3 scripts/2_planilha.py 2026-11` (só no fechamento), `python3 scripts/regras.py
   2026-11`, `python3 scripts/3_painel.py`, rever o rodapé de `painel/base.html`.
3. Grupo novo → `comum.GRUPOS` e `SHORT` em `painel/app.js`.
4. Registrar `docs/historico/2026-11-*.md` e reportar achados, entradas/saídas do quadro.

## Ambiente

`python3 -m pip install openpyxl playwright`; `poppler-utils` e `libreoffice-calc`.
Chromium do Playwright já vem instalado (não rodar `playwright install`).
