# Fechamento mensal — produtividade dos motoristas

Tóliman Transportes (Grupo Dínamo). Transforma o PDF "Planilha de comissão" do
Rodopar em duas entregas: a planilha de indicadores no modelo fixo e o painel HTML
multimês.

## Comandos

| Comando | O que faz |
|---|---|
| `python3 scripts/1_extrair.py entrada/<arquivo>.pdf AAAA-MM` | Lê o PDF, confere lançamentos × resumos, grava `dados/AAAA-MM.json` e imprime o relatório de conferência (detalhe em `saida/conferencia_AAAA-MM.json`) |
| `python3 scripts/1_extrair.py entrada/<parte1>.pdf entrada/<parte2>.pdf AAAA-MM` | Prévia em partes (períodos seguidos): soma as partes por motorista |
| `python3 scripts/2_planilha.py AAAA-MM` | Gera `saida/Indicadores_Produtividade_Motoristas_MM_AAAA.xlsx` já recalculado pelo LibreOffice e conferido sem erros |
| `python3 scripts/regras.py AAAA-MM` | Roda as regras de verificação sobre as movimentações do mês (`dados/lancamentos/AAAA-MM.json`) e lista as ocorrências |
| `python3 scripts/comparar_versoes.py entrada/<pago>.pdf entrada/<novo>.pdf AAAA-MM` | Compara duas versões do PDF do mesmo mês (reemissão) e gera `saida/Comparativo_Versoes_PDF_MM_AAAA.xlsx` com o acerto por motorista e as diferenças lançamento a lançamento |
| `python3 scripts/3_painel.py` | Lê todo `dados/*.json` e gera `saida/Dashboard_Produtividade_Motoristas.html` (arquivo único, com a versão vAAAA.MM.DD) |
| `node tests/pasta-sharepoint.mjs` | Testa login e dados na pasta do SharePoint com duas pessoas (pasta temporária); rodar depois do build |
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
painel/    # base.html (casca) + app.js (lógica) + acesso.js (login e dados) + sistema.css,
           # fonts/ e img/ — o 3_painel.py junta tudo num HTML só
tests/     # pasta-sharepoint.mjs (Playwright, duas pessoas na mesma pasta)
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


## Padrão de acesso e dados (Padrão de Sistemas Tóliman — obrigatório)

Todo sistema segue o design, o login e o armazenamento de dados definidos na página "Padrão de Sistemas Tóliman", com o HTML, o CSS e o JavaScript de referência que estão nela. Não invente outro formato de tela, outro jeito de guardar dados, nem outras regras.

Este sistema é independente: tem a sua própria pasta no SharePoint, os seus próprios usuários e os seus próprios dados. Nunca use, cite ou aponte para a pasta, o repositório ou os arquivos de outro sistema ou painel.

Tela
- Visual: o layout padrão Grupo Dínamo / Tóliman (skill "layout padrão", artefato Layout Base). Só tema claro. Tokens: --ink, --navy, --navy3, --accent #E4536C, --plum, --steel, --line, --paper. Fontes: Barlow Condensed (títulos, caixa alta), IBM Plex Sans (texto), IBM Plex Mono (rótulos e números).
- Janela modal (`<dialog>`), `Esc` não fecha. Fundo `--g-noite` (azul-marinho com brilhos vermelho, lilás e amarelo) com listras diagonais leves.
- Cores da logo: --accent #E4536C (vermelho), --ouro #F5CE7A (amarelo), --lilas #A275B4 (lilás). Faixa de 6px no topo em degradê contínuo `--g-logo` (vermelho → amarelo → lilás).
- Janela com raio de 18px, borda de 1,5px em degradê `--g-borda`, sombra profunda, logo no cabeçalho e título com degradê no texto `--g-titulo`.
- Cabeçalho: linha em Mono caixa alta "Empresa · Nome do sistema" e abaixo o título do sistema em Barlow Condensed, caixa alta, 28px.
- Botão principal em `--g-cta` com brilho vermelho suave; campos com raio de 10px; foco com borda em degradê `--g-foco` e halo lilás.
- Telas do sistema: linha `--g-logo` de 3px no pé do cabeçalho, aba ativa sublinhada em `--g-foco`, faixa de título `--g-noite` com período, título e ações, cartões de números com faixa `--g-logo` e número em degradê azul-marinho → roxo, barras de valor em `--g-logo`, linha escolhida da tabela com fundo rosado. Selos de situação em cor sólida. Degradê só nesses elementos; o resto continua liso. CSS completo na página do padrão (seções Componentes do sistema e Efeitos de gradiente).

