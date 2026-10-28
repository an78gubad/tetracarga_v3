/** Todo bulto dentro de los límites del contenedor (FR-010). */

import type { Bulto, Colocacion, Contenedor } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { prismaDe } from './geometria'

/**
 * El primer bulto que se sale, o `undefined` si todos entran.
 *
 * Las medidas del contenedor llegan **por argumento**: el validador no lee el catálogo. Si lo
 * leyera, compartiría un origen de valores con el acomodador y un error al leerlo lo cometerían
 * los dos igual (Principio II).
 */
export function bultoFueraDeLimites(
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
  contenedor: Contenedor,
): Bulto | undefined {
  for (const colocacion of secuencia) {
    const p = prismaDe(colocacion, tipos)
    if (p === undefined) return colocacion.bulto

    const adentro =
      p.enX.desde >= 0 &&
      p.enY.desde >= 0 &&
      p.enZ.desde >= 0 &&
      p.enX.hasta <= (contenedor.largoInterior as number) &&
      p.enY.hasta <= (contenedor.anchoInterior as number) &&
      p.enZ.hasta <= (contenedor.altoInterior as number)

    if (!adentro) return colocacion.bulto
  }
  return undefined
}
