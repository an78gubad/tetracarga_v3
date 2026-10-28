/**
 * Qué falta y por qué, y el bloqueo de la consolidación (FR-004).
 *
 * Quedar bloqueado es el comportamiento correcto, no una falla.
 */

import type { Campo, Item, MotivoFaltante } from '../dominio/items'

export type CampoFaltante = {
  readonly itemId: string
  readonly nombreItem: string
  readonly campo: 'cantidad' | 'largo' | 'ancho' | 'alto' | 'pesoUnitario' | 'pesoMaximoEncima'
  readonly motivo: MotivoFaltante
}

/** Qué se le dice al usuario en cada caso. Los tres motivos de FR-004 dicen cosas distintas. */
export const EXPLICACION: Readonly<Record<MotivoFaltante, string>> = {
  'sin-entrada-en-catalogo': 'No está en el catálogo: hace falta que lo completes.',
  'entrada-sin-el-dato': 'El catálogo lo conoce pero no trae este dato.',
  'valor-fuera-de-rango': 'El valor que vino no es válido: la cantidad es entera ≥ 1, y las medidas y el peso mayores que 0.',
}

const CAMPOS = ['cantidad', 'largo', 'ancho', 'alto', 'pesoUnitario'] as const

export function camposFaltantes(items: readonly Item[]): readonly CampoFaltante[] {
  const faltantes: CampoFaltante[] = []

  for (const item of items) {
    for (const campo of CAMPOS) {
      const valor: Campo<unknown> = item[campo]
      if (valor.estado === 'faltante') {
        faltantes.push({ itemId: item.id, nombreItem: item.nombre, campo, motivo: valor.motivo })
      }
    }
    const tope = item.marcas.pesoMaximoEncima
    if (tope.estado === 'faltante') {
      faltantes.push({
        itemId: item.id,
        nombreItem: item.nombre,
        campo: 'pesoMaximoEncima',
        motivo: tope.motivo,
      })
    }
  }

  return faltantes
}

/**
 * Si hay algún campo faltante, la consolidación está bloqueada.
 *
 * El bloqueo es **de la lista entera**, no del ítem: no se consolida una carga incompleta
 * dejando un ítem afuera, porque el informe diría que entra algo que todavía no se sabe
 * cuánto mide.
 *
 * `pesoMaximoEncima` **no** bloquea: nunca viene del catálogo, así que si bloqueara, ninguna
 * carga se podría consolidar sin que el usuario declare el tope de cada ítem. Lo que hace es
 * dejar al bulto sin límite de peso encima hasta que alguien lo declare.
 */
export function consolidacionBloqueada(items: readonly Item[]): boolean {
  if (items.length === 0) return true
  return camposFaltantes(items).some((f) => f.campo !== 'pesoMaximoEncima')
}