Telas e fluxo: navegador sem suporte, conectar a pasta, autorizar a pasta, primeiro acesso, entrar, trocar a senha provisória e sessão bloqueada.

Regras
- Usuários em `usuarios/<login>.json` na pasta do SharePoint; senha só como hash PBKDF2-SHA256 (150 mil iterações, sal de 16 bytes). Mínimo de 6 caracteres.
- Primeira pessoa numa pasta vazia vira administradora. Só administradores cadastram usuários e redefinem senhas. Sempre há pelo menos um administrador ativo.
- Senha provisória exige troca na primeira entrada, e a nova precisa ser diferente.
- 20 minutos sem uso bloqueia a sessão e pede a senha de novo.
- Histórico em `historico/AAAA-MM_<id do navegador>.json` (entradas, senhas erradas, trocas, bloqueios). Só administradores consultam.
- Credenciais de serviços externos vêm de variáveis de ambiente e nunca vão para o repositório.

Dados (pasta do SharePoint)
- Nenhum dado de trabalho fica só no navegador. O sistema é um HTML único na pasta criada para ele no canal do Teams da equipe que o usa (nome em `PASTA_NOME`), aberto pelo atalho do OneDrive, e grava na mesma pasta pela File System Access API (Chrome e Edge). O navegador guarda uma cópia para funcionar sem internet.
- Estrutura: `dados/<id do navegador>.json`, `backups/<Sistema>_dados_AAAA-MM-DD_<nome>.json`, `presenca/<id do navegador>.json`, `usuarios/<login>.json`, `historico/AAAA-MM_<id do navegador>.json`.
- Cada navegador grava só os próprios arquivos, nunca o arquivo de outra pessoa, cerca de 2 s depois de cada alteração, mais um backup por dia.
- Ciclo de 20 s (e ao voltar para a aba): ler os arquivos dos colegas que mudaram (`lastModified`), juntar, conferir o bloqueio e gravar a presença. Arquivo que não abre como JSON ainda está chegando: tentar no ciclo seguinte.
- Junção: por registro vale o `atualizadoEm` mais novo; exclusões ficam marcadas com a data e não voltam; cadastros são somados; configurações ficam com o `alteradoEm` mais novo; contadores ficam com o maior.
- Bloqueio por registro: quem abriu primeiro fica com ele; liberado ao trocar de registro, ao fechar (3 min sem presença) ou com 20 min parado. Mostrar "Aguardando chegar pelo OneDrive…" com "Abrir assim mesmo" quando a versão do colega ainda não chegou.
- O arquivo de dados tem o mesmo formato do backup (`versao`, `geradoEm`, `origem`, `usuario`…), e "Recuperar um backup" usa as mesmas regras de junção.
- Teste automatizado com duas pessoas na mesma pasta (`tests/pasta-sharepoint.mjs`), simulando a pasta com uma pasta temporária.
- Continuidade: o README traz o preparo do computador e o passo a passo de férias. O sistema tem sempre pelo menos dois administradores.
- Dados reais (planilhas, backups) nunca vão para o repositório.

