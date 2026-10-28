/**
 * El validador bloqueante (FR-010, FR-011).
 *
 * Toda disposición pasa por acá antes de mostrarse. La que no pasa **no se renderiza ni se
 * guarda**, y el rechazo viaja con el bulto y el motivo para poder decir por qué (FR-028).
 *
 * **No importa nada de `src/acomodador/` ni de `src/catalogo/`.** El contenedor y los tipos
 * llegan por argumento. Un test de arquitectura lo verifica.
 */

import type { Contenedor, Disposicion, ResultadoValidacion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { bultoSinApoyo } from './apoyo'
import { bultoFueraDeLimites } from './limites'
import { cargaMaximaExcedida, pesoEncimaExcedido } from './peso'
import { primerSolapamiento } from './solapamiento'

export function validar(
  disposicion: Disposicion,
  contenedor: Contenedor,
  tipos: readonly Item[],
): ResultadoValidacion {
  const secuencia = disposicion.secuencia

  const fuera = bultoFueraDeLimites(secuencia, tipos, contenedor)
  if (fuera !== undefined) return { valida: false, motivo: 'fuera-de-limites', bulto: fuera }

  const solapado = primerSolapamiento(secuencia, tipos)
  if (solapado !== undefined) return { valida: false, motivo: 'superposicion', bulto: solapado }

  const flotando = bultoSinApoyo(secuencia, tipos)
  if (flotando !== undefined) return { valida: false, motivo: 'apoyo-insuficiente', bulto: flotando }

  const falla = pesoEncimaExcedido(secuencia, tipos)
  if (falla !== undefined) {
    return {
      valida: false,
      motivo: falla.noApilable ? 'no-apilable-con-carga-encima' : 'peso-maximo-encima-excedido',
      bulto: falla.bulto,
    }
  }

  if (cargaMaximaExcedida(secuencia, tipos, contenedor)) {
    const ultimo = secuencia[secuencia.length - 1]
    return {
      valida: false,
      motivo: 'carga-maxima-excedida',
      bulto: ultimo?.bulto ?? { itemId: '', indice: 0 },
    }
  }

  return { valida: true }
}
