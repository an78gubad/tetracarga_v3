/**
 * El orden en que se intentan colocar los bultos.
 *
 * **Esto ya está medido y no se vuelve a investigar** (CONTEXTO.md): el orden de colocación
 * pesa más que el algoritmo. Las tres reglas, con el número que las justifica:
 *
 *   1. Los **no apilables al final**. Puestos primero tapizan el piso y nada puede apoyarse
 *      encima: llevó un escenario de tambores y cajas de 45,1% a 91,0%.
 *   2. Después, **volumen decreciente**.
 *   3. A igual volumen, **primero el que aguanta más peso encima**. Un frágil abajo le pone
 *      techo a toda la pila: llevó el escenario de frágiles de 33,5% a 70,9%.
 *
 * Los frágiles **no** van al final: cuando son el grueso de la carga quedan afuera enteros
 * —en un escenario de heladeras, de 51 colocadas a 3.
 */

import type { Item } from '../dominio/items'

function volumenDe(item: Item): number {
  const de = (c: Item['largo']) => (c.estado === 'faltante' ? 0 : (c.valor as number))
  return de(item.largo) * de(item.ancho) * de(item.alto)
}

/**
 * Cuánto peso aguanta encima. Sin tope declarado se trata como infinito: no hay techo que
 * respetar, así que va primero.
 */
function topeEncima(item: Item): number {
  const tope = item.marcas.pesoMaximoEncima
  return tope.estado === 'faltante' ? Number.POSITIVE_INFINITY : (tope.valor as number)
}

/**
 * Ordena los ítems para colocarlos.
 *
 * **No depende del orden de la lista de entrada** (FR-009): el desempate final es por id, así
 * que reordenar la lista no cambia la disposición.
 */
export function ordenarParaColocar(items: readonly Item[]): readonly Item[] {
  return [...items].sort((a, b) => {
    const apilableA = a.marcas.noApilable.valor ? 1 : 0
    const apilableB = b.marcas.noApilable.valor ? 1 : 0
    if (apilableA !== apilableB) return apilableA - apilableB

    const volumen = volumenDe(b) - volumenDe(a)
    if (volumen !== 0) return volumen

    const tope = topeEncima(b) - topeEncima(a)
    if (tope !== 0) return tope > 0 ? 1 : -1

    // Desempate estable y ajeno al orden de entrada.
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
  })
}
