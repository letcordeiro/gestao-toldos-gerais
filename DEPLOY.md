# Deploy — Gestão Toldos Gerais (Dokploy)

O app está pronto e testado em container de produção. Fluxo: **GitHub → Dokploy puxa e builda pelo Dockerfile → autodeploy no push da `main`** (igual ao na-pista).

## 1. Subir o código pro GitHub

Crie o repositório `gestao-toldos-gerais` na conta `letcordeiro` (github.com/new, pode ser privado). Depois, na pasta do projeto:

```bash
cd "03 Apps/gestao-toldos-gerais"
git remote add origin git@github.com:letcordeiro/gestao-toldos-gerais.git
git push -u origin main
```

(Se usar HTTPS em vez de SSH: `https://github.com/letcordeiro/gestao-toldos-gerais.git`.)

Tudo já está commitado. `.env.local` e a pasta `data/` **não** vão pro repositório (estão no `.gitignore`).

## 2. Criar o app no Dokploy

1. **Create → Application** (não Compose).
2. **Provider:** GitHub → repositório `letcordeiro/gestao-toldos-gerais`, branch `main`.
3. **Build Type:** `Dockerfile` (caminho `Dockerfile`, na raiz).
4. **Environment:**
   ```
   DATABASE_PATH=/data/toldos.db
   SESSION_SECRET=<gere um e cole só aqui no Dokploy>
   AUTH_USERS=leticia@toldosgerais.com.br:TROQUE_POR_UMA_SENHA_FORTE
   ```
   - Gere o `SESSION_SECRET` com: `openssl rand -hex 32`. **Cole só no painel do Dokploy — nunca no repositório** (o repo é público).
   - Depois de definido, não troque: mudar o `SESSION_SECRET` derruba todos os logins.
   - `AUTH_USERS` aceita vários usuários separados por vírgula: `email1:senha1,email2:senha2`.
5. **Volume (CRÍTICO — senão o banco some a cada deploy):** em Advanced → Volumes/Mounts, adicione um **Volume Mount** com Mount Path `/data`. É onde fica o `toldos.db`.
6. **Porta:** o container escuta na **3000**.
7. **Domínio:** em Domains, adicione `toldos.bionatural.tech`, container port **3000**, HTTPS (Let's Encrypt) ligado. Aponte o DNS `toldos` para o IP da VPS antes (registro A).
8. **Deploy.**

## O que acontece no primeiro boot

O container roda `scripts/init-db.mjs` antes de subir o servidor: aplica as migrations (cria as tabelas) e faz o seed (9 fases + 10 modelos). É idempotente — nos deploys seguintes ele só confere e não duplica nada. Os dados persistem no volume `/data`.

## Depois do deploy

- Qualquer `git push` na `main` dispara autodeploy no Dokploy.
- Migração de domínio para `app.toldosgerais.com.br`: é só adicionar o novo domínio no Dokploy e ajustar o DNS.
- Trocar/adicionar usuário: editar `AUTH_USERS` no Dokploy e redeploy.

## Validação já feita localmente

Build da imagem, boot com volume, criação+seed do banco, login+middleware, páginas com dados, cadastro público e geração de PDF — todos testados e passando num container idêntico ao de produção.
