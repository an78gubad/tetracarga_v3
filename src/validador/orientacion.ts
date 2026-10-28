/**
 * La orientación obligatoria (FR-008, AC-05), verificada por el validador.
 *
 * Es la tercera marca de FR-008, y era la que faltaba: FR-010 dice "respetando las marcas de
 * FR-008" —las tres—, pero el validador solo verificaba no apilable y el tope de peso. El
 * motivo existía en el tipo y nada lo producía. Lo encontró `marcas.test.ts`.
 *
 * Qué se verifica: que el **alto declarado del ítem quede sobre el eje z**. Es lo único que
 * mide AC-05 ("su altura declarada coincide con su altura final"); la rotación en el plano
 * horizontal sigue permitida.
 */

import type { Bulto, Colocacion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'

export function bultoConOrientacionViolada(
  secuencia: readonly Colocacion[],
  tipos: readonly Item[],
): Bulto | undefined {
  for (const colocacion of secuencia) {
    const tipo = tipos.find((t) => t.id === colocacion.bulto.itemId)
    if (tipo === undefined) return colocacion.bulto
    if (!tipo.marcas.orientacionObligatoria.valor) continue
    if (colocacion.orientacion.ejeZ !== 'alto') return colocacion.bulto
  }
  return undefined
}
