import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const clientes = sqliteTable("clientes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  telefone: text("telefone").notNull(),
  email: text("email"),
  endereco: text("endereco"), // logradouro (rua/av.)
  numero: text("numero"),
  complemento: text("complemento"),
  bairro: text("bairro"),
  cidade: text("cidade"),
  cep: text("cep"),
  origem: text("origem", { enum: ["interno", "auto_cadastro"] })
    .notNull()
    .default("interno"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const fases = sqliteTable("fases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull(),
  cor: text("cor").notNull(),
});

export const atendimentos = sqliteTable("atendimentos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  faseId: integer("fase_id")
    .notNull()
    .references(() => fases.id),
  // Vendedor dono do atendimento (null = lead do pool, visível só a gestores)
  vendedorId: integer("vendedor_id"),
  observacoes: text("observacoes"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  atualizadoEm: integer("atualizado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const historicoFases = sqliteTable("historico_fases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  atendimentoId: integer("atendimento_id")
    .notNull()
    .references(() => atendimentos.id),
  faseAnteriorId: integer("fase_anterior_id").references(() => fases.id),
  faseNovaId: integer("fase_nova_id")
    .notNull()
    .references(() => fases.id),
  data: integer("data", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const modelosToldo = sqliteTable("modelos_toldo", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  descricaoMaterial: text("descricao_material"),
  estruturaAluminio: text("estrutura_aluminio"),
  estruturaFerro: text("estrutura_ferro"),
  fixacaoVedacao: text("fixacao_vedacao"),
  // Toldos Italianos: estrutura sempre em alumínio + escolha de formato
  estruturaSempreAluminio: integer("estrutura_sempre_aluminio", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  usaFormato: integer("usa_formato", { mode: "boolean" })
    .notNull()
    .default(false),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
});

// Vendedores responsáveis pelos orçamentos (cartão de contato no PDF).
export const vendedores = sqliteTable("vendedores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  email: text("email"),
  // Login do vendedor: quem tem senhaHash consegue entrar no sistema
  senhaHash: text("senha_hash"),
  // Papel de acesso: gestor vê tudo e gerencia cadastros; vendedor vê só o seu
  papel: text("papel", { enum: ["gestor", "vendedor"] })
    .notNull()
    .default("vendedor"),
  // Link público de cadastro exclusivo do vendedor (/cadastro/{linkToken}).
  // Leads que entram por ele já nascem atribuídos a este vendedor.
  linkToken: text("link_token").unique(),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const orcamentos = sqliteTable("orcamentos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  numero: text("numero").notNull().unique(), // formato AAAA-NNN, sequencial por ano
  atendimentoId: integer("atendimento_id")
    .notNull()
    .references(() => atendimentos.id),
  modeloId: integer("modelo_id").references(() => modelosToldo.id),
  vendedorId: integer("vendedor_id").references(() => vendedores.id),
  descricaoMaterial: text("descricao_material"),
  estruturaTexto: text("estrutura_texto"),
  tipoEstrutura: text("tipo_estrutura", { enum: ["aluminio", "metalica"] }),
  formato: text("formato", { enum: ["capotinha", "braco_retratil"] }),
  fixacaoVedacao: text("fixacao_vedacao"),
  garantiaTexto: text("garantia_texto"),
  formaPagamento: text("forma_pagamento"),
  prazoEntrega: text("prazo_entrega"),
  status: text("status", {
    enum: ["rascunho", "enviado", "aprovado", "recusado"],
  })
    .notNull()
    .default("rascunho"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const orcamentoItens = sqliteTable("orcamento_itens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id),
  descricao: text("descricao").notNull(),
  valorMin: integer("valor_min"), // centavos; null em subtítulos livres
  valorMax: integer("valor_max"), // centavos; null = valor único
  ordem: integer("ordem").notNull().default(0),
});

export const tokensCadastro = sqliteTable("tokens_cadastro", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  token: text("token").notNull().unique(),
  expiraEm: integer("expira_em", { mode: "timestamp" }).notNull(),
  usadoEm: integer("usado_em", { mode: "timestamp" }),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Usuários com senha redefinível (recuperação por código).
// O login também aceita as credenciais do env AUTH_USERS como fallback/master:
// se existe linha aqui para o e-mail, ela tem prioridade; senão, cai no env.
export const usuarios = sqliteTable("usuarios", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  senhaHash: text("senha_hash").notNull(),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  atualizadoEm: integer("atualizado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
