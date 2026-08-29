import { db } from "@/db";
import { logsDinheiro } from "@/db/schema";

export type AcaoDinheiro =
  | "parcela_recebida"
  | "parcela_desfeita"
  | "comissao_paga"
  | "comissao_desfeita";

export const ACAO_DINHEIRO_LABEL: Record<AcaoDinheiro, string> = {
  parcela_recebida: "Parcela recebida",
  parcela_desfeita: "Recebimento desfeito",
  comissao_paga: "Comissão paga",
  comissao_desfeita: "Pagamento de comissão desfeito",
};

/** Verde entra, laranja sai, cinza é correção. */
export const ACAO_DINHEIRO_COR: Record<AcaoDinheiro, string> = {
  parcela_recebida: "#10B981",
  parcela_desfeita: "#94A3B8",
  comissao_paga: "#E06E00",
  comissao_desfeita: "#94A3B8",
};

/**
 * Registra um movimento de dinheiro.
 *
 * Silencioso de propósito: falhar aqui não pode impedir a baixa. Um log
 * perdido é ruim; uma parcela que não foi dada como recebida porque o log
 * quebrou é pior.
 */
export async function registrarDinheiro(dados: {
  acao: AcaoDinheiro;
  usuario: string;
  descricao: string;
  valor?: number | null;
  orcamentoId?: number | null;
  contratoId?: number | null;
}): Promise<void> {
  try {
    await db.insert(logsDinheiro).values({
      acao: dados.acao,
      usuario: dados.usuario,
      descricao: dados.descricao,
      valor: dados.valor ?? null,
      orcamentoId: dados.orcamentoId ?? null,
      contratoId: dados.contratoId ?? null,
    });
  } catch (e) {
    console.error("[log-dinheiro] não registrou:", e);
  }
}
