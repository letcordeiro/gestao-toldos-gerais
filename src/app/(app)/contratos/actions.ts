"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  contratoAditivos,
  contratoEventos,
  contratoItens,
  contratoOpcoes,
  contratoPagamentos,
  contratos,
  modelosToldo,
  orcamentoItens,
  orcamentos,
} from "@/db/schema";
import { exigirComercial, exigirUsuario, podeComercial } from "@/lib/auth";
import { enderecoCompleto } from "@/lib/endereco";
import { configNumeracao } from "@/lib/numeracao-consulta";
import { proximoNumero as proximoNumeroFormatado } from "@/lib/numeracao";
import { dispararGatilhos } from "@/lib/gatilhos-executor";
import type { EventoGatilho } from "@/lib/gatilhos";
import {
  calcularRetencao,
  gerarPreset,
  gerarPresetPercentual,
  temOpcoes,
  pendenciasParaEmitir,
  podeFazer,
  proximoNumeroAditivo,
  validarPlanoPagamento,
  type OpcoesPreset,
  type PresetPlano,
  type SnapshotContrato,
  type StatusContrato,
} from "@/lib/contratos";

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

async function registrarEvento(
  contratoId: number,
  tipo:
    | "criado"
    | "editado"
    | "emitido"
    | "assinado"
    | "versionado"
    | "aditivado"
    | "cancelado",
  descricao: string,
  usuario: string
) {
  await db
    .insert(contratoEventos)
    .values({ contratoId, tipo, descricao, usuario });
}

/** Soma dos itens do orçamento (valorMin), em centavos. */
async function totalDoOrcamento(orcamentoId: number): Promise<number> {
  const itens = await db
    .select({ valorMin: orcamentoItens.valorMin })
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, orcamentoId));
  return itens.reduce((s, i) => s + (i.valorMin ?? 0), 0);
}

/** Estado atual de cliente + orçamento, para snapshot e comparação. */
async function montarSnapshot(
  orcamentoId: number
): Promise<SnapshotContrato | null> {
  const [linha] = await db
    .select({ orc: orcamentos, cliente: clientes })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .where(eq(orcamentos.id, orcamentoId));
  if (!linha) return null;
  return {
    cliente: {
      nome: linha.cliente.nome,
      documento: linha.cliente.documento,
      endereco: enderecoCompleto(linha.cliente) || null,
      telefone: linha.cliente.telefone,
      email: linha.cliente.email,
    },
    orcamento: {
      numero: linha.orc.numero,
      status: linha.orc.status,
      valorTotal: await totalDoOrcamento(orcamentoId),
    },
  };
}

async function carregarContrato(id: number) {
  const contrato = await db.query.contratos.findFirst({
    where: eq(contratos.id, id),
  });
  return contrato ?? null;
}

/**
 * Vendedor só mexe em contrato de orçamento dele; gestor mexe em tudo;
 * atendente não mexe em nenhum (faz triagem, não comercial).
 */
async function exigirAcesso(contratoId: number) {
  const usuario = await exigirUsuario();
  if (!podeComercial(usuario.papel)) return null;
  const contrato = await carregarContrato(contratoId);
  if (!contrato) return null;
  if (usuario.papel === "vendedor") {
    const orc = await db.query.orcamentos.findFirst({
      where: eq(orcamentos.id, contrato.orcamentoId),
    });
    if (!orc || orc.vendedorId !== usuario.vendedorId) return null;
  }
  return { usuario, contrato };
}

function nomeUsuario(u: { nome: string | null; email: string }): string {
  return u.nome ?? u.email;
}

// ---------------------------------------------------------------------------
// Criação a partir do orçamento
// ---------------------------------------------------------------------------

/**
 * Cria o contrato em RASCUNHO já pré-preenchido pelo orçamento. Ponto de
 * entrada é o botão "Gerar contrato" na tela do orçamento aprovado.
 */
