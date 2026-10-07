import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { EMPRESA_CONTRATO } from "@/lib/empresa";
import {
  avisoVersao,
  montarClausulas,
  moedaComExtenso,
  ordinalClausula,
  qualificacaoPartes,
  type DadosContrato,
} from "@/lib/contrato-clausulas";

const VERDE = "#004e36";

// Mesmas margens e mesma família da Proposta Técnica Comercial — o contrato
// tem que parecer irmão do orçamento, não outro documento.
const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 58,
    paddingHorizontal: 42,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.4,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  logo: { width: 88 },
  tituloDoc: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
    textAlign: "right",
  },
  avisoVersao: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#b45309",
    textAlign: "right",
    marginTop: 2,
  },
  partes: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  parteTexto: { marginBottom: 4, textAlign: "justify" },
  preambulo: { marginBottom: 8, textAlign: "justify" },
  clausula: { marginBottom: 7 },
  clausulaTitulo: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
    marginBottom: 2,
  },
  paragrafo: { marginBottom: 3, textAlign: "justify" },
  item: { marginBottom: 2, paddingLeft: 10, textAlign: "justify" },
  paragrafoUnico: {
    marginTop: 3,
    fontFamily: "Helvetica-Oblique",
    textAlign: "justify",
  },
  dataLocal: { marginTop: 14, marginBottom: 22 },
  assinaturas: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 24,
    marginTop: 10,
  },
  assinaturaBloco: { flex: 1 },
  linhaAssinatura: {
    borderTopWidth: 1,
    borderTopColor: "#1a1a1a",
    marginBottom: 3,
  },
  assinaturaNome: { fontFamily: "Helvetica-Bold", fontSize: 8.5 },
  assinaturaDetalhe: { fontSize: 8, color: "#4a4a4a" },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 6,
    fontSize: 8,
    color: "#6b6b6b",
    textAlign: "center",
  },
  // Faixa de CANCELADO: repetida no topo de toda página (fixed). Borda e texto
  // vermelhos, sem depender de fundo — impressora em P&B ainda mostra a caixa.
  marcaCancelado: {
    borderWidth: 1.5,
    borderColor: "#b91c1c",
    color: "#b91c1c",
    fontFamily: "Helvetica-Bold",
    fontSize: 10,
    textAlign: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    marginBottom: 8,
  },
  aditivoTitulo: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
    marginBottom: 6,
  },
});

export type DadosContratoPDF = DadosContrato & {
  logoDataUri: string;
  /** true = rascunho: ainda sem número definitivo no cabeçalho. */
  minuta: boolean;
};

function Clausulas({ dados }: { dados: DadosContrato }) {
  const clausulas = montarClausulas(dados);
  return (
    <>
      {clausulas.map((c, i) => (
        // A cláusula QUEBRA entre páginas. Era wrap={false}: com observações
        // técnicas longas a Cláusula Primeira passava de uma página, pulava
        // inteira para a 2 (deixando a 1 quase em branco) e, maior que a
        // folha, o react-pdf sobrepunha as linhas — texto em cima de texto
        // (auditoria de 07/10/2026). Só o TÍTULO é preso ao primeiro
        // parágrafo, num bloco wrap={false} pequeno (título + 2 ou 3 linhas):
        // título sozinho no pé da página não acontece mais. minPresenceAhead
        // foi testado e NÃO segurou o título no react-pdf — a Cláusula Décima
        // Primeira ficou órfã no pé da página 2.
        <View key={c.titulo} style={styles.clausula}>
          <View wrap={false}>
            <Text style={styles.clausulaTitulo}>
              CLÁUSULA {ordinalClausula(i)} — {c.titulo}
            </Text>
            {c.paragrafos.slice(0, 1).map((p, j) => (
              <Text key={j} style={styles.paragrafo}>
                {p}
              </Text>
            ))}
          </View>
          {c.paragrafos.slice(1).map((p, j) => (
            <Text key={j} style={styles.paragrafo}>
              {p}
            </Text>
          ))}
          {c.itens?.map((item, j) => (
            <Text key={j} style={styles.item}>
              {String.fromCharCode(97 + j)}) {item}
            </Text>
          ))}
          {c.paragrafosFinais?.map((p, j) => (
            <Text key={j} style={styles.paragrafo}>
              {p}
            </Text>
          ))}
          {c.itensFinais?.map((item, j) => (
            <Text key={j} style={styles.item}>
              {String.fromCharCode(97 + j)}) {item}
            </Text>
          ))}
          {c.paragrafoUnico ? (
            <Text style={styles.paragrafoUnico}>{c.paragrafoUnico}</Text>
          ) : null}
        </View>
      ))}
    </>
  );
}

