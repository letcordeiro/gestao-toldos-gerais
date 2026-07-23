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
import { MONTAGEM_COBERTURA } from "@/lib/proposta";
import { formatarValorItem } from "@/lib/format";
import { enderecoCompleto } from "@/lib/endereco";

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
  // --- Ficha de instalação (página 2) ---
  // Campos propositalmente compactos: quanto menos altura o formulário come,
  // maior fica a área de desenho (igual ao modelo da empresa).
  instPage: {
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 42,
    fontSize: 9,
    fontFamily: "Helvetica",
    color: "#1a1a1a",
    lineHeight: 1.28,
  },
  instCabecalho: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  instLogo: { width: 44 },
  instTitulo: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
  },
  instCaixa: { borderWidth: 1, borderColor: "#999", marginBottom: 3 },
  instLinha: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#999" },
  instLinhaUltima: { flexDirection: "row" },
  instCelula: {
    borderRightWidth: 1,
    borderColor: "#999",
    paddingHorizontal: 3,
    paddingVertical: 1.5,
    justifyContent: "flex-start",
  },
  instCelulaFim: { paddingHorizontal: 3, paddingVertical: 1.5 },
  instRotulo: { fontSize: 5, color: "#666", fontFamily: "Helvetica-Bold" },
  instValor: { fontSize: 7.5, marginTop: 0.5 },
  instTabTitulo: {
    fontSize: 5.5,
    color: "#fff",
    fontFamily: "Helvetica-Bold",
  },
  instCabTab: { backgroundColor: VERDE },
  desenhoCaixa: {
    borderWidth: 1,
    borderColor: "#999",
    marginTop: 2,
    padding: 3,
    overflow: "hidden",
  },
  desenhoRotulo: {
    fontSize: 5.5,
    color: "#666",
    fontFamily: "Helvetica-Bold",
    marginBottom: 2,
  },
  fotosSecao: { marginTop: 10 },
  fotosNota: {
    fontSize: 8,
    fontFamily: "Helvetica-Oblique",
    color: "#6b6b6b",
    marginTop: 2,
  },
  fotosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 3,
  },
  fotoImg: {
    width: "48.5%",
    height: 150,
    objectFit: "cover",
    borderWidth: 1,
    borderColor: "#e5e5e5",
    borderRadius: 3,
  },
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
  rodapeVendedor: {
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    color: VERDE,
    marginBottom: 1,
  },
});

export type DadosProposta = {
  numero: string;
  dataExtenso: string;
  cliente: {
    nome: string;
    telefone: string;
    endereco: string | null;
    numero: string | null;
    complemento: string | null;
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
    whatsapp: string | null;
    telefoneFixo: string | null;
    email: string | null;
  } | null;
  itens: Array<{
    descricao: string;
    valorMin: number | null;
    valorMax: number | null;
  }>;
  logoDataUri: string;
  // Fotos anexadas (data URIs) — aparecem numa seção ao final da proposta.
  fotos: string[];
  // Ficha de INSTALAÇÃO (página 2) — só no PDF interno do vendedor, quando o
  // orçamento está aprovado. Nunca vem preenchida no PDF público do cliente.
  instalacao?: DadosInstalacaoPDF | null;
  // true = gerar SÓ a ficha de instalação (documento interno separado).
  somenteInstalacao?: boolean;
};

