import { describe, expect, it } from 'vitest'
import { colocacionDe, tipoDe } from './fixtures'
import { UMBRAL_APOYO, bultoSinApoyo, fraccionApoyada } from './apoyo'

const tipos = [
  tipoDe({ id: 'g', largo: 600, ancho: 400, alto: 300, peso: 1000 }),
  tipoDe({ id: 'm', largo: 480, ancho: 400, alto: 300, peso: 500 }),
  tipoDe({ id: 'p', largo: 300, ancho: 400, alto: 300, peso: 200 }),
]

describe('el apoyo se mide contra los bultos CARGADOS ANTES en la secuencia', () => {
  it('el umbral es del 80%', () => {
    expect(UMBRAL_APOYO).toBe(80)
  })

  it('un bulto en el piso siempre tiene apoyo', () => {
    expect(bultoSinApoyo([colocacionDe({ itemId: 'g', x: 0, y: 0, z: 0 })], tipos)).toBeUndefined()
  })

  it('apilado completo pasa', () => {
    const s = [
      colocacionDe({ itemId: 'g', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'g', indice: 1, x: 0, y: 0, z: 300 }),
    ]
    expect(bultoSinApoyo(s, tipos)).toBeUndefined()
  })

  it('un bulto flotando no pasa', () => {
    const s = [colocacionDe({ itemId: 'g', x: 0, y: 0, z: 500 })]
    expect(bultoSinApoyo(s, tipos)).toBeDefined()
  })

  it('exactamente el 80% pasa', () => {
    // 480 de 600 es el 80% justo.
    const s = [
      colocacionDe({ itemId: 'm', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'g', indice: 0, x: 0, y: 0, z: 300 }),
    ]
    expect(bultoSinApoyo(s, tipos)).toBeUndefined()
  })

  it('la mitad no pasa', () => {
    const s = [
      colocacionDe({ itemId: 'p', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'g', indice: 0, x: 0, y: 0, z: 300 }),
    ]
    expect(bultoSinApoyo(s, tipos)).toBeDefined()
  })

  it('el apoyo se suma entre varios soportes', () => {
    const s = [
      colocacionDe({ itemId: 'p', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'p', indice: 1, x: 300, y: 0, z: 0 }),
      colocacionDe({ itemId: 'g', indice: 0, x: 0, y: 0, z: 300 }),
    ]
    expect(bultoSinApoyo(s, tipos)).toBeUndefined()
  })

  it('UN BULTO POSTERIOR en la secuencia NO sostiene a uno anterior', () => {
    // Es la diferencia entre "apoyado sobre algo" y "apoyado sobre algo que ya estaba": sin
    // esto, un prefijo del recorrido mostraría bultos flotando (AC-24).
    const s = [
      colocacionDe({ itemId: 'g', indice: 0, x: 0, y: 0, z: 300 }), // primero, elevado
      colocacionDe({ itemId: 'g', indice: 1, x: 0, y: 0, z: 0 }), // después, abajo
    ]
    expect(bultoSinApoyo(s, tipos)).toBeDefined()
  })

  it('la fracción apoyada se informa, para poder decir cuánto faltó', () => {
    const s = [
      colocacionDe({ itemId: 'p', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'g', indice: 0, x: 0, y: 0, z: 300 }),
    ]
    expect(fraccionApoyada(1, s, tipos)).toBe(50)
  })
})

describe('TODO prefijo de la secuencia tiene apoyo (AC-24)', () => {
  it('una pila construida de abajo hacia arriba pasa en todos sus prefijos', () => {
    const s = [0, 300, 600].map((z, i) => colocacionDe({ itemId: 'g', indice: i, x: 0, y: 0, z }))
    for (let k = 1; k <= s.length; k++) {
      expect(bultoSinApoyo(s.slice(0, k), tipos), `prefijo de ${k}`).toBeUndefined()
    }
  })

  it('una pila construida de arriba hacia abajo falla en el primer prefijo', () => {
    const s = [600, 300, 0].map((z, i) => colocacionDe({ itemId: 'g', indice: i, x: 0, y: 0, z }))
    expect(bultoSinApoyo(s, tipos)).toBeDefined()
  })
})
