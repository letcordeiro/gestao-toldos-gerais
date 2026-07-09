import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
} from "@react-pdf/renderer";
import { EMPRESA } from "@/lib/empresa";
import { MONTAGEM_COBERTURA } from "@/lib/proposta";
import { formatarValorItem } from "@/lib/format";

const VERDE = "#004e36";

const styles = StyleSheet.create({
  page: {
    paddingTop: 28,
    paddingBottom: 58,
    paddingHorizontal: 42,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.28,
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
  data: { marginBottom: 8, color: "#4a4a4a" },
  destinatario: {
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e5e5",
  },
  secao: { marginBottom: 7 },
  secaoInline: { marginBottom: 0 },
  tituloSecao: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
    marginBottom: 1.5,
  },
  itemLinha: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 3,
  },
  itemPontilhado: {
    flexGrow: 1,
    borderBottomWidth: 1,
    borderBottomStyle: "dotted",
    borderBottomColor: "#9a9a9a",
    marginHorizontal: 4,
    marginBottom: 2,
  },
  itemValor: { fontFamily: "Helvetica-Bold" },
  subtitulo: {
    fontFamily: "Helvetica-Oblique",
    marginTop: 4,
    marginBottom: 2,
  },
  duasColunas: { flexDirection: "row", gap: 16, marginBottom: 7 },
  coluna: { flex: 1 },
  vendedorCard: {
    marginTop: 10,
    padding: 8,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    backgroundColor: "#f5f7f6",
  },
  vendedorLabel: {
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
    marginBottom: 2,
  },
  vendedorNome: { fontSize: 10, fontFamily: "Helvetica-Bold", marginBottom: 1 },
  vendedorContato: { fontSize: 8.5, color: "#4a4a4a" },
  rodape: {
    position: "absolute",
    bottom: 24,
    left: 42,
    right: 42,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 6,
    fontSize: 7.5,
    color: "#6b6b6b",
    textAlign: "center",
  },
});

export type DadosProposta = {
  numero: string;
  dataExtenso: string;
  cliente: {
    nome: string;
    telefone: string;
    endereco: string | null;
    bairro: string | null;
    cidade: string | null;
    cep: string | null;
  };
  modeloNome: string | null;
  formatoLabel: string | null;
  descricaoMaterial: string | null;
  estruturaLabel: string | null;
  fixacaoVedacao: string | null;
  garantiaTexto: string | null;
  formaPagamento: string | null;
  prazoEntrega: string | null;
  vendedor: {
    nome: string;
    telefone: string | null;
    email: string | null;
  } | null;
  itens: Array<{
    descricao: string;
    valorMin: number | null;
    valorMax: number | null;
  }>;
  logoDataUri: string;
};

function Secao({
  titulo,
  texto,
  style,
}: {
  titulo: string;
  texto: string | null;
  style?: (typeof styles)["secao"] | (typeof styles)["secaoInline"];
}) {
  if (!texto) return null;
  return (
    <View style={style ?? styles.secao} wrap={false}>
      <Text style={styles.tituloSecao}>{titulo}</Text>
      <Text>{texto}</Text>
    </View>
  );
}

export function PropostaPDF({ dados }: { dados: DadosProposta }) {
  const enderecoCliente = [
    dados.cliente.endereco,
    dados.cliente.bairro,
    dados.cliente.cidade,
    dados.cliente.cep ? `CEP ${dados.cliente.cep}` : null,
  ]
    .filter(Boolean)
    .join(" – ");

  const modeloTexto = dados.modeloNome
    ? dados.formatoLabel
      ? `${dados.modeloNome} — Formato: ${dados.formatoLabel}`
      : dados.modeloNome
    : null;

  return (
    <Document
      title={`Proposta ${dados.numero} — Toldos Gerais`}
      author={EMPRESA.razaoSocial}
    >
      <Page size="A4" style={styles.page}>
        <View style={styles.cabecalho}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={dados.logoDataUri} style={styles.logo} />
          <Text style={styles.tituloDoc}>
            PROPOSTA TÉCNICA COMERCIAL{"\n"}Nº {dados.numero}
          </Text>
        </View>

        <Text style={styles.data}>Belo Horizonte, {dados.dataExtenso}.</Text>

        <View style={styles.destinatario}>
          <Text style={{ fontFamily: "Helvetica-Bold" }}>
            A/c de {dados.cliente.nome} — {dados.cliente.telefone}
          </Text>
          {enderecoCliente ? <Text>{enderecoCliente}</Text> : null}
        </View>

        <Secao titulo="MODELO" texto={modeloTexto} />
        <Secao titulo="DESCRIÇÃO DO MATERIAL" texto={dados.descricaoMaterial} />
        <Secao titulo="ESTRUTURA" texto={dados.estruturaLabel} />
        <Secao
          titulo="FIXAÇÃO E VEDAÇÃO DA ESTRUTURA"
          texto={dados.fixacaoVedacao}
        />
        <Secao titulo="MONTAGEM DA COBERTURA" texto={MONTAGEM_COBERTURA} />
        <Secao titulo="GARANTIA" texto={dados.garantiaTexto} />

        <View style={styles.secao}>
          <Text style={styles.tituloSecao}>VALOR DO ORÇAMENTO</Text>
          {dados.itens.map((item, i) =>
            item.valorMin === null ? (
              <Text key={i} style={styles.subtitulo}>
                {item.descricao}
              </Text>
            ) : (
              <View key={i} style={styles.itemLinha}>
                <Text>{item.descricao}</Text>
                <View style={styles.itemPontilhado} />
                <Text style={styles.itemValor}>
                  {formatarValorItem(item.valorMin, item.valorMax)}
                </Text>
              </View>
            )
          )}
        </View>

        <View style={styles.duasColunas}>
          <View style={styles.coluna}>
            <Secao
              titulo="FORMA DE PAGAMENTO"
              texto={dados.formaPagamento}
              style={styles.secaoInline}
            />
          </View>
          <View style={styles.coluna}>
            <Secao
              titulo="PRAZO DE ENTREGA"
              texto={dados.prazoEntrega}
              style={styles.secaoInline}
            />
          </View>
        </View>

        {dados.vendedor ? (
          <View style={styles.vendedorCard} wrap={false}>
            <Text style={styles.vendedorLabel}>VENDEDOR RESPONSÁVEL</Text>
            <Text style={styles.vendedorNome}>{dados.vendedor.nome}</Text>
            {dados.vendedor.telefone ? (
              <Text style={styles.vendedorContato}>
                Telefone/WhatsApp: {dados.vendedor.telefone}
              </Text>
            ) : null}
            {dados.vendedor.email ? (
              <Text style={styles.vendedorContato}>
                E-mail: {dados.vendedor.email}
              </Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.rodape} fixed>
          <Text>
            {EMPRESA.razaoSocial} — CNPJ {EMPRESA.cnpj} — {EMPRESA.site} /{" "}
            {EMPRESA.emailVendas}
          </Text>
          <Text>
            Av. Waldir Soeiro Emrich, 4645 A – Diamante – Belo Horizonte/MG –{" "}
            {EMPRESA.telefoneFixo}
          </Text>
        </View>
      </Page>
    </Document>
  );
}
