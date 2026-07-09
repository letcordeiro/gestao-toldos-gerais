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

const styles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 70,
    paddingHorizontal: 50,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.45,
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  logo: { width: 110 },
  tituloDoc: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: "#004e36",
    textAlign: "right",
  },
  data: { marginBottom: 16 },
  destinatario: { marginBottom: 16 },
  secao: { marginBottom: 12 },
  tituloSecao: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: "#004e36",
    marginBottom: 3,
  },
  itemLinha: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: 4,
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
    marginTop: 6,
    marginBottom: 4,
  },
  vendedorCard: {
    marginTop: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 4,
    backgroundColor: "#f5f7f6",
  },
  vendedorLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#004e36",
    marginBottom: 3,
  },
  vendedorNome: {
    fontSize: 11,
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  vendedorContato: { fontSize: 9, color: "#4a4a4a" },
  rodape: {
    position: "absolute",
    bottom: 30,
    left: 50,
    right: 50,
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
    paddingTop: 8,
    fontSize: 8,
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
    cidade: string | null;
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

function Secao({ titulo, texto }: { titulo: string; texto: string | null }) {
  if (!texto) return null;
  return (
    <View style={styles.secao} wrap={false}>
      <Text style={styles.tituloSecao}>{titulo}</Text>
      <Text>{texto}</Text>
    </View>
  );
}

export function PropostaPDF({ dados }: { dados: DadosProposta }) {
  const enderecoCliente = [dados.cliente.endereco, dados.cliente.cidade]
    .filter(Boolean)
    .join(" — ");

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
            A/c de {dados.cliente.nome} {dados.cliente.telefone}
          </Text>
          {enderecoCliente ? <Text>{enderecoCliente}</Text> : null}
        </View>

        <Secao
          titulo="MODELO"
          texto={
            dados.modeloNome
              ? dados.formatoLabel
                ? `${dados.modeloNome} — Formato: ${dados.formatoLabel}`
                : dados.modeloNome
              : null
          }
        />
        <Secao
          titulo="DESCRIÇÃO DO MATERIAL"
          texto={dados.descricaoMaterial}
        />
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

        <Secao titulo="FORMA DE PAGAMENTO" texto={dados.formaPagamento} />
        <Secao titulo="PRAZO DE ENTREGA" texto={dados.prazoEntrega} />

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
            {EMPRESA.razaoSocial} — {EMPRESA.site} / {EMPRESA.emailVendas}
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
