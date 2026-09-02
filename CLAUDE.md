# Gestão Toldos Gerais

Sistema interno de orçamentos e funil de atendimento da Toldos Gerais Ltda (toldos e coberturas — Belo Horizonte/MG). Uso por 1–2 pessoas, sem cadastro público de usuários.

## Stack

- Next.js 15 (App Router) + TypeScript
- SQLite via Drizzle ORM (better-sqlite3)
- shadcn/ui + Tailwind CSS (v4)
- Geração de PDF: @react-pdf/renderer
- Deploy: VPS Hostinger via Dokploy (Traefik + Let's Encrypt)
  - Banco em volume persistente: `/data/toldos.db` (NUNCA dentro do build)
  - Variável de ambiente `DATABASE_PATH=/data/toldos.db`
  - Domínio: **`toldos.cordena.net`** — é o único Host no roteador do Traefik.
    `toldos.bionatural.tech` NÃO existe e responde 404 do próprio Traefik (texto
    puro, 19 bytes): quem vir isso está batendo no domínio errado, não num app
    fora do ar (29/08/2026).

## Dev local

- `npm run dev` — porta **3008** (3000/3005/3006/3007 já usadas por outros apps)
- `npm run db:push` — aplica schema no SQLite (`./data/toldos.db` local)
- `npm run db:seed` — seed de fases e modelos (idempotente)
- Env em `.env.local`: `DATABASE_PATH`, `SESSION_SECRET`, `AUTH_USERS`
- Login local: `leticia@toldosgerais.com.br` / `toldos2026` (trocar em produção)
  - **Ordem de validação** (`validarCredenciais`): tabela `usuarios` → senha do
    vendedor → `AUTH_USERS` do env. **Linha em `usuarios` ganha do env**: se a
    senha for redefinida pela tela, a do `.env.local` para de valer e este
    trecho aqui passa a mentir. Aconteceu em 27/08/2026 — a saída foi
    `delete from usuarios where email = '…'`, que devolve o login ao env.

## Estrutura de pastas

```
src/
  app/
    (auth)/login/         # login (público)
    (app)/                # rotas protegidas
      atendimentos/       # lista do funil (tela inicial)
      atendimentos/[id]/
      orcamentos/
      orcamentos/novo/
      cadastros/clientes/
      cadastros/modelos/
      cadastros/fases/
    cadastro/[token]/     # página PÚBLICA de auto-cadastro (fora do auth)
    api/
  components/
    ui/                   # shadcn
    shared/
  db/
    schema.ts             # ✅ pronto
    index.ts              # ✅ pronto (DATABASE_PATH, WAL, FK on)
    seed.ts               # ✅ pronto
  lib/
    auth.ts               # ✅ sessão/login (server-only)
    session.ts            # ✅ token HMAC (Node + Edge)
    format.ts             # ✅ centavos ↔ BRL
    empresa.ts             # ✅ dados oficiais da empresa
  middleware.ts           # ✅ protege tudo exceto /login, /cadastro/*, /api/cadastro
```

## Autenticação

### Papéis (`src/lib/papeis.ts` — regras puras, testadas)

| | gestor | atendente | vendedor |
|---|---|---|---|
| Funil, orçamentos, contratos e Painel de **todo mundo** | ✅ | ✅ | só o que é dele |
| Cadastrar cliente e abrir atendimento | ✅ | ✅ | ✅ |
| **Escolher/trocar o vendedor** do atendimento | ✅ | ✅ | ❌ |
| Criar/editar orçamento, ficha e contrato | ✅ | ❌ | os dele |
| Modelos, Fases, Avisos, Usuários | ✅ | ❌ (só consulta) | ❌ (só consulta) |

- `veFunilInteiro(papel)` = gestor ou atendente — troca todo `papel === "gestor"`
  que era **visibilidade**. `podeComercial(papel)` = qualquer um menos atendente.
- Guards em `auth.ts`: `exigirGestor` (configuração), `exigirTriagem`
  (direcionar cliente), `exigirComercial` (orçamento/contrato).
- **Atendente não recebe lead**: fica fora da lista de responsáveis e do link
  público de cadastro. O papel é uma linha em `vendedores` como as outras.
- Login de admin do env/`usuarios` (sem linha em `vendedores`) continua gestor.
- A tela é **`/cadastros/usuarios`** ("Usuários", já que cabem os três papéis).
  `/cadastros/vendedores` continua respondendo, com redirect permanente. A
  **tabela do banco segue `vendedores`** — só a rota e os rótulos mudaram; não
  confundir com a tabela `usuarios`, que guarda os admins do env.
- **Redefinir senha**: botão por linha na tela de Usuários. Não pede a senha
  antiga (é a saída para quem esqueceu), gera sugestão de 10 caracteres sem
  0/O/1/l/I e permite copiar antes de salvar. Sem e-mail não há login, então o
  diálogo só explica o que falta. "Remover acesso" apaga a senha, mas o gestor
  é impedido de remover a própria — senão fica trancado do lado de fora.

- Sessão própria: cookie httpOnly `tg_session` com token HMAC-SHA256 (`SESSION_SECRET`), validade 30 dias
- Usuários em env `AUTH_USERS="email:senha,email2:senha2"` — sem signup público
- Middleware protege tudo em `(app)/`; `/cadastro/[token]` e `/login` são públicos
- Em Server Components/Actions protegidas: `exigirSessao()` de `@/lib/auth`

## Modelo de dados (Drizzle — src/db/schema.ts)

- **clientes**: id, nome, telefone, email, endereco, cidade, origem (`interno` | `auto_cadastro`), criado_em
- **fases**: id, nome, ordem, cor — seed: Novo lead, Visita técnica, Orçamento enviado, Negociação, Aguardando pagamento, Em produção, Instalação agendada, Concluído, Perdido
- **atendimentos**: id, cliente_id, fase_id, observacoes, criado_em, atualizado_em
- **historico_fases**: id, atendimento_id, fase_anterior_id, fase_nova_id, data
- **modelos_toldo**: id, nome, descricao_material, estrutura_aluminio, estrutura_ferro, fixacao_vedacao, ativo
- **orcamentos**: id, numero (`AAAA-NNN`, sequencial por ano), atendimento_id, modelo_id, descricao_material, estrutura_texto, tipo_estrutura (`aluminio` | `ferro`), fixacao_vedacao, garantia_texto, forma_pagamento, prazo_entrega, status (`rascunho` | `enviado` | `aprovado` | `recusado`), criado_em
- **orcamento_itens**: id, orcamento_id, descricao, valor_min (centavos), valor_max (centavos, null = valor único; valor_min null = subtítulo livre), ordem
- **tokens_cadastro**: id, token (nanoid 8), expira_em, usado_em, criado_em

### Regras

- Valores monetários sempre em **centavos** (integer); formatar com helpers de `@/lib/format.ts`
- Ao selecionar o modelo no formulário de orçamento, preencher automaticamente descricao_material, estrutura (conforme tipo escolhido) e fixacao_vedacao — todos editáveis depois
- Gerar orçamento com status `enviado` move o atendimento para a fase "Orçamento enviado" (registrando em historico_fases)

## Funil de atendimento

- Tela inicial: lista de atendimentos com dropdown de fase inline (sem kanban por ora)
- Filtros: fase, busca por nome/telefone
- Toda mudança de fase grava em `historico_fases`
- Exibir "há X dias nesta fase" em cada linha

## Tabelas: ordenação por coluna (27/08/2026)

Toda lista do sistema ordena clicando no cabeçalho. Duas peças:

- `src/lib/ordenacao.ts` — regras puras (`ordenarLista`, `linkDaColuna`,
  `compararValores`), com teste próprio.
- `src/components/shared/coluna-ordenavel.tsx` — o `<th>` clicável.

Como funciona e por quê:

- É um **`<Link>` com `scroll={false}`**. Funciona sem javascript, o estado
  fica na URL (dá para salvar a visão) e a página **não pula para o topo** —
  sem isso a tabela sai da vista e parece que nada aconteceu.
- A ordenação roda **em memória, depois da consulta**, porque várias colunas
  são calculadas: tempo em fase (vem do histórico), total do orçamento
  (subquery), valor do contrato com opções de preço.
- **Coluna de estado ordena pelo andamento, nunca pelo nome**: fase pela ordem
  do funil, status de orçamento por rascunho→enviado→aprovado→recusado, papel
  de usuário por gestor→atendente→vendedor. Alfabético não diria nada.
- **Vazio vai sempre para o fim**, nos dois sentidos — senão ordenar por uma
  coluna com buracos enche a primeira tela de linhas em branco.
- Filtro e busca são preservados via `extras`; a tela do cliente tem duas
  tabelas e usa pares próprios (`ordemA`/`dirA` e `ordemO`/`dirO`).

Telas cobertas: atendimentos, orçamentos, contratos, clientes, ficha do
cliente (2 tabelas), usuários, modelos, avisos e fases.

## Lista de atendimentos: filtro (26/08/2026)

- Os **botões redondos de fase saíram**. Filtrar era a mesma coisa em dois
  lugares; ficou só o seletor, que agora traz a contagem junto
  ("Orçamento enviado (13)") — a informação que os botões davam.
- **Colunas ordenam**: Cliente, Telefone, Status e No status. É `<Link>` puro,
  estado na URL (`?ordem=&dir=`), então funciona sem javascript e dá para
  salvar a visão. Clicar na coluna já ativa inverte.
- Ordenar por **Status usa a ordem do funil**, não o nome da fase. "No status"
  também é calculado (vem do `historico_fases`), então as duas ordenações
  acontecem em memória depois da consulta, não no SQL.
- Filtrar não desfaz a ordenação: `FiltrosFunil` repassa `ordem`/`dir`.
- Os links de ordenação e a busca usam **`scroll={false}`**. Sem isso o Next
  joga a página para o topo a cada clique, a tabela sai da vista e parece que
  a ordenação não funcionou.
- **Dispensa de aviso é otimista** (`linha-pendencia.tsx`): o item sai da lista
  no clique e só volta se o servidor recusar. Antes dependia de a tela se
  redesenhar depois de gravar; quando isso falhava, o item ficava lá e parecia
  que o clique não tinha feito nada.
- **Perdido** continua fora da visão padrão e agora só se chega nele pelo
  seletor — antes era pelo botão redondo.

## Auto-cadastro público

- Botão "Gerar link de cadastro" cria token (nanoid, 8 chars), expiração 7 dias, uso único
- Página `/cadastro/[token]`: mobile-first, logo da empresa, campos nome, telefone (obrigatórios), email, endereco, cidade, "descreva o que precisa" (opcionais)
- Ao enviar: cria cliente (origem `auto_cadastro`) + atendimento na fase "Novo lead"; token marcado como usado
- Também existe rota fixa `/cadastro/publico` (sem token) com o mesmo formulário, para divulgação permanente

## PDF do orçamento — "Proposta Técnica Comercial"

Replicar fielmente o modelo atual da empresa. Seções, nesta ordem:

1. Cabeçalho com logo + "PROPOSTA TÉCNICA COMERCIAL"
2. "Belo Horizonte, {data por extenso}"
3. A/c de {nome} {telefone} + endereço do cliente
4. MODELO
5. DESCRIÇÃO DO MATERIAL
6. ESTRUTURA
7. FIXAÇÃO E VEDAÇÃO DA ESTRUTURA
8. MONTAGEM DA COBERTURA (texto fixo padrão)
9. GARANTIA
10. VALOR DO ORÇAMENTO — itens com linha pontilhada até o valor; suportar valor único ou faixa (R$ X – R$ Y) e subtítulos livres (ex. "valores referente à troca de lona")
11. FORMA DE PAGAMENTO
12. PRAZO DE ENTREGA
13. Rodapé: Toldos Gerais Ltda — www.toldosgerais.com.br / vendas@toldosgerais.com.br — Rua Carmelita Prates da Silva, 501 – Salgado Filho – CEP 30550-110 – Belo Horizonte/MG – (31) 3646-1145

Botão "Enviar no WhatsApp": link `wa.me/55{telefone}` com mensagem padrão.

## Dados oficiais da empresa

Centralizados em `src/lib/empresa.ts`, em **duas** constantes:

- `EMPRESA` — Toldos Gerais Ltda. Vale para proposta/orçamento, ficha de
  instalação, páginas públicas, login e avisos de WhatsApp.
- `EMPRESA_CONTRATO` — **Comercial Mari Ltda (Distribuidora Alvorada)**, emitente
  dos CONTRATOS desde 26/08/2026. CNPJ 41.415.580/0001-65 · IE 0040120360063 ·
  Rua Estoril, 1724 – São Francisco – CEP 31255-190 – Belo Horizonte/MG ·
  (31) 3441-3900 · distribuidorabhza@gmail.com · contato Mariana Curvelano ·
  optante pelo Simples Nacional. Logo própria em `public/logo-alvorada.png`.

`EMPRESA` (Toldos Gerais):

- Toldos Gerais Ltda — www.toldosgerais.com.br
- Endereço: Rua Carmelita Prates da Silva, 501 – Salgado Filho – CEP 30550-110 – Belo Horizonte/MG
- Fixo (31) 3646-1145 · WhatsApp (31) 99614-6810
- vendas@toldosgerais.com.br · sac@toldosgerais.com.br
- Instagram @toldosgerais

## Seed de modelos de toldo

Toldo Retrátil Cortina · Toldos em Lona · Toldos Italianos e Motorização · Lonas Tensionadas · Sombreadores · Cobertura Termoacústica (telha sanduíche) · Coberturas Metálicas · Cobertura de Policarbonato e Vidro · Estrutura Geodésica · Coberturas Móveis

O Toldo Retrátil Cortina tem textos completos no seed (redação de referência — **conferir/ajustar com o João a partir do orçamento real**). Demais modelos: completar descrições com o João.

## Identidade visual

Paleta extraída da logo oficial (`public/logo.png` ✅):

- **Primária (verde)**: `#004E36` — texto "GERAIS" da logo; usada como `--primary`
- **Destaque (laranja)**: `#FF8500` — swoosh da logo; disponível em `--brand-orange`
- **Laranja queimado**: `#F15C00` — sombra do swoosh; `--brand-orange-dark`
- Base neutra: fundo `#FAFAFA`, texto `#1A1A1A`, bordas `#E5E5E5`
- Fonte: Inter (UI), via `next/font`
- Tokens definidos em `src/app/globals.css` (`:root`)
- Estética: minimalista, disciplinada, densidade confortável para uso diário

## Convenções gerais

- Todo o texto da UI em português do Brasil
- Server Components por padrão; Client Components apenas onde há interatividade
- Server Actions para mutações; validação com Zod em todas as entradas
- Datas com `date-fns` e locale `ptBR`
- Commits em português, prefixo por área: `feat(orcamentos): ...`
- Cada tela nova é implementada com um prompt específico; este arquivo cobre apenas convenções globais

## Status (2026-07-08)

- ✅ Scaffold Next.js 15.5 + TS + Tailwind v4 + shadcn/ui **versão Base UI** (sem Radix: triggers usam `render={...}` em vez de `asChild`; Buttons que renderizam `<Link>/<a>` precisam de `nativeButton={false}`; `onValueChange` recebe `string | null`)
- ✅ Schema Drizzle completo + seed (9 fases, 10 modelos)
- ✅ Auth por sessão própria + middleware
- ✅ Logo + paleta + tokens CSS
- ✅ Funil de atendimentos: lista com dropdown de fase inline, filtros (fase + busca), "há X dias nesta fase", dialog de novo atendimento (cliente novo ou existente), botão "Gerar link de cadastro"
- ✅ Detalhe do atendimento: cliente, observações editáveis, histórico de fases, orçamentos
- ✅ CRUDs: clientes (busca, editar, excluir com guarda), modelos (editar textos, toggle ativo), fases (ordem, cor, excluir com guarda)
- ✅ Orçamentos: lista, formulário novo **e edição** (`/orcamentos/[id]/editar`) — form compartilhado em `components/shared/orcamento-form.tsx`, auto-preenchimento pelo modelo + tipo de estrutura, itens com valor único/faixa/subtítulo, rascunho × enviado, detalhe com preview da proposta, mudança de status. Editar regrava os itens do zero (delete + insert) e só move a fase se estava em rascunho
- ✅ "Salvar como enviado" move o atendimento para "Orçamento enviado" com registro no histórico
- ✅ PDF "Proposta Técnica Comercial" (`/orcamentos/[id]/pdf`) com todas as 13 seções, linha pontilhada nos itens, logo e rodapé oficial
- ✅ Botão "Enviar no WhatsApp" (`wa.me/55…` com mensagem padrão)
- ✅ Auto-cadastro público: `/cadastro/[token]` (7 dias, uso único) e `/cadastro/publico` (permanente) → cria cliente `auto_cadastro` + atendimento em "Novo lead"
- ⚠️ Textos padrão em `src/lib/proposta.ts` (montagem, garantia, pagamento, prazo) e seed do Toldo Retrátil Cortina: **conferir redação com o João contra o orçamento real**
- ⚠️ Evitar `useSearchParams` em client components (causa mismatch de hidratação com IDs do Base UI) — passar valores como props do Server Component
- ⚠️ Aviso dev-only de hidratação do Base UI (IDs `base-ui-_R_…`) aparece em telas com `Select`/`RadioGroup` de valor pré-selecionado (ex.: `/orcamentos/[id]/editar`). É cosmético: os valores renderizam e salvam corretamente; some em produção. Não afeta funcionalidade
- ✅ **NO AR em produção: https://toldos.cordena.net** (HTTPS/Let's Encrypt). Verificado end-to-end: login real, middleware, banco criado+semeado no boot, cadastro público, PDF.
  - GitHub: `letcordeiro/gestao-toldos-gerais` (público), branch `main`.
  - Dokploy: projeto **Toldos Gerais** → app **app**. Provider **Git** (URL pública `https://github.com/letcordeiro/gestao-toldos-gerais.git`), Build Type **Dockerfile**, porta 3000.
  - Volume persistente: mount **toldos-data → /data** (banco `toldos.db`).
  - Env no Dokploy: `DATABASE_PATH=/data/toldos.db`, `SESSION_SECRET` (guardado no painel), `AUTH_USERS`.
  - `Dockerfile` multi-stage standalone, `scripts/init-db.mjs` roda migrations + seed no boot (idempotente), `db/index.ts` abre SQLite lazy (proxy).
- ✅ **Autodeploy on push LIGADO**: webhook do GitHub (`Settings → Webhooks`) aponta para a Webhook URL do Dokploy (aba Deployments), evento `push`, content-type JSON. Todo `git push` na `main` publica sozinho (Docker reaproveita cache quando o código não muda). SSH key local `~/.ssh/id_ed25519_toldos` (registrada no GitHub como "Mac Toldos") autoriza o push.

## Módulo de contratos (2026-08-05)

Contrato é **opcional** e nasce de um orçamento aprovado ("Gerar contrato" na tela do orçamento, mesma regra da ficha de instalação: só quando o atendimento está em fase que libera instalação).

- **Tabelas** (migration `0018_contratos`): `contratos`, `contrato_itens`, `contrato_pagamentos`, `contrato_aditivos`, `contrato_eventos`. Nomes em português, seguindo o resto do schema. `clientes.documento` (CPF/CNPJ) foi acrescentado — **obrigatório para emitir**.
- **Ciclo**: `rascunho` (edição livre, ainda sem número — é isso que identifica a minuta) → `emitido` (congela snapshot, ganha `CT-AAAA-NNNN`, edição bloqueada) → `assinado` (só aditivo depois) → `aditivado`. `cancelado` exige motivo; se já estava assinado, calcula e grava a retenção.
- **Nova versão** (antes de assinar): clona com `versao+1` + `contratoPaiId`, cancela a anterior com motivo "substituído pela versão N"; o PDF traz o aviso no cabeçalho.
- **Plano de pagamento** é a peça central: linhas com tipo/valor/meio/parcelas/gatilho. A **soma tem que bater exatamente** com `valorTotal` — totalizador sempre visível e emissão bloqueada quando não bate. 6 presets (à vista, entrada+saldo, entrada+cartão, parcelado, entrada+mensais, personalizado).
- **Fonte única do texto**: `src/lib/contrato-clausulas.ts` (`montarClausulas`) alimenta a prévia HTML e o PDF — nenhuma cláusula escrita duas vezes. Valor por extenso em `src/lib/valor-extenso.ts`.
- **Regras puras** (numeração, validação, presets, pendências, divergência, transições) em `src/lib/contratos.ts`, sem banco — é o que os testes cobrem.
- **Divergência**: se o orçamento mudar depois da emissão, a tela avisa comparando com o snapshot. Nunca sincroniza sozinho.
- **Link público**: `/contrato/{token}` (HTML + PDF), no padrão de `/proposta/{token}`. Rota liberada no middleware.
- **Testes**: `npm test` (38 unitários + ciclo completo em SQLite real). **Exige Node 20** (mesma major do Dockerfile; `better-sqlite3` é binário nativo). `npm run test:unit` roda só os unitários.
- **Emitente**: o contrato sai no nome da **Comercial Mari Ltda (Distribuidora
  Alvorada)** — logo, qualificação da CONTRATADA (com nome fantasia, IE e
  "optante pelo Simples Nacional") e rodapé vêm de `EMPRESA_CONTRATO`. Vale para
  o PDF (`contrato-pdf.tsx`), a prévia HTML (`contrato-preview.tsx`) e a versão
  de impressão (`/contratos/[id]/imprimir`) — e também para a logo da barra da
  página pública `/contrato/[token]`. O **WhatsApp dessa página continua o da
  Toldos Gerais**: é o canal de atendimento do João, não o emitente. O resto do
  sistema (proposta, ficha, login, avisos) segue Toldos Gerais.
- **Conferir o PDF**: `node scripts/preview-contrato.mjs` monta um banco novo
  (`data/preview.db`) com um contrato emitido e imprime o token; depois basta
  subir o dev apontando `DATABASE_PATH` para ele e baixar
  `/contrato/{token}/pdf`.
- **Contratante pessoa jurídica** (migration `0019_contratante_pj`): quando o
  documento do cliente tem 14 dígitos, a qualificação muda de "residente e
  domiciliado" para "pessoa jurídica de direito privado, com sede em … neste ato
  representada por …". O campo `representanteContratante` só aparece no
  formulário nesse caso; sem ele o contrato imprime uma linha para preencher à
  mão. Regra em `ehPessoaJuridica` (contrato-clausulas.ts).
- **Observações técnicas em vários parágrafos**: cada linha do campo vira um
  parágrafo próprio na Cláusula Primeira (descritivos longos de perfil, calha,
  acabamento). Uma linha só continua inline, como antes.
- **Vencimentos escalonados**: gatilho `dias_apos_assinatura` + `numeroParcelas`
  maior que 1 escreve "com vencimentos em 30, 60 e 90 dias contados da
  assinatura" em vez de "em até 30 dias". Vale também para
  `dias_apos_instalacao`.
- **Opções de preço** (migration `0020_contrato_opcoes`): tabela
  `contrato_opcoes` + coluna `contrato_pagamentos.percentual`. Duas ou mais
  opções colocam o contrato em **modo opções**: `valorTotal` deixa de valer, a
  Cláusula Segunda lista "Opção A / Opção B" com os valores e o plano de
  pagamento passa a ser **em percentual, somando 100%** (a validação de reais é
  trocada pela de percentual, inclusive nas pendências de emissão). O documento
  ganha um parágrafo dizendo que a opção contratada é indicada por escrito na
  assinatura. Lista vazia devolve o contrato ao valor fechado. Modo inferido de
  `temOpcoes()` — não há coluna de modo.
  - `gerarPresetPercentual` converte os presets para %, distribuindo a sobra do
    arredondamento na última linha (3 × 16,67 estouraria 100%).
  - `Clausula` ganhou `paragrafosFinais`/`itensFinais` para o plano poder vir
    DEPOIS da lista de opções — sem isso o leitor via percentual antes de saber
    sobre o que incide.
  - Lista de contratos mostra a faixa ("R$ 48.410,00 – R$ 89.600,00").
- **Snapshot defensivo**: `lerSnapshot()` devolve `null` para snapshot corrompido
  ou de formato antigo. Antes, `JSON.parse` direto derrubava a tela inteira do
  contrato com um snapshot parcial.
- **Seed de exemplo**: `SEED_CONTRATOS=1` no boot cria 2 contratos (rascunho + assinado). Fica atrás de env porque produção tem dados reais.


## Tarefas e automações (27/08/2026)

O funil dizia em que pé cada cliente estava, mas não o que fazer a seguir.
Tarefa é a próxima ação combinada; gatilho é quem cria a tarefa sozinho.

- **Tabelas** (migration `0021_tarefas_gatilhos`): `tarefas`, `gatilhos`,
  `motivos_perda`. `fases` ganhou `exibirNaListagem`, `terminal` e `ehPerdido`;
  `atendimentos` ganhou `motivoPerdaId`/`motivoPerdaObs`.
- **`src/lib/tarefas.ts` é puro** (sem banco, sem date-fns) para rodar no
  `node --test`, como `contratos.ts` e `papeis.ts`. As consultas ficam em
  `src/lib/tarefas-consulta.ts`.
- **Gavetas** organizam a tela: atrasada → hoje → amanhã → próximas → sem data.
  Tarefa sem data não cobra prazo de ninguém.
- **`dispararGatilhos(evento, ctx)`** (`src/lib/gatilhos.ts`) é chamado em
  `mudarFase`, nas duas funções `moverParaOrcamento*` (a fase também muda por
  ali), em `mudarStatusOrcamento` e em `emitirContrato`/`marcarAssinado`.
  **Nunca derruba a ação principal**: erro no gatilho é engolido de propósito.
  Não repete: já existindo tarefa PENDENTE daquela regra para o atendimento,
  pula — senão vai e volta de fase enchia a lista.
- **Seed** cria 4 automações (follow-up de orçamento em 3 dias, confirmar
  visita, cobrar assinatura, pós-venda em 7 dias) e 7 motivos de perda.
  Idempotente: só na primeira vez.

## Fases carregam comportamento (27/08/2026)

`"Perdido"` estava escrito à mão em quatro lugares. Agora são marcações na tela
de Fases:

| Marcação | O que muda |
|---|---|
| `exibirNaListagem` | fora dela, a fase só aparece escolhendo no filtro |
| `liberaInstalacao` | negócio fechado: aprova orçamento, libera ficha e contrato |
| `terminal` | sai da conta de "em aberto" no painel |
| `ehPerdido` | pede o motivo da perda e recusa os orçamentos que aguardavam |

Ao mover para uma fase `ehPerdido`, o `FaseSelect` para e pergunta o motivo
(cadastro em Configurações → Motivos de perda). Sair da fase limpa o motivo —
senão o relatório continuaria contando um negócio que voltou a andar.

## Campos novos do orçamento (27/08/2026)

`introducao` (abre a proposta), `aosCuidadosDe` (vazio = nome do cliente),
`validadeDias` (padrão 15; vazio = sem prazo) e `observacoesInternas`.

- A validade conta do **envio** (`enviadoEm`), não da criação; sem envio, vale a
  criação. `textoValidade()` e `aosCuidados()` moram em `src/lib/proposta.ts` e
  são usados nos **quatro** lugares que renderizam a proposta: PDF
  (`gerar-proposta.ts`), `/orcamentos/[id]/imprimir`, `/proposta/[token]` e a
  prévia da tela do orçamento.
- **`observacoesInternas` nunca sai** no PDF, no imprimir nem na página pública.
  Duplicar orçamento não copia a anotação: a cópia é outro negócio.

## Painel e navegação (27/08/2026)

- O painel **abre pelo dia**: tarefas atrasadas e de hoje antes dos números.
  Depois vêm conversão, ticket médio e ciclo de venda (`src/lib/metricas.ts`,
  tudo derivado de `historico_fases` + `orcamentos`), motivos de perda e
  **"precisam de atenção"** — sem tarefa marcada e parados há 30+ dias, ou
  nunca trabalhados.
- **Navegação segue a rotina**: Painel · Tarefas · Atendimentos · Orçamentos ·
  Contratos · Clientes. O resto foi para a engrenagem **Configurações**
  (`menu-config.tsx`): Fases, Automações, Avisos, Motivos de perda, Modelos,
  Usuários. Fases e Avisos eram telas órfãs, alcançáveis só por um botão dentro
  de Atendimentos.
- **Tela do orçamento**: os nove botões do topo viraram uma faixa de
  **"Próximo passo"** (que muda conforme o status) + `AcoesOrcamento`, um menu
  com editar, duplicar, link do cliente e excluir.

## Instalações, cobrança e resumo por e-mail (27/08/2026)

### Painel de instalações (`/instalacoes`)

Entra na lista o orçamento cujo atendimento está numa fase de **negócio
fechado** e que ainda não teve `dataEntrega` registrada na ficha. O prazo é a
`prevEntrega` da ficha, e a gaveta é **a mesma das tarefas**
(`gavetaDaTarefa`) — duas telas que falam de prazo contam do mesmo jeito.
Alerta próprio para "negócio fechado sem ficha": é o furo mais caro do
processo. O painel avisa quando há instalação vencida ou marcada para hoje.

### Régua de cobrança

- `contrato_pagamentos.pago_em` (migration `0022_cobranca`) guarda a baixa.
- **`src/lib/cobranca.ts` é puro e testado**: `vencimentoEfetivo` traduz o
  gatilho da parcela em data (assinatura, dias após instalação, data fixa…).
  **Parcela presa a evento que ainda não aconteceu devolve `null`** — é o que
  impede a régua de cobrar por algo que não era para ter acontecido.
- A régua reaproveita os **avisos**: dois gatilhos novos, `parcela_vencida` e
  `contrato_sem_assinatura`. Cada degrau (1, 7, 15 dias) é um aviso editável.
  O alvo do "já contatei" é a **parcela**, não o contrato.
- Cartão **Recebimentos** aparece no contrato assinado, separado do plano de
  pagamento: o plano é o que foi combinado (e trava ao emitir); a baixa é
  operação do dia.

### Resumo por e-mail (`/cadastros/resumos` + `POST /api/resumos`)

- Tabela `resumos` (migration `0023_resumos`), com blocos e destinatários em
  JSON — lista curta que muda junto com o código.
- `estaNaHora()` compara com o **último envio**, não com o calendário: cron que
  falhou ontem manda hoje em vez de pular o período em silêncio. Margem de 2h
  para a variação do cron.
- `ultimoEnvioEm` só é gravado **depois** do envio dar certo.
- Blocos vazios não entram no e-mail.
- O envio é externo. Cron da VPS:
  ```
  0 7 * * * curl -fsS -X POST https://SEU-DOMINIO/api/resumos \
    -H "Authorization: Bearer $RESUMO_TOKEN"
  ```
  Envs necessárias: `RESUMO_TOKEN` + o SMTP (`SMTP_HOST`, `SMTP_USER`,
  `SMTP_PASS`, `EMAIL_FROM`). A rota confere a frequência, então chamar demais
  não manda e-mail repetido.
- `scripts/preview-resumo.mts` monta o e-mail com os dados reais e grava um
  HTML, **sem enviar nada** — foi assim que apareceu a inconsistência abaixo.

### Ciclo de venda × conversão contam a mesma população

O ciclo médio olhava o histórico inteiro e a conversão olhava a fase atual.
Resultado: "ciclo de 48 dias" com "0 fechados" na mesma tela. Agora os dois
contam só quem está fechado **agora** (`idsGanhos` em `metricas.ts`).

### Dois dev servers na mesma pasta corrompem o `.next`

Aconteceu em 27/08: a sessão do Claude subiu um dev server enquanto outro já
rodava na pasta, e o `.next` compartilhado começou a dar `ENOENT` em
`build-manifest.json`. **Um dev server por pasta.** Para conferir código sem
subir servidor, use `NEXT_DIST_DIR=.next-verify npx next build` — o padrão
`/.next-*/` já está no `.gitignore`.

## Pesquisa, chamados, cotação, comissão e numeração (27/08/2026)

### Pesquisa de satisfação

Tabela `pesquisas` (0024): **uma por atendimento**, com token próprio. Nasce da
variável **`{pesquisa}`** numa automação — que resolve o link na hora. Fica no
gatilho (escrita) e não no aviso (leitura): aviso é lido a cada carregamento de
tela e não pode criar registro. Página pública `/pesquisa/[token]` com nota
0–10 e comentário; responder de novo sobrescreve. `/pesquisas` mostra NPS, nota
média, distribuição e quem não respondeu (`src/lib/pesquisa.ts`, puro).

**Sem `APP_URL` não há link**: nesse caso a variável sai da mensagem junto com
os dois-pontos que a antecediam — mandar "ajuda muito a gente: " é pior do que
mandar a frase sem o convite.

### Chamados (pós-venda e garantia)

Tabelas `chamados` + `chamado_interacoes` (0025). O chamado é preso ao
**atendimento**, então o histórico do cliente continua num lugar só.

A tela abre pela **garantia** — é a primeira pergunta de todo chamado, porque
decide quem paga a visita. `avaliarGarantia()` conta a partir da **conclusão da
instalação** (`orcamento_instalacao.dataEntrega`), com o prazo do contrato
quando existe. Sem data de entrega o status é **"indefinida"**, nunca
"expirada". Mudar a situação grava linha no histórico sozinha.

## Ordem de Manutenção (31/08/2026)

A ficha de papel que a equipe levava à mão virou impressão do chamado — é o
**mesmo registro**, não um cadastro à parte: o que se preenchia no papel já
estava quase todo no sistema, faltavam quatro campos (0034 em `chamados`):

| Campo da ficha | Onde mora |
|---|---|
| Nome / Tel / End. | `clientes` (pelo atendimento) |
| Data da instalação | `orcamento_instalacao.dataEntrega` do orçamento ligado |
| com / sem garantia | `chamados.naGarantia` |
| Vendedor | `atendimentos.vendedorId` |
| Data da ligação | `chamados.criadoEm` |
| **Instalador** | `chamados.instalador` — texto livre |
| **Valor** | `chamados.valor` (centavos) |
| **Vedação / Outros** | `chamados.tipoServico` + `servicoOutros` |
| **Data da ida ao local** | `chamados.visitaEm` |

**Instalador é texto livre de propósito.** Quem executa é quase sempre
terceirizado, não tem cadastro nem login; exigir cadastro travaria o
preenchimento. O preço é não dar para filtrar por instalador — se um dia isso
fizer falta, aí sim vira cadastro.

`GET /chamados/[id]/pdf` gera **folha A4 com a ficha na metade de cima** e um
tracejado "corte aqui" no meio (01/09/2026). O desenho é de A5 deitada; a
folha é A4 porque **a impressora da loja é A4** — sair em A5 obrigaria a trocar
bandeja ou deixaria o papel encolhido no meio da página.

As duas medidas casam exatamente: a largura de uma A4 em pé (595pt) é a de uma
A5 deitada, e metade da altura da A4 (420pt) é a altura de uma A5 deitada.

**O botão "Imprimir ficha" vai para `/chamados/[id]/imprimir`, NÃO para o PDF**
(01/09/2026). Celular não imprime PDF: o link abria o arquivo e parava aí, sem
diálogo de impressão. A página HTML chama `window.print()` sozinha e funciona
em qualquer navegador — e no diálogo já tem "Salvar como PDF" para quem quer o
arquivo. Mesma razão que já valia para a ficha de instalação e o contrato.
O PDF continua em `/chamados/[id]/pdf`, atrás do "Baixar PDF", para mandar.

As duas saídas lêem `dadosDaOrdem()` — uma consulta só. Se um campo novo entrar
na ficha, entra nos dois lugares ou em nenhum.

Logo da Toldos Gerais (`EMPRESA`, não `EMPRESA_CONTRATO` — só o contrato mudou
de emitente). Rota **interna** nas duas saídas: não existe versão pública, e
vendedor só imprime a ficha dos próprios clientes.

**Todo campo sai como linha sublinhada, mesmo preenchido.** A ficha continua
sendo papel de trabalho: o que o sistema não sabe vai em branco para escrever
no local, e as três linhas do relato existem para o instalador anotar o que
encontrou. `linhasDaFicha()` devolve sempre o mesmo número de linhas por isso.

Nada é copiado para o chamado na hora de abrir: a ficha impressa hoje lê o
cadastro de hoje, então corrigir um telefone conserta a próxima impressão
sozinho.

Massa de teste: `node scripts/preview-ordem-manutencao.mjs` monta
`data/preview-ordem.db` do zero (roda todas as migrations) com três chamados —
ficha cheia, ficha vazia e serviço "outros".

## Escolher cliente: seletor com busca (31/08/2026)

`components/shared/seletor-cliente.tsx` — um componente só, usado no diálogo de
chamado, no de visita e no "cliente existente" do novo atendimento. Lista em
ordem alfabética e **filtra pelo que se digita**.

As regras ficam separadas em `lib/busca-cliente.ts`, com teste, porque errar
aqui não quebra tela nenhuma — só faz o cliente sumir da lista, que é o defeito
que ninguém percebe até alguém reclamar:

- casa em **qualquer parte** do texto, não só no começo — "carlos" tem que
  achar "João Carlos Ferreira";
- **ignora acento e caixa** — "goncalves" acha "Gonçalves";
- cada palavra digitada precisa aparecer, **em qualquer ordem**;
- o **telefone** entra na busca junto: é como se separa dois homônimos.

O id escolhido vai num `<input type="hidden">`, então as Server Actions
continuam recebendo exatamente o que sempre receberam. Qual id depende da tela
(atendimento nos chamados e visitas, cliente no novo atendimento) — quem chama
decide.

## Impressão: `min-h-screen` gera página em branco no iPhone (02/09/2026)

O shell do app é `min-h-screen`. Em IMPRESSÃO, o **Safari do iPhone** entende
`100vh` como a altura do CELULAR, muito maior que uma A4: a caixa com
`bg-background` estourava a folha e saía uma segunda página com uma faixa
cinza e nada mais. O Chrome do computador remapeia `vh` para a folha e **não
reproduz** — cheguei a testar a hipótese no Chrome, ela "passou", e eu a
descartei errado. Só o PDF salvo pelo Safari mostrou a faixa.

Consertado com `print:min-h-0 print:bg-white` no shell (`(app)/layout.tsx`).

**Lição para a próxima:** impressão que só falha no celular precisa ser
depurada com o PDF DAQUELE navegador. Chrome desktop não serve de prova, e a
faixa de fundo é a pista — página "em branco" quase nunca está vazia.

## Editar orçamento já enviado (01/09/2026)

O formulário só tinha "Salvar rascunho" e "Finalizar e enviar". Num orçamento
que o cliente JÁ RECEBEU, o primeiro **derrubava o status de volta para
rascunho** e o segundo levava recusa por reenvio — não existia salvar mantendo
"enviado". Quem só queria corrigir um valor a pedido do cliente desfazia o
envio sem perceber.

Agora o status do formulário aceita um terceiro valor, **`manter`**, que
preserva o status atual. Em orçamento fora de rascunho a tela mostra só
**"Salvar alterações"**; em rascunho, os dois botões de sempre.

O `publicToken` NÃO muda ao editar: o link que o cliente já tem passa a mostrar
a versão corrigida. É isso que se quer — o cliente pediu a alteração.

`manter` não existe na criação (orçamento nasce rascunho); se chegar lá, vira
rascunho.

## Foto no orçamento: dois limites que precisam combinar (01/09/2026)

O Next recusa Server Action com corpo acima de **1 MB por padrão**, e isso
nunca tinha sido configurado. O formulário aceitava foto de até 8 MB, então
**qualquer foto de celular derrubava o envio inteiro** com "Application error:
a server-side exception has occurred" — sem dizer o motivo, e sem aparecer
para quem testava sem anexar foto. Custou um dia de trabalho do João em
31/08/2026, com três hipóteses erradas pelo caminho (papel de usuário, cache do
navegador, id de atendimento).

Agora são três números que têm que continuar combinando:

| Onde | Quanto | Papel |
|---|---|---|
| `next.config.ts` → `serverActions.bodySizeLimit` | 40 MB | último recurso |
| `lib/limites-foto.ts` → `MAX_ENVIO_BYTES` | 32 MB | soma das fotos, barra no navegador |
| `lib/limites-foto.ts` → `MAX_FOTO_BYTES` | 8 MB | cada imagem |

`limites-foto.ts` NÃO tem `server-only` de propósito: os dois lados leem o
mesmo número. Quando o navegador barrava com um limite e o servidor com outro,
o envio morria sem explicação.

**Ao mexer em qualquer um: o do next.config tem que ser o MAIOR**, com folga
para o resto do formulário, que viaja no mesmo envio. Se ele ficar abaixo dos
outros, o defeito volta exatamente igual — e ele não aparece em teste sem foto.

## Agenda do Google por vendedor (31/08/2026)

Cada vendedor conecta a PRÓPRIA agenda em `/perfil`. O sistema usa isso só para
saber o que já está ocupado, e mostra os horários livres na hora de marcar
visita.

**Só leitura, e só free/busy.** O escopo é `calendar.readonly` e a consulta é a
`freeBusy` da API: o Google devolve apenas as FAIXAS ocupadas, sem título e sem
convidado. O sistema nunca escreve na agenda de ninguém.

**Privacidade (regra da Letícia, 31/08/2026):** só o dono da agenda vê os
próprios compromissos. Para os outros — a atendente marcando visita para o
vendedor — saem apenas as visitas de cliente marcadas neste sistema, que já são
informação de trabalho. O compromisso particular encolhe o horário livre e
pronto; a tela só diz que "há compromissos particulares no dia". Devolver
"ocupado 19h–22h, terça e quinta" contaria a vida de fora do trabalho de quem
só emprestou a agenda.

O cálculo junta DUAS fontes: Google + visitas já marcadas aqui. Só a do Google
deixaria marcar duas visitas no mesmo horário; só a daqui ignoraria o dentista.

Peças: `lib/disponibilidade.ts` (o que sobra livre — puro, testado),
`lib/google-freebusy.ts` (lê a resposta do Google — puro, testado),
`lib/google-agenda.ts` (OAuth, token, consulta), `lib/cripto.ts` (AES-256-GCM),
rotas `/api/google/conectar` e `/api/google/callback`, tabela `agendas_google`
(0035).

**Envs (Dokploy, nunca no repositório):** `GOOGLE_CLIENT_ID`,
`GOOGLE_CLIENT_SECRET`, `AGENDA_ENCRYPTION_KEY` (`openssl rand -hex 32`) e
`APP_URL`. Sem os quatro, a integração some da tela e o cálculo de horário
livre segue funcionando só com as visitas do sistema — nada quebra.

O convite para conectar aparece em DOIS lugares: no perfil e numa faixa na tela
de **Visitas** — é lá que a falta da agenda aparece, e ninguém entra no perfil
sem motivo. A faixa some sozinha quando a agenda está conectada, e nunca é
mostrada para a atendente: ela marca a agenda dos outros, a dela não entra no
cálculo de ninguém.

Perder a `AGENDA_ENCRYPTION_KEY` **não** é catástrofe (ao contrário da do cofre
do Gestão): ninguém perde dado, cada vendedor só reconecta a agenda.

O `state` do OAuth é assinado (`lib/google-estado.ts`) e conferido contra o
vendedor logado — sem isso dava para induzir alguém a ligar a agenda de um
estranho à própria conta.

## "Abrir chamado" fica em três lugares (31/08/2026)

Na tela do atendimento (cliente já definido), na lista de Chamados e na lista
de Atendimentos. Nas duas listas o cliente é escolhido dentro do diálogo, pelo
seletor com busca, e a consulta é a `atendimentosParaChamado()` — que NÃO
filtra fase terminal, ao contrário da de visita: pós-venda é justamente para
quem já teve o toldo instalado e saiu do funil.

Quem vê o funil inteiro escolhe o responsável já na criação; vendedor abre
para si.

## Link em tabela é verde (31/08/2026)

Nome que leva para outra tela usa `text-primary hover:underline`. Só
`hover:underline` faz o link parecer texto comum, e ninguém passa o mouse em
cima de um texto para descobrir que ele clica.

Isso escondeu a tela do atendimento: as ações do cliente (abrir chamado,
agendar visita, novo orçamento) só existem em `/atendimentos/[id]`, e o único
caminho até lá é o nome na lista. Pintado de preto, a tela inteira ficou
inalcançável — quem procurava os botões procurava na lista, onde eles nunca
estiveram.

## Linha de botões precisa de `flex-wrap` (31/08/2026)

A tela do atendimento tem cinco ações no cabeçalho. Sem `flex-wrap`, no celular
as últimas ("Abrir chamado", "Novo orçamento") saíam para fora da tela **sem
barra de rolagem** — deixavam de existir para quem usa, e o defeito não aparece
em nenhum teste nem no monitor do desenvolvedor. Toda linha de ações de
cabeçalho leva `flex flex-wrap`.

### Cotação de fornecedor

Tabelas `fornecedores`, `cotacoes`, `cotacao_itens`, `cotacao_fornecedores`,
`cotacao_respostas` (0026). Cada fornecedor tem **link próprio**
(`/cotacao/[token]`) e não vê o preço dos outros.

- Item em branco = "não trabalho com isso", **diferente de cotar zero**.
- Na comparação, `totalCompleto` separa quem cotou a lista inteira: somar
  cotação parcial faria quem cotou menos parecer o mais barato.
- **Editar a lista de material apaga as respostas** (cascade). É o certo — o
  preço de antes não vale para outra lista — e o aviso está na tela.

### Equipe de instalação e comissão

Tabelas `instaladores` + `instalacao_equipe` (0027). Instalador **não é usuário
do sistema**: é quem trabalha na obra, e tem cadastro próprio. Comissão em
percentual (sobre a soma dos itens do orçamento) ou valor fixo.

`valorDaComissao()` devolve **`null`, nunca zero**, quando o percentual não tem
valor de orçamento para incidir: "ainda não dá para calcular" é diferente de
"não deve nada". `/instalacoes/comissoes` agrupa **por instalador**, porque a
pergunta é "quanto devo pro Zé", não "quanto devo nesta obra".

### Numerações configuráveis

Tabela `numeracoes` (0028) guarda **só o formato** (prefixo, incluir ano,
dígitos). O **sequencial continua saindo dos números que já existem** — contador
guardado em tabela desencontra do banco depois de um registro apagado ou de um
backup restaurado. Trocar o prefixo recomeça a contagem, e o documento antigo
mantém o número que já saiu no papel.

`src/lib/numeracao.ts` é puro; `numeracao-consulta.ts` lê a config e cai no
formato histórico (`2026-001`, `CT-2026-0001`) se a tabela vier vazia.

## Navegação: barra, "Mais" e engrenagem (27/08/2026)

- **Barra principal — só o que se abre TODO DIA**: Painel · Tarefas ·
  Atendimentos · Orçamentos · Instalações.
- **Um único menu "Mais"**, com dois blocos:
  - *Telas* (uso semanal): Chamados, Clientes, Cotações, Satisfação.
  - *Configurações* (só gestor): Fases, Automações, Avisos, Motivos de perda,
    Resumo por e-mail · Modelos, Fornecedores, Instaladores, Numerações,
    Usuários.
- A engrenagem separada foi removida: um botão só para tudo que não é do dia a
  dia. No mobile já era assim.
- `MenuSuspenso` (`menu-config.tsx`) monta o menu a partir de grupos.

### `npm run test:menu` — toda tela precisa ter caminho

Cotações e Satisfação **sumiram do menu** numa edição de texto e ninguém
percebeu: as telas continuavam funcionando, só não havia como chegar nelas.
`scripts/teste-menu.mjs` varre `src/app/(app)` e falha se alguma tela não
estiver no menu nem na lista de exceções (alcançada por botão ou redirect) —
e também se um item de menu apontar para tela que não existe.

## A lista de contratos foi absorvida pela de orçamentos (27/08/2026)

As duas listas eram a mesma tabela — Número, Cliente, Status, Valor, Data — e a
de contratos ainda trazia uma coluna "Orçamento" que só apontava de volta.

- **A lista sumiu; o documento não.** `/contratos/[id]` continua sendo tela
  própria, com emissão, versões, aditivos, plano de pagamento e recebimentos.
  Juntar os detalhes enterraria um documento de valor jurídico (e de **outro
  emitente** — Comercial Mari) atrás do status de uma proposta.
- `/orcamentos` ganhou a coluna **Contrato** (selo + número) e uma barra de
  filtros — "com contrato", "minuta", "aguardando assinatura", "assinado" —
  que responde o que a lista antiga respondia.
- O join do contrato **ignora cancelado**: na lista importa o documento que
  vale hoje.
- `CelulaContrato` é componente de cliente por causa do `stopPropagation`: sem
  ele o clique no selo dispara junto o clique da linha (que abre o orçamento),
  e o orçamento ganha a corrida.
- `/contratos` virou **redirect** para `/orcamentos?contrato=com` — link antigo
  em favorito ou WhatsApp não pode virar erro. O "← Contratos" da tela do
  contrato virou "← Orçamento {número}".
- **Criar contrato nunca passou pela lista**: sai do botão "Gerar contrato" na
  tela do orçamento, liberado pela fase de negócio fechado. Nada mudou aí.

## Diálogo + navegação: nunca no mesmo instante (02/09/2026)

`setAberto(false)` seguido de `router.push()` na mesma função **desmonta o
diálogo no meio da animação de saída** e deixa o fundo dele órfão no
documento — invisível, fora da árvore da página, e engolindo todo clique. A
tela seguinte abre e nada responde até um F5. Foi o "site trava ao trocar de
página" relatado em 02/09/2026.

O certo é guardar o destino e navegar em **`onOpenChangeComplete`**, que só
dispara quando o fechamento terminou:

```tsx
const [destino, setDestino] = useState<string | null>(null);
// no sucesso: setDestino(url); setAberto(false);
<Dialog open={aberto} onOpenChange={setAberto}
  onOpenChangeComplete={(open) => {
    if (open || !destino) return;
    router.push(destino); setDestino(null);
  }}>
```

`router.refresh()` pode ir na hora: ele não desmonta o diálogo, só refaz o
servidor. É só `push`/`replace` que criam a corrida.

**Isto não aparece em teste automatizado**: no navegador headless as animações
não rodam, o diálogo fecha na hora e a corrida não acontece. Só se vê no
navegador de verdade.

## Diálogos: altura da tela (26/08/2026)

`DialogContent` tem `max-h-[calc(100dvh-2rem)]` + `overflow-y-auto`. Antes, um
diálogo mais alto que a janela era **cortado em cima e embaixo** — sumia o
título e o botão de salvar ficava inalcançável (reportado no "Novo
atendimento"). O X de fechar mora numa faixa `sticky` de altura zero antes do
conteúdo, então continua no canto depois de rolar.

Formulário longo dentro de diálogo (novo atendimento, cliente) usa
`DialogHeader` com `sticky top-0` e o botão de salvar num rodapé
`sticky bottom-0`, ambos com `-mx-4` para encostar nas bordas.

## Armadilha: `loading.tsx` × Server Actions (25/08/2026)

**Não colocar `loading.tsx` no grupo `(app)`.** Um `loading.tsx` cobrindo o
grupo inteiro cria um Suspense boundary em todas as rotas — e quando uma Server
Action chama `revalidatePath` da rota que está aberta, o resultado da action
nunca volta para o cliente. Sintomas (todos reproduzidos e confirmados):

- "Criar atendimento" ficava em **"Criando…"** para sempre, com o diálogo aberto
  por cima da tela nova (só saía clicando fora);
- mudar a **fase** no detalhe do atendimento travava o seletor e a tela não
  refletia a fase nova (o banco gravava certo);
- **"já contatei"** gravava mas o item não sumia da lista sem recarregar.

Foi adicionado na auditoria de usabilidade de 04/08 (para dar feedback entre
telas) e removido em 25/08. Se um dia voltar a fazer falta, use `loading.tsx`
por rota específica que não sofra revalidação por action, nunca no grupo todo.

Blindagens que ficaram (valem por si):
- mutação no cliente usa `try/finally` com estado próprio, então o botão
  **sempre** destrava, mesmo com erro (e mostra aviso em vez de travar);
- depois de gravar, `router.refresh()` garante a tela atualizada;
- `criarAtendimento` devolve o id em vez de chamar `redirect()` — com
  `useActionState` o redirect deixava o botão preso.


Para zerar o banco local: `rm -rf data/toldos.db* && npm run db:push && npm run db:seed`
Boot em produção cria/semeia o banco sozinho via `scripts/init-db.mjs`.

---

## Ficha do sistema (movida do CLAUDE.md da raiz em 21/08/2026)

- **O quê:** Sistema interno de orçamentos e funil de atendimento da Toldos Gerais
  (toldos e coberturas — BH).
- **Stack:** Next.js 15 + **SQLite/Drizzle** (não é Postgres) + shadcn/ui, PDF com `@react-pdf/renderer`.
- **Banco em uso:** `data/toldos.db` (definido em `.env.local` → `DATABASE_PATH` e em `drizzle.config.ts`).
- **Dev local:** porta 3008. Login de dev: `leticia@toldosgerais.com.br`.
- **Repositório:** `letcordeiro/gestao-toldos-gerais`.
- **Status:** Setup concluído (schema, seed, auth, logo, paleta). Próximo: telas do funil,
  CRUDs, orçamento + PDF, auto-cadastro.
- **Avisos de WhatsApp** viraram cadastro em `/cadastros/avisos`; todo item tem
  "já contatei" + "não avisar mais".
- **Site institucional** (WordPress + WPForms) documentado em `docs/site-wordpress/`.

### Cópias antigas do banco
`data/toldos 2.db` … `toldos 7.db` (e seus `-shm`/`-wal`) foram movidos para
`../_triagem/duplicatas/toldos-db-antigos/`. O banco vivo continua sendo `data/toldos.db`.
