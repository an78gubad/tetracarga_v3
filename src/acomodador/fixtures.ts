/** Ítems armados a mano para los tests del acomodador, con todos los campos declarados. */

import type { Item } from '../dominio/items'
import type { Contenedor } from '../dominio/disposicion'
import type { Gramos, Milimetros } from '../dominio/unidades'

export type EspecItem = {
  readonly id: string
  readonly cantidad: number
  readonly largo: number
  readonly ancho: number
  readonly alto: number
  readonly peso: number
  readonly noApilable?: boolean
  readonly orientacionObligatoria?: boolean
  readonly pesoMaximoEncima?: number
}

export function itemDe(e: EspecItem): Item {
  return {
    id: e.id,
    nombre: e.id,
    cantidad: { estado: 'declarado', valor: e.cantidad },
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

/** Un contenedor chico, para que los tests se lean: 2 × 1 × 1 metro, 1 tonelada. */
export const CONTENEDOR_CHICO: Contenedor = {
  id: 'prueba',
  largoInterior: 2000 as Milimetros,
  anchoInterior: 1000 as Milimetros,
  altoInterior: 1000 as Milimetros,
  cargaUtil: 1_000_000 as Gramos,
}

/** El 40' high cube real, para los escenarios grandes. */
export const CONTENEDOR_40HC: Contenedor = {
  id: '40hc',
  largoInterior: 12032 as Milimetros,
  anchoInterior: 2352 as Milimetros,
  altoInterior: 2698 as Milimetros,
  cargaUtil: 28_690_000 as Gramos,
}
