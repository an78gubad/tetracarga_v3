/**
 * La validación de la respuesta del modelo, en **dos niveles** (FR-017, FR-021).
 *
 * La **forma** se valida por respuesta entera: si no es una lista de ítems con los campos
 * esperados, se descarta completa y se trata como vacía, con reintento (AC-26).
 *
 * El **rango** se valida ítem por ítem: un valor fuera de rango deja ese campo faltante con su
 * motivo, no descarta los demás ítems y no dispara reintento (AC-27).
 *
 * Separarlos es lo que resuelve el conflicto que tenían AC-26 y AC-27: una respuesta mal
 * formada significa que el modelo no respetó el contrato, pero un número fuera de rango es un
 * dato puntual, y tirar 39 ítems buenos por uno malo no protege nada.
 */

import type { ItemPropuesto, ValorConUnidad } from '../modelo/interfaz.js'

export type CampoDescartado = {
  readonly nombreItem: string
  readonly campo: 'cantidad' | 'largo' | 'ancho' | 'alto' | 'peso'
  readonly motivo: 'valor-fuera-de-rango'
}

export type ResultadoValidacion =
  /** La forma no cumple: se descarta entera y se reintenta. */
  | { readonly tipo: 'forma-invalida'; readonly porque: string }
  | {
      readonly tipo: 'ok'
      readonly items: readonly ItemPropuesto[]
      /** Los campos que cayeron por rango, para que la interfaz los muestre y los pregunte. */
      readonly descartados: readonly CampoDescartado[]
    }

const EJES = ['largo', 'ancho', 'alto'] as const

function esObjeto(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/**
 * Una medida o un peso. La **forma**, no el rango.
 *
 * Se aceptan tres formas, y las tres son legítimas según FR-002:
 *
 *   - `{valor, unidad}` — la que pide el prompt.
 *   - `{valor}` sin unidad — **FR-002 dice que una medida sin unidad está en centímetros y un
 *     peso sin unidad en kilos**, así que la ausencia de unidad es un caso previsto, no un
 *     error de forma.
 *   - un número suelto — lo mismo, escrito más corto.
 *
 * Esto se corrigió después de medir: el esquema era **más estricto que el spec** y rechazaba
 * respuestas enteras por una medida sin unidad. Eran 32 de 56 fallas del primer eval.
 */
function formaDeValorConUnidad(v: unknown): boolean {
  if (typeof v === 'number') return true
  if (!esObjeto(v)) return false
  if (typeof v['valor'] !== 'number') return false
  return v['unidad'] === undefined || typeof v['unidad'] === 'string'
}

/** Lleva las tres formas aceptadas a `{valor, unidad}`, con la unidad vacía si no vino. */
function normalizarValor(v: unknown): Record<string, unknown> {
  if (typeof v === 'number') return { valor: v, unidad: '' }
  const objeto = v as Record<string, unknown>
  return { ...objeto, unidad: typeof objeto['unidad'] === 'string' ? objeto['unidad'] : '' }
}

/** El rango de FR-021: medidas y peso > 0. */
function rangoValido(v: unknown): boolean {
  const n = typeof v === 'number' ? v : esObjeto(v) ? v['valor'] : undefined
  return typeof n === 'number' && Number.isFinite(n) && n > 0
}

export function validarRespuesta(items: readonly unknown[]): ResultadoValidacion {
  // --- Nivel 1: la forma, por respuesta entera ---
  for (const [i, crudo] of items.entries()) {
    if (!esObjeto(crudo)) return { tipo: 'forma-invalida', porque: `el ítem ${i} no es un objeto` }
    if (typeof crudo['nombre'] !== 'string' || crudo['nombre'].trim() === '') {
      return { tipo: 'forma-invalida', porque: `el ítem ${i} no trae nombre` }
    }
    for (const campo of [...EJES, 'peso'] as const) {
      const v = crudo[campo]
      if (v !== undefined && !formaDeValorConUnidad(v)) {
        return { tipo: 'forma-invalida', porque: `${campo} del ítem ${i} no es {valor, unidad}` }
      }
    }
    const cantidad = crudo['cantidad']
    if (cantidad !== undefined && typeof cantidad !== 'number') {
      return { tipo: 'forma-invalida', porque: `la cantidad del ítem ${i} no es un número` }
    }
    const id = crudo['idCatalogo']
    if (id !== undefined && typeof id !== 'string') {
      return { tipo: 'forma-invalida', porque: `el idCatalogo del ítem ${i} no es texto` }
    }
  }

  // --- Nivel 2: el rango, ítem por ítem ---
  const limpios: ItemPropuesto[] = []
  const descartados: CampoDescartado[] = []

  for (const crudo of items as readonly Record<string, unknown>[]) {
    const nombreItem = crudo['nombre'] as string
    const item: Record<string, unknown> = { nombre: nombreItem }

    // Cantidad: entero ≥ 1. Un -5 o un 0 o un 2,5 no se toman como dato declarado, y **no se
    // corrigen por su signo ni por su valor absoluto** (FR-021, AC-27).
    const cantidad = crudo['cantidad']
    if (typeof cantidad === 'number') {
      if (Number.isInteger(cantidad) && cantidad >= 1) item['cantidad'] = cantidad
      else descartados.push({ nombreItem, campo: 'cantidad', motivo: 'valor-fuera-de-rango' })
    }

    for (const campo of EJES) {
      const v = crudo[campo]
      if (v === undefined) continue
      if (rangoValido(v)) item[campo] = normalizarValor(v) as unknown as ValorConUnidad
      else descartados.push({ nombreItem, campo, motivo: 'valor-fuera-de-rango' })
    }

    const peso = crudo['peso']
    if (peso !== undefined) {
      if (rangoValido(peso)) item['peso'] = normalizarValor(peso)
      else descartados.push({ nombreItem, campo: 'peso', motivo: 'valor-fuera-de-rango' })
    }

    if (crudo['capacidad'] !== undefined) item['capacidad'] = crudo['capacidad']
    if (crudo['idCatalogo'] !== undefined) item['idCatalogo'] = crudo['idCatalogo']

    limpios.push(item as ItemPropuesto)
  }

  return { tipo: 'ok', items: limpios, descartados }
}
