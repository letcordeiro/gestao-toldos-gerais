import Image from "next/image";
import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  atendimentos,
  clientes,
  fases,
  instalacaoItens,
  orcamentoInstalacao,
  orcamentos,
  vendedores,
} from "@/db/schema";
import { exigirUsuario } from "@/lib/auth";
import { enderecoCompleto } from "@/lib/endereco";
import { EMPRESA } from "@/lib/empresa";
import { ImprimirAutomatico } from "@/components/shared/imprimir-automatico";

/** Célula rotulada da ficha (mesma linguagem visual do papel da empresa). */
function Celula({
  rotulo,
  valor,
  className = "",
}: {
  rotulo: string;
  valor?: string | null;
  className?: string;
}) {
  return (
    <div className={`border-r border-neutral-400 px-1.5 py-1 ${className}`}>
      <p className="text-[6.5px] font-bold uppercase leading-none tracking-wide text-neutral-500">
        {rotulo}
      </p>
      <p className="mt-0.5 min-h-[11px] text-[9.5px] leading-tight">
        {valor || " "}
      </p>
    </div>
  );
}

const COLS = [
  { rotulo: "Qtde", chave: "qtde", w: "7%" },
  { rotulo: "Produto", chave: "produto", w: "25%" },
  { rotulo: "Estrut / tipo / cor", chave: "estrutura", w: "17%" },
  { rotulo: "Revest / tipo / cor", chave: "revestimento", w: "17%" },
  { rotulo: "Rufo", chave: "rufo", w: "8%" },
  { rotulo: "Babado / modelo / cor", chave: "babado", w: "13%" },
  { rotulo: "Viés / modelo / cor", chave: "vies", w: "13%" },
] as const;

