# Fechamento de produtividade dos motoristas — Tóliman

Pipeline do fechamento mensal de bonificação, a partir do PDF "Planilha de
comissão" do Rodopar.

## Primeira vez

1. Instale o Claude Code (ver abaixo) e as dependências listadas no `CLAUDE.md`.
2. `git init && git add -A && git commit -m "estado inicial"` — ter histórico
   importa, porque os números mudam e você vai querer comparar versões.
3. Abra a pasta: `cd fechamento-motoristas && claude`

## Todo mês

1. Coloque o PDF do mês em `entrada/`.
2. No Claude Code: *"faça o fechamento de setembro, o PDF está em entrada/"*.
3. Confira o relatório de conferência antes de aceitar a planilha.
4. Commite `dados/AAAA-MM.json` e o doc novo em `docs/historico/`.

## Estado atual

Os três scripts estão em `scripts/` (com `comum.py`, que guarda a tabela de grupos
e as colunas derivadas). Julho, agosto e setembro de 2026 estão em `dados/`.

As bases de julho e agosto de 2026 e a casca do painel (`painel/base.html` +
`painel/app.js`) já foram recuperadas do painel publicado — ver `dados/LEIA-ME.md`
e `painel/LEIA-ME.md`.

## Sistema na pasta do SharePoint (quem opera)

O painel é um sistema: abre com usuário e senha e grava as checagens na pasta do sistema,
**Produtividade de Motoristas**, no canal do Teams da equipe. Nada fica só no computador de uma
pessoa. Use o **Chrome** ou o **Edge** (o app do Teams, o Firefox e o celular não acessam a pasta).
O link publicado no claude.ai é só para leitura.

**Uma vez em cada computador**
1. No Teams: canal da equipe › Arquivos › pasta *Produtividade de Motoristas* › **Adicionar atalho ao OneDrive**.
2. No Explorador de Arquivos, clique com o botão direito na pasta › **Sempre manter neste dispositivo**.
3. Abra o `Dashboard_Produtividade_Motoristas.html` sempre por essa pasta, no Chrome ou no Edge, e
   conecte essa mesma pasta quando o sistema pedir (clique em **Permitir**).

**Entrar.** A primeira pessoa numa pasta vazia cria o acesso e vira administradora. Os demais são
cadastrados pelo administrador em Configurações › Usuários e senhas, com uma senha provisória; na
primeira entrada cada um cria a sua. Esqueceu a senha? Peça a um administrador para redefinir. Mantenha
sempre **dois administradores**. Depois de 20 minutos sem uso a sessão bloqueia e pede a senha.

**Antes das férias (quem vai sair)**
1. Confira no topo “SharePoint: salvo em …” com a hora de agora.
2. Confira que o OneDrive não tem arquivos pendentes.
3. Feche o sistema, para liberar a checagem que estava aberta.

**Quem cobre**
1. Tenha acesso ao canal no Teams e um usuário no sistema.
2. Abra pela mesma pasta e entre. Os dados chegam sozinhos, em até um minuto.

**Atualizar o sistema.** Substitua o HTML na pasta do sistema; quem estiver com ele aberto aperta F5.
O rodapé mostra a versão (vAAAA.MM.DD) para conferir se o computador está com o arquivo novo.

**Checagens da versão anterior** (pasta *painel-dados* da equipe, até out/2026): o administrador
traz em Configurações › Importar da versão anterior, escolhendo a pasta da equipe. A pasta antiga
não é alterada.