/**
 * Faixa de contrato CANCELADO, no topo de TODA página. Antes o PDF de um
 * cancelado saía idêntico ao de um válido — só a página pública HTML avisava,
 * e o arquivo baixado circulava sem aviso nenhum (auditoria de 07/10/2026).
 * `fixed` sem posição absoluta: o react-pdf repete a faixa em cada página e
 * empurra o conteúdo para baixo dela, então nada fica escondido por baixo.
 */
function MarcaCancelado({ texto }: { texto?: string | null }) {
  if (!texto) return null;
  return (
    <View fixed style={styles.marcaCancelado}>
      <Text>{texto}</Text>
    </View>
  );
}

function Assinaturas({ dados }: { dados: DadosContrato }) {
  return (
    <View style={styles.assinaturas} wrap={false}>
      <View style={styles.assinaturaBloco}>
        <View style={styles.linhaAssinatura} />
        <Text style={styles.assinaturaNome}>
          {EMPRESA_CONTRATO.razaoSocial} ({EMPRESA_CONTRATO.nomeFantasia})
        </Text>
        <Text style={styles.assinaturaDetalhe}>
          CNPJ {EMPRESA_CONTRATO.cnpj}
        </Text>
        <Text style={styles.assinaturaDetalhe}>
          {dados.representante} — CONTRATADA
        </Text>
      </View>
      <View style={styles.assinaturaBloco}>
        <View style={styles.linhaAssinatura} />
        <Text style={styles.assinaturaNome}>{dados.contratante.nome}</Text>
        <Text style={styles.assinaturaDetalhe}>
          CPF/CNPJ {dados.contratante.documento ?? "____________________"}
        </Text>
        <Text style={styles.assinaturaDetalhe}>CONTRATANTE</Text>
      </View>
    </View>
  );
}

