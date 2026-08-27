import { eq } from "drizzle-orm";
import { db } from "@/db";
import { numeracoes } from "@/db/schema";
import {
  PADRAO,
  type ConfigNumeracao,
  type DocumentoNumerado,
} from "@/lib/numeracao";

/**
 * Configuração de numeração de um documento. Sem linha na tabela, vale o
 * formato histórico — assim o sistema continua numerando igual mesmo se a
 * tabela vier vazia.
 */
export async function configNumeracao(
  documento: DocumentoNumerado
): Promise<ConfigNumeracao> {
  const linha = await db.query.numeracoes.findFirst({
    where: eq(numeracoes.documento, documento),
  });
  if (!linha) return PADRAO[documento];
  return {
    prefixo: linha.prefixo,
    incluiAno: linha.incluiAno,
    digitos: linha.digitos,
  };
}
