"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  fases,
  historicoFases,
  orcamentoFotos,
  orcamentoItens,
  orcamentos,
} from "@/db/schema";
import { exigirComercial, podeComercial, usuarioAtual } from "@/lib/auth";
import { parseParaCentavos } from "@/lib/format";
import { configNumeracao } from "@/lib/numeracao-consulta";
import { proximoNumero as proximoNumeroFormatado } from "@/lib/numeracao";
import { permiteEnvioAutomatico } from "@/lib/orcamento-envio";
import { dispararGatilhos } from "@/lib/gatilhos-executor";
import { removerFotoArquivo, salvarFoto } from "@/lib/uploads";

const itemSchema = z.object({
  descricao: z.string().trim().min(1),
  valorMin: z.string().optional(),
  valorMax: z.string().optional(),
  subtitulo: z.boolean().optional(),
});

const orcamentoSchema = z.object({
  atendimentoId: z.coerce.number().int().positive("Escolha o atendimento"),
  modeloId: z.coerce.number().int().positive().optional(),
  vendedorId: z.coerce.number().int().positive().optional(),
  tipoEstrutura: z.enum(["aluminio", "metalica"]),
  formato: z.enum(["capotinha", "braco_retratil"]).optional(),
  descricaoMaterial: z.string().trim().optional(),
  fixacaoVedacao: z.string().trim().optional(),
  garantiaTexto: z.string().trim().optional(),
  formaPagamento: z.string().trim().optional(),
  prazoEntrega: z.string().trim().optional(),
  introducao: z.string().trim().optional(),
  aosCuidadosDe: z.string().trim().max(120).optional(),
  // "" ou 0 = proposta sem prazo de validade
  validadeDias: z
    .union([z.literal(""), z.coerce.number().int().min(0).max(365)])
    .optional()
    .transform((v) => (v === "" || v === 0 || v === undefined ? null : v)),
  observacoesInternas: z.string().trim().max(4000).optional(),
  // "agendado" (e não "enviado"): quem marca como enviado é o worker, depois
  // da confirmação da Evolution.
  // "manter" = salvar sem mexer no status. Existe porque orçamento JÁ ENVIADO
  // precisa poder ser corrigido quando o cliente pede alteração: antes, as
  // únicas saídas eram derrubar de volta para rascunho ou levar recusa por
  // reenvio, e nenhuma das duas é "corrigir o que o cliente pediu".
  status: z.enum(["rascunho", "agendado", "manter"]),
  itens: z.array(itemSchema).min(1, "Adicione ao menos um item"),
});

export type OrcamentoFormState = { erro?: string };

/**
 * Erro de validação na língua de quem preenche.
 *
 * Item sem descrição caía na mensagem padrão do Zod — em inglês técnico, sem
 * dizer QUAL linha. Num orçamento de quinze itens a pessoa relia tudo.
 */
function mensagemDeErro(issue: z.core.$ZodIssue): string {
  const [campo, indice, sub] = issue.path;
  if (campo === "itens" && typeof indice === "number") {
    const n = indice + 1;
    if (sub === "descricao") return `O item ${n} está sem descrição.`;
    return `Confira o item ${n}.`;
  }
  return issue.message;
}

type ItemConvertido = {
  descricao: string;
  valorMin: number | null;
  valorMax: number | null;
};

// Converte itens do formulário para centavos (subtítulos ficam sem valor)
function converterItens(
  itens: z.infer<typeof itemSchema>[]
): { itens: ItemConvertido[] } | { erro: string } {
  const convertidos: ItemConvertido[] = [];
  for (const item of itens) {
    if (item.subtitulo) {
      convertidos.push({
        descricao: item.descricao,
        valorMin: null,
        valorMax: null,
      });
      continue;
    }
    const valorMin = item.valorMin ? parseParaCentavos(item.valorMin) : null;
    const valorMax = item.valorMax ? parseParaCentavos(item.valorMax) : null;
    if (valorMin === null) {
      return { erro: `Informe o valor do item "${item.descricao}"` };
    }
    convertidos.push({ descricao: item.descricao, valorMin, valorMax });
  }
  return { itens: convertidos };
}

