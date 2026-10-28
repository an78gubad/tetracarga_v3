/**
 * Convierte lo que el modelo devolvió —número y unidad tal como aparecen en el texto— a
 * milímetros y gramos enteros (FR-002).
 *
 * **La conversión la hace el código, nunca el modelo**: una conversión es una cuenta, y las
 * cuentas no se le piden al modelo (Principio I). Si el modelo convirtiera, un error suyo
 * llegaría como dato declarado, sin marca de estimado.
 */

import type { Gramos, Milimetros } from '../dominio/unidades'

/** Longitudes. Sin unidad, una medida está en centímetros (FR-002). */
const A_MILIMETROS: Readonly<Record<string, number>> = {
  mm: 1,
  milimetro: 1,
  milimetros: 1,
  milímetro: 1,
  milímetros: 1,
  cm: 10,
  centimetro: 10,
  centimetros: 10,
  centímetro: 10,
  centímetros: 10,
  m: 1000,
  metro: 1000,
  metros: 1000,
  in: 25.4,
  pulgada: 25.4,
  pulgadas: 25.4,
  '"': 25.4,
}

/** Pesos. Sin unidad, un peso está en kilos. */
const A_GRAMOS: Readonly<Record<string, number>> = {
  g: 1,
  gr: 1,
  gramo: 1,
  gramos: 1,
  kg: 1000,
  kilo: 1000,
  kilos: 1000,
  kilogramo: 1000,
  kilogramos: 1000,
  t: 1_000_000,
  tn: 1_000_000,
  tonelada: 1_000_000,
  toneladas: 1_000_000,
}

export const UNIDAD_LONGITUD_POR_DEFECTO = 'cm'
export const UNIDAD_PESO_POR_DEFECTO = 'kg'

function normalizar(unidad: string | undefined, porDefecto: string): string {
  const u = (unidad ?? '').trim().toLowerCase().replace(/\.$/, '')
  return u === '' ? porDefecto : u
}

export type Conversion<T> = { readonly ok: true; readonly valor: T } | { readonly ok: false }

/** Redondea hacia arriba, pero solo si hace falta: un valor ya entero no se mueve. */
function haciaArriba(n: number): number {
  return Number.isInteger(n) ? n : Math.ceil(n)
}

export function aMilimetros(valor: number, unidad?: string): Conversion<Milimetros> {
  const factor = A_MILIMETROS[normalizar(unidad, UNIDAD_LONGITUD_POR_DEFECTO)]
  if (factor === undefined || !Number.isFinite(valor) || valor <= 0) return { ok: false }
  return { ok: true, valor: haciaArriba(valor * factor) as Milimetros }
}

export function aGramos(valor: number, unidad?: string): Conversion<Gramos> {
  const factor = A_GRAMOS[normalizar(unidad, UNIDAD_PESO_POR_DEFECTO)]
  if (factor === undefined || !Number.isFinite(valor) || valor <= 0) return { ok: false }
  return { ok: true, valor: haciaArriba(valor * factor) as Gramos }
}

/**
 * Reparte el peso del ítem completo entre sus bultos, **redondeando hacia arriba al gramo**.
 *
 * Hacia arriba por la misma razón que el reparto en la pila de FR-027: nunca subestimar. La
 * suma de los unitarios puede quedar unos gramos por encima del total declarado —3 × 3.334 =
 * 10.002 para un total de 10 kg— y ese es el lado seguro: un redondeo puede dejar un bulto
 * afuera, nunca meter uno que no entraba.
 */
export function dividirPesoDelItem(totalEnGramos: Gramos, cantidad: number): Gramos {
  if (!Number.isInteger(cantidad) || cantidad < 1) {
    throw new Error(`La cantidad tiene que ser un entero ≥ 1 y vino ${cantidad}`)
  }
  return Math.ceil(totalEnGramos / cantidad) as Gramos
}

export type Eje = 'largo' | 'ancho' | 'alto'
const ORDEN_POR_DEFECTO: readonly Eje[] = ['largo', 'ancho', 'alto']

export type MedidaCruda = {
  readonly valor: number
  readonly unidad: string
  readonly ejeRotulado?: Eje
}

export type AsignacionEjes =
  | { readonly ok: true; readonly ejes: Readonly<Partial<Record<Eje, MedidaCruda>>> }
  /** Rótulos ambiguos o contradictorios: los campos quedan faltantes y se preguntan. */
  | { readonly ok: false; readonly porque: string }

/**
 * Asigna medidas a ejes. **El rótulo explícito manda sobre la posición** (FR-002).
 *
 * "60 de alto por 40 por 30" no se lee como largo 60: el 60 va al alto, y el 40 y el 30 se
 * reparten en el orden largo-ancho entre los ejes que quedaron libres.
 *
 * Si dos medidas reclaman el mismo eje, o si hay más medidas que ejes, no se adivina: se
 * devuelve el motivo y los campos quedan faltantes (Principio I).
 */
export function asignarEjes(medidas: readonly MedidaCruda[]): AsignacionEjes {
  if (medidas.length > 3) {
    return { ok: false, porque: `vinieron ${medidas.length} medidas y los ejes son 3` }
  }

  const ejes: Partial<Record<Eje, MedidaCruda>> = {}

  for (const medida of medidas) {
    if (medida.ejeRotulado === undefined) continue
    if (ejes[medida.ejeRotulado] !== undefined) {
      return { ok: false, porque: `dos medidas dicen ser el ${medida.ejeRotulado}` }
    }
    ejes[medida.ejeRotulado] = medida
  }

  const libres = ORDEN_POR_DEFECTO.filter((e) => ejes[e] === undefined)
  const sinRotulo = medidas.filter((m) => m.ejeRotulado === undefined)
  if (sinRotulo.length > libres.length) {
    return { ok: false, porque: 'hay más medidas sin rótulo que ejes libres' }
  }

  for (const [i, medida] of sinRotulo.entries()) {
    ejes[libres[i]!] = medida
  }

  return { ok: true, ejes }
}
