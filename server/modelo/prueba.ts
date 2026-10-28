/**
 * La implementación de prueba de `Modelo`. **No toca la red.**
 *
 * Es contra esta que corre la suite completa, así que `npm test` pasa en un repositorio recién
 * clonado, sin `.env` y sin conexión (FR-020, AC-16). Si un test necesita red, está mal escrito.
 */

import type {
  ItemPropuesto,
  Modelo,
  PedidoInterpretacion,
  ResultadoInterpretacion,
} from './interfaz.js'

export type Guion = readonly ResultadoInterpretacion[]

export type ModeloDePrueba = Modelo & {
  /** Los pedidos que recibió, en orden. Sirve para contar llamadas (SC-014, AC-25, AC-29). */
  readonly pedidos: readonly PedidoInterpretacion[]
  readonly llamadas: () => number
}

/**
 * Devuelve el guion, un resultado por llamada. Agotado el guion, repite el último.
 *
 * Repetir el último es lo que permite escribir "el proveedor falla siempre" con un solo
 * elemento, en vez de tener que contar cuántos intentos va a hacer quien llama.
 */
export function crearModeloDePrueba(guion: Guion): ModeloDePrueba {
  if (guion.length === 0) throw new Error('El guion del modelo de prueba no puede estar vacío')
  const pedidos: PedidoInterpretacion[] = []

  return {
    pedidos,
    llamadas: () => pedidos.length,
    interpretar(pedido: PedidoInterpretacion): Promise<ResultadoInterpretacion> {
      pedidos.push(pedido)
      const i = Math.min(pedidos.length - 1, guion.length - 1)
      return Promise.resolve(guion[i]!)
    },
  }
}

/** Atajos para los guiones más usados. */
export const respuestas = {
  items: (...items: readonly ItemPropuesto[]): ResultadoInterpretacion => ({
    tipo: 'items',
    items,
  }),
  vacia: (): ResultadoInterpretacion => ({ tipo: 'vacia' }),
  fallaTransitoria: (codigo = '429'): ResultadoInterpretacion => ({
    tipo: 'falla',
    falla: { transitoria: true, codigo },
  }),
  fallaDefinitiva: (codigo = '401'): ResultadoInterpretacion => ({
    tipo: 'falla',
    falla: { transitoria: false, codigo },
  }),
}