export async function gerarContratoDoOrcamento(orcamentoId: number) {
  const usuario = await exigirComercial();
  const id = z.coerce.number().int().positive().parse(orcamentoId);

  const [linha] = await db
    .select({
      orc: orcamentos,
      cliente: clientes,
      modeloNome: modelosToldo.nome,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .leftJoin(modelosToldo, eq(orcamentos.modeloId, modelosToldo.id))
    .where(eq(orcamentos.id, id));
  if (!linha) return;

  if (
    usuario.papel === "vendedor" &&
    linha.orc.vendedorId !== usuario.vendedorId
  ) {
    return;
  }

  // Um contrato vivo por orçamento: se já existe, abre o que existe em vez de
  // duplicar (decisão conservadora — evita dois contratos para a mesma venda).
  const existente = await db.query.contratos.findFirst({
    where: and(
      eq(contratos.orcamentoId, id),
      sql`${contratos.status} <> 'cancelado'`
    ),
    orderBy: desc(contratos.versao),
  });
  if (existente) redirect(`/contratos/${existente.id}`);

  const valorTotal = await totalDoOrcamento(id);
  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, id))
    .orderBy(asc(orcamentoItens.ordem));

  const [novo] = await db
    .insert(contratos)
    .values({
      clienteId: linha.cliente.id,
      orcamentoId: id,
      status: "rascunho",
      valorTotal,
      localInstalacao: enderecoCompleto(linha.cliente) || "",
      publicToken: nanoid(12),
      criadoPor: nomeUsuario(usuario),
    })
    .returning({ id: contratos.id });

  // Itens: cópia (snapshot), não referência ao orçamento.
  const itensContrato = itens
    .filter((i) => i.valorMin !== null) // subtítulos livres não são produto
    .map((i, idx) => ({
      contratoId: novo.id,
      ordem: idx,
      modelo: linha.modeloNome ?? i.descricao,
      cor: null,
      medidasM2: null,
      descricaoExtra: i.descricao,
    }));
  if (itensContrato.length > 0) {
    await db.insert(contratoItens).values(itensContrato);
  } else if (linha.modeloNome) {
    await db.insert(contratoItens).values({
      contratoId: novo.id,
      ordem: 0,
      modelo: linha.modeloNome,
    });
  }

  // Plano de pagamento começa no preset mais comum da casa.
  const linhasPreset = gerarPreset("entrada_saldo_entrega", valorTotal);
  if (valorTotal > 0) {
    await db.insert(contratoPagamentos).values(
      linhasPreset.map((l) => ({
        contratoId: novo.id,
        ordem: l.ordem,
        rotulo: l.rotulo,
        tipo: l.tipo,
        valor: l.valor,
        percentual: l.percentual ?? null,
        meio: l.meio,
        numeroParcelas: l.numeroParcelas,
        gatilho: l.gatilho,
        diasApos: l.diasApos,
        dataVencimento: l.dataVencimento ? new Date(l.dataVencimento) : null,
      }))
    );
  }

  await registrarEvento(
    novo.id,
    "criado",
    `Contrato criado a partir do orçamento ${linha.orc.numero}`,
    nomeUsuario(usuario)
  );

  revalidatePath("/contratos");
  redirect(`/contratos/${novo.id}`);
}

// ---------------------------------------------------------------------------
// Edição (só em rascunho)
// ---------------------------------------------------------------------------

const dadosSchema = z.object({
  contratoId: z.coerce.number().int().positive(),
  escopo: z.enum([
    "fabricacao",
    "remocao_fabricacao",
    "manutencao",
    "troca_lona",
  ]),
  localInstalacao: z.string().trim().max(500),
  observacoesTecnicas: z.string().trim().max(3000).optional(),
  observacoesInternas: z.string().trim().max(4000).optional(),
  valorTotal: z.coerce.number().int().min(0),
  prazoDiasUteis: z.coerce.number().int().min(0).max(365),
  garantiaMeses: z.coerce.number().int().min(0).max(120),
  retencaoPercent: z.coerce.number().int().min(0).max(100),
  multaPercent: z.coerce.number().min(0).max(100),
  jurosMesPercent: z.coerce.number().min(0).max(100),
  flagMedidas: z.coerce.boolean(),
  flagClima: z.coerce.boolean(),
  flagEnergia: z.coerce.boolean(),
  flagSobMedida: z.coerce.boolean(),
  representante: z.string().trim().min(1).max(120),
  representanteContratante: z.string().trim().max(120),
  cidadeEmissao: z.string().trim().min(1).max(120),
});

