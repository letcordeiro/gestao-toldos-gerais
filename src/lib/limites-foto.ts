// Limites de foto do orçamento. SEM "server-only": o formulário (cliente)
// precisa deles para barrar antes de enviar, e o servidor para conferir depois.
//
// Os dois lados usando o mesmo número é o ponto: quando o navegador barrava com
// um limite e o servidor com outro, o envio morria em "Application error" sem
// explicar nada.

export const MAX_FOTO_BYTES = 8 * 1024 * 1024; // 8 MB por imagem

/**
 * Teto do envio INTEIRO do formulário (soma das fotos).
 *
 * Existe porque o limite do servidor é do envio todo, não de cada foto: cinco
 * fotos de 7 MB passam uma a uma e estouram juntas.
 *
 * Fica ABAIXO do `bodySizeLimit` do next.config (40 MB) de propósito — a folga
 * cobre o resto do formulário, que viaja no mesmo envio.
 */
export const MAX_ENVIO_BYTES = 32 * 1024 * 1024; // 32 MB
