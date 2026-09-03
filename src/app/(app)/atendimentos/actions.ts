"use server";

import { revalidatePath } from "next/cache";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  avisoContatos,
  avisos,
  canais,
  clientes,
  fases,
  historicoFases,
  motivosPerda,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirSessao, exigirTriagem, usuarioAtual } from "@/lib/auth";
import { dispararGatilhos } from "@/lib/gatilhos-executor";

const novoAtendimentoSchema = z
  .object({
    clienteId: z.coerce.number().int().positive().optional(),
    vendedorId: z.coerce.number().int().positive().optional(),
    nome: z.string().trim().optional(),
    telefone: z.string().trim().optional(),
    email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
    cep: z.string().trim().optional(),
    endereco: z.string().trim().optional(),
    numero: z.string().trim().optional(),
    complemento: z.string().trim().optional(),
    bairro: z.string().trim().optional(),
    cidade: z.string().trim().optional(),
    observacoes: z.string().trim().optional(),
    canalId: z
      .union([z.literal(""), z.coerce.number().int().positive()])
      .optional()
      .transform((v) => (v === "" || v === undefined ? null : v)),
  })
  .refine((d) => d.clienteId || (d.nome && d.telefone), {
    message: "Escolha um cliente ou informe nome e telefone",
  });

export type NovoAtendimentoState = {
  erro?: string;
  /** id do atendimento criado — a tela fecha o diálogo e navega. */
  criadoId?: number;
};

export async function criarAtendimento(
  _prev: NovoAtendimentoState,
  formData: FormData
): Promise<NovoAtendimentoState> {
  const usuario = await usuarioAtual();
  if (!usuario) return { erro: "Sessão expirada" };

  const parsed = novoAtendimentoSchema.safeParse({
    clienteId: formData.get("clienteId") || undefined,
    vendedorId: formData.get("vendedorId") || undefined,
    nome: formData.get("nome") || undefined,
    telefone: formData.get("telefone") || undefined,
    email: formData.get("email") || undefined,
    cep: formData.get("cep") || undefined,
    endereco: formData.get("endereco") || undefined,
    numero: formData.get("numero") || undefined,
    complemento: formData.get("complemento") || undefined,
    bairro: formData.get("bairro") || undefined,
    cidade: formData.get("cidade") || undefined,
    observacoes: formData.get("observacoes") || undefined,
    canalId: formData.get("canalId") ?? "",
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  // Todo atendimento tem um vendedor: vendedor cria em seu nome; gestor escolhe.
  const vendedorId =
    usuario.papel === "vendedor" ? usuario.vendedorId : dados.vendedorId ?? null;
  if (!vendedorId) {
    return { erro: "Escolha o vendedor responsável pelo atendimento" };
  }

  const faseInicial = await db.query.fases.findFirst({
    orderBy: asc(fases.ordem),
  });
  if (!faseInicial) return { erro: "Nenhuma fase cadastrada — rode o seed" };

  let clienteId = dados.clienteId;
  if (!clienteId) {
    const [novoCliente] = await db
      .insert(clientes)
      .values({
        nome: dados.nome!,
        telefone: dados.telefone!,
        email: dados.email || null,
        cep: dados.cep || null,
        endereco: dados.endereco || null,
        numero: dados.numero || null,
        complemento: dados.complemento || null,
        bairro: dados.bairro || null,
        cidade: dados.cidade || null,
        origem: "interno",
      })
      .returning({ id: clientes.id });
    clienteId = novoCliente.id;
  }

  const [novo] = await db
    .insert(atendimentos)
    .values({
      clienteId,
      faseId: faseInicial.id,
      vendedorId,
      canalId: dados.canalId,
      observacoes: dados.observacoes || null,
    })
    .returning({ id: atendimentos.id });

  await db.insert(historicoFases).values({
    atendimentoId: novo.id,
    faseAnteriorId: null,
    faseNovaId: faseInicial.id,
  });

  // O atendimento novo aparece em várias telas. Invalidar só o funil deixava
  // Orçamentos e, principalmente, o seletor de Visitas com a lista que havia
  // sido carregada antes da criação; um F5 fazia o cliente "aparecer" porque
  // então a rota era buscada novamente.
  revalidatePath("/atendimentos");
  revalidatePath("/orcamentos");
  revalidatePath("/visitas");
  revalidatePath("/painel");
  // Sem redirect() aqui: com useActionState ele deixava o botão travado em
  // "Criando…" e o diálogo aberto na frente da tela nova.
  return { criadoId: novo.id };
}

const mudarFaseSchema = z.object({
  atendimentoId: z.coerce.number().int().positive(),
  faseId: z.coerce.number().int().positive(),
});

/**
 * Orçamentos que a mudança de fase pode aprovar (os que foram ao cliente e
 * ainda não tiveram desfecho). A tela usa isso para perguntar qual aprovar
 * quando há mais de um.
 */
export async function orcamentosParaAprovar(atendimentoId: number) {
  await exigirSessao();
  const at = z.coerce.number().int().positive().parse(atendimentoId);
  const linhas = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      // Tabela e colunas escritas à mão de propósito: sem um join, o Drizzle
      // não qualifica os nomes e o "id" da subquery acabaria resolvendo para
      // a tabela de itens — a soma sairia errada sem dar erro nenhum.
      total: sql<number | null>`(
        select sum(oi.valor_min)
        from orcamento_itens oi
        where oi.orcamento_id = orcamentos.id
      )`,
    })
    .from(orcamentos)
    .where(
      and(
        eq(orcamentos.atendimentoId, at),
        eq(orcamentos.status, "enviado")
      )
    )
    .orderBy(asc(orcamentos.numero));
  return linhas;
}