export type ContratoFormState = { ok?: boolean; erro?: string };

export async function salvarDadosContrato(
  _prev: ContratoFormState,
  formData: FormData
): Promise<ContratoFormState> {
  const parsed = dadosSchema.safeParse({
    contratoId: formData.get("contratoId"),
    escopo: formData.get("escopo"),
    localInstalacao: formData.get("localInstalacao") ?? "",
    observacoesTecnicas: formData.get("observacoesTecnicas") ?? "",
    observacoesInternas: formData.get("observacoesInternas") ?? "",
    valorTotal: formData.get("valorTotal"),
    prazoDiasUteis: formData.get("prazoDiasUteis"),
    garantiaMeses: formData.get("garantiaMeses"),
    retencaoPercent: formData.get("retencaoPercent"),
    multaPercent: formData.get("multaPercent"),
    jurosMesPercent: formData.get("jurosMesPercent"),
    flagMedidas: formData.get("flagMedidas") === "on",
    flagClima: formData.get("flagClima") === "on",
    flagEnergia: formData.get("flagEnergia") === "on",
    flagSobMedida: formData.get("flagSobMedida") === "on",
    representante: formData.get("representante"),
    representanteContratante: formData.get("representanteContratante") ?? "",
    cidadeEmissao: formData.get("cidadeEmissao"),
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const acesso = await exigirAcesso(d.contratoId);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "editar")) {
    return {
      erro: "Contrato já emitido não pode ser editado. Use Nova versão ou Aditivo.",
    };
  }

  await db
    .update(contratos)
    .set({
      escopo: d.escopo,
      localInstalacao: d.localInstalacao,
      observacoesTecnicas: d.observacoesTecnicas || null,
      observacoesInternas: d.observacoesInternas || null,
      valorTotal: d.valorTotal,
      prazoDiasUteis: d.prazoDiasUteis,
      garantiaMeses: d.garantiaMeses,
      retencaoPercent: d.retencaoPercent,
      multaPercent: d.multaPercent,
      jurosMesPercent: d.jurosMesPercent,
      flagMedidas: d.flagMedidas,
      flagClima: d.flagClima,
      flagEnergia: d.flagEnergia,
      flagSobMedida: d.flagSobMedida,
      representante: d.representante,
      representanteContratante: d.representanteContratante || null,
      cidadeEmissao: d.cidadeEmissao,
      atualizadoEm: new Date(),
    })
    .where(eq(contratos.id, d.contratoId));

  await registrarEvento(
    d.contratoId,
    "editado",
    "Dados do contrato atualizados",
    nomeUsuario(acesso.usuario)
  );
  revalidatePath(`/contratos/${d.contratoId}`);
  return { ok: true };
}

// Itens do contrato (snapshot editável enquanto rascunho)
const itemSchema = z.object({
  modelo: z.string().trim().min(1),
  cor: z.string().trim().optional(),
  medidasM2: z.string().trim().optional(),
  descricaoExtra: z.string().trim().optional(),
});

const opcaoSchema = z.object({
  rotulo: z.string().trim().max(200),
  valor: z.coerce.number().int().min(0),
});

/**
 * Opções de preço do contrato. Duas ou mais colocam o contrato em modo opções
 * (plano de pagamento em percentual); lista vazia volta ao valor fechado.
 */
