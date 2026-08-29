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
  // Aparece na visão padrão do funil. Desligado = só quem escolher a fase no
  // filtro vê (era a regra fixa do "Perdido", agora é configurável por fase).
  exibirNaListagem: integer("exibir_na_listagem", { mode: "boolean" })
    .notNull()
    .default(true),
  // Negócio encerrado: sai da conta de "em aberto" no painel.
  terminal: integer("terminal", { mode: "boolean" }).notNull().default(false),
  // Negócio perdido: recusa os orçamentos que aguardavam e pede o motivo.
  ehPerdido: integer("eh_perdido", { mode: "boolean" }).notNull().default(false),
});

// Por que o negócio foi perdido. Cadastro próprio para o relatório sair
// somado — texto livre nunca agrupa.
export const motivosPerda = sqliteTable("motivos_perda", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
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
  // Por onde este cliente chegou. Fica no ATENDIMENTO e não no cliente: um
  // cliente antigo pode voltar por outro caminho, e o que interessa medir é
  // a origem de cada negócio.
  canalId: integer("canal_id"),
  // Preenchidos quando o atendimento entra numa fase marcada como perdida.
  motivoPerdaId: integer("motivo_perda_id"),
  motivoPerdaObs: text("motivo_perda_obs"),
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
  // Página de agendamento do Google Agenda deste vendedor, se ele tiver uma
  // (Workspace → "Horário de atendimento"). O sistema só guarda e envia o
  // link; quem administra os horários é o próprio Google.
  linkAgendamento: text("link_agendamento"),
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
  // Abre a proposta, acima do MODELO. Vazio = proposta começa como sempre.
  introducao: text("introducao"),
  // A/c da proposta. Vazio = nome do cliente (comportamento antigo).
  aosCuidadosDe: text("aos_cuidados_de"),
  // Dias de validade contados do envio (ou da criação, se ainda não foi
  // enviado). Null = proposta sem prazo, como era antes.
  validadeDias: integer("validade_dias"),
  // Recado interno: NUNCA sai no PDF nem na página pública.
  observacoesInternas: text("observacoes_internas"),
  status: text("status", {
    enum: ["rascunho", "agendado", "enviando", "enviado", "falha_envio", "aprovado", "recusado"],
  })
    .notNull()
    .default("rascunho"),
  // Token para link público de visualização da proposta (/proposta/{token}).
  publicToken: text("public_token").unique(),
  // Momento em que o orçamento foi enviado ao cliente (status -> enviado).
  // Base para a cobrança de retorno após DIAS_COBRANCA dias (lib/cobranca).
  enviadoEm: integer("enviado_em", { mode: "timestamp" }),
  agendadoEm: integer("agendado_em", { mode: "timestamp" }),
  envioTentativas: integer("envio_tentativas").notNull().default(0),
  envioErro: text("envio_erro"),
  mensagemId: text("mensagem_id"),
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
    enum: [
      "orcamento_sem_resposta",
      "atendimento_concluido",
      // Régua de cobrança: parcela do contrato vencida há N dias e contrato
      // emitido há N dias sem assinatura.
      "parcela_vencida",
      "contrato_sem_assinatura",
    ],
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
  // Recado interno: não entra no documento nem na página pública.
  observacoesInternas: text("observacoes_internas"),
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
  // Quando o dinheiro entrou. Null = ainda a receber — é o que a régua de
  // cobrança olha para saber se ainda tem que lembrar o cliente.
  pagoEm: integer("pago_em", { mode: "timestamp" }),
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

// ---------------------------------------------------------------------------
// TAREFAS E GATILHOS
// A tarefa é a próxima ação combinada — é o que transforma o funil de "lista
// de status" em "lista do que fazer". O gatilho é quem cria a tarefa sozinho
// quando um evento acontece, para o follow-up não depender de memória.
// ---------------------------------------------------------------------------

export const tarefas = sqliteTable("tarefas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  tipo: text("tipo", {
    enum: ["ligacao", "whatsapp", "visita", "proposta", "reuniao", "nota"],
  })
    .notNull()
    .default("ligacao"),
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),
  // Vínculo — pelo menos um. O atendimento é o mais comum; o orçamento e o
  // contrato aparecem quando a tarefa nasceu de um deles.
  atendimentoId: integer("atendimento_id").references(() => atendimentos.id),
  orcamentoId: integer("orcamento_id").references(() => orcamentos.id),
  contratoId: integer("contrato_id").references(() => contratos.id),
  responsavelId: integer("responsavel_id").references(() => vendedores.id),
  prioridade: text("prioridade", { enum: ["baixa", "media", "alta"] })
    .notNull()
    .default("media"),
  status: text("status", { enum: ["pendente", "concluida", "cancelada"] })
    .notNull()
    .default("pendente"),
  // Dia combinado. Sem hora de propósito: a agenda do dia é do João, o
  // sistema só diz o que vence quando.
  previstaEm: integer("prevista_em", { mode: "timestamp" }),
  concluidaEm: integer("concluida_em", { mode: "timestamp" }),
  // Mensagem pronta de WhatsApp (com as variáveis já resolvidas). Quando
  // existe, a tarefa mostra o botão que abre a conversa com o texto.
  mensagem: text("mensagem"),
  // Gatilho que criou a tarefa (null = criada à mão). Evita repetir a mesma
  // tarefa automática duas vezes para o mesmo alvo.
  gatilhoId: integer("gatilho_id"),
  criadoPor: text("criado_por"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Regra "quando X acontecer, crie a tarefa Y".
export const gatilhos = sqliteTable("gatilhos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  evento: text("evento", {
    enum: [
      "entrou_na_fase",
      "orcamento_enviado",
      "orcamento_aprovado",
      "orcamento_recusado",
      "contrato_emitido",
      "contrato_assinado",
    ],
  }).notNull(),
  // Só para "entrou_na_fase": qual fase dispara.
  faseId: integer("fase_id").references(() => fases.id),
  // A tarefa que será criada.
  tarefaTipo: text("tarefa_tipo", {
    enum: ["ligacao", "whatsapp", "visita", "proposta", "reuniao", "nota"],
  })
    .notNull()
    .default("ligacao"),
  tarefaTitulo: text("tarefa_titulo").notNull(),
  tarefaPrioridade: text("tarefa_prioridade", {
    enum: ["baixa", "media", "alta"],
  })
    .notNull()
    .default("media"),
  // Prazo em dias contados do evento. 0 = para hoje.
  prazoDias: integer("prazo_dias").notNull().default(0),
  // Template de WhatsApp (mesmas variáveis dos avisos). Vazio = tarefa sem
  // mensagem pronta.
  mensagem: text("mensagem"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// RESUMO POR E-MAIL
// O sistema mandando notícia para fora, em vez de esperar alguém abrir a tela.
// ---------------------------------------------------------------------------

export const resumos = sqliteTable("resumos", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  frequencia: text("frequencia", {
    enum: ["diario", "semanal", "quinzenal", "mensal"],
  })
    .notNull()
    .default("diario"),
  // Blocos escolhidos, em JSON: ["tarefas_do_dia", "parcelas_vencidas", …].
  // JSON num campo texto porque a lista é curta e muda junto com o código —
  // uma tabela de ligação aqui só daria trabalho.
  blocos: text("blocos").notNull().default("[]"),
  // Destinatários em JSON: [{ email, tipo: "para" | "copia" | "oculta" }].
  destinatarios: text("destinatarios").notNull().default("[]"),
  mensagem: text("mensagem"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  // Última vez que este resumo saiu — é o que decide se já está na hora.
  ultimoEnvioEm: integer("ultimo_envio_em", { mode: "timestamp" }),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// PESQUISA DE SATISFAÇÃO
// Uma pesquisa por atendimento, com link público próprio. Nasce quando uma
// automação usa a variável {pesquisa} na mensagem.
// ---------------------------------------------------------------------------

export const pesquisas = sqliteTable("pesquisas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  atendimentoId: integer("atendimento_id")
    .notNull()
    .references(() => atendimentos.id),
  token: text("token").notNull().unique(),
  // Nota de 0 a 10 (NPS). Null enquanto o cliente não respondeu.
  nota: integer("nota"),
  comentario: text("comentario"),
  respondidaEm: integer("respondida_em", { mode: "timestamp" }),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// CHAMADOS (pós-venda / garantia)
// O que acontece DEPOIS da instalação: goteira, lona rasgada, motor parado.
// Vive preso ao atendimento, então o histórico do cliente fica num lugar só.
// ---------------------------------------------------------------------------

export const chamados = sqliteTable("chamados", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  atendimentoId: integer("atendimento_id")
    .notNull()
    .references(() => atendimentos.id),
  // Qual serviço gerou o chamado — é o que diz se ainda está na garantia.
  orcamentoId: integer("orcamento_id").references(() => orcamentos.id),
  assunto: text("assunto").notNull(),
  descricao: text("descricao"),
  // Receptivo = o cliente procurou. Ativo = a empresa procurou o cliente.
  tipo: text("tipo", { enum: ["receptivo", "ativo"] })
    .notNull()
    .default("receptivo"),
  // Na garantia ou fora dela: muda quem paga, e é a primeira pergunta que
  // aparece. `null` enquanto ninguém decidiu.
  naGarantia: integer("na_garantia", { mode: "boolean" }),
  prioridade: text("prioridade", { enum: ["baixa", "media", "alta"] })
    .notNull()
    .default("media"),
  situacao: text("situacao", {
    enum: ["aberto", "em_andamento", "resolvido", "cancelado"],
  })
    .notNull()
    .default("aberto"),
  responsavelId: integer("responsavel_id").references(() => vendedores.id),
  fechadoEm: integer("fechado_em", { mode: "timestamp" }),
  criadoPor: text("criado_por"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Histórico do chamado: cada retorno dado ao cliente vira uma linha.
export const chamadoInteracoes = sqliteTable("chamado_interacoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  chamadoId: integer("chamado_id")
    .notNull()
    .references(() => chamados.id, { onDelete: "cascade" }),
  texto: text("texto").notNull(),
  autor: text("autor"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// COTAÇÃO DE FORNECEDOR
// Antes do orçamento sair: manda a lista de material para N fornecedores e
// compara as respostas lado a lado.
// ---------------------------------------------------------------------------

export const fornecedores = sqliteTable("fornecedores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  contato: text("contato"),
  telefone: text("telefone"),
  email: text("email"),
  // O que ele vende — aparece na hora de escolher quem cotar.
  fornece: text("fornece"),
  observacoes: text("observacoes"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const cotacoes = sqliteTable("cotacoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  titulo: text("titulo").notNull(),
  // Orçamento que motivou a cotação, quando existe.
  orcamentoId: integer("orcamento_id").references(() => orcamentos.id),
  prazoResposta: integer("prazo_resposta", { mode: "timestamp" }),
  // Sai no link do fornecedor.
  observacoes: text("observacoes"),
  // Nunca sai: é recado da equipe.
  observacoesInternas: text("observacoes_internas"),
  situacao: text("situacao", { enum: ["aberta", "fechada", "cancelada"] })
    .notNull()
    .default("aberta"),
  criadoPor: text("criado_por"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const cotacaoItens = sqliteTable("cotacao_itens", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cotacaoId: integer("cotacao_id")
    .notNull()
    .references(() => cotacoes.id, { onDelete: "cascade" }),
  descricao: text("descricao").notNull(),
  quantidade: text("quantidade"),
  unidade: text("unidade"),
  ordem: integer("ordem").notNull().default(0),
});

// Um convite por fornecedor: cada um tem link próprio e responde sem ver o
// preço dos outros.
export const cotacaoFornecedores = sqliteTable("cotacao_fornecedores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cotacaoId: integer("cotacao_id")
    .notNull()
    .references(() => cotacoes.id, { onDelete: "cascade" }),
  fornecedorId: integer("fornecedor_id")
    .notNull()
    .references(() => fornecedores.id),
  token: text("token").notNull().unique(),
  prazoEntrega: text("prazo_entrega"),
  observacao: text("observacao"),
  respondidoEm: integer("respondido_em", { mode: "timestamp" }),
});

export const cotacaoRespostas = sqliteTable("cotacao_respostas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  cotacaoFornecedorId: integer("cotacao_fornecedor_id")
    .notNull()
    .references(() => cotacaoFornecedores.id, { onDelete: "cascade" }),
  itemId: integer("item_id")
    .notNull()
    .references(() => cotacaoItens.id, { onDelete: "cascade" }),
  // Centavos, como todo valor do sistema. Null = fornecedor não cotou o item.
  valorUnitario: integer("valor_unitario"),
});

// ---------------------------------------------------------------------------
// EQUIPE DE INSTALAÇÃO E COMISSÃO
// Quem foi na obra e quanto a empresa deve por ela. Instalador não é usuário
// do sistema — é gente que trabalha, e por isso tem cadastro próprio.
// ---------------------------------------------------------------------------

export const instaladores = sqliteTable("instaladores", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  telefone: text("telefone"),
  // Sugestão que aparece preenchida ao montar a equipe. Percentual do valor
  // do orçamento; a linha pode ser trocada por valor fixo depois.
  comissaoPadraoPercent: real("comissao_padrao_percent"),
  observacoes: text("observacoes"),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export const instalacaoEquipe = sqliteTable("instalacao_equipe", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orcamentoId: integer("orcamento_id")
    .notNull()
    .references(() => orcamentos.id),
  instaladorId: integer("instalador_id")
    .notNull()
    .references(() => instaladores.id),
  papel: text("papel", { enum: ["responsavel", "ajudante"] })
    .notNull()
    .default("ajudante"),
  // Percentual do valor do orçamento OU valor fixo em centavos. Guardar os
  // dois seria ambíguo: `tipo` diz qual vale.
  tipo: text("tipo", { enum: ["percentual", "fixo"] })
    .notNull()
    .default("percentual"),
  percentual: real("percentual"),
  valorFixo: integer("valor_fixo"),
  // Quando a comissão foi paga. Null = ainda a pagar.
  pagoEm: integer("pago_em", { mode: "timestamp" }),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// Formato do número de cada documento. O SEQUENCIAL não mora aqui: ele sai
// dos números já existentes (ver lib/numeracao.ts) — contador guardado
// desencontra do banco depois de um backup restaurado.
export const numeracoes = sqliteTable("numeracoes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  documento: text("documento", { enum: ["orcamento", "contrato"] })
    .notNull()
    .unique(),
  prefixo: text("prefixo").notNull().default(""),
  incluiAno: integer("inclui_ano", { mode: "boolean" }).notNull().default(true),
  digitos: integer("digitos").notNull().default(3),
});

// De onde o cliente veio. Cadastro fechado pelo mesmo motivo dos motivos de
// perda: texto livre nunca agrupa, e a pergunta que interessa é "qual canal
// traz cliente que FECHA", cruzando com a conversão.
export const canais = sqliteTable("canais", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nome: text("nome").notNull(),
  ordem: integer("ordem").notNull().default(0),
  // Aparece na pergunta "como nos conheceu?" do cadastro público. Nem todo
  // canal faz sentido perguntar ao cliente (ex.: "cliente antigo").
  noCadastroPublico: integer("no_cadastro_publico", { mode: "boolean" })
    .notNull()
    .default(true),
  ativo: integer("ativo", { mode: "boolean" }).notNull().default(true),
});

// ---------------------------------------------------------------------------
// VISITAS
// A agenda de campo: quem o vendedor vai ver, quando e onde. Fica separada da
// tarefa porque visita tem HORA e LUGAR — e é isso que permite montar rota.
// ---------------------------------------------------------------------------

export const visitas = sqliteTable("visitas", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  atendimentoId: integer("atendimento_id")
    .notNull()
    .references(() => atendimentos.id),
  vendedorId: integer("vendedor_id").references(() => vendedores.id),
  inicioEm: integer("inicio_em", { mode: "timestamp" }).notNull(),
  duracaoMin: integer("duracao_min").notNull().default(60),
  // Endereço da visita. Copiado do cliente na hora de agendar, mas editável:
  // a obra costuma ser em outro lugar que não o endereço do cadastro.
  endereco: text("endereco"),
  observacoes: text("observacoes"),
  situacao: text("situacao", {
    enum: [
      "agendada",
      "confirmada",
      "realizada",
      "cancelada",
      "nao_compareceu",
    ],
  })
    .notNull()
    .default("agendada"),
  // Id do evento no Google Agenda, quando a sincronia estiver ligada.
  googleEventId: text("google_event_id"),
  criadoPor: text("criado_por"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

// ---------------------------------------------------------------------------
// LOG DE DINHEIRO
// Só o que move dinheiro: baixa de parcela recebida e de comissão paga.
// Registrar tudo viraria ruído com uma equipe de três pessoas; o que precisa
// de resposta é "quem deu baixa nisso, quando, e de quanto era".
// ---------------------------------------------------------------------------

export const logsDinheiro = sqliteTable("logs_dinheiro", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  acao: text("acao", {
    enum: [
      "parcela_recebida",
      "parcela_desfeita",
      "comissao_paga",
      "comissao_desfeita",
    ],
  }).notNull(),
  usuario: text("usuario").notNull(),
  descricao: text("descricao").notNull(),
  // Valor envolvido, em centavos. Null quando não dá para calcular (comissão
  // percentual sobre orçamento sem valor fechado).
  valor: integer("valor"),
  // Para onde a tela manda quem for conferir.
  orcamentoId: integer("orcamento_id"),
  contratoId: integer("contrato_id"),
  criadoEm: integer("criado_em", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});
