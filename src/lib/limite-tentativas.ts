// Freio contra chute de senha e contra disparo em massa de e-mail de senha.
//
// Antes não havia limite nenhum: dava para testar senhas sem parar (a mínima
// tem 6 caracteres) e mandar centenas de e-mails de redefinição para alguém
// (auditoria de 07/10/2026).
//
// Em memória de propósito: o sistema roda num container só, e zerar a conta a
// cada deploy não é problema — o objetivo é tornar o chute lento, não guardar
// histórico. Puro (sem banco) para ter teste.

type Registro = { falhas: number; desde: number; bloqueadoAte: number };

export class LimiteTentativas {
  private registros = new Map<string, Registro>();

  constructor(
    private readonly maxFalhas: number,
    private readonly janelaMs: number,
    private readonly bloqueioMs: number
  ) {}

  /** Quanto falta de bloqueio (ms), ou 0 se pode tentar. */
  bloqueado(chave: string, agora = Date.now()): number {
    const r = this.registros.get(chave);
    if (!r) return 0;
    return r.bloqueadoAte > agora ? r.bloqueadoAte - agora : 0;
  }

  /** Conta uma falha (ou um pedido, para o e-mail de senha). */
  falhou(chave: string, agora = Date.now()): void {
    const r = this.registros.get(chave);
    if (!r || agora - r.desde > this.janelaMs) {
      this.registros.set(chave, { falhas: 1, desde: agora, bloqueadoAte: 0 });
      this.limpar(agora);
      return;
    }
    r.falhas += 1;
    if (r.falhas >= this.maxFalhas) r.bloqueadoAte = agora + this.bloqueioMs;
  }

  /** Deu certo: zera. */
  acertou(chave: string): void {
    this.registros.delete(chave);
  }

  /** Não deixa o mapa crescer para sempre. */
  private limpar(agora: number): void {
    if (this.registros.size < 1000) return;
    for (const [k, r] of this.registros) {
      if (agora - r.desde > this.janelaMs && r.bloqueadoAte <= agora) {
        this.registros.delete(k);
      }
    }
  }
}

/** Minutos, arredondando para cima, para a mensagem. */
export function minutosRestantes(ms: number): number {
  return Math.max(1, Math.ceil(ms / 60000));
}
