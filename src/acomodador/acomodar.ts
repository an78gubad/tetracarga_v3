/**
 * El acomodador. Calcula la disposición de forma **determinística y sin el modelo** (FR-009).
 *
 * El algoritmo es deliberadamente simple: por cada bulto, en el orden de `orden.ts`, se prueban
 * posiciones candidatas en un orden fijo y se toma la primera que es válida. No busca el óptimo
 * —el acomodo es NP-duro y mejorarlo está fuera de alcance— y eso es lo que permite congelarlo
 * contra una línea base.
 *
 * Las candidatas salen de las esquinas de lo ya colocado: el origen al principio, y por cada
 * bulto puesto, sus tres esquinas "lejanas". Se recorren ordenadas por z, después x, después y:
 * eso llena de abajo hacia arriba y del fondo hacia la puerta, que es como se carga de verdad.
 */

import type {
  Bulto,
  Colocacion,
  Contenedor,
  Disposicion,
  MotivoAfuera,
  Orientacion,
} from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { areaContacto, soportesDe, tieneApoyoSuficiente, type Caja } from './apoyo'
import { ordenarParaColocar } from './orden'
import { medidasEn, orientacionesPara } from './orientacion'
import { repartirPorArea } from './peso'
import type { Gramos, MilimetrosCuadrados } from '../dominio/unidades'

type Puesto = Caja & {
  readonly bulto: Bulto
  readonly orientacion: Orientacion
  readonly peso: number
  /** Cuánto peso admite encima. `Infinity` si no se declaró. */
  readonly topeEncima: number
  readonly noApilable: boolean
}

type Punto = { readonly x: number; readonly y: number; readonly z: number }

function cabeEnContenedor(caja: Caja, c: Contenedor): boolean {
  return (
    caja.x >= 0 &&
    caja.y >= 0 &&
    caja.z >= 0 &&
    caja.x + caja.dx <= c.largoInterior &&
    caja.y + caja.dy <= c.anchoInterior &&
    caja.z + caja.dz <= c.altoInterior
  )
}

/** Semiabierto: dos bultos pegados comparten una cara y **no** se superponen (research.md §5). */
function seSuperponen(a: Caja, b: Caja): boolean {
  return (
    a.x < b.x + b.dx &&
    b.x < a.x + a.dx &&
    a.y < b.y + b.dy &&
    b.y < a.y + a.dy &&
    a.z < b.z + b.dz &&
    b.z < a.z + a.dz
  )
}

/**
 * Recalcula la carga que recibe cada bulto y verifica los topes (FR-027, AC-06).
 *
 * Se resuelve de arriba hacia abajo —por z decreciente— porque así, cuando se procesa un bulto,
 * la carga que él mismo recibe ya está completa: lo que está encima siempre tiene z mayor.
 */
function pesosRespetados(puestos: readonly Puesto[]): boolean {
  const recibido = new Map<number, number>()
  const porZDescendente = [...puestos.keys()].sort((i, j) => puestos[j]!.z - puestos[i]!.z)

  for (const i of porZDescendente) {
    const arriba = puestos[i]!
    const soportes = puestos
      .map((p, j) => ({ p, j }))
      .filter(({ p }) => areaContacto(arriba, p) > 0)

    if (soportes.length === 0) continue

    // Un no apilable no admite NADA encima (AC-04).
    for (const { p } of soportes) if (p.noApilable) return false

    const total = (arriba.peso + (recibido.get(i) ?? 0)) as Gramos
    const areas = soportes.map(({ p }) => areaContacto(arriba, p) as MilimetrosCuadrados)
    const partes = repartirPorArea(total, areas)

    for (const [k, { j }] of soportes.entries()) {
      const nuevo = (recibido.get(j) ?? 0) + partes[k]!
      recibido.set(j, nuevo)
      if (nuevo > puestos[j]!.topeEncima) return false
    }
  }

  return true
}

