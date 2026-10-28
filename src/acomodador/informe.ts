/**
 * El informe de consolidación (FR-012, research.md §8).
 *
 * Las dos fórmulas estaban sin definir en el spec y fue uno de los huecos que encontraron los
 * checklists. Un porcentaje sin numerador declarado no es verificable.
 *
 *   volumen = Σ (caja envolvente de cada bulto **colocado**) ÷ volumen interior
 *   peso    = Σ (peso de cada bulto **colocado**) ÷ **carga útil**
 *
 * Los bultos que quedaron afuera no entran en ningún numerador: si entraran, una carga
 * sobrecargada daría más del 100%, que no significa nada.
 */

import type { Contenedor, Disposicion, InformeConsolidacion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { medidasEn } from './orientacion'

export function informeDe(
  disposicion: Disposicion,
  items: readonly Item[],
  contenedor: Contenedor,
): InformeConsolidacion {
  const porId = new Map(items.map((i) => [i.id, i]))

  let volumenColocado = 0
  let pesoColocado = 0

  for (const colocacion of disposicion.secuencia) {
    const item = porId.get(colocacion.bulto.itemId)
    if (item === undefined) continue

    // Caja envolvente: un cilindro ocupa su caja, no su cilindro. Es el supuesto del spec.
    const { dx, dy, dz } = medidasEn(item, colocacion.orientacion)
    volumenColocado += dx * dy * dz

    if (item.pesoUnitario.estado !== 'faltante') pesoColocado += item.pesoUnitario.valor as number
  }

  const volumenInterior =
    (contenedor.largoInterior as number) *
    (contenedor.anchoInterior as number) *
    (contenedor.altoInterior as number)

  return {
    aprovechamientoVolumen: volumenInterior === 0 ? 0 : (volumenColocado / volumenInterior) * 100,
    aprovechamientoPeso:
      (contenedor.cargaUtil as number) === 0
        ? 0
        : (pesoColocado / (contenedor.cargaUtil as number)) * 100,
    colocados: disposicion.secuencia.length,
    afuera: disposicion.afuera,
  }
}
