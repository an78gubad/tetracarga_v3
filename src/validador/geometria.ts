/**
 * La geometría del validador. **Escrita por separado de la del acomodador, a propósito.**
 *
 * El Principio II dice que estas dos carpetas no comparten código ni constantes. Duplicar las
 * cuentas es lo que permite que un error del acomodador se note: si compartieran la cuenta,
 * compartirían el error.
 *
 * Acá el bulto se representa por su intervalo en cada eje —`[desde, hasta)`— y no por origen y
 * medidas. Es la misma geometría pensada de otra forma, que es el punto.
 */

import type { Colocacion, Orientacion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'

export type Intervalo = { readonly desde: number; readonly hasta: number }

/** Un bulto colocado, como tres intervalos semiabiertos. */
export type Prisma = {
  readonly enX: Intervalo
  readonly enY: Intervalo
  readonly enZ: Intervalo
}

function medidaDelTipo(tipo: Item, cual: Orientacion['ejeX']): number {
  const campo = cual === 'largo' ? tipo.largo : cual === 'ancho' ? tipo.ancho : tipo.alto
  return campo.estado === 'faltante' ? 0 : (campo.valor as number)
}

/** `undefined` si el tipo no está: un tipo desconocido se rechaza, no se asume. */
export function prismaDe(colocacion: Colocacion, tipos: readonly Item[]): Prisma | undefined {
  const tipo = tipos.find((t) => t.id === colocacion.bulto.itemId)
  if (tipo === undefined) return undefined

  const enEje = (origen: number, cual: Orientacion['ejeX']): Intervalo => ({
    desde: origen,
    hasta: origen + medidaDelTipo(tipo, cual),
  })

  return {
    enX: enEje(colocacion.x as number, colocacion.orientacion.ejeX),
    enY: enEje(colocacion.y as number, colocacion.orientacion.ejeY),
    enZ: enEje(colocacion.z as number, colocacion.orientacion.ejeZ),
  }
}

/** Cuánto se solapan dos intervalos. Cero si se tocan en un extremo. */
export function solape(a: Intervalo, b: Intervalo): number {
  const desde = a.desde > b.desde ? a.desde : b.desde
  const hasta = a.hasta < b.hasta ? a.hasta : b.hasta
  return hasta > desde ? hasta - desde : 0
}

/** Área con que el piso de `arriba` toca el techo de `abajo`. Cero si no están a la misma z. */
export function areaDeContacto(arriba: Prisma, abajo: Prisma): number {
  if (arriba.enZ.desde !== abajo.enZ.hasta) return 0
  return solape(arriba.enX, abajo.enX) * solape(arriba.enY, abajo.enY)
}

export function areaDelPiso(prisma: Prisma): number {
  return (prisma.enX.hasta - prisma.enX.desde) * (prisma.enY.hasta - prisma.enY.desde)
}
