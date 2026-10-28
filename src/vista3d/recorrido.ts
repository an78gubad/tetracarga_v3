/**
 * El recorrido de la secuencia de carga, bulto por bulto (FR-014, AC-08).
 *
 * En la posición k se ven **exactamente** los primeros k bultos de la secuencia, en el orden en
 * que hay que cargarlos en el depósito. El orden es el que produjo el acomodador: el índice en
 * `secuencia` *es* el orden de colocación.
 */

import type { Colocacion, Disposicion } from '../dominio/disposicion'

export type Recorrido = {
  /** De 0 —contenedor vacío— a la cantidad total de bultos colocados. */
  readonly posicion: number
  readonly total: number
  readonly visibles: readonly Colocacion[]
}

export const POSICION_INICIAL = 0

/**
 * El prefijo de la secuencia en la posición `k`.
 *
 * `k` se acota al rango válido en vez de explotar: un control deslizante puede quedar fuera de
 * rango cuando la disposición se recalcula y se hace más corta, y eso no es un error.
 */
export function recorridoEn(disposicion: Disposicion, k: number): Recorrido {
  const total = disposicion.secuencia.length
  const posicion = Math.min(Math.max(Math.trunc(k), 0), total)
  return { posicion, total, visibles: disposicion.secuencia.slice(0, posicion) }
}

/** El recorrido completo: todos los bultos colocados. */
export function recorridoCompleto(disposicion: Disposicion): Recorrido {
  return recorridoEn(disposicion, disposicion.secuencia.length)
}

/**
 * Qué posición conservar cuando la disposición se recalcula (FR-006).
 *
 * Se conserva la posición si todavía existe, y si no, se va al final. Volver a 0 obligaría a
 * recorrer todo de nuevo por haber corregido una medida.
 */
export function posicionTrasRecalcular(anterior: number, nuevoTotal: number): number {
  return Math.min(Math.max(Math.trunc(anterior), 0), nuevoTotal)
}
