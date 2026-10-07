import { EMPRESA_CONTRATO } from "@/lib/empresa";
import {
  avisoVersao,
  montarClausulas,
  moedaComExtenso,
  ordinalClausula,
  qualificacaoPartes,
  type DadosContrato,
} from "@/lib/contrato-clausulas";

/**
 * Prévia do contrato em HTML. Usa EXATAMENTE as mesmas cláusulas do PDF
 * (montarClausulas) — nenhuma frase é escrita duas vezes.
 *
 * Rascunho não tem marca visual no documento: o que o identifica é a ausência
 * do número no cabeçalho (o número só é atribuído na emissão).
 */
export function ContratoPreview({ dados }: { dados: DadosContrato }) {
  const clausulas = montarClausulas(dados);
  const partes = qualificacaoPartes(dados, {
    razaoSocial: EMPRESA_CONTRATO.razaoSocial,
    nomeFantasia: EMPRESA_CONTRATO.nomeFantasia,
    cnpj: EMPRESA_CONTRATO.cnpj,
    inscricaoEstadual: EMPRESA_CONTRATO.inscricaoEstadual,
    endereco: EMPRESA_CONTRATO.endereco,
    regimeTributario: EMPRESA_CONTRATO.regimeTributario,
  });
  const aviso = avisoVersao(dados.versao);

  return (
    <article className="relative space-y-4 text-[13px] leading-relaxed text-foreground">
      {dados.marcaCancelado && (
        // Cancelado não pode sair do papel parecendo válido (auditoria de
        // 07/10/2026). Borda e texto vermelhos, sem fundo: a impressão costuma
        // descartar fundo e a faixa sumiria.
        <p className="rounded-md border-2 border-red-700 px-3 py-2 text-center text-sm font-bold text-red-700 break-inside-avoid">
          {dados.marcaCancelado}
        </p>
      )}

      {/* <div>, NÃO <header>: as páginas de impressão escondem
          `header, nav, footer` para tirar o menu do sistema do papel, e o
          título do contrato ia junto — o contrato impresso saía sem "CONTRATO
          DE…", sem o número e sem o aviso de versão (auditoria de 07/10/2026). */}
      <div className="border-b pb-3">
        <h2 className="text-sm font-semibold tracking-tight text-primary">
          CONTRATO DE FORNECIMENTO E INSTALAÇÃO
          {dados.numero ? ` — Nº ${dados.numero}` : ""}
        </h2>
        {aviso && (
          <p className="text-xs font-semibold text-brand-orange-dark">{aviso}</p>
        )}
      </div>

      <section className="space-y-2 border-b pb-3 text-justify">
        <p>{partes.contratada}</p>
        <p>{partes.contratante}</p>
      </section>

      <p className="text-justify">
        As partes acima qualificadas têm entre si justo e contratado o presente
        CONTRATO DE FORNECIMENTO E INSTALAÇÃO, que se regerá pelas cláusulas e
        condições a seguir.
      </p>

      {clausulas.map((c, i) => (
        <section key={c.titulo} className="space-y-1">
          {/* Título preso ao primeiro parágrafo na impressão: sozinho no pé
              da página, o título ficava órfão e o texto começava na folha
              seguinte (auditoria de 07/10/2026). break-after sozinho não
              basta em todo navegador; o bloco com break-inside garante. */}
          <div className="space-y-1 break-inside-avoid">
            <h3 className="text-xs font-semibold tracking-wide text-primary break-after-avoid">
              CLÁUSULA {ordinalClausula(i)} — {c.titulo}
            </h3>
            {c.paragrafos.slice(0, 1).map((p, j) => (
              <p key={j} className="text-justify">
                {p}
              </p>
            ))}
          </div>
          {c.paragrafos.slice(1).map((p, j) => (
            <p key={j} className="text-justify">
              {p}
            </p>
          ))}
          {c.itens && c.itens.length > 0 && (
            <ol className="ml-4 list-[lower-alpha] space-y-0.5 text-justify">
              {c.itens.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ol>
          )}
          {c.paragrafosFinais?.map((p, j) => (
            <p key={j} className="text-justify">
              {p}
            </p>
          ))}
          {c.itensFinais && c.itensFinais.length > 0 && (
            <ol className="ml-4 list-[lower-alpha] space-y-0.5 text-justify">
              {c.itensFinais.map((item, j) => (
                <li key={j}>{item}</li>
              ))}
            </ol>
          )}
          {c.paragrafoUnico && (
            <p className="text-justify italic text-muted-foreground">
              {c.paragrafoUnico}
            </p>
          )}
        </section>
      ))}

      {/* Local/data e assinaturas nunca se separam na impressão, e a linha
          de assinatura é escura: a cor de borda padrão saía quase invisível
          no papel (auditoria de 07/10/2026). */}
      <div className="break-inside-avoid">
        <p className="pt-3">
          {dados.cidadeEmissao},{" "}
          {dados.dataEmissaoExtenso ?? "____ de ____________ de ______"}.
        </p>

        <div className="grid gap-6 pt-10 sm:grid-cols-2">
          <div className="border-t border-neutral-800 pt-1">
            <p className="font-semibold">
              {EMPRESA_CONTRATO.razaoSocial} ({EMPRESA_CONTRATO.nomeFantasia})
            </p>
            <p className="text-xs text-muted-foreground">
              CNPJ {EMPRESA_CONTRATO.cnpj}
            </p>
            <p className="text-xs text-muted-foreground">
              {dados.representante} — CONTRATADA
            </p>
          </div>
          <div className="border-t border-neutral-800 pt-1">
            <p className="font-semibold">{dados.contratante.nome}</p>
            <p className="text-xs text-muted-foreground">
              CPF/CNPJ {dados.contratante.documento ?? "____________________"}
            </p>
            <p className="text-xs text-muted-foreground">CONTRATANTE</p>
          </div>
        </div>
      </div>

      {(dados.aditivos ?? []).map((aditivo) => (
        <section
          key={aditivo.numero}
          className="mt-6 space-y-2 rounded-lg border bg-secondary/30 p-3 break-inside-avoid"
        >
          <h3 className="text-xs font-semibold tracking-wide text-primary">
            TERMO ADITIVO Nº {aditivo.numero}
          </h3>
          <p className="text-justify">{aditivo.objeto}</p>
          <p className="text-justify">
            {aditivo.deltaValor === 0
              ? "Sem alteração de valor."
              : aditivo.deltaValor > 0
                ? `Acréscimo de ${moedaComExtenso(aditivo.deltaValor)}.`
                : `Redução de ${moedaComExtenso(Math.abs(aditivo.deltaValor))}.`}
            {aditivo.novoPrazoDiasUteis != null
              ? ` Novo prazo: ${aditivo.novoPrazoDiasUteis} dias úteis.`
              : " Prazo inalterado."}
          </p>
        </section>
      ))}
    </article>
  );
}
