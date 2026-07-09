"use server";

// Ações PÚBLICAS de auto-cadastro — sem exigir sessão.

import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  historicoFases,
  vendedores,
} from "@/db/schema";

function soDigitos(valor: string): string {
  return valor.replace(/\D/g, "");
}

const cadastroSchema = z.object({
  nome: z.string().trim().min(1, "Informe seu nome"),
  telefone: z.string().trim().min(8, "Informe um telefone válido"),
  email: z.string().trim().email("E-mail inválido").optional().or(z.literal("")),
  cep: z
    .string()
    .trim()
    .refine((v) => v.replace(/\D/g, "").length === 8, "Informe um CEP válido"),
  endereco: z.string().trim().min(1, "Informe o endereço"),
  numero: z.string().trim().min(1, "Informe o número"),
  complemento: z.string().trim().optional(),
  bairro: z.string().trim().optional(),
  cidade: z.string().trim().optional(),
  descricao: z.string().trim().max(2000).optional(),
});

export type CadastroPublicoState = { erro?: string; ok?: boolean };

export async function enviarAutoCadastro(
  _prev: CadastroPublicoState,
  formData: FormData
): Promise<CadastroPublicoState> {
  const token = String(formData.get("token") ?? "");

  const parsed = cadastroSchema.safeParse({
    nome: formData.get("nome"),
    telefone: formData.get("telefone"),
    email: formData.get("email") || undefined,
    cep: formData.get("cep") ?? "",
    endereco: formData.get("endereco") ?? "",
    numero: formData.get("numero") ?? "",
    complemento: formData.get("complemento") || undefined,
    bairro: formData.get("bairro") || undefined,
    cidade: formData.get("cidade") || undefined,
    descricao: formData.get("descricao") || undefined,
  });

  if (!parsed.success) {
    return { erro: parsed.error.issues[0].message };
  }
  const dados = parsed.data;

  // O token é o link exclusivo de um vendedor: todo lead nasce atribuído a ele.
  const vendedor = token
    ? await db.query.vendedores.findFirst({
        where: and(eq(vendedores.linkToken, token), eq(vendedores.ativo, true)),
      })
    : null;
  if (!vendedor) {
    return { erro: "Este link de cadastro não é mais válido." };
  }

  const faseInicial = await db.query.fases.findFirst({
    orderBy: asc(fases.ordem),
  });
  if (!faseInicial) return { erro: "Erro interno. Tente mais tarde." };

  // Detecta se a pessoa já está cadastrada (mesmo telefone, comparando só dígitos).
  const telefoneDigitos = soDigitos(dados.telefone);
  const emailNovo = dados.email ? dados.email.toLowerCase() : null;
  const todos = await db
    .select({
      id: clientes.id,
      telefone: clientes.telefone,
      email: clientes.email,
      endereco: clientes.endereco,
      bairro: clientes.bairro,
      cidade: clientes.cidade,
      cep: clientes.cep,
    })
    .from(clientes);
  const existente = todos.find(
    (c) =>
      (telefoneDigitos.length >= 8 &&
        soDigitos(c.telefone) === telefoneDigitos) ||
      (emailNovo != null && c.email?.toLowerCase() === emailNovo)
  );

  let clienteId: number;
  let recorrente = false;

  if (existente) {
    // Já cadastrado: reaproveita o cliente e completa campos que estavam vazios.
    recorrente = true;
    clienteId = existente.id;
    const preencher: Record<string, string> = {};
    if (!existente.email && dados.email) preencher.email = dados.email;
    if (!existente.endereco && dados.endereco)
      preencher.endereco = dados.endereco;
    if (!existente.bairro && dados.bairro) preencher.bairro = dados.bairro;
    if (!existente.cidade && dados.cidade) preencher.cidade = dados.cidade;
    if (!existente.cep && dados.cep) preencher.cep = dados.cep;
    if (Object.keys(preencher).length > 0) {
      await db.update(clientes).set(preencher).where(eq(clientes.id, clienteId));
    }
  } else {
    const [cliente] = await db
      .insert(clientes)
      .values({
        nome: dados.nome,
        telefone: dados.telefone,
        email: dados.email || null,
        endereco: dados.endereco || null,
        numero: dados.numero || null,
        complemento: dados.complemento || null,
        bairro: dados.bairro || null,
        cidade: dados.cidade || null,
        cep: dados.cep || null,
        origem: "auto_cadastro",
      })
      .returning({ id: clientes.id });
    clienteId = cliente.id;
  }

  const prefixo = recorrente
    ? "Auto-cadastro (cliente recorrente)"
    : "Auto-cadastro";
  const [atendimento] = await db
    .insert(atendimentos)
    .values({
      clienteId,
      faseId: faseInicial.id,
      vendedorId: vendedor.id,
      observacoes: dados.descricao
        ? `${prefixo} — o que precisa: ${dados.descricao}`
        : prefixo,
    })
    .returning({ id: atendimentos.id });

  await db.insert(historicoFases).values({
    atendimentoId: atendimento.id,
    faseAnteriorId: null,
    faseNovaId: faseInicial.id,
  });

  return { ok: true };
}
