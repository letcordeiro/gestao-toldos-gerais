import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
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
  // CPF ou CNPJ — obrigatório para emitir contrato (qualificação das partes).
  documento: text("documento"),
  origem: text("origem", { enum: ["interno", "auto_cadastro"] })
    .notNull()
    .default("interno"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const fases = sqliteTable("fases", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull(),
  cor: text("cor").notNull(),
  // Fase em que o negócio já está fechado: libera a ficha de instalação e
  // aprova o orçamento automaticamente. Marcada por fase (e não por "ordem >=")
  // porque "Perdido" é a última da ordem e NÃO pode liberar nada.
  liberaInstalacao: integer("libera_instalacao", { mode: "boolean" })
    .notNull()
    .default(false),
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
  // Quando o contato de pós-venda foi feito (null = ainda pendente). Some do
  // aviso de pós-venda depois de marcado.
  posVendaEm: integer("pos_venda_em", { mode: "timestamp" }),
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
  telefone: text("telefone"), // legado — mantido; usar whatsapp/telefoneFixo
  whatsapp: text("whatsapp"),
  telefoneFixo: text("telefone_fixo"),
  email: text("email"),
  // Login do vendedor: quem tem senhaHash consegue entrar no sistema
  senhaHash: text("senha_hash"),
  // Papel de acesso: gestor faz tudo; atendente vê o funil inteiro e direciona
  // clientes, sem tocar em orçamento/contrato nem nos cadastros de
  // configuração; vendedor vê só o que é dele.
  papel: text("papel", { enum: ["gestor", "atendente", "vendedor"] })
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
  // Token para link público de visualização da proposta (/proposta/{token}).
  publicToken: text("public_token").unique(),
  // Momento em que o orçamento foi enviado ao cliente (status -> enviado).
  // Base para a cobrança de retorno após DIAS_COBRANCA dias (lib/cobranca).
  enviadoEm: integer("enviado_em", { mode: "timestamp" }),
  // Último "já contatei" no aviso de cobrança. Silencia o aviso por mais um
  // ciclo de DIAS_COBRANCA dias (se continuar sem desfecho, volta a lembrar).
  cobrancaContatoEm: integer("cobranca_contato_em", { mode: "timestamp" }),
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

// Fotos anexadas ao orçamento pelo vendedor (armazenadas no volume /data/uploads).
// Aparecem no PDF e na página pública da proposta.
export const orcamentoFotos = sqliteTable("orcamento_fotos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id),
  arquivo: text("arquivo").notNull(), // nome do arquivo no disco
  legenda: text("legenda"),
  ordem: integer("ordem").notNull().default(0),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Ficha de INSTALAÇÃO (ordem de serviço interna, só para vendedor/gestor).
// Preenchida quando o cliente fecha; sai como página 2 do PDF autenticado.
// Nunca entra no PDF público do cliente (/proposta/[token]/pdf).
export const orcamentoInstalacao = sqliteTable("orcamento_instalacao", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .unique()
    .references(() => orcamentos.id),
  // Dados da obra / logística
  responsavel: text("responsavel"),
  observacoes: text("observacoes"),
  calha: text("calha"),
  tipoEscada: text("tipo_escada"),
  condEstacionamento: text("cond_estacionamento"),
  horario: text("horario"),
  // Datas do pedido
  prevEntrega: integer("prev_entrega", { mode: "timestamp" }),
  dataEntrega: integer("data_entrega", { mode: "timestamp" }),
  atualizadoEm: integer("atualizado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Linhas de produto da ficha de instalação (especificação técnica).
export const instalacaoItens = sqliteTable("instalacao_itens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id),
  qtde: text("qtde"),
  produto: text("produto"), // ex.: TOLDO RETO FIXO 2,41X2,35
  estrutura: text("estrutura"), // ESTRUT / TIPO / COR — ex.: METALICA MARROM
  revestimento: text("revestimento"), // REVEST / TIPO / COR — ex.: LONA PVC
  rufo: text("rufo"),
  babado: text("babado"), // BABADO / MODELO / COR
  vies: text("vies"), // VIES / MODELO / COR
  ordem: integer("ordem").notNull().default(0),
});

// Pedidos de redefinição de senha por e-mail.
// Guardamos só o HASH do token: se o banco vazar, os links não servem.
export const tokensSenha = sqliteTable("tokens_senha", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull(),
  tokenHash: text("token_hash").notNull().unique(),
  expiraEm: integer("expira_em", { mode: "timestamp" }).notNull(),
  usadoEm: integer("usado_em", { mode: "timestamp" }),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
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

// Avisos configuráveis (notificações de WhatsApp na tela de Atendimentos).
// gatilho define de onde vem a pendência:
//   orcamento_sem_resposta — orçamento "enviado" há `dias`+ sem desfecho (alvo = orçamento)
//   atendimento_concluido  — atendimento em "Concluído" há `dias`+ (alvo = atendimento)
// rearme_dias: null = "já contatei" dispensa de vez; N = volta a avisar após N dias.
export const avisos = sqliteTable("avisos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  gatilho: text("gatilho", {
    enum: ["orcamento_sem_resposta", "atendimento_concluido"],
  }).notNull(),
  dias: integer("dias").notNull(),
  mensagem: text("mensagem").notNull(),
  rearmeDias: integer("rearme_dias"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Registro de "já contatei" por aviso × alvo. definitivo = "não avisar mais"
// (vale mesmo quando o aviso re-arma).
export const avisoContatos = sqliteTable("aviso_contatos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  avisoId: integer("aviso_id")
    .notNull()
    .references(() => avisos.id, { onDelete: "cascade" }),
  alvoId: integer("alvo_id").notNull(),
  definitivo: integer("definitivo", { mode: "boolean" }).notNull().default(false),
  contatadoEm: integer("contatado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// CONTRATOS
// Gerados sob demanda a partir de um orçamento aprovado. Os nomes das tabelas
// seguem a convenção em português do resto do schema.
// ---------------------------------------------------------------------------

export const contratos = sqliteTable("contratos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  // "CT-2026-0001" — sequencial por ano. Só ganha número ao ser EMITIDO;
  // rascunho fica null (o PDF sai como MINUTA).
  numero: text("numero").unique(),
  versao: integer("versao").notNull().default(1),
  // Quando é nova versão de um contrato anterior (que vira cancelado).
  contratoPaiId: integer("contrato_pai_id"),
  clienteId: integer("cliente_id")
    .notNull()
    .references(() => clientes.id),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id),
  status: text("status", {
    enum: ["rascunho", "emitido", "assinado", "aditivado", "cancelado"],
  })
    .notNull()
    .default("rascunho"),
  // JSON com cliente + orçamento congelados no momento da emissão. É o que vale
  // no documento: alterar o orçamento depois não muda o contrato.
  snapshot: text("snapshot"),
  valorTotal: integer("valor_total").notNull().default(0), // centavos
  escopo: text("escopo", {
    enum: ["fabricacao", "remocao_fabricacao", "manutencao", "troca_lona"],
  })
    .notNull()
    .default("fabricacao"),
  localInstalacao: text("local_instalacao").notNull().default(""),
  observacoesTecnicas: text("observacoes_tecnicas"),
  prazoDiasUteis: integer("prazo_dias_uteis").notNull().default(30),
  garantiaMeses: integer("garantia_meses").notNull().default(12),
  retencaoPercent: integer("retencao_percent").notNull().default(30),
  multaPercent: real("multa_percent").notNull().default(2),
  jurosMesPercent: real("juros_mes_percent").notNull().default(1),
  // Cláusulas opcionais — desligar renumera as demais automaticamente.
  flagMedidas: integer("flag_medidas", { mode: "boolean" }).notNull().default(true),
  flagClima: integer("flag_clima", { mode: "boolean" }).notNull().default(true),
  flagEnergia: integer("flag_energia", { mode: "boolean" }).notNull().default(true),
  flagSobMedida: integer("flag_sob_medida", { mode: "boolean" })
    .notNull()
    .default(true),
  representante: text("representante").notNull().default("João Pedro Avelar"),
  // Quem assina pelo CONTRATANTE quando ele é empresa (CNPJ). Pessoa física
  // assina por si e não usa este campo.
  representanteContratante: text("representante_contratante"),
  cidadeEmissao: text("cidade_emissao").notNull().default("Belo Horizonte"),
  dataEmissao: integer("data_emissao", { mode: "timestamp" }),
  dataAssinatura: integer("data_assinatura", { mode: "timestamp" }),
  motivoCancelamento: text("motivo_cancelamento"),
  // Valor retido no cancelamento (retencaoPercent sobre o total), em centavos.
  valorRetido: integer("valor_retido"),
  // Token do link público (/contrato/{token}), no padrão da proposta.
  publicToken: text("public_token").unique(),
  criadoPor: text("criado_por"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  atualizadoEm: integer("atualizado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Snapshot dos produtos: cópia, não referência viva ao orçamento.
export const contratoItens = sqliteTable("contrato_itens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contratoId: integer("contrato_id")
    .notNull()
    .references(() => contratos.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(0),
  modelo: text("modelo").notNull(),
  cor: text("cor"),
  medidasM2: text("medidas_m2"),
  descricaoExtra: text("descricao_extra"),
});

// Plano de pagamento: cada linha é uma etapa. A soma tem que bater com
// contratos.valorTotal — a emissão é bloqueada quando não bate.
export const contratoPagamentos = sqliteTable("contrato_pagamentos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contratoId: integer("contrato_id")
    .notNull()
    .references(() => contratos.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(0),
  rotulo: text("rotulo").notNull(),
  tipo: text("tipo", { enum: ["sinal", "parcela", "saldo"] }).notNull(),
  valor: integer("valor").notNull(), // centavos
  // Contrato com opções de preço não tem valor fechado: a linha vale um
  // percentual do valor da opção que o cliente escolher. Nesse modo `valor`
  // fica em 0 e quem manda é `percentual`.
  percentual: real("percentual"),
  meio: text("meio", {
    enum: [
      "pix",
      "cartao_credito",
      "cartao_debito",
      "transferencia",
      "boleto",
      "dinheiro",
    ],
  }).notNull(),
  numeroParcelas: integer("numero_parcelas").notNull().default(1),
  gatilho: text("gatilho", {
    enum: [
      "assinatura",
      "inicio_fabricacao",
      "entrega_material",
      "conclusao_instalacao",
      "dias_apos_instalacao",
      "dias_apos_assinatura",
      "data_fixa",
    ],
  }).notNull(),
  diasApos: integer("dias_apos"),
  dataVencimento: integer("data_vencimento", { mode: "timestamp" }),
});

// Opções de preço do MESMO contrato (ex.: mesma pérgola em 3,00 m ou 4,55 m).
// Duas ou mais linhas colocam o contrato em "modo opções": o valor total deixa
// de ser fechado e o plano de pagamento passa a ser em percentual. O cliente
// indica por escrito qual contratou na hora de assinar.
export const contratoOpcoes = sqliteTable("contrato_opcoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contratoId: integer("contrato_id")
    .notNull()
    .references(() => contratos.id, { onDelete: "cascade" }),
  ordem: integer("ordem").notNull().default(0),
  // O que diferencia a opção — medidas, acabamento, o que for.
  rotulo: text("rotulo").notNull(),
  valor: integer("valor").notNull(), // centavos
});

// Aditivos: mudanças DEPOIS da assinatura. Cumulativos e numerados por contrato.
export const contratoAditivos = sqliteTable("contrato_aditivos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contratoId: integer("contrato_id")
    .notNull()
    .references(() => contratos.id, { onDelete: "cascade" }),
  numero: integer("numero").notNull(), // sequencial dentro do contrato
  objeto: text("objeto").notNull(),
  deltaValor: integer("delta_valor").notNull().default(0), // centavos, pode ser negativo
  novoPrazoDiasUteis: integer("novo_prazo_dias_uteis"),
  dataAssinatura: integer("data_assinatura", { mode: "timestamp" }),
  snapshot: text("snapshot"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Auditoria: toda transição de status grava evento. Nada de edição silenciosa.
export const contratoEventos = sqliteTable("contrato_eventos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  contratoId: integer("contrato_id")
    .notNull()
    .references(() => contratos.id, { onDelete: "cascade" }),
  tipo: text("tipo", {
    enum: [
      "criado",
      "editado",
      "emitido",
      "assinado",
      "versionado",
      "aditivado",
      "cancelado",
    ],
  }).notNull(),
  descricao: text("descricao").notNull(),
  usuario: text("usuario"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
