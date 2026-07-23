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
import { ImprimirAutomatico } from "./imprimir-automatico";

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

        {/* Croqui: o quadriculado é um fundo em CSS — imprime igual em
            qualquer navegador, sem depender de imagem ou PDF. */}
        <div className="mt-1 border border-neutral-400 p-1">
          <p className="text-[6.5px] font-bold uppercase tracking-wide text-neutral-500">
            Desenho / Croqui
          </p>
          <div className="croqui mt-1" />
        </div>
      </div>

      <style>{`
        .croqui {
          height: 165mm;
          background-color: #fff;
          background-image:
            linear-gradient(to right, #c8c8c8 0.4px, transparent 0.4px),
            linear-gradient(to bottom, #c8c8c8 0.4px, transparent 0.4px);
          background-size: 4.6mm 4.6mm;
        }
        @media print {
          @page { size: A4 portrait; margin: 8mm; }
          html, body { background: #fff !important; }
          .croqui { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          /* esconde a moldura do sistema (menu, rodapé) ao imprimir */
          header, nav, footer { display: none !important; }
          main { padding: 0 !important; max-width: none !important; }
        }
      `}</style>
    </div>
  );
}