export async function mudarFase(
  atendimentoId: number,
  faseId: number,
  // ids escolhidos na caixa de diálogo. undefined = aprova todos os enviados
  // (caminho de quando existe só um, ou fallback sem JavaScript).
  orcamentoIds?: number[],
  // Preenchido quando a fase de destino é de negócio perdido.
  perda?: { motivoId: number | null; observacao?: string | null }
) {
  await exigirSessao();
  const parsed = mudarFaseSchema.parse({ atendimentoId, faseId });

  const atendimento = await db.query.atendimentos.findFirst({
    where: eq(atendimentos.id, parsed.atendimentoId),
  });
  if (!atendimento || atendimento.faseId === parsed.faseId) return;

  const faseNova = await db.query.fases.findFirst({
    where: eq(fases.id, parsed.faseId),
  });

  await db
    .update(atendimentos)
    .set({
      faseId: parsed.faseId,
      atualizadoEm: new Date(),
      // Sair da fase de perdido limpa o motivo — senão o relatório continua
      // contando um negócio que voltou a andar.
      motivoPerdaId: faseNova?.ehPerdido ? (perda?.motivoId ?? null) : null,
      motivoPerdaObs: faseNova?.ehPerdido
        ? (perda?.observacao?.trim() || null)
        : null,
    })
    .where(eq(atendimentos.id, parsed.atendimentoId));

  await db.insert(historicoFases).values({
    atendimentoId: parsed.atendimentoId,
    faseAnteriorId: atendimento.faseId,
    faseNovaId: parsed.faseId,
  });

  // Fase de negócio fechado ("Orçamento aprovado" em diante) aprova sozinha os
  // orçamentos que estavam aguardando resposta. Não mexe em rascunho (ainda não
  // foi ao cliente) nem em recusado (decisão já tomada).
  const aprovados: number[] = [];
  if (faseNova?.liberaInstalacao) {
    const escolhidos = orcamentoIds
      ?.map((n) => Number(n))
      .filter((n) => Number.isInteger(n) && n > 0);

    const alvo = and(
      eq(orcamentos.atendimentoId, parsed.atendimentoId),
      eq(orcamentos.status, "enviado"),
      // só os escolhidos, quando a tela mandou a seleção
      ...(escolhidos && escolhidos.length
        ? [inArray(orcamentos.id, escolhidos)]
        : [])
    );
    const vaoAprovar = await db
      .select({ id: orcamentos.id })
      .from(orcamentos)
      .where(alvo);
    aprovados.push(...vaoAprovar.map((o) => o.id));

    await db.update(orcamentos).set({ status: "aprovado" }).where(alvo);
    revalidatePath("/orcamentos");
  }

  // Negócio perdido: orçamentos que aguardavam resposta viram recusados —
  // somem do aviso de cobrança e entram na conta certa dos cards por status.
  // Rascunho (nunca foi ao cliente) e aprovado (decisão tomada) ficam como estão.
  if (faseNova?.ehPerdido) {
    await db
      .update(orcamentos)
      .set({ status: "recusado" })
      .where(
        and(
          eq(orcamentos.atendimentoId, parsed.atendimentoId),
          eq(orcamentos.status, "enviado")
        )
      );
    revalidatePath("/orcamentos");
  }

  // Automações: a fase nova sempre dispara; aprovar/recusar dispara junto.
  await dispararGatilhos("entrou_na_fase", {
    atendimentoId: parsed.atendimentoId,
    faseId: parsed.faseId,
  });
  for (const orcamentoId of aprovados) {
    await dispararGatilhos("orcamento_aprovado", {
      atendimentoId: parsed.atendimentoId,
      orcamentoId,
    });
  }
  if (faseNova?.ehPerdido) {
    await dispararGatilhos("orcamento_recusado", {
      atendimentoId: parsed.atendimentoId,
    });
  }

  revalidatePath("/atendimentos");
  revalidatePath(`/atendimentos/${parsed.atendimentoId}`);
  revalidatePath("/tarefas");
  revalidatePath("/painel");
}

