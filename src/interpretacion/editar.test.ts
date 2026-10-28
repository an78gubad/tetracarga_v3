import { describe, expect, it } from 'vitest'
import type { Gramos, Milimetros } from '../dominio/unidades'
import type { Item } from '../dominio/items'
import {
  borrarCampo,
  declararPesoMaximoEncima,
  editarCampo,
  itemEnBlanco,
  marcarItem,
} from './editar'

function estimado(): Item {
  return {
    id: 'i1',
    nombre: 'tambores',
    cantidad: { estado: 'declarado', valor: 15 },
    largo: { estado: 'estimado', valor: 585 as Milimetros, entradaCatalogo: 'tambor-215l' },
    ancho: { estado: 'estimado', valor: 585 as Milimetros, entradaCatalogo: 'tambor-215l' },
    alto: { estado: 'estimado', valor: 877 as Milimetros, entradaCatalogo: 'tambor-215l' },
    pesoUnitario: { estado: 'faltante', motivo: 'entrada-sin-el-dato' },
    marcas: {
      noApilable: { estado: 'del-catalogo', valor: true },
      orientacionObligatoria: { estado: 'declarado', valor: false },
      pesoMaximoEncima: { estado: 'faltante', motivo: 'entrada-sin-el-dato' },
    },
    color: 3,
  }
}

describe('AC-12 — editar un campo estimado lo convierte en declarado', () => {
  it('pierde la marca de estimado', () => {
    const editado = editarCampo(estimado(), 'largo', 600)
    expect(editado.largo).toEqual({ estado: 'declarado', valor: 600 })
  })

  it('pierde la entrada de catálogo de la que venía', () => {
    const editado = editarCampo(estimado(), 'largo', 600)
    expect(editado.largo).not.toHaveProperty('entradaCatalogo')
  })

  it('no toca los otros campos', () => {
    const original = estimado()
    const editado = editarCampo(original, 'largo', 600)
    expect(editado.alto).toEqual(original.alto)
    expect(editado.cantidad).toEqual(original.cantidad)
  })

  it('conserva el color: editar no es eliminar (AC-09)', () => {
    expect(editarCampo(estimado(), 'largo', 600).color).toBe(3)
  })
})

describe('un valor fuera de rango no se escribe (FR-021)', () => {
  it.each([0, -600, Number.NaN])('un largo de %s deja el campo faltante', (valor) => {
    const editado = editarCampo(estimado(), 'largo', valor)
    expect(editado.largo).toEqual({ estado: 'faltante', motivo: 'valor-fuera-de-rango' })
  })

  it('NO se salva por su valor absoluto', () => {
    const editado = editarCampo(estimado(), 'largo', -600)
    expect(editado.largo).not.toHaveProperty('valor')
  })

  it.each([0, -5, 2.5])('una cantidad de %s deja el campo faltante', (valor) => {
    expect(editarCampo(estimado(), 'cantidad', valor).cantidad.estado).toBe('faltante')
  })

  it('una cantidad entera ≥ 1 sí se escribe', () => {
    expect(editarCampo(estimado(), 'cantidad', 40).cantidad).toEqual({ estado: 'declarado', valor: 40 })
  })
})

describe('borrar un campo lo deja faltante, no en cero', () => {
  it('queda faltante', () => {
    const borrado = borrarCampo(estimado(), 'largo')
    expect(borrado.largo.estado).toBe('faltante')
    expect(borrado.largo).not.toHaveProperty('valor')
  })
})

describe('las marcas de FR-008', () => {
  it('una marca del catálogo pasa a declarada cuando el usuario la toca', () => {
    const item = estimado()
    expect(item.marcas.noApilable.estado).toBe('del-catalogo')
    const tocada = marcarItem(item, 'noApilable', false)
    expect(tocada.marcas.noApilable).toEqual({ estado: 'declarado', valor: false })
  })

  it('el peso máximo encima lo declara el usuario', () => {
    const item = declararPesoMaximoEncima(estimado(), 50_000)
    expect(item.marcas.pesoMaximoEncima).toEqual({ estado: 'declarado', valor: 50_000 as Gramos })
  })

  it('se puede volver a dejarlo sin declarar', () => {
    const item = declararPesoMaximoEncima(declararPesoMaximoEncima(estimado(), 50_000), null)
    expect(item.marcas.pesoMaximoEncima.estado).toBe('faltante')
  })

  it('un tope de 0 o negativo no se acepta', () => {
    for (const valor of [0, -1]) {
      const item = declararPesoMaximoEncima(estimado(), valor)
      expect(item.marcas.pesoMaximoEncima).toEqual({ estado: 'faltante', motivo: 'valor-fuera-de-rango' })
    }
  })
})

describe('un ítem agregado a mano', () => {
  const nuevo = itemEnBlanco('cajones', 7)

  it('arranca con todos los campos faltantes, NUNCA estimados', () => {
    for (const campo of ['cantidad', 'largo', 'ancho', 'alto', 'pesoUnitario'] as const) {
      expect(nuevo[campo].estado).toBe('faltante')
    }
  })

  it('el estado estimado solo lo produce el catálogo', () => {
    expect(JSON.stringify(nuevo)).not.toContain('estimado')
  })

  it('toma el color de su posición de entrada', () => {
    expect(nuevo.color).toBe(7)
    expect(itemEnBlanco('x', 13).color).toBe(1)
  })
})
