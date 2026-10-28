/**
 * El límite de largo, también del lado del navegador.
 *
 * Está duplicado a propósito respecto del intermediario: acá sirve para avisarle al usuario
 * mientras escribe, y allá para rechazar sin llamar al proveedor. El que manda es el del
 * intermediario (FR-017); este solo evita un viaje que ya se sabe que va a fallar.
 */
export const LARGO_MAXIMO_DESCRIPCION = 2_000
