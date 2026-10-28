/**
 * Una segunda descripción con la lista ya cargada (FR-025).
 *
 * Los ítems nuevos **se agregan al final**. Los que ya estaban conservan sus valores, el estado
 * de cada campo, sus marcas y su color.
 *
 * Lo que explícitamente **no** se hace, y cada prohibición tiene su razón:
 *
 *   - **No se reemplaza la lista**: alguien que agrega carga no quiere perder la que cargó.
 *   - **No se fusionan ítems por parecido de nombre**: "cajas" y "cajas chicas" son dos cosas, y
 *     adivinar que son la misma es exactamente lo que el Principio I prohíbe.
 *   - **No se reinterpreta lo ya cargado**: un campo corregido a mano se perdería.
 */

import type { Item } from '../dominio/items'

export function agregarAlFinal(existentes: readonly Item[], nuevos: readonly Item[]): readonly Item[] {
  return [...existentes, ...nuevos]
}

/**
 * El índice desde el que numerar los ítems nuevos, para que sus ids y colores no choquen con
 * los que ya están.
 */
export function proximoIndice(existentes: readonly Item[]): number {
  return existentes.length
}

export function eliminarPorId(items: readonly Item[], itemId: string): readonly Item[] {
  // Los colores de los demás NO se corren: cada uno está atado a su ítem (AC-09).
  return items.filter((i) => i.id !== itemId)
}

export function reemplazarPorId(items: readonly Item[], reemplazo: Item): readonly Item[] {
  return items.map((i) => (i.id === reemplazo.id ? reemplazo : i))
}
