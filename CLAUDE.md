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
  - Domínio inicial: `toldos.bionatural.tech` (migrar depois para `app.toldosgerais.com.br`)

## Dev local

- `npm run dev` — porta **3008** (3000/3005/3006/3007 já usadas por outros apps)
- `npm run db:push` — aplica schema no SQLite (`./data/toldos.db` local)
- `npm run db:seed` — seed de fases e modelos (idempotente)
- Env em `.env.local`: `DATABASE_PATH`, `SESSION_SECRET`, `AUTH_USERS`
- Login local: `leticia@toldosgerais.com.br` / `toldos2026` (trocar em produção)

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
13. Rodapé: Toldos Gerais Ltda — www.toldosgerais.com.br / vendas@toldosgerais.com.br — Av. Waldir Soeiro Emrich, 4645 A – Diamante – Belo Horizonte/MG – (31) 3385-4552

Botão "Enviar no WhatsApp": link `wa.me/55{telefone}` com mensagem padrão.

## Dados oficiais da empresa

Centralizados em `src/lib/empresa.ts`:

- Toldos Gerais Ltda — www.toldosgerais.com.br
- Fábrica: Av. Waldir Soeiro Emrich, 4.645 A – Diamante – CEP 30660-560 – Belo Horizonte/MG
- Fixo (31) 3385-4552 · WhatsApp (31) 99614-6810
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
- ✅ **Deploy preparado e validado em container real** (2026-07-08): `Dockerfile` multi-stage standalone, `.dockerignore`, migrations SQL em `drizzle/`, `scripts/init-db.mjs` (migrations + seed idempotentes no boot). `next.config.ts` com `output: "standalone"` + `serverExternalPackages: ["better-sqlite3"]`. `db/index.ts` abre o SQLite de forma **lazy** (proxy) p/ não instanciar no build. Testado: build da imagem, boot com volume, init do banco, login/middleware, páginas com dados, cadastro público, PDF — tudo passou
- ⏳ Pendente (só depende da Letícia): push pro GitHub `letcordeiro/gestao-toldos-gerais` + criar o app no Dokploy. Passo a passo completo em `DEPLOY.md` (env, volume `/data`, porta 3000, domínio `toldos.bionatural.tech`). `SESSION_SECRET` de produção já gerado e anotado no DEPLOY.md

Para zerar o banco local: `rm -rf data/toldos.db* && npm run db:push && npm run db:seed`
Boot em produção cria/semeia o banco sozinho via `scripts/init-db.mjs`.
