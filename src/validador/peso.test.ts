import { describe, expect, it } from 'vitest'
import { colocacionDe, contenedorDe, tipoDe } from './fixtures'
import { cargaMaximaExcedida, pesoEncimaExcedido, pesoRecibidoPorBulto } from './peso'

describe('la carga máxima total (AC-15)', () => {
  const tipos = [tipoDe({ id: 'p', largo: 500, ancho: 500, alto: 500, peso: 100_000 })]
  const contenedor = contenedorDe(5000, 2000, 2000, 1_000_000)

  it('diez bultos de 100 kg llegan justo a la tonelada y pasan', () => {
    const s = [...Array(10).keys()].map((i) => colocacionDe({ itemId: 'p', indice: i, x: i * 500, y: 0, z: 0 }))
    expect(cargaMaximaExcedida(s, tipos, contenedor)).toBe(false)
  })

  it('once no pasan', () => {
    const s = [...Array(11).keys()].map((i) => colocacionDe({ itemId: 'p', indice: i, x: i * 400, y: 0, z: 0 }))
    expect(cargaMaximaExcedida(s, tipos, contenedor)).toBe(true)
  })
})

describe('el peso que baja por la pila (FR-027, AC-06)', () => {
  const tipos = [
    tipoDe({ id: 'base', largo: 600, ancho: 400, alto: 300, peso: 10_000, pesoMaximoEncima: 50_000 }),
    tipoDe({ id: 'encima', largo: 600, ancho: 400, alto: 300, peso: 20_000 }),
  ]

  it('un bulto en el piso no recibe nada', () => {
    const s = [colocacionDe({ itemId: 'base', x: 0, y: 0, z: 0 })]
    expect(pesoRecibidoPorBulto(s, tipos).get(0)).toBeUndefined()
  })

  it('el de abajo recibe el peso del de arriba', () => {
    const s = [
      colocacionDe({ itemId: 'base', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'encima', x: 0, y: 0, z: 300 }),
    ]
    expect(pesoRecibidoPorBulto(s, tipos).get(0)).toBe(20_000)
  })

  it('se ACUMULA por toda la pila, no solo el de arriba inmediato', () => {
    const s = [
      colocacionDe({ itemId: 'base', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'encima', indice: 0, x: 0, y: 0, z: 300 }),
      colocacionDe({ itemId: 'encima', indice: 1, x: 0, y: 0, z: 600 }),
    ]
    // El de abajo recibe los dos de arriba: 40 kg.
    expect(pesoRecibidoPorBulto(s, tipos).get(0)).toBe(40_000)
  })

  it('se reparte entre dos apoyos en proporción al área', () => {
    const t = [
      tipoDe({ id: 'mitad', largo: 300, ancho: 400, alto: 300, peso: 1_000 }),
      tipoDe({ id: 'ancho', largo: 600, ancho: 400, alto: 300, peso: 30_000 }),
    ]
    const s = [
      colocacionDe({ itemId: 'mitad', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'mitad', indice: 1, x: 300, y: 0, z: 0 }),
      colocacionDe({ itemId: 'ancho', indice: 0, x: 0, y: 0, z: 300 }),
    ]
    const recibido = pesoRecibidoPorBulto(s, t)
    expect(recibido.get(0)).toBe(15_000)
    expect(recibido.get(1)).toBe(15_000)
  })

  it('AC-06 — sobre un ítem que admite 50 kg no se apoyan más de 50 kg', () => {
    const s = [
      colocacionDe({ itemId: 'base', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'encima', indice: 0, x: 0, y: 0, z: 300 }),
      colocacionDe({ itemId: 'encima', indice: 1, x: 0, y: 0, z: 600 }),
    ]
    // 40 kg encima de un tope de 50: pasa.
    expect(pesoEncimaExcedido(s, tipos)).toBeUndefined()

    const tresEncima = [...s, colocacionDe({ itemId: 'encima', indice: 2, x: 0, y: 0, z: 900 })]
    // 60 kg encima de un tope de 50: no pasa.
    expect(pesoEncimaExcedido(tresEncima, tipos)).toBeDefined()
  })

  it('un ítem sin tope declarado no se excede nunca', () => {
    const t = [tipoDe({ id: 'sinTope', largo: 600, ancho: 400, alto: 300, peso: 500_000 })]
    const s = [0, 300, 600, 900].map((z, i) => colocacionDe({ itemId: 'sinTope', indice: i, x: 0, y: 0, z }))
    expect(pesoEncimaExcedido(s, t)).toBeUndefined()
  })

  it('el reparto redondea hacia arriba: nunca subestima lo que recibe un apoyo', () => {
    const t = [
      tipoDe({ id: 'chico', largo: 1, ancho: 1, alto: 300, peso: 0, pesoMaximoEncima: 333 }),
      tipoDe({ id: 'tres', largo: 3, ancho: 1, alto: 300, peso: 1_000 }),
    ]
    const s = [
      colocacionDe({ itemId: 'chico', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'chico', indice: 1, x: 1, y: 0, z: 0 }),
      colocacionDe({ itemId: 'chico', indice: 2, x: 2, y: 0, z: 0 }),
      colocacionDe({ itemId: 'tres', indice: 0, x: 0, y: 0, z: 300 }),
    ]
    // 1.000 g entre tres áreas de 1: 334 a cada uno, no 333. Con un tope de 333, se excede.
    expect(pesoRecibidoPorBulto(s, t).get(0)).toBe(334)
    expect(pesoEncimaExcedido(s, t)).toBeDefined()
  })
})

describe('AC-04 — nada se apoya sobre un no apilable', () => {
  const tipos = [
    tipoDe({ id: 'tambor', largo: 585, ancho: 585, alto: 877, peso: 200_000, noApilable: true }),
    tipoDe({ id: 'caja', largo: 585, ancho: 585, alto: 300, peso: 10_000 }),
  ]

  it('una caja sobre un tambor no apilable no pasa', () => {
    const s = [
      colocacionDe({ itemId: 'tambor', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'caja', x: 0, y: 0, z: 877 }),
    ]
    expect(pesoEncimaExcedido(s, tipos)).toBeDefined()
  })

  it('el tambor solo, sin nada encima, pasa', () => {
    expect(pesoEncimaExcedido([colocacionDe({ itemId: 'tambor', x: 0, y: 0, z: 0 })], tipos)).toBeUndefined()
  })
})
