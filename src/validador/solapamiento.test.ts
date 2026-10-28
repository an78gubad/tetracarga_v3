import { describe, expect, it } from 'vitest'
import { haySolapamiento, primerSolapamiento } from './solapamiento'
import { colocacionDe, tipoDe } from './fixtures'

const tipos = [tipoDe({ id: 'c', largo: 600, ancho: 400, alto: 300, peso: 1000 })]

describe('qué cuenta como superposición (research.md §5)', () => {
  it('dos bultos en el mismo lugar se superponen', () => {
    const a = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const b = colocacionDe({ itemId: 'c', indice: 1, x: 0, y: 0, z: 0 })
    expect(haySolapamiento([a, b], tipos)).toBe(true)
  })

  it('solaparse en los tres ejes aunque sea 1 mm cuenta', () => {
    const a = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const b = colocacionDe({ itemId: 'c', indice: 1, x: 599, y: 0, z: 0 })
    expect(haySolapamiento([a, b], tipos)).toBe(true)
  })

  it('COMPARTIR UNA CARA no es superposición: apilar lo exige', () => {
    const a = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const pegado = colocacionDe({ itemId: 'c', indice: 1, x: 600, y: 0, z: 0 })
    expect(haySolapamiento([a, pegado], tipos)).toBe(false)
  })

  it('apilado exacto no es superposición', () => {
    const abajo = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const arriba = colocacionDe({ itemId: 'c', indice: 1, x: 0, y: 0, z: 300 })
    expect(haySolapamiento([abajo, arriba], tipos)).toBe(false)
  })

  it('compartir una arista tampoco', () => {
    const a = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const b = colocacionDe({ itemId: 'c', indice: 1, x: 600, y: 400, z: 0 })
    expect(haySolapamiento([a, b], tipos)).toBe(false)
  })

  it('compartir un vértice tampoco', () => {
    const a = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const b = colocacionDe({ itemId: 'c', indice: 1, x: 600, y: 400, z: 300 })
    expect(haySolapamiento([a, b], tipos)).toBe(false)
  })

  it('separados por completo tampoco', () => {
    const a = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const b = colocacionDe({ itemId: 'c', indice: 1, x: 1000, y: 0, z: 0 })
    expect(haySolapamiento([a, b], tipos)).toBe(false)
  })

  it('dice CUÁLES se superponen, para poder informarlo', () => {
    const a = colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 })
    const b = colocacionDe({ itemId: 'c', indice: 1, x: 100, y: 0, z: 0 })
    expect(primerSolapamiento([a, b], tipos)?.indice).toBe(1)
  })

  it('un solo bulto nunca se superpone consigo mismo', () => {
    expect(haySolapamiento([colocacionDe({ itemId: 'c', x: 0, y: 0, z: 0 })], tipos)).toBe(false)
  })
})
