import { describe, expect, it } from 'vitest'
import { PORCENTAJE_MINIMO_APOYO, areaBase, areaContacto, tieneApoyoSuficiente, type Caja } from './apoyo'

const caja = (x: number, y: number, z: number, dx: number, dy: number, dz: number): Caja =>
  ({ x, y, z, dx, dy, dz }) as Caja

describe('el área de contacto se mide en el plano xy, a la misma z', () => {
  it('dos cajas apiladas exactas: el contacto es la base entera', () => {
    const abajo = caja(0, 0, 0, 600, 400, 300)
    const arriba = caja(0, 0, 300, 600, 400, 300)
    expect(areaContacto(arriba, abajo)).toBe(600 * 400)
  })

  it('apilada a medias: el contacto es la intersección', () => {
    const abajo = caja(0, 0, 0, 600, 400, 300)
    const arriba = caja(300, 0, 300, 600, 400, 300)
    expect(areaContacto(arriba, abajo)).toBe(300 * 400)
  })

  it('si no están a la misma z, no hay contacto', () => {
    const abajo = caja(0, 0, 0, 600, 400, 300)
    const flotando = caja(0, 0, 301, 600, 400, 300)
    expect(areaContacto(flotando, abajo)).toBe(0)
  })

  it('si no se superponen en xy, no hay contacto', () => {
    const abajo = caja(0, 0, 0, 600, 400, 300)
    const alCostado = caja(600, 0, 300, 600, 400, 300)
    expect(areaContacto(alCostado, abajo)).toBe(0)
  })

  it('tocarse de canto no es apoyo: el área es 0', () => {
    const abajo = caja(0, 0, 0, 600, 400, 300)
    const deCanto = caja(600, 400, 300, 600, 400, 300)
    expect(areaContacto(deCanto, abajo)).toBe(0)
  })
})

describe('el 80% de apoyo (FR-010, research.md §7)', () => {
  it('el umbral es 80', () => {
    expect(PORCENTAJE_MINIMO_APOYO).toBe(80)
  })

  it('una caja en el piso tiene apoyo siempre', () => {
    expect(tieneApoyoSuficiente(caja(0, 0, 0, 600, 400, 300), [])).toBe(true)
  })

  it('apoyo completo pasa', () => {
    const abajo = caja(0, 0, 0, 600, 400, 300)
    expect(tieneApoyoSuficiente(caja(0, 0, 300, 600, 400, 300), [abajo])).toBe(true)
  })

  it('exactamente el 80% pasa: el criterio es "al menos"', () => {
    const abajo = caja(0, 0, 0, 480, 400, 300) // 480/600 = 80%
    expect(tieneApoyoSuficiente(caja(0, 0, 300, 600, 400, 300), [abajo])).toBe(true)
  })

  it('un 79,8% no pasa', () => {
    const abajo = caja(0, 0, 0, 479, 400, 300)
    expect(tieneApoyoSuficiente(caja(0, 0, 300, 600, 400, 300), [abajo])).toBe(false)
  })

  it('la mitad no pasa', () => {
    const abajo = caja(0, 0, 0, 300, 400, 300)
    expect(tieneApoyoSuficiente(caja(0, 0, 300, 600, 400, 300), [abajo])).toBe(false)
  })

  it('el apoyo se suma entre varios soportes', () => {
    // Dos cajas de 300 de ancho sostienen una de 600: juntas dan el 100%.
    const a = caja(0, 0, 0, 300, 400, 300)
    const b = caja(300, 0, 0, 300, 400, 300)
    expect(tieneApoyoSuficiente(caja(0, 0, 300, 600, 400, 300), [a, b])).toBe(true)
  })

  it('un soporte que no está a la altura no cuenta', () => {
    const aLaAltura = caja(0, 0, 0, 300, 400, 300)
    const masBajo = caja(300, 0, 0, 300, 400, 200)
    expect(tieneApoyoSuficiente(caja(0, 0, 300, 600, 400, 300), [aLaAltura, masBajo])).toBe(false)
  })

  it('el área de la base es la que toca el piso en esa orientación', () => {
    expect(areaBase(caja(0, 0, 0, 600, 400, 300))).toBe(600 * 400)
  })
})
