/** Sin superposiciones entre bultos (FR-010). */

import type { Bulto, Colocacion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { prismaDe, solape } from './geometria'

/**
 * Dos bultos se superponen cuando se solapan en los **tres** ejes a la vez, con más de 0 mm.
 *
 * Compartir una cara, una arista o un vértice da solape 0 en al menos un eje, así que **no** es
 * superposición. Tiene que ser así: apilar exige contacto.
 */
export function primerSolapamiento(
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
): Bulto | undefined {
  for (let i = 0; i < secuencia.length; i++) {
    const a = prismaDe(secuencia[i]!, tipos)
    if (a === undefined) return secuencia[i]!.bulto
    for (let j = 0; j < i; j++) {
      const b = prismaDe(secuencia[j]!, tipos)
      if (b === undefined) return secuencia[j]!.bulto
      if (solape(a.enX, b.enX) > 0 && solape(a.enY, b.enY) > 0 && solape(a.enZ, b.enZ) > 0) {
        return secuencia[i]!.bulto
      }
    }
  }
  return undefined
}

export function haySolapamiento(secuencia: readonly Colocacion[], tipos: readonly Item[]): boolean {
  return primerSolapamiento(secuencia, tipos) !== undefined
}
