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
 * A FOLHA É A4, O DESENHO É A5 DEITADA (01/09/2026). Elas não brigam: a
 * largura de uma A4 em pé (595pt) é exatamente a de uma A5 deitada, e metade
 * da altura da A4 (420pt) é exatamente a altura de uma A5 deitada. Então a
 * ficha ocupa a METADE DE CIMA da folha e sai um tracejado no meio para
 * cortar — a impressora da loja é A4, e imprimir em A5 obrigaria a trocar a
 * bandeja ou deixar o papel encolhido no meio da página.
 *
 * A metade de cima é um teto de verdade: o desenho gasta ~345pt dos 420
 * disponíveis. Mexer no espaçamento, no tamanho da logo ou no número de linhas
 * de escrita come essa folga — e quando estoura, o que passa da linha de corte
 * é justamente a assinatura do cliente, sem aviso nenhum. Depois de mexer,
 * gere o PDF e confira que nada cruzou o tracejado.
 */

const styles = StyleSheet.create({
  page: {
    paddingTop: 18,
    paddingBottom: 0,
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

  linha: { flexDirection: "row", alignItems: "flex-end", marginBottom: 15 },
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
    marginBottom: 14,
    minHeight: 14,
  },
  rodape: { marginTop: 14 },
  // Metade de cima da A4. A altura fixa é o que garante que a linha de corte
  // caia no meio da folha, com ficha ou sem ficha preenchida.
  metade: {
    height: 402, // 420 (meia A4) menos o paddingTop da página
    borderBottomWidth: 0.5,
    borderBottomColor: "#bbb",
    borderBottomStyle: "dashed",
  },
  corte: {
    marginTop: 3,
    fontSize: 6,
    color: "#999",
    textAlign: "center",
  },
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
      {/* Folha A4, ficha na metade de cima: imprime e corta no tracejado. */}
      <Page size="A4" style={styles.page}>
        <View style={styles.metade}>
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
        </View>
        <Text style={styles.corte}>corte aqui</Text>
      </Page>
    </Document>
  );
}
