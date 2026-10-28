/**
 * El color de cada ítem (FR-013, AC-09).
 *
 * El color va atado al **ítem** y no a su posición en la lista. Con FR-004 se eliminan ítems: si
 * el color saliera de la posición, al borrar uno se correrían los de todos los demás.
 *
 * El índice de color lo asigna la interpretación cuando el ítem entra a la lista y viaja en el
 * ítem; acá solo se traduce a un color concreto.
 */

import type { Item } from '../dominio/items'
import { colorDeIndice, hayColoresReciclados } from './paleta'

export function colorDe(item: Item): string {
  return colorDeIndice(item.color)
}

export type ColoresDeLaCarga = {
  readonly porItemId: ReadonlyMap<string, string>
  /** `true` cuando hay tipos que comparten color y la vista tiene que avisarlo. */
  readonly hayReciclados: boolean
}

export function coloresDe(items: readonly Item[]): ColoresDeLaCarga {
  const porItemId = new Map(items.map((i) => [i.id, colorDe(i)]))

  // Hay reciclado cuando dos ítems distintos terminan con el MISMO color. Se mira el resultado
  // en vez de contar ítems: así el aviso aparece cuando de verdad hay colores compartidos, y no
  // por tener 13 ítems de los cuales dos son el mismo tipo.
  const usos = new Map<string, number>()
  for (const color of porItemId.values()) usos.set(color, (usos.get(color) ?? 0) + 1)
  const hayCompartidos = [...usos.values()].some((n) => n > 1)

  return { porItemId, hayReciclados: hayCompartidos || hayColoresReciclados(porItemId.size) }
}
