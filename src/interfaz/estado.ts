/**
 * El estado de la pantalla y sus transiciones, **separado de React** para que se pueda probar
 * sin montar un navegador.
 */

import type { Item } from '../dominio/items'
import { completarItems, type CampoDescartado, type ItemCrudo } from '../interpretacion/completar'
import type { Catalogo } from '../catalogo/catalogo'
import type { ResultadoPedido } from '../cliente-modelo/interpretar'

export type EstadoInterpretacion =
  | { readonly fase: 'quieto' }
  /** Mientras interpreta se muestra que está trabajando; no hace falta cancelar (FR-026). */
  | { readonly fase: 'interpretando' }
  | { readonly fase: 'falla-del-proveedor'; readonly mensaje: string }
  | { readonly fase: 'rechazado'; readonly mensaje: string }
  | { readonly fase: 'sin-items' }

export type Estado = {
  readonly descripcion: string
  readonly items: readonly Item[]
  readonly interpretacion: EstadoInterpretacion
}

export const ESTADO_INICIAL: Estado = {
  descripcion: '',
  items: [],
  interpretacion: { fase: 'quieto' },
}

/**
 * Aplica el resultado de un pedido.
 *
 * Ante una falla **se conserva la descripción tipeada intacta y la lista ya cargada no se
 * toca** (FR-026). Y los ítems nuevos se **agregan al final**: lo que ya estaba conserva sus
 * valores, sus marcas y su color (FR-025).
 */
export function aplicarResultado(
  estado: Estado,
  resultado: ResultadoPedido,
  catalogo: Catalogo,
): Estado {
  switch (resultado.tipo) {
    case 'falla-del-proveedor':
      return { ...estado, interpretacion: { fase: 'falla-del-proveedor', mensaje: resultado.mensaje } }
    case 'rechazado':
      return { ...estado, interpretacion: { fase: 'rechazado', mensaje: resultado.mensaje } }
    case 'sin-items':
      return { ...estado, interpretacion: { fase: 'sin-items' } }
    case 'items': {
      const nuevos = completarItems(resultado.items as readonly ItemCrudo[], {
        catalogo,
        descartados: resultado.descartados as readonly CampoDescartado[],
        // Los nuevos siguen la numeración: no se corren los colores de los que ya estaban.
        desdeIndice: estado.items.length,
      })
      return {
        ...estado,
        // Al final, sin reemplazar la lista, sin fusionar por parecido de nombre y sin
        // reinterpretar lo ya cargado (FR-025).
        items: [...estado.items, ...nuevos],
        interpretacion: { fase: 'quieto' },
      }
    }
  }
}

export function eliminarItem(estado: Estado, itemId: string): Estado {
  // Los colores de los demás NO se corren: cada uno está atado a su ítem (AC-09).
  return { ...estado, items: estado.items.filter((i) => i.id !== itemId) }
}