export async function salvarOpcoesContrato(
  contratoId: number,
  opcoes: unknown
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "editar")) {
    return { erro: "Contrato já emitido não pode ser editado." };
  }
  const parsed = z.array(opcaoSchema).safeParse(opcoes);
  if (!parsed.success) return { erro: "Opções inválidas" };

  await db.delete(contratoOpcoes).where(eq(contratoOpcoes.contratoId, id));
  if (parsed.data.length > 0) {
    await db.insert(contratoOpcoes).values(
      parsed.data.map((o, idx) => ({
        contratoId: id,
        ordem: idx,
        rotulo: o.rotulo,
        valor: o.valor,
      }))
    );
  }
  await registrarEvento(
    id,
    "editado",
    parsed.data.length > 0
      ? `Opções de preço atualizadas (${parsed.data.length})`
      : "Opções de preço removidas — contrato voltou ao valor fechado",
    nomeUsuario(acesso.usuario)
  );
  revalidatePath(`/contratos/${id}`);
  return {};
}

export async function salvarItensContrato(
  contratoId: number,
  itens: unknown
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "editar")) {
    return { erro: "Contrato já emitido não pode ser editado." };
  }
  const parsed = z.array(itemSchema).safeParse(itens);
  if (!parsed.success) return { erro: "Itens inválidos" };

  await db.delete(contratoItens).where(eq(contratoItens.contratoId, id));
  if (parsed.data.length > 0) {
    await db.insert(contratoItens).values(
      parsed.data.map((it, idx) => ({
        contratoId: id,
        ordem: idx,
        modelo: it.modelo,
        cor: it.cor || null,
        medidasM2: it.medidasM2 || null,
        descricaoExtra: it.descricaoExtra || null,
      }))
    );
  }
  await registrarEvento(
    id,
    "editado",
    `Itens atualizados (${parsed.data.length})`,
    nomeUsuario(acesso.usuario)
  );
  revalidatePath(`/contratos/${id}`);
  return {};
}

// Plano de pagamento
const pagamentoSchema = z.object({
  rotulo: z.string().trim().min(1),
  tipo: z.enum(["sinal", "parcela", "saldo"]),
  valor: z.coerce.number().int().min(0),
  percentual: z.coerce.number().min(0).max(100).nullable().optional(),
  meio: z.enum([
    "pix",
    "cartao_credito",
    "cartao_debito",
    "transferencia",
    "boleto",
    "dinheiro",
  ]),
  numeroParcelas: z.coerce.number().int().min(1).max(48),
  gatilho: z.enum([
    "assinatura",
    "inicio_fabricacao",
    "entrega_material",
    "conclusao_instalacao",
    "dias_apos_instalacao",
    "dias_apos_assinatura",
    "data_fixa",
  ]),
  diasApos: z.coerce.number().int().min(0).max(365).nullable().optional(),
  dataVencimento: z.string().trim().nullable().optional(),
});

export async function salvarPlanoPagamento(
  contratoId: number,
  linhas: unknown
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "editar")) {
    return { erro: "Contrato já emitido não pode ser editado." };
  }
  const parsed = z.array(pagamentoSchema).safeParse(linhas);
  if (!parsed.success) return { erro: "Plano de pagamento inválido" };

  await db
    .delete(contratoPagamentos)
    .where(eq(contratoPagamentos.contratoId, id));
  if (parsed.data.length > 0) {
    await db.insert(contratoPagamentos).values(
      parsed.data.map((l, idx) => ({
        contratoId: id,
        ordem: idx,
        rotulo: l.rotulo,
        tipo: l.tipo,
        valor: l.valor,
        meio: l.meio,
        numeroParcelas: l.numeroParcelas,
        gatilho: l.gatilho,
        diasApos: l.diasApos ?? null,
        dataVencimento: l.dataVencimento ? new Date(l.dataVencimento) : null,
      }))
    );
  }
  await registrarEvento(
    id,
    "editado",
    `Plano de pagamento atualizado (${parsed.data.length} linha(s))`,
    nomeUsuario(acesso.usuario)
  );
  revalidatePath(`/contratos/${id}`);
  return {};
}

