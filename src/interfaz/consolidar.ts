/**
 * Orquesta la consolidación: **lee el catálogo una vez** y le pasa el contenedor al acomodador
 * y al validador (FR-010, FR-011).
 *
 * Que el catálogo se lea acá y no en cada módulo es lo que hace que el acomodador y el
 * validador no compartan un origen de valores: si los dos lo leyeran, un error de lectura lo
 * cometerían los dos igual y el validador no lo detectaría.
 *
 * La validación es **bloqueante**: una disposición que no pasa no se renderiza ni se guarda.
 */

import { acomodar } from '../acomodador/acomodar'
import { informeDe } from '../acomodador/informe'
import { catalogo } from '../catalogo/catalogo'
import type { Item } from '../dominio/items'
import { validar } from '../validador/validar'
import { consolidacionBloqueada, camposFaltantes } from '../interpretacion/faltantes'
import type { EstadoConsolidacion } from './InformeConsolidacion'

export type PedidoConsolidacion = {
  readonly items: readonly Item[]
  readonly contenedorId: string | null
}

/**
 * Por encima de esta cantidad de bultos se pide confirmación antes de consolidar (FR-031).
 *
 * Medido: 800 bultos tardan 4,5 s y el crecimiento es de alrededor de n^2,5, así que 5.000
 * serían minutos. No se rechaza ni se recorta la carga (FR-024): se avisa y se pregunta.
 */
export const BULTOS_QUE_PIDEN_CONFIRMACION = 5_000

export function cantidadDeBultos(items: readonly Item[]): number {
  return items.reduce((n, i) => n + (i.cantidad.estado === 'declarado' ? i.cantidad.valor : 0), 0)
}

export function consolidar(items: readonly Item[], contenedorId: string | null): EstadoConsolidacion {
  if (items.length === 0) return { fase: 'sin-items' }
  if (contenedorId === null) return { fase: 'sin-contenedor' }

  if (consolidacionBloqueada(items)) {
    const faltantes = camposFaltantes(items).filter((f) => f.campo !== 'pesoMaximoEncima')
    return { fase: 'bloqueada', faltantes: faltantes.length }
  }

  const contenedor = catalogo.contenedor(contenedorId)
  if (contenedor === undefined) return { fase: 'sin-contenedor' }

  const disposicion = acomodar(items, contenedor)

  // El validador rehizo todas las cuentas por su cuenta. Si rechaza, no se muestra nada: ni la
  // vista 3D ni el informe se construyen sobre una disposición inválida (FR-011).
  const veredicto = validar(disposicion, contenedor, items)
  if (!veredicto.valida) return { fase: 'rechazada', motivo: veredicto.motivo }

  return {
    fase: 'lista',
    informe: informeDe(disposicion, items, contenedor),
    disposicion,
    contenedor,
  }
}
