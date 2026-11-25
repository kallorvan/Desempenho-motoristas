# Handoff — situação em 25/11/2026

Para continuar em outra sessão: ler `CLAUDE.md`, `docs/procedimento.md` e
`docs/historico/2026-10-extracao.md` (último mês fechado). Este arquivo resume o que
está feito, o que ficou em aberto e o que foi só discutido.

## Estado

- **Meses no painel:** jul, ago, set, out/2026 (fechamento; versão reemitida em 25/11) e **nov/2026 — 1ª prévia,
  01 a 10/11** (`docs/historico/2026-11-previa.md`; PDF × xlsx 100% iguais).
  `dados/*.json` + `dados/lancamentos/2026-09.json` e `2026-10.json` (jul e ago sem
  movimentações).
- **Painel = sistema do Padrão de Sistemas Tóliman (19/11/2026)**
  (https://claude.ai/artifact/NiiyT3so8rej7pLiy84L5M): visual novo (tokens, Barlow Condensed /
  IBM Plex, degradês, componentes `s-`), login com senha (PBKDF2) e dados na pasta do sistema
  **`Produtividade de Motoristas`** no SharePoint (`usuarios/`, `dados/`, `backups/`, `presenca/`,
  `historico/`), bloqueio por checagem, 20 min de inatividade, versão no rodapé. Código em
  `painel/acesso.js` e `painel/sistema.css`; fontes e imagens em `painel/fonts/` e `painel/img/`
  (embutidas pelo `3_painel.py`). Teste: `node tests/pasta-sharepoint.mjs` (29 verificações, duas
  pessoas). Detalhes em `docs/procedimento.md` (Painel) e uso/férias no `README.md`.
- **Para colocar em uso (usuário):** criar a pasta `Produtividade de Motoristas` no canal do
  Teams da equipe, só a equipe com edição; copiar para ela o
  `saida/Dashboard_Produtividade_Motoristas.html`; abrir no Chrome/Edge, conectar a pasta, criar o
  primeiro acesso (vira administrador), cadastrar um segundo administrador e os colegas. As
  checagens de out/2026 (pasta `painel-dados` da equipe, 7 de 7) entram por Configurações ›
  Importar da versão anterior.
- **Painel publicado:** https://claude.ai/artifact/XKHh5g1TCnweh6y7U1XBvv agora é **só leitura**
  (sem checagens; o banco `db` dele estava vazio). Republicar com `python3 scripts/3_painel.py` e
  publicar o mesmo arquivo nessa URL.
- **Modo pasta do Teams antigo** (`painel-dados/`, usuários sem senha): substituído; lido só para
  leitura.
- **Entradas e saídas não vão para o git** (`entrada/` e `saida/` ignorados: dados de
  folha), **exceto** `saida/Dashboard_Produtividade_Motoristas.html`, que o padrão manda versionar
  (o conteúdo já está em `dados/`). O container é efêmero — PDF/xlsx precisam ser reenviados pelo usuário.

## Regras do usuário implantadas (`scripts/regras.py`)

- Rotas de carregamento (Machado x Machado / Pouso Alegre / Varginha) sem valor de viagem;
  devido R$ 25,00 de carregamento por lançamento.
- Ordem cancelada (mesmo CT-e, trecho e motorista, VG 0): estorna tudo o que a linha
  pagou e entrou no resumo.
- `REPETIDO_MES_ANTERIOR`: mesmo motorista + documento + CT-e já no mês anterior.
- `CTE_MES_ANTERIOR` (nov/2026): CT-e com frete já no mês anterior em outro motorista ou
  documento (sem fechar 60/40) → alerta; no Confrontos com o lançamento do mês anterior.
- `VIAGEM_DIVIDIDA` (nov/2026): 2 motoristas no mesmo CT-e, Nº RV diferentes, frete
  60%/40% da soma (tol. R$ 0,01), trecho igual ou não → info; demais CT-e repetidos
  seguem como alerta. Setembro **não** se mexe (mês fechado, 20 CT-e com frete inteiro).

## Pendências com o usuário (decisões dele)

1. Outubro — **resolvido em 25/11**: a base passou a ser o PDF reemitido pelo Rodopar
   (premiação preenchida, R$ 76.835,97; sem as linhas de 30/09; taxa 1,75% em 0285, 0357,
   0563 e 0598). Bonificações R$ 182.759,13 → R$ 252.357,36. Se a versão anterior já tiver
   sido paga, o acerto por motorista está em `saida/Comparativo_Versoes_PDF_10_2026.xlsx`
   (falta o usuário dizer). Ver `docs/historico/2026-10-extracao.md`.
3. 0752 ANANIAS — carregamento 2 × R$ 50,00 em 21/10 (doc. 1-001-078420).
4. Setembro — acertos das versões V2/V3/V4 do PDF e R$ 1.198,56 de pagamento indevido.
5. Outubro — pagamento indevido R$ 506,37 (7 lançamentos).
6. Novembro — 3 pares de CT-e Varginha x Santos com frete inteiro em out (0752, 0357,
   0735) e de novo em nov (0598, 0423, 0396): 6 lançamentos, frete R$ 34.754,40, bônus
   R$ 608,22, frete inteiro (não é 60/40). Regra `CTE_MES_ANTERIOR` criada a pedido do
   usuário; os casos aparecem nas verificações e no Confrontos. Falta a decisão sobre o
   pagamento.

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

## Novembro (em andamento)

1. Próximas prévias / fechamento: `python3 scripts/1_extrair.py entrada/<arquivo>.pdf 2026-11`
   e `comparar_versoes.py` prévia anterior × nova. Se vier o xlsx, conferir; o `conferir_xlsx.py` acusa diferenças de resumo
   falsas no layout novo (resumo numa linha só) — conferir os resumos à parte ou ajustar o
   script.
2. `python3 scripts/2_planilha.py 2026-11` (só no fechamento), `python3 scripts/regras.py
   2026-11`, `python3 scripts/3_painel.py`, rever o rodapé de `painel/base.html`.
3. Grupo novo → `comum.GRUPOS` e `SHORT` em `painel/app.js`.
4. Registrar `docs/historico/2026-11-*.md` e reportar achados, entradas/saídas do quadro.

## Ambiente

`python3 -m pip install openpyxl playwright`; `poppler-utils` e `libreoffice-calc`.
Chromium do Playwright já vem instalado (não rodar `playwright install`).
