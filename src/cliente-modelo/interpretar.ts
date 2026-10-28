/**
 * Llama a `/api/interpretar`. **No conoce al proveedor**: ni su nombre, ni su URL, ni su forma
 * de error. Es lo único que `src/` sabe sobre cómo se interpreta una descripción (FR-015).
 */

import type { ItemCrudo, CampoDescartado } from '../interpretacion/completar'

export type ResultadoPedido =
  | { readonly tipo: 'items'; readonly items: readonly ItemCrudo[]; readonly descartados: readonly CampoDescartado[] }
  /** El modelo no reconoció ninguna carga en el texto. */
  | { readonly tipo: 'sin-items' }
  /** La falla es del proveedor, no de la descripción: se puede reintentar (FR-026). */
  | { readonly tipo: 'falla-del-proveedor'; readonly mensaje: string }
  /** El pedido se rechazó antes de llegar al proveedor: largo o límite por IP. */
  | { readonly tipo: 'rechazado'; readonly mensaje: string }

type CuerpoRespuesta = {
  readonly items?: readonly ItemCrudo[]
  readonly descartados?: readonly CampoDescartado[]
  readonly codigo?: string
  readonly mensaje?: string
}

export async function interpretarDescripcion(
  descripcion: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ResultadoPedido> {
  let respuesta: Response
  try {
    respuesta = await fetchImpl('/api/interpretar', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ descripcion }),
    })
  } catch {
    return {
      tipo: 'falla-del-proveedor',
      mensaje: 'No se pudo llegar al servidor. Revisá la conexión y reintentá.',
    }
  }

  let cuerpo: CuerpoRespuesta
  try {
    cuerpo = (await respuesta.json()) as CuerpoRespuesta
  } catch {
    return { tipo: 'falla-del-proveedor', mensaje: 'El servidor respondió algo que no se pudo leer.' }
  }

  if (respuesta.ok) {
    if (cuerpo.codigo === 'sin-items') return { tipo: 'sin-items' }
    return {
      tipo: 'items',
      items: cuerpo.items ?? [],
      descartados: cuerpo.descartados ?? [],
    }
  }

  const mensaje = cuerpo.mensaje ?? 'No se pudo interpretar la descripción.'
  // 413 y 429 son rechazos del intermediario: el texto es largo o hubo demasiados pedidos.
  // No son fallas del proveedor, y la diferencia importa porque la acción del usuario cambia.
  if (respuesta.status === 413 || respuesta.status === 429 || respuesta.status === 400) {
    return { tipo: 'rechazado', mensaje }
  }
  return { tipo: 'falla-del-proveedor', mensaje }
}