Projeto e entrega
- Estrutura: `src/` (index.html, app.js, fonts, img), `build.py`, `Nome-do-Sistema.html` gerado, `tests/*.mjs` (Playwright), `exemplos/` fictícios, `docs/manual/`, `README.md`, `HANDOFF.md`.
- `build.py` gera um HTML único com scripts, fontes e imagens embutidos, e troca `__VERSAO__` por `vAAAA.MM.DD`. Rode depois de cada mudança e faça commit do HTML gerado.
- A versão aparece no rodapé. Atualizar = substituir o HTML na pasta do sistema e apertar F5.
- Todo arquivo de dados tem `versao`; uma versão nova sempre lê os arquivos das anteriores.
- Testes passam antes de cada merge; merge para `main` só quando o responsável pedir.
- README para quem opera (uso, preparo do computador, férias). HANDOFF para quem continua (estrutura, decisões, pendências). Manual em PDF gerado por script com dados de exemplo.
- Exportações: `<sistema>_<conteúdo>_AAAA-MM-DD_a_AAAA-MM-DD.<ext>`, sem acentos nem espaços.

Segurança e manutenção
- Só a equipe do sistema tem edição na pasta do sistema no SharePoint; essa é a proteção real dos dados.
- Credenciais de serviços externos só em variáveis de ambiente; nunca no código, na pasta ou no git.
- Dados pessoais ficam só na pasta do sistema; exemplos e prints usam dados fictícios.
- Backups: diários por 60 dias, depois só a primeira cópia de cada mês. Cada navegador limpa só os backups do próprio usuário, uma vez por dia. O histórico não é apagado.
- Ao conectar, conferir se a pasta tem o nome definido em `PASTA_NOME` e a estrutura esperada (ou está vazia); senão, avisar com "Escolher outra pasta" e "Usar esta pasta".

Design (componentes)
- Toda tela de sistema usa os componentes da seção "Componentes do sistema" da página do padrão, com o CSS de referência (classes `s-`): cabeçalho `.s-cab` com linha da logo, abas `.s-abas`, faixa de título `.s-faixa-titulo`, botões `.s-btn` (primario, perigo, vidro, pequeno), campos `.s-campo`, mensagens `.s-msg` (ok, aviso, erro, info), selos `.s-selo`, situação `.s-situacao`, números `.s-kpi`, tabela `.s-tabela`, confirmação `.s-dialogo`, aviso rápido `.s-aviso` e estado vazio `.s-vazio`.
- Um botão principal por área; texto do botão diz a ação; confirmação só para o que apaga ou não tem volta.
- Verde certo, amarelo atenção, vermelho corrigir, sempre com texto. Números em formato brasileiro, à direita nas tabelas.
- Sem emoji. Foco visível, campos com rótulo, tudo pelo teclado. Sem rolagem lateral da página.
- Escalas: raio 10/12/14/16/18px; sombras --s1/--s2/--s3; botão 38px, campo 42px.
- Sistema com login e dados segue esta página; painel ou relatório de leitura segue o Layout Base. Os dois usam os mesmos tokens e fontes.

Textos: reutilize as mensagens da seção "Textos padrão" ao pé da letra (você, frases curtas, dizer o que fazer). A referência completa está na página "Padrão de Sistemas Tóliman".

Neste projeto: `PASTA_NOME = 'Produtividade de Motoristas'`, sistema `Produtividade_Motoristas`.
O build é o `scripts/3_painel.py` (não há `build.py`): junta `painel/base.html`, `painel/app.js`,
`painel/acesso.js` (login e dados), `painel/sistema.css`, fontes e imagens num arquivo único e
grava a versão. Teste da pasta com duas pessoas: `node tests/pasta-sharepoint.mjs`. O README para
quem opera é o `README.md`; o HANDOFF é `docs/handoff.md`.

## Detalhes

O procedimento completo — passos, armadilhas do PDF, modelo da planilha coluna a
coluna, estrutura do painel — está em:

@docs/procedimento.md

Para retomar o trabalho em outra sessão: `docs/handoff.md`.

O histórico de cada fechamento fica em `docs/historico/`. Leia o do mês anterior
antes de começar um mês novo; não precisa ler todos.