export function ContratoPDF({ dados }: { dados: DadosContratoPDF }) {
  const partes = qualificacaoPartes(dados, {
    razaoSocial: EMPRESA_CONTRATO.razaoSocial,
    nomeFantasia: EMPRESA_CONTRATO.nomeFantasia,
    cnpj: EMPRESA_CONTRATO.cnpj,
    inscricaoEstadual: EMPRESA_CONTRATO.inscricaoEstadual,
    endereco: EMPRESA_CONTRATO.endereco,
    regimeTributario: EMPRESA_CONTRATO.regimeTributario,
  });
  const aviso = avisoVersao(dados.versao);
  const titulo = dados.minuta
    ? "CONTRATO DE FORNECIMENTO E INSTALAÇÃO"
    : `CONTRATO DE FORNECIMENTO E INSTALAÇÃO\nNº ${dados.numero}`;

  return (
    <Document
      title={`Contrato ${dados.numero ?? "MINUTA"} — ${EMPRESA_CONTRATO.nomeFantasia}`}
      author={EMPRESA_CONTRATO.razaoSocial}
    >
      <Page size="A4" style={styles.page}>
        <MarcaCancelado texto={dados.marcaCancelado} />
        <View style={styles.cabecalho}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={dados.logoDataUri} style={styles.logo} />
          <View>
            <Text style={styles.tituloDoc}>{titulo}</Text>
            {aviso ? <Text style={styles.avisoVersao}>{aviso}</Text> : null}
          </View>
        </View>

        <View style={styles.partes}>
          <Text style={styles.parteTexto}>{partes.contratada}</Text>
          <Text style={styles.parteTexto}>{partes.contratante}</Text>
        </View>

        <Text style={styles.preambulo}>
          As partes acima qualificadas têm entre si justo e contratado o
          presente CONTRATO DE FORNECIMENTO E INSTALAÇÃO, que se regerá pelas
          cláusulas e condições a seguir.
        </Text>

        <Clausulas dados={dados} />

        {/* Local/data e assinaturas na MESMA página: assinatura sem a data
            ao lado, ou data órfã no pé da folha anterior, enfraquece o
            documento (auditoria de 07/10/2026). */}
        <View wrap={false}>
          <Text style={styles.dataLocal}>
            {dados.cidadeEmissao},{" "}
            {dados.dataEmissaoExtenso ?? "____ de ____________ de ______"}.
          </Text>

          <Assinaturas dados={dados} />
        </View>

        <View style={styles.rodape} fixed>
          <Text>
            {EMPRESA_CONTRATO.razaoSocial} ({EMPRESA_CONTRATO.nomeFantasia}) —{" "}
            {EMPRESA_CONTRATO.email} · {EMPRESA_CONTRATO.telefoneFixo} ·{" "}
            {EMPRESA_CONTRATO.endereco}
          </Text>
        </View>
      </Page>

      {/* Aditivos: documento próprio, um por página, referenciando o contrato. */}
      {(dados.aditivos ?? []).map((aditivo) => (
        <Page key={aditivo.numero} size="A4" style={styles.page}>
          <MarcaCancelado texto={dados.marcaCancelado} />
          <View style={styles.cabecalho}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={dados.logoDataUri} style={styles.logo} />
            <Text style={styles.tituloDoc}>
              TERMO ADITIVO Nº {aditivo.numero}
            </Text>
          </View>

          <Text style={styles.preambulo}>
            Termo aditivo ao CONTRATO DE FORNECIMENTO E INSTALAÇÃO nº{" "}
            {dados.numero ?? "(minuta)"}
            {dados.dataEmissaoExtenso
              ? `, firmado em ${dados.dataEmissaoExtenso}`
              : ""}
            , celebrado entre {EMPRESA_CONTRATO.razaoSocial} (CONTRATADA) e{" "}
            {dados.contratante.nome} (CONTRATANTE), que passa a integrá-lo para
            todos os efeitos.
          </Text>

          <View style={styles.clausula}>
            <Text style={styles.aditivoTitulo}>CLÁUSULA PRIMEIRA — DO OBJETO DO ADITIVO</Text>
            <Text style={styles.paragrafo}>{aditivo.objeto}</Text>
          </View>

          <View style={styles.clausula}>
            <Text style={styles.aditivoTitulo}>
              CLÁUSULA SEGUNDA — DA REVISÃO DE VALOR E PRAZO
            </Text>
            <Text style={styles.paragrafo}>
              {aditivo.deltaValor === 0
                ? "Este aditivo não altera o valor originalmente contratado."
                : aditivo.deltaValor > 0
                  ? `Fica acrescido ao valor do contrato o montante de ${moedaComExtenso(
                      aditivo.deltaValor
                    )}.`
                  : `Fica reduzido do valor do contrato o montante de ${moedaComExtenso(
                      Math.abs(aditivo.deltaValor)
                    )}.`}
            </Text>
            <Text style={styles.paragrafo}>
              {aditivo.novoPrazoDiasUteis != null
                ? `O prazo de execução passa a ser de ${aditivo.novoPrazoDiasUteis} dias úteis, contados na forma do contrato original.`
                : "O prazo de execução permanece inalterado."}
            </Text>
          </View>

          <View style={styles.clausula}>
            <Text style={styles.aditivoTitulo}>
              CLÁUSULA TERCEIRA — DA RATIFICAÇÃO
            </Text>
            <Text style={styles.paragrafo}>
              Permanecem inalteradas e em pleno vigor todas as demais cláusulas e
              condições do contrato original não expressamente modificadas por
              este termo.
            </Text>
          </View>

          <Text style={styles.dataLocal}>
            {dados.cidadeEmissao},{" "}
            {aditivo.dataAssinaturaExtenso ?? "____ de ____________ de ______"}.
          </Text>

          <Assinaturas dados={dados} />

          <View style={styles.rodape} fixed>
            <Text>
              {EMPRESA_CONTRATO.razaoSocial} ({EMPRESA_CONTRATO.nomeFantasia}) —{" "}
              {EMPRESA_CONTRATO.email} · {EMPRESA_CONTRATO.telefoneFixo}
            </Text>
          </View>
        </Page>
      ))}
    </Document>
  );
}
