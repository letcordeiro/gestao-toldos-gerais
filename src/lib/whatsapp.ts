/** Monta um link wa.me a partir de um telefone brasileiro (com ou sem formatação). */
export function linkWhatsApp(telefone: string, mensagem?: string): string {
  const digitos = telefone.replace(/\D/g, "");
  const completo = digitos.startsWith("55") ? digitos : `55${digitos}`;
  const query = mensagem ? `?text=${encodeURIComponent(mensagem)}` : "";
  return `https://wa.me/${completo}${query}`;
}