function candidatos(puestos: readonly Puesto[]): readonly Punto[] {
  const puntos: Punto[] = [{ x: 0, y: 0, z: 0 }]
  for (const p of puestos) {
    puntos.push({ x: p.x + p.dx, y: p.y, z: p.z })
    puntos.push({ x: p.x, y: p.y + p.dy, z: p.z })
    puntos.push({ x: p.x, y: p.y, z: p.z + p.dz })
  }
  // Orden fijo: de abajo hacia arriba, del fondo hacia la puerta. Sin esto el resultado
  // dependería del orden en que se generaron los puntos, y el determinismo se perdería.
  const clave = (p: Punto) => `${p.x},${p.y},${p.z}`
  const unicos = new Map(puntos.map((p) => [clave(p), p]))
  return [...unicos.values()].sort((a, b) => a.z - b.z || a.x - b.x || a.y - b.y)
}

export function acomodar(items: readonly Item[], contenedor: Contenedor): Disposicion {
  const ordenados = ordenarParaColocar(items)
  const puestos: Puesto[] = []
  const afuera: { bulto: Bulto; motivo: MotivoAfuera }[] = []
  let pesoColocado = 0

  for (const item of ordenados) {
    const cantidad = item.cantidad.estado === 'faltante' ? 0 : item.cantidad.valor
    const peso = item.pesoUnitario.estado === 'faltante' ? 0 : (item.pesoUnitario.valor as number)
    const tope =
      item.marcas.pesoMaximoEncima.estado === 'faltante'
        ? Number.POSITIVE_INFINITY
        : (item.marcas.pesoMaximoEncima.valor as number)
    const orientaciones = orientacionesPara(item)

    for (let indice = 0; indice < cantidad; indice++) {
      const bulto: Bulto = { itemId: item.id, indice }

      // El peso se mira primero: si colocarlo superara la carga útil, el motivo es "peso"
      // aunque además no entrara por volumen (AC-23).
      if (pesoColocado + peso > contenedor.cargaUtil) {
        afuera.push({ bulto, motivo: 'peso' })
        continue
      }

      const colocado = buscarLugar(bulto, item, orientaciones, peso, tope, puestos, contenedor)
      if (colocado === undefined) {
        afuera.push({ bulto, motivo: 'volumen' })
        continue
      }
      puestos.push(colocado)
      pesoColocado += peso
    }
  }

  const secuencia: Colocacion[] = puestos.map((p) => ({
    bulto: p.bulto,
    x: p.x as never,
    y: p.y as never,
    z: p.z as never,
    orientacion: p.orientacion,
  }))

  return { contenedorId: contenedor.id, secuencia, afuera }
}

function buscarLugar(
  bulto: Bulto,
  item: Item,
  orientaciones: readonly Orientacion[],
  peso: number,
  topeEncima: number,
  puestos: readonly Puesto[],
  contenedor: Contenedor,
): Puesto | undefined {
  const noApilable = item.marcas.noApilable.valor

  for (const punto of candidatos(puestos)) {
    for (const orientacion of orientaciones) {
      const { dx, dy, dz } = medidasEn(item, orientacion)
      if (dx <= 0 || dy <= 0 || dz <= 0) continue

      const caja: Caja = { x: punto.x, y: punto.y, z: punto.z, dx, dy, dz }
      if (!cabeEnContenedor(caja, contenedor)) continue
      if (puestos.some((p) => seSuperponen(caja, p))) continue
      if (!tieneApoyoSuficiente(caja, puestos)) continue
      // Nada se apoya sobre un no apilable (AC-04).
      if (soportesDe(caja, puestos).some((s) => (s as Puesto).noApilable)) continue

      const tentativo: Puesto = { ...caja, bulto, orientacion, peso, topeEncima, noApilable }
      if (!pesosRespetados([...puestos, tentativo])) continue

      return tentativo
    }
  }
  return undefined
}