/** Aplica um preset por cima do plano atual. */
export async function aplicarPresetPlano(
  contratoId: number,
  preset: PresetPlano,
  opcoes: OpcoesPreset = {}
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "editar")) {
    return { erro: "Contrato já emitido não pode ser editado." };
  }
  const opcoesPreco = await db
    .select()
    .from(contratoOpcoes)
    .where(eq(contratoOpcoes.contratoId, id));
  const linhas = temOpcoes(opcoesPreco)
    ? gerarPresetPercentual(preset, opcoes)
    : gerarPreset(preset, acesso.contrato.valorTotal, opcoes);
  return salvarPlanoPagamento(id, linhas);
}

/** CPF/CNPJ do cliente — editável direto da tela do contrato. */
export async function salvarDocumentoCliente(
  clienteId: number,
  documento: string
): Promise<{ erro?: string }> {
  await exigirComercial();
  const id = z.coerce.number().int().positive().parse(clienteId);
  const doc = z.string().trim().max(30).parse(documento);
  await db
    .update(clientes)
    .set({ documento: doc || null })
    .where(eq(clientes.id, id));
  revalidatePath("/contratos");
  return {};
}

// ---------------------------------------------------------------------------
// Transições de status
// ---------------------------------------------------------------------------

async function dadosParaPendencias(contratoId: number) {
  const contrato = await carregarContrato(contratoId);
  if (!contrato) return null;
  const cliente = await db.query.clientes.findFirst({
    where: eq(clientes.id, contrato.clienteId),
  });
  const itens = await db
    .select()
    .from(contratoItens)
    .where(eq(contratoItens.contratoId, contratoId));
  const pagamentos = await db
    .select({
      valor: contratoPagamentos.valor,
      percentual: contratoPagamentos.percentual,
    })
    .from(contratoPagamentos)
    .where(eq(contratoPagamentos.contratoId, contratoId));
  const opcoes = await db
    .select()
    .from(contratoOpcoes)
    .where(eq(contratoOpcoes.contratoId, contratoId))
    .orderBy(asc(contratoOpcoes.ordem));
  return { contrato, cliente, itens, pagamentos, opcoes };
}

export async function emitirContrato(
  contratoId: number
): Promise<{ erro?: string; pendencias?: string[] }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "emitir")) {
    return { erro: "Só rascunho pode ser emitido." };
  }

  const dados = await dadosParaPendencias(id);
  if (!dados?.cliente) return { erro: "Cliente não encontrado" };

  const faltas = pendenciasParaEmitir({
    clienteNome: dados.cliente.nome,
    clienteDocumento: dados.cliente.documento,
    clienteEndereco: enderecoCompleto(dados.cliente) || null,
    localInstalacao: dados.contrato.localInstalacao,
    valorTotal: dados.contrato.valorTotal,
    itens: dados.itens,
    pagamentos: dados.pagamentos,
    opcoes: dados.opcoes,
  });
  if (faltas.length > 0) return { pendencias: faltas };

  // Prefixo é configurável (Configurações → Numerações), então traz todos e
  // deixa o formatador filtrar pelo prefixo em vigor.
  const todosNumeros = await db
    .select({ numero: contratos.numero })
    .from(contratos);
  const numero = proximoNumeroFormatado(
    todosNumeros.map((n) => n.numero),
    await configNumeracao("contrato"),
    new Date().getFullYear()
  );

  const snapshot = await montarSnapshot(dados.contrato.orcamentoId);

  await db
    .update(contratos)
    .set({
      numero,
      status: "emitido",
      dataEmissao: new Date(),
      snapshot: snapshot ? JSON.stringify(snapshot) : null,
      atualizadoEm: new Date(),
    })
    .where(eq(contratos.id, id));

  await registrarEvento(
    id,
    "emitido",
    `Contrato emitido sob o nº ${numero}`,
    nomeUsuario(acesso.usuario)
  );
  await dispararGatilhoDoContrato(id, "contrato_emitido");
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  return {};
}