export type DadosInstalacaoPDF = {
  clienteEmail: string | null;
  responsavel: string | null;
  observacoes: string | null;
  calha: string | null;
  tipoEscada: string | null;
  condEstacionamento: string | null;
  horario: string | null;
  dataPedido: string;
  prevEntrega: string | null;
  dataEntrega: string | null;
  vendedorNome: string | null;
  itens: Array<{
    qtde: string | null;
    produto: string | null;
    estrutura: string | null;
    revestimento: string | null;
    rufo: string | null;
    babado: string | null;
    vies: string | null;
  }>;
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
  const enderecoCliente = enderecoCompleto(dados.cliente);

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
      {dados.somenteInstalacao ? null : (
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

        {dados.fotos.length > 0 ? (
          <View style={styles.fotosSecao} break={dados.fotos.length > 2}>
            <Text style={styles.tituloSecao}>FOTOS</Text>
            <Text style={styles.fotosNota}>
              As imagens são apenas exemplos de aplicação do produto. O resultado
              final pode variar conforme o local, as medidas e outros fatores do
              projeto.
            </Text>
            <View style={styles.fotosGrid}>
              {dados.fotos.map((src, i) => (
                // eslint-disable-next-line jsx-a11y/alt-text
                <Image key={i} src={src} style={styles.fotoImg} />
              ))}
            </View>
          </View>
        ) : null}

        {/* Rodapé com os dados do vendedor responsável (fixo em todas as páginas) */}
        <View style={styles.rodape} fixed>
          {dados.vendedor ? (
            <>
              <Text style={styles.rodapeVendedor}>
                {dados.vendedor.nome} · Vendedor responsável — Toldos Gerais
              </Text>
              <Text>
                {[
                  dados.vendedor.whatsapp
                    ? `WhatsApp ${dados.vendedor.whatsapp}`
                    : null,
                  dados.vendedor.telefoneFixo
                    ? `Fixo ${dados.vendedor.telefoneFixo}`
                    : null,
                  dados.vendedor.email,
                ]
                  .filter(Boolean)
                  .join("  ·  ")}
              </Text>
            </>
          ) : (
            <Text>
              {EMPRESA.razaoSocial} — {EMPRESA.site} · {EMPRESA.telefoneFixo}
            </Text>
          )}
        </View>
      </Page>
      )}

      {/* Ficha de INSTALAÇÃO (interna; nunca vai no PDF do cliente) */}
      {dados.instalacao ? (
        <Page size="A4" style={styles.instPage}>
          <View style={styles.instCabecalho}>
            {/* eslint-disable-next-line jsx-a11y/alt-text */}
            <Image src={dados.logoDataUri} style={styles.instLogo} />
            <Text style={styles.instTitulo}>INSTALAÇÃO</Text>
          </View>

          {/* Dados do cliente / local */}
          <View style={styles.instCaixa}>
            <View style={styles.instLinha}>
              <Celula rotulo="CLIENTE" valor={dados.cliente.nome} largura="100%" fim />
            </View>
            <View style={styles.instLinha}>
              <Celula
                rotulo="ENDEREÇO"
                valor={[dados.cliente.endereco, dados.cliente.numero]
                  .filter(Boolean)
                  .join(", ")}
                largura="60%"
              />
              <Celula rotulo="BAIRRO" valor={dados.cliente.bairro} largura="40%" fim />
            </View>
            <View style={styles.instLinha}>
              <Celula rotulo="CIDADE" valor={dados.cliente.cidade} largura="40%" />
              <Celula rotulo="CEP" valor={dados.cliente.cep} largura="25%" />
              <Celula
                rotulo="TELEFONE(S)"
                valor={dados.cliente.telefone}
                largura="35%"
                fim
              />
            </View>
            <View style={styles.instLinha}>
              <Celula
                rotulo="RESPONSÁVEL"
                valor={dados.instalacao.responsavel}
                largura="40%"
              />
              <Celula
                rotulo="E-MAIL"
                valor={dados.instalacao.clienteEmail}
                largura="60%"
                fim
              />
            </View>
            <View style={styles.instLinha}>
              <Celula
                rotulo="REFERÊNCIAS / COMPLEMENTO"
                valor={dados.cliente.complemento}
                largura="100%"
                fim
              />
            </View>
            <View style={styles.instLinha}>
              <Celula
                rotulo="OBSERVAÇÕES"
                valor={dados.instalacao.observacoes}
                largura="100%"
                fim
              />
            </View>
            <View style={styles.instLinhaUltima}>
              <Celula rotulo="CALHA" valor={dados.instalacao.calha} largura="25%" />
              <Celula
                rotulo="TIPO ESCADA"
                valor={dados.instalacao.tipoEscada}
                largura="25%"
              />
              <Celula
                rotulo="COND. ESTAC."
                valor={dados.instalacao.condEstacionamento}
                largura="25%"
              />
              <Celula
                rotulo="HORÁRIO"
                valor={dados.instalacao.horario}
                largura="25%"
                fim
              />
            </View>
          </View>

          {/* Dados do pedido */}
          <View style={styles.instCaixa}>
            <View style={styles.instLinha}>
              <Celula rotulo="EMPRESA" valor={EMPRESA.razaoSocial} largura="100%" fim />
            </View>
            <View style={styles.instLinhaUltima}>
              <Celula rotulo="Nº PEDIDO" valor={dados.numero} largura="18%" />
              <Celula
                rotulo="DATA PEDIDO"
                valor={dados.instalacao.dataPedido}
                largura="18%"
              />
              <Celula
                rotulo="VENDEDOR"
                valor={dados.instalacao.vendedorNome}
                largura="30%"
              />
              <Celula
                rotulo="PREV. ENTREGA"
                valor={dados.instalacao.prevEntrega}
                largura="17%"
              />
              <Celula
                rotulo="DATA ENTREGA"
                valor={dados.instalacao.dataEntrega}
                largura="17%"
                fim
              />
            </View>
          </View>

          {/* Produtos */}
          <View style={styles.instCaixa}>
            <View style={[styles.instLinha, styles.instCabTab]}>
              {COLS_INST.map((c, i) => (
                <View
                  key={c.rotulo}
                  style={[
                    i === COLS_INST.length - 1
                      ? styles.instCelulaFim
                      : styles.instCelula,
                    { width: c.largura },
                  ]}
                >
                  <Text style={styles.instTabTitulo}>{c.rotulo}</Text>
                </View>
              ))}
            </View>
            {(dados.instalacao.itens.length
              ? dados.instalacao.itens
              : [null]
            ).map((item, idx, arr) => (
              <View
                key={idx}
                style={
                  idx === arr.length - 1 ? styles.instLinhaUltima : styles.instLinha
                }
              >
                {COLS_INST.map((c, i) => (
                  <View
                    key={c.rotulo}
                    style={[
                      i === COLS_INST.length - 1
                        ? styles.instCelulaFim
                        : styles.instCelula,
                      { width: c.largura, minHeight: 13 },
                    ]}
                  >
                    <Text style={styles.instValor}>
                      {(item ? item[c.chave] : null) ?? ""}
                    </Text>
                  </View>
                ))}
              </View>
            ))}
          </View>

          {/* Área quadriculada para o croqui — desenhada à mão pela equipe.
              wrap={false}: a grade nunca pode partir entre duas páginas. */}
          <View style={styles.desenhoCaixa} wrap={false}>
            <Text style={styles.desenhoRotulo}>DESENHO / CROQUI</Text>
            <AreaDesenho altura={alturaDesenho(dados.instalacao)} />
          </View>
        </Page>
      ) : null}
    </Document>
  );
}



