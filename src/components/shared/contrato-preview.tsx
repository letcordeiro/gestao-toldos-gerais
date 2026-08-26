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
      <header className="border-b pb-3">
        <h2 className="text-sm font-semibold tracking-tight text-primary">
          CONTRATO DE FORNECIMENTO E INSTALAÇÃO
          {dados.numero ? ` — Nº ${dados.numero}` : ""}
        </h2>
        {aviso && (
          <p className="text-xs font-semibold text-brand-orange-dark">{aviso}</p>
        )}
      </header>

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
          <h3 className="text-xs font-semibold tracking-wide text-primary">
            CLÁUSULA {ordinalClausula(i)} — {c.titulo}
          </h3>
          {c.paragrafos.map((p, j) => (
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

      <p className="pt-3">
        {dados.cidadeEmissao},{" "}
        {dados.dataEmissaoExtenso ?? "____ de ____________ de ______"}.
      </p>

      <div className="grid gap-6 pt-6 sm:grid-cols-2">
        <div className="border-t pt-1">
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
        <div className="border-t pt-1">
          <p className="font-semibold">{dados.contratante.nome}</p>
          <p className="text-xs text-muted-foreground">
            CPF/CNPJ {dados.contratante.documento ?? "____________________"}
          </p>
          <p className="text-xs text-muted-foreground">CONTRATANTE</p>
        </div>
      </div>

      {(dados.aditivos ?? []).map((aditivo) => (
        <section
          key={aditivo.numero}
          className="mt-6 space-y-2 rounded-lg border bg-secondary/30 p-3"
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