export async function marcarAssinado(
  contratoId: number,
  dataISO: string
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "assinar")) {
    return { erro: "Só contrato emitido pode ser marcado como assinado." };
  }
  const data = dataISO ? new Date(dataISO) : new Date();
  if (Number.isNaN(data.getTime())) return { erro: "Data inválida" };

  await db
    .update(contratos)
    .set({ status: "assinado", dataAssinatura: data, atualizadoEm: new Date() })
    .where(eq(contratos.id, id));
  await registrarEvento(
    id,
    "assinado",
    `Assinatura registrada em ${data.toLocaleDateString("pt-BR")}`,
    nomeUsuario(acesso.usuario)
  );
  await dispararGatilhoDoContrato(id, "contrato_assinado");
  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  return {};
}

/**
 * Nova versão: clona o contrato com versao+1 e cancela o anterior. Só faz
 * sentido ANTES da assinatura — depois disso a saída é o aditivo.
 */
export async function criarNovaVersao(
  contratoId: number
): Promise<{ erro?: string; novoId?: number }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "versionar")) {
    return {
      erro: "Contrato assinado não pode ser versionado — gere um aditivo.",
    };
  }
  const antigo = acesso.contrato;
  const novaVersao = antigo.versao + 1;

  const [novo] = await db
    .insert(contratos)
    .values({
      versao: novaVersao,
      contratoPaiId: antigo.id,
      clienteId: antigo.clienteId,
      orcamentoId: antigo.orcamentoId,
      status: "rascunho",
      valorTotal: antigo.valorTotal,
      escopo: antigo.escopo,
      localInstalacao: antigo.localInstalacao,
      observacoesTecnicas: antigo.observacoesTecnicas,
      observacoesInternas: antigo.observacoesInternas,
      prazoDiasUteis: antigo.prazoDiasUteis,
      garantiaMeses: antigo.garantiaMeses,
      retencaoPercent: antigo.retencaoPercent,
      multaPercent: antigo.multaPercent,
      jurosMesPercent: antigo.jurosMesPercent,
      flagMedidas: antigo.flagMedidas,
      flagClima: antigo.flagClima,
      flagEnergia: antigo.flagEnergia,
      flagSobMedida: antigo.flagSobMedida,
      representante: antigo.representante,
      representanteContratante: antigo.representanteContratante,
      cidadeEmissao: antigo.cidadeEmissao,
      publicToken: nanoid(12),
      criadoPor: nomeUsuario(acesso.usuario),
    })
    .returning({ id: contratos.id });

  // Clona itens e plano de pagamento.
  const itens = await db
    .select()
    .from(contratoItens)
    .where(eq(contratoItens.contratoId, id))
    .orderBy(asc(contratoItens.ordem));
  if (itens.length > 0) {
    await db.insert(contratoItens).values(
      itens.map((i) => ({
        contratoId: novo.id,
        ordem: i.ordem,
        modelo: i.modelo,
        cor: i.cor,
        medidasM2: i.medidasM2,
        descricaoExtra: i.descricaoExtra,
      }))
    );
  }
  const pagamentos = await db
    .select()
    .from(contratoPagamentos)
    .where(eq(contratoPagamentos.contratoId, id))
    .orderBy(asc(contratoPagamentos.ordem));
  if (pagamentos.length > 0) {
    await db.insert(contratoPagamentos).values(
      pagamentos.map((p) => ({
        contratoId: novo.id,
        ordem: p.ordem,
        rotulo: p.rotulo,
        tipo: p.tipo,
        valor: p.valor,
        percentual: p.percentual,
        meio: p.meio,
        numeroParcelas: p.numeroParcelas,
        gatilho: p.gatilho,
        diasApos: p.diasApos,
        dataVencimento: p.dataVencimento,
      }))
    );
  }
  const opcoesAntigas = await db
    .select()
    .from(contratoOpcoes)
    .where(eq(contratoOpcoes.contratoId, id))
    .orderBy(asc(contratoOpcoes.ordem));
  if (opcoesAntigas.length > 0) {
    await db.insert(contratoOpcoes).values(
      opcoesAntigas.map((o) => ({
        contratoId: novo.id,
        ordem: o.ordem,
        rotulo: o.rotulo,
        valor: o.valor,
      }))
    );
  }

  await db
    .update(contratos)
    .set({
      status: "cancelado",
      motivoCancelamento: `Substituído pela versão ${novaVersao}`,
      atualizadoEm: new Date(),
    })
    .where(eq(contratos.id, id));

  await registrarEvento(
    id,
    "versionado",
    `Substituído pela versão ${novaVersao}`,
    nomeUsuario(acesso.usuario)
  );
  await registrarEvento(
    novo.id,
    "criado",
    `Versão ${novaVersao} criada a partir do contrato ${antigo.numero ?? "(rascunho)"}`,
    nomeUsuario(acesso.usuario)
  );

  revalidatePath("/contratos");
  return { novoId: novo.id };
}

