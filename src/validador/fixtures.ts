/**
 * Fixtures **propios** del validador.
 *
 * No se importan los del acomodador, y no es por prolijidad: el Principio II dice que estas dos
 * carpetas no comparten valores. Si compartieran los fixtures, los dos módulos estarían
 * mirando los mismos casos con los mismos números, que es la mitad de lo que se quiere evitar.
 */

import type { Bulto, Colocacion, Contenedor, Disposicion, Orientacion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import type { Gramos, Milimetros } from '../dominio/unidades'

export const NATURAL: Orientacion = { ejeX: 'largo', ejeY: 'ancho', ejeZ: 'alto' }

export function contenedorDe(
  largo: number,
  ancho: number,
  alto: number,
  cargaUtil: number,
): Contenedor {
  return {
    id: 'v',
    largoInterior: largo as Milimetros,
    anchoInterior: ancho as Milimetros,
    altoInterior: alto as Milimetros,
    cargaUtil: cargaUtil as Gramos,
  }
}

export type EspecBulto = {
  readonly itemId: string
  readonly indice?: number
  readonly x: number
  readonly y: number
  readonly z: number
  readonly orientacion?: Orientacion
}

export function colocacionDe(e: EspecBulto): Colocacion {
  const bulto: Bulto = { itemId: e.itemId, indice: e.indice ?? 0 }
  return {
    bulto,
    x: e.x as Milimetros,
    y: e.y as Milimetros,
    z: e.z as Milimetros,
    orientacion: e.orientacion ?? NATURAL,
  }
}

export function disposicionDe(colocaciones: readonly Colocacion[]): Disposicion {
  return { contenedorId: 'v', secuencia: colocaciones, afuera: [] }
}

export type EspecTipo = {
  readonly id: string
  readonly largo: number
  readonly ancho: number
  readonly alto: number
  readonly peso: number
  readonly noApilable?: boolean
  readonly orientacionObligatoria?: boolean
  readonly pesoMaximoEncima?: number
}

export function tipoDe(e: EspecTipo): Item {
  return {
    id: e.id,
    nombre: e.id,
    cantidad: { estado: 'declarado', valor: 99 },
    largo: { estado: 'declarado', valor: e.largo as Milimetros },
    ancho: { estado: 'declarado', valor: e.ancho as Milimetros },
    alto: { estado: 'declarado', valor: e.alto as Milimetros },
    pesoUnitario: { estado: 'declarado', valor: e.peso as Gramos },
    marcas: {
      noApilable: { estado: 'declarado', valor: e.noApilable ?? false },
      orientacionObligatoria: { estado: 'declarado', valor: e.orientacionObligatoria ?? false },
      pesoMaximoEncima:
        e.pesoMaximoEncima === undefined
          ? { estado: 'faltante', motivo: 'entrada-sin-el-dato' }
          : { estado: 'declarado', valor: e.pesoMaximoEncima as Gramos },
    },
    color: 0,
  }
}
