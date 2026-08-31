import {
  Document,
  Image,
  Line,
  Page,
  StyleSheet,
  Svg,
  Text,
  View,
} from "@react-pdf/renderer";
import { EMPRESA } from "@/lib/empresa";

const VERDE = "#004e36";
const TRACO = "#333";

/**
 * Ordem de Manutenção — o papel que a equipe leva ao cliente e volta assinado.
 *
 * O desenho copia a ficha impressa que a Toldos Gerais já usava: mesmos campos,
 * mesma ordem. O que o sistema sabe vem preenchido; o que ele não sabe sai como
 * linha em branco, para escrever à mão no local. É por isso que todo campo é
 * uma linha sublinhada mesmo quando tem valor — a ficha continua servindo como
 * papel de trabalho, e não como um comprovante fechado.
 *
 * CABE EM UMA PÁGINA e tem que continuar cabendo: o A5 deitado dá ~388pt de
 * altura útil e o desenho gasta ~345. Mexer no espaçamento, no tamanho da logo
 * ou no número de linhas de escrita come essa folga — e quando estoura, quem
 * cai para a página 2 é justamente a assinatura do cliente, sem aviso nenhum.
 * Depois de mexer, conte as páginas do PDF gerado.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 14,
    paddingHorizontal: 30,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
  },
  cabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  logo: { width: 64 },
  titulo: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
  },
  numero: { fontSize: 8, color: "#666", textAlign: "right" },

  linha: { flexDirection: "row", alignItems: "flex-end", marginBottom: 12 },
  rotulo: { fontFamily: "Helvetica-Bold", marginRight: 3 },
  campo: {
    flexGrow: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: TRACO,
    paddingBottom: 1.5,
    marginRight: 10,
  },
  campoFim: {
    flexGrow: 1,
    borderBottomWidth: 0.8,
    borderBottomColor: TRACO,
    paddingBottom: 1.5,
  },
  valor: { fontSize: 9 },

  caixa: {
    width: 9,
    height: 9,
    borderWidth: 0.8,
    borderColor: TRACO,
    marginRight: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  opcao: { flexDirection: "row", alignItems: "center", marginRight: 16 },

  relato: {
    borderBottomWidth: 0.8,
    borderBottomColor: TRACO,
    paddingBottom: 1.5,
    marginBottom: 11,
    minHeight: 13,
  },
  rodape: { marginTop: 8 },
});

export type DadosOrdemManutencao = {
  numero: string | null;
  clienteNome: string;
  clienteTelefone: string;
  endereco: string;
  dataInstalacao: string;
  naGarantia: boolean | null;
  vendedor: string;
  valor: string;
  dataLigacao: string;
  instalador: string;
  tipoServico: "vedacao" | "outros" | null;
  servicoOutros: string;
  dataVisita: string;
  /** O relato do cliente, quebrado nas linhas de escrita da ficha. */
  linhasRelato: string[];
  logoDataUri: string;
};

/** Rótulo + linha sublinhada com o valor (ou vazia, para preencher à mão). */
function Campo({
  rotulo,
  valor,
  largura,
  ultimo = false,
}: {
  rotulo: string;
  valor: string;
  largura?: string;
  ultimo?: boolean;
}) {
  return (
    <>
      <Text style={styles.rotulo}>{rotulo}</Text>
      <View
        style={[
          ultimo ? styles.campoFim : styles.campo,
          largura ? { flexGrow: 0, width: largura } : {},
        ]}
      >
        <Text style={styles.valor}>{valor || " "}</Text>
      </View>
    </>
  );
}

/**
 * Caixa de marcar da ficha.
 *
 * O X é DESENHADO, não escrito: um <Text> dentro de uma View de tamanho fixo
 * é cortado pelo react-pdf e a marcação simplesmente não sai no papel — o que
 * é pior do que não ter caixa, porque a ficha sai dizendo o contrário.
 */
function Caixa({ marcada, rotulo }: { marcada: boolean; rotulo: string }) {
  return (
    <View style={styles.opcao}>
      <View style={styles.caixa}>
        {marcada && (
          <Svg width={6} height={6} viewBox="0 0 6 6">
            <Line x1={0.5} y1={0.5} x2={5.5} y2={5.5} strokeWidth={1} stroke={TRACO} />
            <Line x1={5.5} y1={0.5} x2={0.5} y2={5.5} strokeWidth={1} stroke={TRACO} />
          </Svg>
        )}
      </View>
      <Text>{rotulo}</Text>
    </View>
  );
}

export function OrdemManutencaoPDF({ dados }: { dados: DadosOrdemManutencao }) {
  return (
    <Document
      title={`Ordem de Manutenção — ${dados.clienteNome}`}
      author={EMPRESA.razaoSocial}
    >
      {/* A5 deitada: é a meia folha que a equipe já leva na prancheta. */}
      <Page size="A5" orientation="landscape" style={styles.page}>
        <View style={styles.cabecalho}>
          {/* eslint-disable-next-line jsx-a11y/alt-text */}
          <Image src={dados.logoDataUri} style={styles.logo} />
          <Text style={styles.titulo}>Ordem de Manutenção</Text>
          <Text style={styles.numero}>
            {dados.numero ? `Orçamento ${dados.numero}` : " "}
          </Text>
        </View>

        <View style={styles.linha}>
          <Campo rotulo="Nome:" valor={dados.clienteNome} />
          <Campo
            rotulo="Tel:"
            valor={dados.clienteTelefone}
            largura="130"
            ultimo
          />
        </View>

        <View style={styles.linha}>
          <Campo rotulo="End.:" valor={dados.endereco} ultimo />
        </View>

        <View style={styles.linha}>
          <Campo
            rotulo="Data da instalação:"
            valor={dados.dataInstalacao}
            largura="90"
          />
          <Caixa marcada={dados.naGarantia === true} rotulo="com garantia" />
          <Text style={{ marginRight: 8 }}>/</Text>
          <Caixa marcada={dados.naGarantia === false} rotulo="sem garantia" />
        </View>

        <View style={styles.linha}>
          <Campo rotulo="Vendedor:" valor={dados.vendedor} />
          <Campo rotulo="Valor:" valor={dados.valor} largura="110" ultimo />
        </View>

        <View style={styles.linha}>
          <Campo
            rotulo="Data da ligação:"
            valor={dados.dataLigacao}
            largura="90"
          />
          <Campo rotulo="Instalador:" valor={dados.instalador} ultimo />
        </View>

        <View style={styles.linha}>
          <Caixa marcada={dados.tipoServico === "vedacao"} rotulo="Vedação" />
          <Caixa marcada={dados.tipoServico === "outros"} rotulo="Outros" />
          <View style={styles.campoFim}>
            <Text style={styles.valor}>
              {dados.tipoServico === "outros" ? dados.servicoOutros || " " : " "}
            </Text>
          </View>
        </View>

        <View style={styles.linha}>
          <Campo
            rotulo="Data da ida ao local:"
            valor={dados.dataVisita}
            largura="90"
            ultimo
          />
        </View>

        {/* Linhas de escrita: o relato entra impresso e o resto fica em branco
            para o instalador anotar o que encontrou. */}
        {dados.linhasRelato.map((texto, i) => (
          <View key={i} style={styles.relato}>
            <Text style={styles.valor}>{texto || " "}</Text>
          </View>
        ))}

        <View style={[styles.linha, styles.rodape]}>
          <Campo rotulo="Assinatura do Cliente:" valor="" ultimo />
        </View>
      </Page>
    </Document>
  );
}