export default async function ImprimirFichaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const usuario = await exigirUsuario();
  const { id } = await params;
  const orcamentoId = Number(id);
  if (!Number.isInteger(orcamentoId)) notFound();

  const [linha] = await db
    .select({
      orc: orcamentos,
      cliente: clientes,
      vendedorNome: vendedores.nome,
      faseLibera: fases.liberaInstalacao,
    })
    .from(orcamentos)
    .innerJoin(atendimentos, eq(orcamentos.atendimentoId, atendimentos.id))
    .innerJoin(clientes, eq(atendimentos.clienteId, clientes.id))
    .innerJoin(fases, eq(atendimentos.faseId, fases.id))
    .leftJoin(vendedores, eq(orcamentos.vendedorId, vendedores.id))
    .where(eq(orcamentos.id, orcamentoId));

  if (!linha) notFound();
  if (
    usuario.papel === "vendedor" &&
    linha.orc.vendedorId !== usuario.vendedorId
  ) {
    notFound();
  }
  if (!linha.faseLibera) notFound();

  const ficha = await db.query.orcamentoInstalacao.findFirst({
    where: eq(orcamentoInstalacao.orcamentoId, orcamentoId),
  });
  const itens = await db
    .select()
    .from(instalacaoItens)
    .where(eq(instalacaoItens.orcamentoId, orcamentoId))
    .orderBy(asc(instalacaoItens.ordem));

  const dia = (d: Date | null | undefined) =>
    d ? format(d, "dd/MM/yyyy") : null;
  const endereco = enderecoCompleto(linha.cliente);
  const linhasProduto = itens.length ? itens : [null];

  return (
    <div className="mx-auto max-w-[210mm]">
      <ImprimirAutomatico />

      {/* A folha. Em tela fica com fundo branco e sombra; na impressão ocupa
          a página inteira sem margens extras. */}
      <div className="folha rounded-lg border bg-white p-[10mm] text-black shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="mb-1.5 flex items-center justify-between">
          <Image src="/logo.png" alt="Toldos Gerais" width={58} height={31} />
          <p className="text-[11px] font-bold text-[#004e36]">INSTALAÇÃO</p>
        </div>

        {/* Cliente / local */}
        <div className="border border-neutral-400">
          <div className="flex border-b border-neutral-400">
            <Celula
              rotulo="Cliente"
              valor={linha.cliente.nome}
              className="w-[60%]"
            />
            <Celula
              rotulo="Telefone(s)"
              valor={linha.cliente.telefone}
              className="w-[40%] border-r-0"
            />
          </div>
          <div className="flex border-b border-neutral-400">
            <Celula
              rotulo="Endereço"
              valor={endereco}
              className="w-full border-r-0"
            />
          </div>
          <div className="flex border-b border-neutral-400">
            <Celula
              rotulo="Responsável"
              valor={ficha?.responsavel}
              className="w-[40%]"
            />
            <Celula
              rotulo="E-mail"
              valor={linha.cliente.email}
              className="w-[60%] border-r-0"
            />
          </div>
          <div className="flex">
            <Celula rotulo="Calha" valor={ficha?.calha} className="w-1/3" />
            <Celula
              rotulo="Escada alta"
              valor={ficha?.tipoEscada}
              className="w-1/3"
            />
            <Celula
              rotulo="Estacionamento"
              valor={ficha?.condEstacionamento}
              className="w-1/3 border-r-0"
            />
          </div>
        </div>

        {/* Pedido */}
        <div className="mt-1 border border-neutral-400">
          <div className="flex border-b border-neutral-400">
            <Celula
              rotulo="Empresa"
              valor={EMPRESA.razaoSocial}
              className="w-full border-r-0"
            />
          </div>
          <div className="flex">
            <Celula
              rotulo="Nº pedido"
              valor={linha.orc.numero}
              className="w-[18%]"
            />
            <Celula
              rotulo="Data pedido"
              valor={format(linha.orc.criadoEm, "dd/MM/yyyy")}
              className="w-[18%]"
            />
            <Celula
              rotulo="Vendedor"
              valor={linha.vendedorNome}
              className="w-[30%]"
            />
            <Celula
              rotulo="Prev. entrega"
              valor={dia(ficha?.prevEntrega)}
              className="w-[17%]"
            />
            <Celula
              rotulo="Data entrega"
              valor={dia(ficha?.dataEntrega)}
              className="w-[17%] border-r-0"
            />
          </div>
        </div>

        {/* Produtos */}
        <div className="mt-1 border border-neutral-400">
          <div className="flex bg-[#004e36] print:[print-color-adjust:exact]">
            {COLS.map((c, i) => (
              <div
                key={c.chave}
                className={`px-1.5 py-1 ${i < COLS.length - 1 ? "border-r border-neutral-400" : ""}`}
                style={{ width: c.w }}
              >
                <p className="text-[6.5px] font-bold uppercase leading-none tracking-wide text-white">
                  {c.rotulo}
                </p>
              </div>
            ))}
          </div>
          {linhasProduto.map((item, idx) => (
            <div
              key={idx}
              className={`flex ${idx < linhasProduto.length - 1 ? "border-b border-neutral-400" : ""}`}
            >
              {COLS.map((c, i) => (
                <div
                  key={c.chave}
                  className={`min-h-[15px] px-1.5 py-1 ${i < COLS.length - 1 ? "border-r border-neutral-400" : ""}`}
                  style={{ width: c.w }}
                >
                  <p className="text-[9.5px] leading-tight">
                    {(item ? item[c.chave] : null) || " "}
                  </p>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="mt-1 border border-neutral-400 bg-white p-1">
          <p className="text-[6.5px] font-bold uppercase tracking-wide text-neutral-500">
            Desenho / Croqui
          </p>
          <Quadriculado />
        </div>
      </div>

      <style>{`
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { background: #fff !important; }
          /* esconde a moldura do sistema (menu, rodapé) ao imprimir */
          header, nav, footer { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}

/**
 * Área do croqui: folha branca quadriculada.
 *
 * Era um fundo em CSS (linear-gradient de 0,4px a cada 4,6mm) e saía CINZA na
 * impressão (23/09/2026). Fundo em CSS é imagem de fundo: o navegador
 * rasteriza em baixa resolução para imprimir, a linha fina borra e a área
 * inteira vira um cinza chapado — e ainda some de vez quando "imprimir
 * fundos" está desligado. Aqui são LINHAS de verdade, em SVG: vetor, sai
 * nítido em qualquer impressora e não depende de configuração de fundo.
 *
 * As linhas são desenhadas mais largas que a caixa e o excesso é cortado,
 * então a grade fecha a largura certa em qualquer tamanho de papel.
 */
function Quadriculado() {
  const MM = 96 / 25.4; // px por milímetro (CSS: 96px = 1 polegada)
  const passo = 5 * MM; // quadrado de 5 mm
  const altura = 165 * MM;
  const largura = 210 * MM; // mais larga que a caixa; o resto é cortado
  const colunas = Math.ceil(largura / passo);
  const linhas = Math.floor(altura / passo);
  const cor = "#b8b8b8";
  return (
    <svg
      aria-hidden
      width="100%"
      height={linhas * passo}
      className="mt-1 block bg-white"
      style={{ overflow: "hidden" }}
    >
      <rect width="100%" height="100%" fill="#fff" />
      {Array.from({ length: colunas + 1 }, (_, i) => (
        <line
          key={`v${i}`}
          x1={i * passo}
          y1={0}
          x2={i * passo}
          y2={linhas * passo}
          stroke={cor}
          strokeWidth={0.6}
        />
      ))}
      {Array.from({ length: linhas + 1 }, (_, i) => (
        <line
          key={`h${i}`}
          x1={0}
          y1={i * passo}
          x2={largura}
          y2={i * passo}
          stroke={cor}
          strokeWidth={0.6}
        />
      ))}
    </svg>
  );
}