const aditivoSchema = z.object({
  contratoId: z.coerce.number().int().positive(),
  objeto: z.string().trim().min(1, "Descreva o que muda").max(3000),
  deltaValor: z.coerce.number().int(),
  novoPrazoDiasUteis: z.coerce.number().int().min(0).max(365).nullable(),
  dataAssinatura: z.string().trim().optional(),
});

export async function gerarAditivo(
  _prev: ContratoFormState,
  formData: FormData
): Promise<ContratoFormState> {
  const parsed = aditivoSchema.safeParse({
    contratoId: formData.get("contratoId"),
    objeto: formData.get("objeto"),
    deltaValor: formData.get("deltaValor") || 0,
    novoPrazoDiasUteis: formData.get("novoPrazoDiasUteis") || null,
    dataAssinatura: formData.get("dataAssinatura") ?? "",
  });
  if (!parsed.success) return { erro: parsed.error.issues[0].message };
  const d = parsed.data;

  const acesso = await exigirAcesso(d.contratoId);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "aditivar")) {
    return { erro: "Só contrato assinado pode receber aditivo." };
  }

  const existentes = await db
    .select({ numero: contratoAditivos.numero })
    .from(contratoAditivos)
    .where(eq(contratoAditivos.contratoId, d.contratoId));
  const numero = proximoNumeroAditivo(existentes.map((a) => a.numero));

  const snapshot = await montarSnapshot(acesso.contrato.orcamentoId);

  await db.insert(contratoAditivos).values({
    contratoId: d.contratoId,
    numero,
    objeto: d.objeto,
    deltaValor: d.deltaValor,
    novoPrazoDiasUteis: d.novoPrazoDiasUteis,
    dataAssinatura: d.dataAssinatura ? new Date(d.dataAssinatura) : null,
    snapshot: snapshot ? JSON.stringify(snapshot) : null,
  });

  // Aditivos são cumulativos: o valor e o prazo do contrato acompanham.
  await db
    .update(contratos)
    .set({
      status: "aditivado",
      valorTotal: acesso.contrato.valorTotal + d.deltaValor,
      prazoDiasUteis: d.novoPrazoDiasUteis ?? acesso.contrato.prazoDiasUteis,
      atualizadoEm: new Date(),
    })
    .where(eq(contratos.id, d.contratoId));

  await registrarEvento(
    d.contratoId,
    "aditivado",
    `Aditivo nº ${numero} registrado (${d.deltaValor >= 0 ? "+" : ""}${
      d.deltaValor / 100
    } reais)`,
    nomeUsuario(acesso.usuario)
  );

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${d.contratoId}`);
  return { ok: true };
}

export async function cancelarContrato(
  contratoId: number,
  motivo: string
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const texto = z.string().trim().min(1, "Informe o motivo").max(500);
  const motivoParsed = texto.safeParse(motivo);
  if (!motivoParsed.success) return { erro: "Informe o motivo do cancelamento" };

  const acesso = await exigirAcesso(id);
  if (!acesso) return { erro: "Contrato não encontrado" };
  if (!podeFazer(acesso.contrato.status as StatusContrato, "cancelar")) {
    return { erro: "Contrato já cancelado." };
  }

  // Retenção só faz sentido quando o negócio já estava firmado.
  const aplicaRetencao =
    acesso.contrato.status === "assinado" ||
    acesso.contrato.status === "aditivado";
  const valorRetido = aplicaRetencao
    ? calcularRetencao(
        acesso.contrato.valorTotal,
        acesso.contrato.retencaoPercent
      )
    : null;

  await db
    .update(contratos)
    .set({
      status: "cancelado",
      motivoCancelamento: motivoParsed.data,
      valorRetido,
      atualizadoEm: new Date(),
    })
    .where(eq(contratos.id, id));

  await registrarEvento(
    id,
    "cancelado",
    valorRetido != null
      ? `Cancelado: ${motivoParsed.data} — retenção de ${
          acesso.contrato.retencaoPercent
        }% (R$ ${(valorRetido / 100).toFixed(2)})`
      : `Cancelado: ${motivoParsed.data}`,
    nomeUsuario(acesso.usuario)
  );

  revalidatePath("/contratos");
  revalidatePath(`/contratos/${id}`);
  return {};
}

/** Validação do plano usada pela UI para o totalizador (sem gravar nada). */
export async function conferirPlano(contratoId: number) {
  const id = z.coerce.number().int().positive().parse(contratoId);
  const acesso = await exigirAcesso(id);
  if (!acesso) return null;
  const linhas = await db
    .select({ valor: contratoPagamentos.valor })
    .from(contratoPagamentos)
    .where(eq(contratoPagamentos.contratoId, id));
  return validarPlanoPagamento(linhas, acesso.contrato.valorTotal);
}

/**
 * Ponte entre o contrato e as automações: descobre de qual atendimento ele
 * veio (contrato → orçamento → atendimento) e dispara o evento.
 */
async function dispararGatilhoDoContrato(
  contratoId: number,
  evento: EventoGatilho
) {
  const [linha] = await db
    .select({ atendimentoId: orcamentos.atendimentoId })
    .from(contratos)
    .innerJoin(orcamentos, eq(contratos.orcamentoId, orcamentos.id))
    .where(eq(contratos.id, contratoId));
  if (!linha) return;
  await dispararGatilhos(evento, {
    atendimentoId: linha.atendimentoId,
    contratoId,
  });
  revalidatePath("/tarefas");
  revalidatePath("/painel");
}

/**
 * Marca (ou desmarca) uma parcela como recebida. Vale mesmo com o contrato
 * assinado — receber não é editar o contrato, é operação do dia a dia.
 */
export async function marcarParcelaRecebida(
  parcelaId: number,
  recebida: boolean
): Promise<{ erro?: string }> {
  const usuario = await exigirUsuario();
  if (!podeComercial(usuario.papel)) {
    return { erro: "Seu acesso não permite dar baixa em parcela." };
  }
  const id = z.coerce.number().int().positive().parse(parcelaId);

  const [linha] = await db
    .select({
      contratoId: contratoPagamentos.contratoId,
      vendedorId: orcamentos.vendedorId,
    })
    .from(contratoPagamentos)
    .innerJoin(contratos, eq(contratoPagamentos.contratoId, contratos.id))
    .innerJoin(orcamentos, eq(contratos.orcamentoId, orcamentos.id))
    .where(eq(contratoPagamentos.id, id));
  if (!linha) return { erro: "Parcela não encontrada" };
  if (usuario.papel === "vendedor" && linha.vendedorId !== usuario.vendedorId) {
    return { erro: "Este contrato não é seu." };
  }

  await db
    .update(contratoPagamentos)
    .set({ pagoEm: recebida ? new Date() : null })
    .where(eq(contratoPagamentos.id, id));

  await registrarEvento(
    linha.contratoId,
    "editado",
    recebida ? "Parcela marcada como recebida" : "Recebimento de parcela desfeito",
    nomeUsuario(usuario)
  );
  revalidatePath(`/contratos/${linha.contratoId}`);
  revalidatePath("/atendimentos");
  revalidatePath("/painel");
  return {};
}
