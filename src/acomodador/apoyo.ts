/**
 * El área de contacto y el 80% de apoyo (FR-010, research.md §7).
 *
 * Todo en enteros y comparando **multiplicando en vez de dividiendo**, para no tener que
 * inventar una regla de redondeo: `area_apoyada × 100 ≥ 80 × area_base`.
 */

import type { MilimetrosCuadrados } from '../dominio/unidades'

/** Una caja ya colocada. El intervalo que ocupa es semiabierto: `[x, x + dx)`. */
export type Caja = {
  readonly x: number
  readonly y: number
  readonly z: number
  readonly dx: number
  readonly dy: number
  readonly dz: number
}

/** "Al menos el 80%" es inclusivo: exactamente 80 pasa. */
export const PORCENTAJE_MINIMO_APOYO = 80

function solapeEnEje(a1: number, d1: number, a2: number, d2: number): number {
  return Math.max(0, Math.min(a1 + d1, a2 + d2) - Math.max(a1, a2))
}

/**
 * Área con que `arriba` se apoya sobre `abajo`, en el plano xy.
 *
 * Exige que la base de `arriba` esté **exactamente** a la altura del techo de `abajo`: un apoyo
 * "casi tocando" no existe en milímetros enteros, y exigir igualdad exacta es lo que vuelve la
 * cuenta determinística.
 */
export function areaContacto(arriba: Caja, abajo: Caja): MilimetrosCuadrados {
  if (arriba.z !== abajo.z + abajo.dz) return 0 as MilimetrosCuadrados
  const enX = solapeEnEje(arriba.x, arriba.dx, abajo.x, abajo.dx)
  const enY = solapeEnEje(arriba.y, arriba.dy, abajo.y, abajo.dy)
  return (enX * enY) as MilimetrosCuadrados
}

export function areaBase(caja: Caja): MilimetrosCuadrados {
  return (caja.dx * caja.dy) as MilimetrosCuadrados
}

/** Los soportes reales de una caja: los que la tocan por abajo con área mayor que 0. */
export function soportesDe(caja: Caja, candidatos: readonly Caja[]): readonly Caja[] {
  return candidatos.filter((c) => areaContacto(caja, c) > 0)
}

export function areaApoyada(caja: Caja, candidatos: readonly Caja[]): MilimetrosCuadrados {
  let total = 0
  for (const c of candidatos) total += areaContacto(caja, c)
  return total as MilimetrosCuadrados
}

/**
 * ¿Tiene al menos el 80% de su base apoyada sobre el piso o sobre los candidatos?
 *
 * En el piso (`z === 0`) el apoyo es total: no hace falta buscar soportes.
 */
export function tieneApoyoSuficiente(caja: Caja, candidatos: readonly Caja[]): boolean {
  if (caja.z === 0) return true
  const apoyada = areaApoyada(caja, candidatos)
  return apoyada * 100 >= PORCENTAJE_MINIMO_APOYO * areaBase(caja)
}