async function proximoNumero(): Promise<string> {
  const ano = new Date().getFullYear();
  const config = await configNumeracao("orcamento");
  // Traz todos e filtra pelo prefixo em memória: o prefixo é configurável e
  // pode ter mudado no meio do ano.
  const linhas = await db
    .select({ numero: orcamentos.numero })
    .from(orcamentos);
  return proximoNumeroFormatado(
    linhas.map((l) => l.numero),
    config,
    ano
  );
}

/**
 * Aprovar o orçamento leva o atendimento para "Orçamento aprovado".
 * Não mexe se o atendimento JÁ está numa fase de negócio fechado — senão
 * marcar aprovado puxaria um cliente de "Em produção" de volta.
 */
async function moverParaOrcamentoAprovado(atendimentoId: number) {
  const faseAprovado = await db.query.fases.findFirst({
    where: eq(fases.nome, "Orçamento aprovado"),
  });
  if (!faseAprovado) return;

  const atendimento = await db.query.atendimentos.findFirst({
    where: eq(atendimentos.id, atendimentoId),
  });
  if (!atendimento || atendimento.faseId === faseAprovado.id) return;

  const faseAtual = await db.query.fases.findFirst({
    where: eq(fases.id, atendimento.faseId),
  });
  if (faseAtual?.liberaInstalacao) return; // já está adiante no funil

  await db
    .update(atendimentos)
    .set({ faseId: faseAprovado.id, atualizadoEm: new Date() })
    .where(eq(atendimentos.id, atendimentoId));
  await db.insert(historicoFases).values({
    atendimentoId,
    faseAnteriorId: atendimento.faseId,
    faseNovaId: faseAprovado.id,
  });
  await dispararGatilhos("entrou_na_fase", {
    atendimentoId,
    faseId: faseAprovado.id,
  });
}

export async function criarOrcamento(
  _prev: OrcamentoFormState,
  formData: FormData
): Promise<OrcamentoFormState> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: "Sessão expirada" };
  // Atendente faz triagem, não orçamento.
  if (!podeComercial(usuario.papel)) {
    return { erro: "Seu acesso não permite criar orçamento." };
  }

  let itensBrutos: unknown;
  try {
    itensBrutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { erro: "Itens inválidos" };
  }

  const parsed = orcamentoSchema.safeParse({
    atendimentoId: formData.get("atendimentoId"),
    modeloId: formData.get("modeloId") || undefined,
    vendedorId: formData.get("vendedorId") || undefined,
    tipoEstrutura: formData.get("tipoEstrutura"),
    formato: formData.get("formato") || undefined,
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
    fixacaoVedacao: formData.get("fixacaoVedacao") || undefined,
    garantiaTexto: formData.get("garantiaTexto") || undefined,
    formaPagamento: formData.get("formaPagamento") || undefined,
    prazoEntrega: formData.get("prazoEntrega") || undefined,
    introducao: formData.get("introducao") || undefined,
    aosCuidadosDe: formData.get("aosCuidadosDe") || undefined,
    validadeDias: formData.get("validadeDias") ?? "",
    observacoesInternas: formData.get("observacoesInternas") || undefined,
    status: formData.get("status"),
    itens: itensBrutos,
  });

  if (!parsed.success) {
    return { erro: mensagemDeErro(parsed.error.issues[0]) };
  }
  const dados = parsed.data;

  if (!(await atendimentoPermitido(usuario, dados.atendimentoId))) {
    return { erro: "Cliente não encontrado." };
  }

  // Vendedor responsável = o usuário logado (quem tem cadastro de vendedor).
  // Admin do env sem vendedor cai no que veio do formulário.
  const vendedorId = usuario.vendedorId ?? dados.vendedorId ?? null;

  if (dados.status === "agendado" && !permiteEnvioAutomatico(vendedorId)) {
    return {
      erro: "O envio automático está disponível temporariamente somente para os orçamentos do João Avelar.",
    };
  }

  const conversao = converterItens(dados.itens);
  if ("erro" in conversao) return { erro: conversao.erro };
  const itensConvertidos = conversao.itens;

  const numero = await proximoNumero();

  const [novo] = await db
    .insert(orcamentos)
    .values({
      numero,
      atendimentoId: dados.atendimentoId,
      modeloId: dados.modeloId ?? null,
      vendedorId,
      descricaoMaterial: dados.descricaoMaterial || null,
      tipoEstrutura: dados.tipoEstrutura,
      formato: dados.formato ?? null,
      fixacaoVedacao: dados.fixacaoVedacao || null,
      garantiaTexto: dados.garantiaTexto || null,
      formaPagamento: dados.formaPagamento || null,
      prazoEntrega: dados.prazoEntrega || null,
      introducao: dados.introducao || null,
      aosCuidadosDe: dados.aosCuidadosDe || null,
      validadeDias: dados.validadeDias,
      observacoesInternas: dados.observacoesInternas || null,
      // Orçamento nasce rascunho; "manter" só existe na edição.
      status: dados.status === "manter" ? "rascunho" : dados.status,
      publicToken: nanoid(12),
      agendadoEm: dados.status === "agendado" ? new Date() : null,
    })
    .returning({ id: orcamentos.id });

  await db.insert(orcamentoItens).values(
    itensConvertidos.map((item, i) => ({
      orcamentoId: novo.id,
      descricao: item.descricao,
      valorMin: item.valorMin,
      valorMax: item.valorMax,
      ordem: i,
    }))
  );

  // Fotos anexadas já na criação (opcional).
  const arquivos = formData
    .getAll("fotosNovas")
    .filter((f): f is File => f instanceof File && f.size > 0);
  let ordemFoto = 0;
  for (const file of arquivos) {
    const salvo = await salvarFoto(novo.id, file);
    if (salvo.ok) {
      await db.insert(orcamentoFotos).values({
        orcamentoId: novo.id,
        arquivo: salvo.arquivo,
        ordem: ordemFoto++,
      });
    }
  }

  // Quem tem cadastro de vendedor e orça um lead do pool vira dono do atendimento.
  if (usuario.vendedorId != null) {
    const at = await db.query.atendimentos.findFirst({
      where: eq(atendimentos.id, dados.atendimentoId),
    });
    if (at && at.vendedorId == null) {
      await db
        .update(atendimentos)
        .set({ vendedorId: usuario.vendedorId })
        .where(eq(atendimentos.id, dados.atendimentoId));
    }
  }

  revalidatePath("/orcamentos");
  revalidatePath("/atendimentos");
  redirect(`/orcamentos/${novo.id}`);
}

