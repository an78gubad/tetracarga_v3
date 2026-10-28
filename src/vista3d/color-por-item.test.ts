import { describe, expect, it } from 'vitest'
import type { Item, IndiceColor } from '../dominio/items'
import { colorDe, coloresDe } from './color-por-item'
import { PALETA } from './paleta'

function item(id: string, color: number): Item {
  return {
    id,
    nombre: id,
    cantidad: { estado: 'declarado', valor: 1 },
    largo: { estado: 'declarado', valor: 100 as never },
    ancho: { estado: 'declarado', valor: 100 as never },
    alto: { estado: 'declarado', valor: 100 as never },
    pesoUnitario: { estado: 'declarado', valor: 1000 as never },
    marcas: {
      noApilable: { estado: 'declarado', valor: false },
      orientacionObligatoria: { estado: 'declarado', valor: false },
      pesoMaximoEncima: { estado: 'faltante', motivo: 'entrada-sin-el-dato' },
    },
    color: (color % 12) as IndiceColor,
  }
}

describe('AC-09 — el color va atado al ítem, no a su posición', () => {
  it('cada ítem toma el color de su índice', () => {
    expect(colorDe(item('a', 0))).toBe(PALETA[0])
    expect(colorDe(item('b', 5))).toBe(PALETA[5])
  })

  it('ELIMINAR un ítem no corre los colores de los demás', () => {
    const lista = [item('a', 0), item('b', 1), item('c', 2)]
    const antes = coloresDe(lista)
    const despues = coloresDe(lista.filter((i) => i.id !== 'b'))

    // Si el color saliera de la posición, "c" pasaría del tercero al segundo color.
    expect(despues.porItemId.get('a')).toBe(antes.porItemId.get('a'))
    expect(despues.porItemId.get('c')).toBe(antes.porItemId.get('c'))
  })

  it('consolidar dos veces conserva el color de cada tipo', () => {
    const lista = [item('a', 0), item('b', 1)]
    expect(coloresDe(lista)).toEqual(coloresDe(lista))
  })

  it('dos ítems de una carga de dos tipos tienen colores distintos', () => {
    const colores = coloresDe([item('a', 0), item('b', 1)])
    expect(new Set(colores.porItemId.values()).size).toBe(2)
    expect(colores.hayReciclados).toBe(false)
  })
})

describe('el aviso de colores reciclados (FR-013)', () => {
  it('con 12 tipos distintos no avisa', () => {
    const lista = [...Array(12).keys()].map((i) => item(`i${i}`, i))
    expect(coloresDe(lista).hayReciclados).toBe(false)
  })

  it('con 13 tipos avisa, porque dos comparten color', () => {
    const lista = [...Array(13).keys()].map((i) => item(`i${i}`, i))
    const colores = coloresDe(lista)
    expect(colores.hayReciclados).toBe(true)
    // El 13.° vuelve al primer color.
    expect(colores.porItemId.get('i12')).toBe(colores.porItemId.get('i0'))
  })
})
