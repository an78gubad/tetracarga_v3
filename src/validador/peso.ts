/**
 * Los límites de peso: la carga máxima total y lo que admite cada bulto encima (FR-010, AC-06).
 *
 * El reparto se calcula de nuevo acá, con su propia división entera. Es la cuenta que el
 * acomodador también hace, y la gracia es que la hace **otro código**: si los dos llegan al
 * mismo número, el número es confiable; si no, hay un bug y se nota.
 */

import type { Bulto, Colocacion, Contenedor } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { areaDeContacto, prismaDe } from './geometria'

function tipoDeBulto(colocacion: Colocacion, tipos: readonly Item[]): Item | undefined {
  return tipos.find((t) => t.id === colocacion.bulto.itemId)
}

function pesoDe(colocacion: Colocacion, tipos: readonly Item[]): number {
  const tipo = tipoDeBulto(colocacion, tipos)
  if (tipo === undefined || tipo.pesoUnitario.estado === 'faltante') return 0
  return tipo.pesoUnitario.valor as number
}

export function cargaMaximaExcedida(
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
  contenedor: Contenedor,
): boolean {
  let total = 0
  for (const c of secuencia) total += pesoDe(c, tipos)
  return total > (contenedor.cargaUtil as number)
}

/** División entera hacia arriba, escrita de otra forma que en el acomodador. */
function partirHaciaArriba(peso: number, area: number, areaTotal: number): number {
  if (areaTotal <= 0) return 0
  const exacto = peso * area
  const entero = Math.trunc(exacto / areaTotal)
  return entero * areaTotal === exacto ? entero : entero + 1
}

/**
 * Cuánto peso recibe cada bulto, por índice en la secuencia.
 *
 * Se recorre de la z más alta a la más baja: cuando se procesa un bulto, lo que él mismo recibe
 * ya está completo, porque todo lo que está encima tiene z mayor.
 */
export function pesoRecibidoPorBulto(
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
): Map<number, number> {
  const recibido = new Map<number, number>()
  const prismas = secuencia.map((c) => prismaDe(c, tipos))

  const deArribaHaciaAbajo = [...secuencia.keys()].sort((i, j) => {
    const zi = prismas[i]?.enZ.desde ?? 0
    const zj = prismas[j]?.enZ.desde ?? 0
    return zj - zi
  })

  for (const i of deArribaHaciaAbajo) {
    const arriba = prismas[i]
    if (arriba === undefined) continue

    const apoyos: { indice: number; area: number }[] = []
    let areaTotal = 0
    for (let j = 0; j < secuencia.length; j++) {
      if (j === i) continue
      const abajo = prismas[j]
      if (abajo === undefined) continue
      const area = areaDeContacto(arriba, abajo)
      if (area > 0) {
        apoyos.push({ indice: j, area })
        areaTotal += area
      }
    }
    if (apoyos.length === 0) continue

    const total = pesoDe(secuencia[i]!, tipos) + (recibido.get(i) ?? 0)
    for (const apoyo of apoyos) {
      const parte = partirHaciaArriba(total, apoyo.area, areaTotal)
      recibido.set(apoyo.indice, (recibido.get(apoyo.indice) ?? 0) + parte)
    }
  }

  return recibido
}

export type FallaDePeso = { readonly bulto: Bulto; readonly noApilable: boolean }

/**
 * El primer bulto cuyo límite de peso encima se excede, o que es no apilable y tiene carga.
 *
 * Un ítem sin tope declarado no se excede nunca: sin límite declarado no hay límite que
 * verificar. Un no apilable, en cambio, no admite **nada** (AC-04).
 */
export function pesoEncimaExcedido(
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
): FallaDePeso | undefined {
  const recibido = pesoRecibidoPorBulto(secuencia, tipos)

  for (let i = 0; i < secuencia.length; i++) {
    const carga = recibido.get(i) ?? 0
    if (carga === 0) continue

    const tipo = tipoDeBulto(secuencia[i]!, tipos)
    if (tipo === undefined) return { bulto: secuencia[i]!.bulto, noApilable: false }

    if (tipo.marcas.noApilable.valor) {
      return { bulto: secuencia[i]!.bulto, noApilable: true }
    }
    const tope = tipo.marcas.pesoMaximoEncima
    if (tope.estado !== 'faltante' && carga > (tope.valor as number)) {
      return { bulto: secuencia[i]!.bulto, noApilable: false }
    }
  }
  return undefined
}
