import { describe, expect, it } from 'vitest'
import { colocacionDe, contenedorDe, tipoDe } from './fixtures'
import { bultoFueraDeLimites } from './limites'

const tipos = [tipoDe({ id: 'c', largo: 600, ancho: 400, alto: 300, peso: 1000 })]
const contenedor = contenedorDe(2000, 1000, 1000, 1_000_000)

describe('los límites del contenedor', () => {
  it('un bulto adentro pasa', () => {
    expect(bultoFueraDeLimites([colocacionDe({ itemId: 'c', x: 0, y: 0, z: 0 })], tipos, contenedor)).toBeUndefined()
  })

  it('un bulto que llega justo al borde pasa', () => {
    const justo = colocacionDe({ itemId: 'c', x: 1400, y: 600, z: 700 })
    expect(bultoFueraDeLimites([justo], tipos, contenedor)).toBeUndefined()
  })

  it('un milímetro de más en x no pasa', () => {
    const afuera = colocacionDe({ itemId: 'c', x: 1401, y: 0, z: 0 })
    expect(bultoFueraDeLimites([afuera], tipos, contenedor)).toBeDefined()
  })

  it('un milímetro de más en y no pasa', () => {
    expect(bultoFueraDeLimites([colocacionDe({ itemId: 'c', x: 0, y: 601, z: 0 })], tipos, contenedor)).toBeDefined()
  })

  it('un milímetro de más en z no pasa', () => {
    expect(bultoFueraDeLimites([colocacionDe({ itemId: 'c', x: 0, y: 0, z: 701 })], tipos, contenedor)).toBeDefined()
  })

  it('una coordenada negativa no pasa', () => {
    expect(bultoFueraDeLimites([colocacionDe({ itemId: 'c', x: -1, y: 0, z: 0 })], tipos, contenedor)).toBeDefined()
  })

  it('la orientación cambia qué medida se mide contra cada pared', () => {
    // De costado el bulto mide 300 en x: entra donde el natural de 600 no entraría.
    const acostado = colocacionDe({
      itemId: 'c', x: 1700, y: 0, z: 0,
      orientacion: { ejeX: 'alto', ejeY: 'ancho', ejeZ: 'largo' },
    })
    expect(bultoFueraDeLimites([acostado], tipos, contenedor)).toBeUndefined()
  })
})
