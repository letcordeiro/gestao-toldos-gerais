type PartesEndereco = {
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  cep?: string | null;
};

/** Monta o endereço completo em uma linha ("Rua X, 123 - apto 2 – Bairro – Cidade – CEP 00000-000"). */
export function enderecoCompleto(c: PartesEndereco): string {
  const ruaNumero = [c.endereco, c.numero].filter(Boolean).join(", ");
  const linha1 = [ruaNumero || null, c.complemento]
    .filter(Boolean)
    .join(" - ");
  return [linha1 || null, c.bairro, c.cidade, c.cep ? `CEP ${c.cep}` : null]
    .filter(Boolean)
    .join(" – ");
}
