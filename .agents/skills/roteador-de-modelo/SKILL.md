---
name: roteador-de-modelo
description: Escolhe automaticamente o modelo (Haiku, Sonnet ou Opus) conforme a complexidade do serviço e delega a execução a um subagente com esse modelo. Use quando o usuário pedir "use o modelo certo", "troque de modelo automaticamente", "roteie por modelo", "/roteador-de-modelo", ou quando uma tarefa for claramente trivial (economizar) ou claramente difícil (precisa do modelo mais forte).
---

# Roteador de Modelo

Esta skill classifica o serviço pedido e o executa no modelo mais adequado,
equilibrando custo, velocidade e qualidade.

> **Limitação:** uma skill não troca o modelo da conversa principal. A troca
> acontece delegando o serviço a um subagente com o modelo escolhido. Para
> trocar o modelo da sessão inteira, o usuário usa `/model`.
>
> **Funciona sozinha:** os subagentes dedicados (`modelo-rapido`,
> `modelo-padrao`, `modelo-avancado`) são opcionais. Se não estiverem
> instalados, a skill usa o subagente `general-purpose` com o parâmetro `model`.

## Passo 1 — Classificar o serviço

Avalie o pedido (e, se preciso, dê uma olhada rápida nos arquivos envolvidos) e
escolha **um** nível:

| Nível | Subagente | Modelo | Quando usar |
| --- | --- | --- | --- |
| **Rápido** | `modelo-rapido` | `haiku` | Tarefas mecânicas e de baixo risco: buscar/listar arquivos, resumir texto curto, renomear, corrigir typo, formatar, traduzir, gerar JSON/CSV a partir de dados prontos, responder dúvidas factuais simples sobre o repositório. |
| **Padrão** | `modelo-padrao` | `sonnet` | O dia a dia: implementar ou alterar uma funcionalidade delimitada, escrever/ajustar fluxos do Power Automate, expressões e fórmulas, revisar um arquivo, escrever documentação, depurar um erro com causa provável conhecida. |
| **Avançado** | `modelo-avancado` | `opus` | Alto risco ou alta ambiguidade: arquitetura e decisões de design, refatoração em vários arquivos, bugs difíceis/intermitentes, segurança e permissões, análise de requisitos vagos, planejamento de projeto, qualquer coisa em que um erro custe caro. |

Regras de desempate:

1. Na dúvida entre dois níveis, escolha o **mais alto**.
2. Se o usuário citar um modelo ou nível ("faz no Opus", "algo rápido"), obedeça.
3. Serviços com várias partes de níveis diferentes: divida e delegue cada parte
   ao nível dela (partes independentes podem rodar em paralelo).
4. Perguntas de conversa que você já sabe responder sem ferramentas: responda
   direto, sem delegar.

## Passo 2 — Avisar a escolha

Antes de delegar, diga em uma linha qual nível foi escolhido e por quê. Exemplo:

> Nível **Padrão (Sonnet)**: alteração delimitada no Fluxo 2.

## Passo 3 — Delegar

Primeiro veja se o subagente dedicado do nível existe: ele aparece na lista de
tipos de agente disponíveis da ferramenta `Agent` (ou como arquivo em
`.claude/agents/` do projeto ou `~/.claude/agents/`).

Chame a ferramenta `Agent` com:

- `subagent_type`:
  - se o subagente dedicado existir: `modelo-rapido`, `modelo-padrao` ou `modelo-avancado`;
  - se não existir: `general-purpose` (se esse também não estiver na lista,
    omita `subagent_type`);
- `model`: `haiku`, `sonnet` ou `opus` — **sempre** informe; é ele que garante o
  modelo quando se usa `general-purpose`;
- `prompt`: instrução **autossuficiente** — o subagente começa sem o contexto da
  conversa, então inclua objetivo, arquivos relevantes, restrições e o formato
  de resposta esperado. Ao usar `general-purpose`, acrescente no início do
  prompt a postura do nível:
  - Rápido: "Execute à risca, sem ampliar o escopo, e responda de forma curta.
    Se a tarefa for mais complexa do que parece, pare e avise."
  - Padrão: "Leia o código relevante antes de alterar, siga o estilo existente,
    valide o que fizer e termine com: o que foi feito, arquivos alterados e
    pontos em aberto."
  - Avançado: "Investigue a fundo antes de agir, considere alternativas e
    efeitos colaterais, valide com evidências e termine com: diagnóstico,
    decisão e por quê, mudanças feitas e riscos remanescentes."
- `run_in_background: false` quando o próximo passo depender do resultado.

Se a chamada falhar porque o `subagent_type` não existe, repita com
`general-purpose` (ou sem `subagent_type`) mantendo o mesmo `model`.

## Passo 4 — Conferir e entregar

- Revise o resultado do subagente. Se um nível **Rápido** ou **Padrão** errou ou
  ficou raso, refaça uma vez no nível acima e informe a escalada.
- Repasse ao usuário o que importa (o relatório do subagente não aparece para ele).
