/**
 * El reparto del peso que baja por la pila (FR-027).
 *
 * En aritmética entera y redondeando hacia arriba, **sin punto flotante en ningún paso**: el
 * validador tiene que llegar al mismo número por su cuenta, y dos implementaciones en punto
 * flotante divergen en el último bit, con lo cual "sin tolerancia" deja de ser verificable.
 */

import type { Gramos, MilimetrosCuadrados } from '../dominio/unidades'

/** `ceil(a × b / c)` con enteros. Da el mismo número en cualquier implementación. */
function divisionHaciaArriba(numerador: number, denominador: number): number {
  if (denominador <= 0) return 0
  return Math.floor((numerador + denominador - 1) / denominador)
}

/**
 * Reparte un peso entre los apoyos, en proporción al área con que cada uno toca.
 *
 * El redondeo hacia arriba garantiza que la suma de las partes **nunca** sea menor que el peso
 * repartido: el reparto no subestima lo que recibe un apoyo, así que un error de redondeo solo
 * puede rechazar una pila dudosa, nunca aceptar una imposible.
 */
export function repartirPorArea(
  total: Gramos,
  areas: readonly MilimetrosCuadrados[],
): readonly number[] {
  if (areas.length === 0) return []
  let areaTotal = 0
  for (const a of areas) areaTotal += a
  if (areaTotal <= 0) return areas.map(() => 0)
  return areas.map((a) => divisionHaciaArriba(total * a, areaTotal))
}