/** Motivos de perda ativos — a tela pergunta na hora de marcar como perdido. */
export async function motivosDePerdaAtivos() {
  await exigirSessao();
  return db
    .select({ id: motivosPerda.id, nome: motivosPerda.nome })
    .from(motivosPerda)
    .where(eq(motivosPerda.ativo, true))
    .orderBy(asc(motivosPerda.ordem), asc(motivosPerda.id));
}

// "Já contatei" / "não avisar mais" de um aviso configurável.
// definitivo=true silencia aquele alvo para sempre, mesmo com re-arme.
export async function marcarContatoAviso(
  avisoId: number,
  alvoId: number,
  definitivo: boolean
) {
  const usuario = await usuarioAtual();
  if (!usuario) return;
  const avId = z.coerce.number().int().positive().parse(avisoId);
  const alvo = z.coerce.number().int().positive().parse(alvoId);

  const aviso = await db.query.avisos.findFirst({ where: eq(avisos.id, avId) });
  if (!aviso) return;

  // Vendedor só dispensa o que é dele; gestor qualquer um.
  if (usuario.papel === "vendedor") {
    if (aviso.gatilho === "orcamento_sem_resposta") {
      const orc = await db.query.orcamentos.findFirst({
        where: eq(orcamentos.id, alvo),
      });
      if (!orc || orc.vendedorId !== usuario.vendedorId) return;
    } else {
      const atendimento = await db.query.atendimentos.findFirst({
        where: eq(atendimentos.id, alvo),
      });
      if (!atendimento || atendimento.vendedorId !== usuario.vendedorId) return;
    }
  }

  await db.insert(avisoContatos).values({
    avisoId: avId,
    alvoId: alvo,
    definitivo: Boolean(definitivo),
  });

  revalidatePath("/atendimentos");
}

// Gestor ou atendente (re)atribui o vendedor responsável por um atendimento.
export async function atribuirVendedor(atendimentoId: number, vendedorId: number) {
  await exigirTriagem();
  const at = z.coerce.number().int().positive().parse(atendimentoId);
  const vend = z.coerce.number().int().positive().parse(vendedorId);

  const vendedor = await db.query.vendedores.findFirst({
    where: eq(vendedores.id, vend),
  });
  if (!vendedor) return;

  await db
    .update(atendimentos)
    .set({ vendedorId: vend, atualizadoEm: new Date() })
    .where(eq(atendimentos.id, at));

  revalidatePath("/atendimentos");
  revalidatePath(`/atendimentos/${at}`);
}

const observacoesSchema = z.object({
  atendimentoId: z.coerce.number().int().positive(),
  observacoes: z.string().trim().max(5000),
});

export type ObservacoesState = { ok?: boolean };

export async function atualizarObservacoes(
  _prev: ObservacoesState,
  formData: FormData
): Promise<ObservacoesState> {
  await exigirSessao();
  const parsed = observacoesSchema.parse({
    atendimentoId: formData.get("atendimentoId"),
    observacoes: formData.get("observacoes") ?? "",
  });

  await db
    .update(atendimentos)
    .set({
      observacoes: parsed.observacoes || null,
      atualizadoEm: new Date(),
    })
    .where(eq(atendimentos.id, parsed.atendimentoId));

  revalidatePath(`/atendimentos/${parsed.atendimentoId}`);
  return { ok: true };
}


/** Canais de origem ativos. */
export async function canaisAtivos(soCadastroPublico = false) {
  return db
    .select({ id: canais.id, nome: canais.nome })
    .from(canais)
    .where(
      soCadastroPublico
        ? and(eq(canais.ativo, true), eq(canais.noCadastroPublico, true))
        : eq(canais.ativo, true)
    )
    .orderBy(asc(canais.ordem), asc(canais.id));
}

/** Troca o canal de origem — dá para corrigir depois de abrir o atendimento. */
export async function definirCanal(atendimentoId: number, canalId: number | null) {
  await exigirSessao();
  const id = z.coerce.number().int().positive().parse(atendimentoId);
  const canal = canalId == null ? null : z.coerce.number().int().positive().parse(canalId);
  await db
    .update(atendimentos)
    .set({ canalId: canal, atualizadoEm: new Date() })
    .where(eq(atendimentos.id, id));
  revalidatePath(`/atendimentos/${id}`);
  revalidatePath("/painel");
}
