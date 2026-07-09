// Rótulos legíveis para os enums do orçamento.

export function rotuloEstrutura(tipo: string | null): string {
  switch (tipo) {
    case "aluminio":
      return "Alumínio";
    case "metalica":
    case "ferro": // legado
      return "Metálica";
    default:
      return "";
  }
}

export function rotuloFormato(formato: string | null): string {
  switch (formato) {
    case "capotinha":
      return "Capotinha";
    case "braco_retratil":
      return "Braço Retrátil";
    default:
      return "";
  }
}