export async function atualizarOrcamento(
  _prev: OrcamentoFormState,
  formData: FormData
): Promise<OrcamentoFormState> {
  const usuario = await exigirComercial();

  const orcamentoId = Number(formData.get("orcamentoId"));
  if (!Number.isInteger(orcamentoId) || orcamentoId <= 0) {
    return { erro: "Orçamento inválido" };
  }

  // Vendedor só edita o que é dele (antes: qualquer orçamento pelo id).
  const existente = await orcamentoEditavel(orcamentoId);
  if (!existente) return { erro: "Orçamento não encontrado" };
  // Durante o envio pelo WhatsApp o serviço externo é dono do registro: mudar
  // o status agora fazia o resultado do envio se perder e, voltando para
  // "agendado", a proposta ia DUAS vezes ao cliente.
  if (existente.status === "enviando") {
    return { erro: "A proposta está sendo enviada agora. Espere um instante e tente de novo." };
  }

  let itensBrutos: unknown;
  try {
    itensBrutos = JSON.parse(String(formData.get("itens") ?? "[]"));
  } catch {
    return { erro: "Itens inválidos" };
  }

  const parsed = orcamentoSchema.safeParse({
    atendimentoId: formData.get("atendimentoId"),
    modeloId: formData.get("modeloId") || undefined,
    vendedorId: formData.get("vendedorId") || undefined,
    tipoEstrutura: formData.get("tipoEstrutura"),
    formato: formData.get("formato") || undefined,
    descricaoMaterial: formData.get("descricaoMaterial") || undefined,
    fixacaoVedacao: formData.get("fixacaoVedacao") || undefined,
    garantiaTexto: formData.get("garantiaTexto") || undefined,
    formaPagamento: formData.get("formaPagamento") || undefined,
    prazoEntrega: formData.get("prazoEntrega") || undefined,
    introducao: formData.get("introducao") || undefined,
    aosCuidadosDe: formData.get("aosCuidadosDe") || undefined,
    validadeDias: formData.get("validadeDias") ?? "",
    observacoesInternas: formData.get("observacoesInternas") || undefined,
    status: formData.get("status"),
    itens: itensBrutos,
  });

  if (!parsed.success) {
    return { erro: mensagemDeErro(parsed.error.issues[0]) };
  }
  const dados = parsed.data;

  if (!(await atendimentoPermitido(usuario, dados.atendimentoId))) {
    return { erro: "Cliente não encontrado." };
  }
  // Vendedor não passa o orçamento para outro nome.
  if (usuario.papel === "vendedor") dados.vendedorId = usuario.vendedorId ?? undefined;
  const vendedorIdEfetivo = dados.vendedorId ?? existente.vendedorId;
  if (
    dados.status === "agendado" &&
    !permiteEnvioAutomatico(vendedorIdEfetivo)
  ) {
    return {
      erro: "O envio automático está disponível temporariamente somente para os orçamentos do João Avelar.",
    };
  }

  if (dados.status === "agendado" && existente.enviadoEm != null) {
    return {
      erro: "Este orçamento já foi enviado e não pode ser agendado novamente.",
    };
  }

  const conversao = converterItens(dados.itens);
  if ("erro" in conversao) return { erro: conversao.erro };

  // "manter" preserva o status atual — é o caminho de quem só está corrigindo
  // um orçamento que o cliente já recebeu.
  const statusFinal =
    dados.status === "manter" ? existente.status : dados.status;
  const agendaAgora =
    dados.status === "agendado" && existente.status !== "agendado";

  await db
    .update(orcamentos)
    .set({
      atendimentoId: dados.atendimentoId,
      modeloId: dados.modeloId ?? null,
      vendedorId: dados.vendedorId ?? null,
      descricaoMaterial: dados.descricaoMaterial || null,
      tipoEstrutura: dados.tipoEstrutura,
      formato: dados.formato ?? null,
      fixacaoVedacao: dados.fixacaoVedacao || null,
      garantiaTexto: dados.garantiaTexto || null,
      formaPagamento: dados.formaPagamento || null,
      prazoEntrega: dados.prazoEntrega || null,
      introducao: dados.introducao || null,
      aosCuidadosDe: dados.aosCuidadosDe || null,
      validadeDias: dados.validadeDias,
      observacoesInternas: dados.observacoesInternas || null,
      status: statusFinal,
      ...(agendaAgora
        ? { agendadoEm: new Date(), envioErro: null, envioTentativas: 0 }
        : {}),
    })
    .where(eq(orcamentos.id, orcamentoId));

  // Regrava os itens (mais simples que fazer diff) — numa transação: se a
  // gravação falhasse depois do DELETE (banco ocupado no meio de um deploy),
  // o orçamento ficava SEM itens (auditoria de 07/10/2026).
  db.transaction((tx) => {
    tx.delete(orcamentoItens)
      .where(eq(orcamentoItens.orcamentoId, orcamentoId))
      .run();
    tx.insert(orcamentoItens)
      .values(
        conversao.itens.map((item, i) => ({
          orcamentoId,
          descricao: item.descricao,
          valorMin: item.valorMin,
          valorMax: item.valorMax,
          ordem: i,
        }))
      )
      .run();
  });

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${orcamentoId}`);
  revalidatePath("/atendimentos");
  redirect(`/orcamentos/${orcamentoId}`);
}

const statusSchema = z.enum([
  "rascunho",
  "agendado",
  "enviando",
  "enviado",
  "falha_envio",
  "aprovado",
  "recusado",
]);

export async function mudarStatusOrcamento(
  orcamentoId: number,
  status: string
) {
  const novoStatus = statusSchema.parse(status);
  // "enviado", "enviando" e "falha_envio" são gravados só pelo serviço de
  // envio do WhatsApp. "falha_envio" escolhido à mão era o pior: o serviço
  // pega quem está nesse status para TENTAR DE NOVO — orçamento já enviado
  // (ou aprovado) ia outra vez ao cliente e voltava para "enviado"
  // (auditoria de 07/10/2026).
  if (
    novoStatus === "enviado" ||
    novoStatus === "enviando" ||
    novoStatus === "falha_envio"
  ) {
    return;
  }
  const id = z.coerce.number().int().positive().parse(orcamentoId);

  // Vendedor só muda o status do que é dele (antes: qualquer um pelo id).
  const orcamento = await orcamentoEditavel(id);
  if (!orcamento || orcamento.status === novoStatus) return;
  // Durante o envio, o serviço é dono do registro (ver atualizarOrcamento).
  if (orcamento.status === "enviando") return;
  if (novoStatus === "agendado" && !permiteEnvioAutomatico(orcamento.vendedorId)) return;
  if (novoStatus === "agendado" && orcamento.enviadoEm != null) return;

  const agendar = novoStatus === "agendado" && orcamento.status !== "agendado";

  await db
    .update(orcamentos)
    .set({
      status: novoStatus,
      ...(agendar
        ? { agendadoEm: new Date(), envioErro: null, envioTentativas: 0 }
        : {}),
    })
    .where(eq(orcamentos.id, id));

  if (novoStatus === "aprovado") {
    await moverParaOrcamentoAprovado(orcamento.atendimentoId);
    await dispararGatilhos("orcamento_aprovado", {
      atendimentoId: orcamento.atendimentoId,
      orcamentoId: id,
    });
  }
  if (novoStatus === "recusado") {
    await dispararGatilhos("orcamento_recusado", {
      atendimentoId: orcamento.atendimentoId,
      orcamentoId: id,
    });
  }
  revalidatePath("/tarefas");
  revalidatePath("/painel");

  revalidatePath("/orcamentos");
  revalidatePath(`/orcamentos/${id}`);
  revalidatePath("/atendimentos");
  revalidatePath(`/atendimentos/${orcamento.atendimentoId}`);
}

// Quem pode mexer no orçamento: gestor em qualquer um, vendedor no seu.
// Atendente não mexe em nenhum.
/**
 * Vendedor só monta orçamento em atendimento DELE ou ainda sem dono (que
 * passa a ser dele — ver criarOrcamento). A tela já escondia os outros, mas a
 * Server Action é chamável direto (auditoria de 07/10/2026).
 */
async function atendimentoPermitido(
  usuario: { papel: string; vendedorId: number | null },
  atendimentoId: number
): Promise<boolean> {
  if (usuario.papel !== "vendedor") return true;
  const at = await db.query.atendimentos.findFirst({
    where: eq(atendimentos.id, atendimentoId),
    columns: { vendedorId: true },
  });
  return at != null && (at.vendedorId == null || at.vendedorId === usuario.vendedorId);
}

async function orcamentoEditavel(orcamentoId: number) {
  const usuario = await usuarioAtual();
  if (!usuario) return null;
  if (!podeComercial(usuario.papel)) return null;
  const orc = await db.query.orcamentos.findFirst({
    where: eq(orcamentos.id, orcamentoId),
  });
  if (!orc) return null;
  if (usuario.papel === "vendedor" && orc.vendedorId !== usuario.vendedorId)
    return null;
  return orc;
}

export type FotoState = { erro?: string; ok?: boolean };

export async function adicionarFotoOrcamento(
  _prev: FotoState,
  formData: FormData
): Promise<FotoState> {
  const orcamentoId = Number(formData.get("orcamentoId"));
  if (!Number.isInteger(orcamentoId) || orcamentoId <= 0)
    return { erro: "Orçamento inválido" };

  const orc = await orcamentoEditavel(orcamentoId);
  if (!orc) return { erro: "Sem permissão para este orçamento" };

  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0)
    return { erro: "Escolha uma imagem" };

  const salvo = await salvarFoto(orcamentoId, file);
  if (!salvo.ok) return { erro: salvo.erro };

  const [{ maxOrdem }] = await db
    .select({ maxOrdem: sql<number>`coalesce(max(${orcamentoFotos.ordem}), -1)` })
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, orcamentoId));

  await db.insert(orcamentoFotos).values({
    orcamentoId,
    arquivo: salvo.arquivo,
    ordem: (maxOrdem ?? -1) + 1,
  });

  revalidatePath(`/orcamentos/${orcamentoId}`);
  return { ok: true };
}

export async function removerFotoOrcamento(fotoId: number) {
  const id = z.coerce.number().int().positive().parse(fotoId);
  const foto = await db.query.orcamentoFotos.findFirst({
    where: eq(orcamentoFotos.id, id),
  });
  if (!foto) return;
  const orc = await orcamentoEditavel(foto.orcamentoId);
  if (!orc) return;

  await db.delete(orcamentoFotos).where(eq(orcamentoFotos.id, id));
  await removerFotoArquivo(foto.orcamentoId, foto.arquivo);
  revalidatePath(`/orcamentos/${foto.orcamentoId}`);
}

// Exclui um orçamento — permitido apenas quando está em rascunho.
export async function excluirOrcamento(
  orcamentoId: number
): Promise<{ erro?: string }> {
  const id = z.coerce.number().int().positive().parse(orcamentoId);
  const orc = await orcamentoEditavel(id);
  if (!orc) return { erro: "Sem permissão para este orçamento" };
  if (orc.status !== "rascunho")
    return { erro: "Só é possível excluir orçamentos em rascunho" };

  // Antes: apagava os ARQUIVOS das fotos, depois fotos e itens, e só então
  // tentava o orçamento — que o banco recusava quando havia tarefa, cotação ou
  // chamado ligado a ele. Resultado: tela de erro e orçamento sem itens e sem
  // fotos, sem volta (auditoria de 07/10/2026). Agora o banco apaga tudo numa
  // transação só (tudo ou nada) e os arquivos saem DEPOIS que deu certo.
  const fotos = await db
    .select()
    .from(orcamentoFotos)
    .where(eq(orcamentoFotos.orcamentoId, id));
  try {
    db.transaction((tx) => {
      tx.delete(orcamentoFotos).where(eq(orcamentoFotos.orcamentoId, id)).run();
      tx.delete(orcamentoItens).where(eq(orcamentoItens.orcamentoId, id)).run();
      tx.delete(orcamentos).where(eq(orcamentos.id, id)).run();
    });
  } catch {
    return {
      erro:
        "Este orçamento tem tarefa, cotação ou chamado ligado a ele. Exclua ou desligue esses itens antes.",
    };
  }
  for (const foto of fotos) {
    await removerFotoArquivo(id, foto.arquivo);
  }

  revalidatePath("/orcamentos");
  revalidatePath(`/atendimentos/${orc.atendimentoId}`);
  redirect("/orcamentos");
}

// Cria um novo orçamento (rascunho) copiando todos os dados de um existente.
export async function duplicarOrcamento(orcamentoId: number) {
  const id = z.coerce.number().int().positive().parse(orcamentoId);

  // Vendedor só duplica o que é dele.
  const original = await orcamentoEditavel(id);
  if (!original) return;

  const itens = await db
    .select()
    .from(orcamentoItens)
    .where(eq(orcamentoItens.orcamentoId, id));

  const numero = await proximoNumero();
  const [novo] = await db
    .insert(orcamentos)
    .values({
      numero,
      atendimentoId: original.atendimentoId,
      modeloId: original.modeloId,
      vendedorId: original.vendedorId,
      descricaoMaterial: original.descricaoMaterial,
      tipoEstrutura: original.tipoEstrutura,
      formato: original.formato,
      fixacaoVedacao: original.fixacaoVedacao,
      garantiaTexto: original.garantiaTexto,
      formaPagamento: original.formaPagamento,
      prazoEntrega: original.prazoEntrega,
      introducao: original.introducao,
      aosCuidadosDe: original.aosCuidadosDe,
      validadeDias: original.validadeDias,
      // Anotação interna não é copiada: a duplicata é outro negócio.
      status: "rascunho",
      publicToken: nanoid(12),
    })
    .returning({ id: orcamentos.id });

  if (itens.length > 0) {
    await db.insert(orcamentoItens).values(
      itens.map((item) => ({
        orcamentoId: novo.id,
        descricao: item.descricao,
        valorMin: item.valorMin,
        valorMax: item.valorMax,
        ordem: item.ordem,
      }))
    );
  }

  revalidatePath("/orcamentos");
  redirect(`/orcamentos/${novo.id}/editar`);
}
