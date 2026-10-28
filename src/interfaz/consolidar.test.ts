import { describe, expect, it } from 'vitest'
import { itemEnBlanco } from '../interpretacion/editar'
import { editarCampo } from '../interpretacion/editar'
import {
  BULTOS_QUE_PIDEN_CONFIRMACION,
  cantidadDeBultos,
  consolidar,
} from './consolidar'

function itemCon(id: string, cantidad: number, medida = 300): ReturnType<typeof itemEnBlanco> {
  let item = itemEnBlanco(id, 0)
  item = editarCampo(item, 'cantidad', cantidad)
  item = editarCampo(item, 'largo', medida)
  item = editarCampo(item, 'ancho', medida)
  item = editarCampo(item, 'alto', medida)
  item = editarCampo(item, 'pesoUnitario', 5_000)
  return { ...item, id, marcas: { ...item.marcas, pesoMaximoEncima: { estado: 'declarado', valor: 100_000 as never } } }
}

describe('los estados sin disposición (FR-028)', () => {
  it('la lista vacía', () => {
    expect(consolidar([], '40hc').fase).toBe('sin-items')
  })

  it('sin contenedor elegido', () => {
    expect(consolidar([itemCon('a', 10)], null).fase).toBe('sin-contenedor')
  })

  it('un contenedor que no está en el catálogo', () => {
    expect(consolidar([itemCon('a', 10)], '45hc').fase).toBe('sin-contenedor')
  })

  it('con datos faltantes queda bloqueada, y dice cuántos faltan', () => {
    const r = consolidar([itemEnBlanco('incompleto', 0)], '40hc')
    expect(r.fase).toBe('bloqueada')
    if (r.fase === 'bloqueada') expect(r.faltantes).toBeGreaterThan(0)
  })
})

describe('el camino que sale bien', () => {
  const r = consolidar([itemCon('cajas', 20)], '20')

  it('devuelve el informe, la disposición y el contenedor', () => {
    expect(r.fase).toBe('lista')
    if (r.fase !== 'lista') return
    expect(r.informe.colocados).toBeGreaterThan(0)
    expect(r.disposicion.secuencia.length).toBe(r.informe.colocados)
    expect(r.contenedor.id).toBe('20')
  })

  it('la disposición que devuelve YA pasó el validador', () => {
    // Si el validador la hubiera rechazado, la fase sería 'rechazada' y no habría disposición
    // que mostrar (FR-011).
    expect(r.fase).not.toBe('rechazada')
  })
})

describe('FR-031 — la cantidad que pide confirmación', () => {
  it('el umbral es 5.000 bultos', () => {
    expect(BULTOS_QUE_PIDEN_CONFIRMACION).toBe(5_000)
  })

  it('cuenta los bultos y no los ítems', () => {
    expect(cantidadDeBultos([itemCon('a', 40), itemCon('b', 15)])).toBe(55)
  })

  it('un ítem con la cantidad faltante no suma', () => {
    expect(cantidadDeBultos([itemEnBlanco('sin-cantidad', 0)])).toBe(0)
  })
})
