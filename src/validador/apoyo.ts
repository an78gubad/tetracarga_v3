/**
 * El 80% de apoyo sobre el piso o sobre bultos **cargados antes en la secuencia** (FR-010).
 *
 * El "cargados antes" es lo que vuelve verificable la propiedad de prefijo de AC-24: si un
 * bulto pudiera apoyarse en uno posterior, habría pasos del recorrido con bultos flotando.
 */

import type { Bulto, Colocacion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { areaDeContacto, areaDelPiso, prismaDe } from './geometria'

/** Constante propia del validador. El acomodador tiene la suya. */
export const UMBRAL_APOYO = 80

/** Qué porcentaje de su base tiene apoyado el bulto `indice`. En el piso, 100. */
export function fraccionApoyada(
  indice: number,
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
): number {
  const prisma = prismaDe(secuencia[indice]!, tipos)
  if (prisma === undefined) return 0
  if (prisma.enZ.desde === 0) return 100

  let apoyada = 0
  for (let anterior = 0; anterior < indice; anterior++) {
    const abajo = prismaDe(secuencia[anterior]!, tipos)
    if (abajo === undefined) continue
    apoyada += areaDeContacto(prisma, abajo)
  }

  const base = areaDelPiso(prisma)
  return base === 0 ? 0 : (apoyada * 100) / base
}

/**
 * El primer bulto sin apoyo suficiente, o `undefined`.
 *
 * La comparación se hace **multiplicando**, no con el porcentaje de arriba: así no hay
 * redondeo y "al menos el 80%" queda inclusivo sin ambigüedad.
 */
export function bultoSinApoyo(
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
): Bulto | undefined {
  for (let i = 0; i < secuencia.length; i++) {
    const prisma = prismaDe(secuencia[i]!, tipos)
    if (prisma === undefined) return secuencia[i]!.bulto
    if (prisma.enZ.desde === 0) continue

    let apoyada = 0
    for (let anterior = 0; anterior < i; anterior++) {
      const abajo = prismaDe(secuencia[anterior]!, tipos)
      if (abajo === undefined) continue
      apoyada += areaDeContacto(prisma, abajo)
    }

    if (apoyada * 100 < UMBRAL_APOYO * areaDelPiso(prisma)) return secuencia[i]!.bulto
  }
  return undefined
}