const COLS_INST: {
  rotulo: string;
  chave: keyof NonNullable<DadosProposta["instalacao"]>["itens"][number];
  largura: string;
}[] = [
  { rotulo: "QTDE", chave: "qtde", largura: "7%" },
  { rotulo: "PRODUTO", chave: "produto", largura: "25%" },
  { rotulo: "ESTRUT / TIPO / COR", chave: "estrutura", largura: "17%" },
  { rotulo: "REVEST / TIPO / COR", chave: "revestimento", largura: "17%" },
  { rotulo: "RUFO", chave: "rufo", largura: "8%" },
  { rotulo: "BABADO / MODELO / COR", chave: "babado", largura: "13%" },
  { rotulo: "VIÉS / MODELO / COR", chave: "vies", largura: "13%" },
];

// Área quadriculada para o croqui da instalação (desenho à mão).
// Célula de 13pt (~4,5mm), igual ao modelo da empresa.
const CELULA = 13;
// A4 (595.28pt) menos o padding da página (42 de cada lado) e a borda/padding
// da caixa do desenho.
const LARGURA_DESENHO = 595.28 - 42 * 2 - 8;

// react-pdf não tem "ocupar o resto da página": flexGrow cresce sem respeitar
// a folha, e uma grade fixa grande demais faz a caixa inteira pular de página
// (wrap={false}). Então calculamos a altura a partir do que o formulário
// consome — o que o faz crescer é o nº de produtos e os textos que quebram
// linha. Valores medidos no PDF real (ver testes no log do dia).
const ALTURA_BASE = 390; // cabe com 1 produto e textos curtos
const ALTURA_LINHA = 11; // custo de cada linha extra de texto

function linhasExtras(texto: string | null, charsPorLinha: number): number {
  if (!texto) return 0;
  return Math.max(0, Math.ceil(texto.length / charsPorLinha) - 1);
}

function alturaDesenho(inst: DadosInstalacaoPDF): number {
  // Observações ocupa a largura toda (~115 caracteres por linha a 7.5pt).
  let desconto = linhasExtras(inst.observacoes, 115) * ALTURA_LINHA;
  // Campos estreitos que também podem quebrar (larguras de 25% a 60%).
  desconto += linhasExtras(inst.responsavel, 42) * ALTURA_LINHA;
  desconto += linhasExtras(inst.horario, 42) * ALTURA_LINHA;
  desconto +=
    Math.max(
      linhasExtras(inst.calha, 26),
      linhasExtras(inst.tipoEscada, 26),
      linhasExtras(inst.condEstacionamento, 26)
    ) * ALTURA_LINHA;
  // Cada produto além do primeiro come ~20pt.
  desconto += Math.max(0, inst.itens.length - 1) * 20;
  return Math.min(ALTURA_BASE, Math.max(150, ALTURA_BASE - desconto));
}

function AreaDesenho({ altura }: { altura: number }) {
  const colunas = Math.floor(LARGURA_DESENHO / CELULA);
  const linhas = Math.floor(altura / CELULA);
  return (
    <Svg width={LARGURA_DESENHO} height={linhas * CELULA}>
      {Array.from({ length: colunas + 1 }, (_, i) => (
        <Line
          key={`v${i}`}
          x1={i * CELULA}
          y1={0}
          x2={i * CELULA}
          y2={linhas * CELULA}
          strokeWidth={0.3}
          stroke="#c8c8c8"
        />
      ))}
      {Array.from({ length: linhas + 1 }, (_, i) => (
        <Line
          key={`h${i}`}
          x1={0}
          y1={i * CELULA}
          x2={colunas * CELULA}
          y2={i * CELULA}
          strokeWidth={0.3}
          stroke="#c8c8c8"
        />
      ))}
    </Svg>
  );
}

// Célula rotulada da ficha de instalação.
function Celula({
  rotulo,
  valor,
  largura,
  fim,
}: {
  rotulo: string;
  valor: string | null | undefined;
  largura: string;
  fim?: boolean;
}) {
  return (
    <View
      style={[
        fim ? styles.instCelulaFim : styles.instCelula,
        { width: largura, minHeight: 14 },
      ]}
    >
      <Text style={styles.instRotulo}>{rotulo}</Text>
      <Text style={styles.instValor}>{valor || " "}</Text>
    </View>
  );
}
