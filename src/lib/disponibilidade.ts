// Horário livre de um vendedor num dia — regras puras, sem banco nem Google.
//
// Recebe os compromissos já ocupados (venham da agenda do sistema, do Google
// ou dos dois) e devolve o que sobra. Fica separado de propósito: é a parte
// que decide se a atendente marca a visita em cima de outro compromisso, e
// isso tem que dar para testar sem depender de rede nem de token.

export type Intervalo = { inicio: Date; fim: Date };

/** Janela de trabalho de um dia, em horas locais. Padrão: 8h às 18h. */
export type Expediente = { inicioHora: number; fimHora: number };

export const EXPEDIENTE_PADRAO: Expediente = { inicioHora: 8, fimHora: 18 };

const MIN = 60 * 1000;

/**
 * Junta intervalos que se encostam ou se sobrepõem.
 *
 * Sem isso, dois compromissos sobrepostos comem o mesmo pedaço do dia duas
 * vezes e o cálculo do que sobra sai errado. Intervalos que só se tocam
 * (um termina 10h, o outro começa 10h) viram um só: não existe folga de
 * zero minuto.
 */
export function juntarIntervalos(ocupados: Intervalo[]): Intervalo[] {
  const validos = ocupados
    .filter((o) => o.fim.getTime() > o.inicio.getTime())
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const juntos: Intervalo[] = [];
  for (const atual of validos) {
    const ultimo = juntos[juntos.length - 1];
    if (ultimo && atual.inicio.getTime() <= ultimo.fim.getTime()) {
      if (atual.fim.getTime() > ultimo.fim.getTime()) ultimo.fim = atual.fim;
    } else {
      juntos.push({ inicio: atual.inicio, fim: atual.fim });
    }
  }
  return juntos;
}

/** Início e fim do expediente num dia. */
export function janelaDoDia(dia: Date, exp = EXPEDIENTE_PADRAO): Intervalo {
  const base = (hora: number) => {
    const d = new Date(dia);
    d.setHours(hora, 0, 0, 0);
    return d;
  };
  return { inicio: base(exp.inicioHora), fim: base(exp.fimHora) };
}

/**
 * O que sobra livre no dia, já descontados os compromissos.
 *
 * Buracos menores que `duracaoMin` são descartados: uma folga de 10 minutos
 * entre dois compromissos não é horário para oferecer ao cliente — mostrá-la
 * faria a atendente marcar uma visita que não cabe.
 *
 * `agora` corta o passado: às 14h não se oferece as 9h da manhã de hoje.
 */
export function horariosLivres(
  dia: Date,
  ocupados: Intervalo[],
  duracaoMin = 60,
  exp = EXPEDIENTE_PADRAO,
  agora?: Date
): Intervalo[] {
  const janela = janelaDoDia(dia, exp);
  let cursor = janela.inicio;
  if (agora && mesmoDia(agora, dia) && agora.getTime() > cursor.getTime()) {
    cursor = proximoQuarto(agora);
  }
  if (cursor.getTime() >= janela.fim.getTime()) return [];

  const livres: Intervalo[] = [];
  const guardar = (inicio: Date, fim: Date) => {
    if (fim.getTime() - inicio.getTime() >= duracaoMin * MIN) {
      livres.push({ inicio, fim });
    }
  };

  for (const ocupado of juntarIntervalos(ocupados)) {
    if (ocupado.fim.getTime() <= cursor.getTime()) continue;
    if (ocupado.inicio.getTime() >= janela.fim.getTime()) break;
    guardar(cursor, menor(ocupado.inicio, janela.fim));
    if (ocupado.fim.getTime() > cursor.getTime()) cursor = ocupado.fim;
  }
  guardar(cursor, janela.fim);

  return livres;
}

/** "09:00 às 11:30" — como o horário livre aparece na tela. */
export function textoDoIntervalo(i: Intervalo): string {
  return `${hhmm(i.inicio)} às ${hhmm(i.fim)}`;
}

/** Um horário proposto cabe no que está livre? */
export function cabeNoLivre(
  inicio: Date,
  duracaoMin: number,
  livres: Intervalo[]
): boolean {
  const fim = new Date(inicio.getTime() + duracaoMin * MIN);
  return livres.some(
    (l) =>
      inicio.getTime() >= l.inicio.getTime() &&
      fim.getTime() <= l.fim.getTime()
  );
}

function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(
    d.getMinutes()
  ).padStart(2, "0")}`;
}

function menor(a: Date, b: Date): Date {
  return a.getTime() <= b.getTime() ? a : b;
}

function mesmoDia(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Arredonda para cima no quarto de hora: ninguém marca visita para 14h07. */
function proximoQuarto(d: Date): Date {
  const r = new Date(d);
  r.setSeconds(0, 0);
  const resto = r.getMinutes() % 15;
  if (resto) r.setMinutes(r.getMinutes() + (15 - resto));
  return r;
}
