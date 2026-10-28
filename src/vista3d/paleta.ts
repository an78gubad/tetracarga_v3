/**
 * La paleta fija de 12 colores (FR-013, SC-015).
 *
 * **El umbral no se eligió: se midió.** Los 12 colores salieron de optimizar la distancia
 * mínima entre todos los pares en OKLCh —tono, luminancia y croma por color— y la distancia
 * mínima **medida** es 0,1848. El umbral declarado es 0,15: un número redondo con margen por
 * encima de lo medido, y alrededor de 7 veces la diferencia apenas perceptible en OKLab, que
 * ronda 0,02.
 *
 * El orden importa: el color sale del índice, así que cambiarlo cambia qué color le toca a cada
 * ítem. Cambiar un color **rompe** `paleta.test.ts` si lo acerca a otro, y eso es a propósito:
 * `AGENTS.md` prohíbe aflojar el umbral para que algo pase. Si hiciera falta un color distinto,
 * primero se vuelve a optimizar la paleta entera.
 */

/**
 * Distancia perceptual mínima exigida entre todos los pares, en OKLab.
 *
 * Declarado acá, al lado de la paleta, como pide FR-013.
 */
export const UMBRAL_DISTANCIA = 0.15

/** Lo que dio la medición al generar esta paleta. Ver `eval/ultimo-informe.md`. */
export const DISTANCIA_MINIMA_MEDIDA = 0.1848

export const PALETA: readonly string[] = [
  '#ff8ebb', // rosa claro
  '#e24945', // rojo
  '#8a4300', // marrón
  '#edb345', // ámbar
  '#81900c', // oliva
  '#00671a', // verde oscuro
  '#48dba2', // verde agua
  '#009db2', // cian
  '#005e98', // azul
  '#99c1ff', // celeste claro
  '#9b6bce', // violeta
  '#6e236c', // púrpura oscuro
]

export const CANTIDAD_COLORES = 12

/**
 * El fondo de la vista 3D, declarado como constante y no suelto en un estilo (FR-033).
 *
 * Tiene que estar acá porque entra en la misma verificación que la paleta: un bulto del mismo
 * tono que el fondo se pierde aunque se distinga de todos los demás bultos.
 */
export const COLOR_DE_FONDO = '#f4f4f5'

/**
 * El color de las aristas del contenedor. Entra en la misma verificación que la paleta.
 *
 * Era `#888888` y **el test lo rechazó**: quedaba a 0,1400 del oliva y a 0,1116 del cian, los
 * dos por debajo del umbral. Un gris oscuro resuelve con margen —0,1816 al color más cercano—
 * y además se lee mejor como alambre sobre un fondo claro.
 */
export const COLOR_DEL_CONTENEDOR = '#2a2a2a'

/**
 * El color de un tipo de ítem. Con más de 12 tipos **los colores se reciclan en el mismo
 * orden** y la vista avisa (FR-013).
 */
export function colorDeIndice(indice: number): string {
  return PALETA[((indice % CANTIDAD_COLORES) + CANTIDAD_COLORES) % CANTIDAD_COLORES]!
}

/** `true` cuando hay más tipos que colores y por lo tanto hay colores compartidos. */
export function hayColoresReciclados(cantidadDeTipos: number): boolean {
  return cantidadDeTipos > CANTIDAD_COLORES
}
