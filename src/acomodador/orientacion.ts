/**
 * Las orientaciones que puede tomar un bulto (research.md §4).
 *
 * Son las 6 permutaciones de eje: cualquiera de las tres medidas sobre z, y las otras dos en
 * el plano. Admitir las 6 es lo que vuelve verificable "no entra en ninguna orientación": con
 * menos, esa afirmación sería una consecuencia de haber probado pocas.
 */

import type { Item } from '../dominio/items'
import type { MedidaEnEje, Orientacion } from '../dominio/disposicion'

/**
 * **El orden es fijo y es parte del contrato**: el acomodador prueba las orientaciones en este
 * orden, así que cambiarlo cambia las disposiciones y rompe la línea base (FR-009).
 */
export const ORIENTACIONES: readonly Orientacion[] = [
  { ejeX: 'largo', ejeY: 'ancho', ejeZ: 'alto' },
  { ejeX: 'ancho', ejeY: 'largo', ejeZ: 'alto' },
  { ejeX: 'largo', ejeY: 'alto', ejeZ: 'ancho' },
  { ejeX: 'alto', ejeY: 'largo', ejeZ: 'ancho' },
  { ejeX: 'ancho', ejeY: 'alto', ejeZ: 'largo' },
  { ejeX: 'alto', ejeY: 'ancho', ejeZ: 'largo' },
]

/**
 * Con orientación obligatoria quedan las 2 que dejan el alto declarado sobre z.
 *
 * Solo el eje vertical: es lo único que mide AC-05 ("su altura declarada coincide con su
 * altura final"). La rotación en el plano horizontal sigue libre.
 */
export function orientacionesPara(item: Item): readonly Orientacion[] {
  const obligatoria = item.marcas.orientacionObligatoria.valor
  return obligatoria ? ORIENTACIONES.filter((o) => o.ejeZ === 'alto') : ORIENTACIONES
}

export type Medidas = { readonly dx: number; readonly dy: number; readonly dz: number }

/** Qué medida del ítem queda sobre cada eje. Devuelve 0 en los campos que falten. */
export function medidasEn(item: Item, orientacion: Orientacion): Medidas {
  const de = (cual: MedidaEnEje): number => {
    const campo = cual === 'largo' ? item.largo : cual === 'ancho' ? item.ancho : item.alto
    return campo.estado === 'faltante' ? 0 : (campo.valor as number)
  }
  return { dx: de(orientacion.ejeX), dy: de(orientacion.ejeY), dz: de(orientacion.ejeZ) }
}
