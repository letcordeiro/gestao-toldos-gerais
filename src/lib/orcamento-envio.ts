// Enquanto a Evolution estiver conectada ao WhatsApp pessoal do João, somente
// os orçamentos dele podem usar o envio automático.
export const VENDEDOR_ENVIO_AUTOMATICO_ID = 1;

export function permiteEnvioAutomatico(vendedorId: number | null | undefined) {
  return vendedorId === VENDEDOR_ENVIO_AUTOMATICO_ID;
}
