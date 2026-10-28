import { describe, expect, it } from 'vitest'
import { acomodar } from './acomodar'
import { CONTENEDOR_CHICO, itemDe } from './fixtures'
import { informeDe } from './informe'

describe('el aprovechamiento de volumen (research.md §8)', () => {
  it('es el volumen de los bultos colocados sobre el volumen interior', () => {
    // Un bulto de 600×400×300 = 0,072 m³ en un contenedor de 2×1×1 = 2 m³: 3,6%.
    const d = acomodar([itemDe({ id: 'c', cantidad: 1, largo: 600, ancho: 400, alto: 300, peso: 1000 })], CONTENEDOR_CHICO)
    const i = informeDe(d, [itemDe({ id: 'c', cantidad: 1, largo: 600, ancho: 400, alto: 300, peso: 1000 })], CONTENEDOR_CHICO)
    expect(i.aprovechamientoVolumen).toBeCloseTo(3.6, 1)
  })

  it('los bultos que quedaron afuera NO entran en el numerador', () => {
    const item = itemDe({ id: 'c', cantidad: 100, largo: 600, ancho: 400, alto: 300, peso: 10 })
    const d = acomodar([item], CONTENEDOR_CHICO)
    const i = informeDe(d, [item], CONTENEDOR_CHICO)
    // Si contara los 100, daría más del 100%.
    expect(i.aprovechamientoVolumen).toBeLessThanOrEqual(100)
    expect(d.afuera.length).toBeGreaterThan(0)
  })

  it('un cilindro cuenta por su caja envolvente', () => {
    // Un tambor de 585 de diámetro ocupa 585×585, no π·r². Es el supuesto del spec.
    const tambor = itemDe({ id: 't', cantidad: 1, largo: 585, ancho: 585, alto: 877, peso: 1000 })
    const d = acomodar([tambor], CONTENEDOR_CHICO)
    const i = informeDe(d, [tambor], CONTENEDOR_CHICO)
    const esperado = ((585 * 585 * 877) / (2000 * 1000 * 1000)) * 100
    expect(i.aprovechamientoVolumen).toBeCloseTo(esperado, 2)
  })

  it('la disposición vacía da 0, no da error', () => {
    const i = informeDe({ contenedorId: 'x', secuencia: [], afuera: [] }, [], CONTENEDOR_CHICO)
    expect(i.aprovechamientoVolumen).toBe(0)
    expect(i.aprovechamientoPeso).toBe(0)
    expect(i.colocados).toBe(0)
  })
})

describe('el aprovechamiento de peso', () => {
  it('es el peso colocado sobre la CARGA ÚTIL, no sobre el peso bruto', () => {
    // 10 bultos de 50 kg son 500 kg; la carga útil del contenedor chico es 1.000 kg: 50%.
    const item = itemDe({ id: 'p', cantidad: 10, largo: 200, ancho: 200, alto: 200, peso: 50_000 })
    const d = acomodar([item], CONTENEDOR_CHICO)
    const i = informeDe(d, [item], CONTENEDOR_CHICO)
    expect(i.aprovechamientoPeso).toBeCloseTo(50, 1)
  })

  it('100% significa que llegó al tope', () => {
    const item = itemDe({ id: 'p', cantidad: 10, largo: 200, ancho: 200, alto: 200, peso: 100_000 })
    const d = acomodar([item], CONTENEDOR_CHICO)
    const i = informeDe(d, [item], CONTENEDOR_CHICO)
    expect(i.aprovechamientoPeso).toBeCloseTo(100, 1)
  })

  it('los que quedaron afuera no entran en el numerador', () => {
    const item = itemDe({ id: 'p', cantidad: 50, largo: 200, ancho: 200, alto: 200, peso: 100_000 })
    const d = acomodar([item], CONTENEDOR_CHICO)
    const i = informeDe(d, [item], CONTENEDOR_CHICO)
    expect(i.aprovechamientoPeso).toBeLessThanOrEqual(100)
  })
})

describe('los colocados y los que quedaron afuera (FR-012)', () => {
  it('cuenta los colocados', () => {
    const item = itemDe({ id: 'c', cantidad: 5, largo: 300, ancho: 300, alto: 300, peso: 1000 })
    const d = acomodar([item], CONTENEDOR_CHICO)
    const i = informeDe(d, [item], CONTENEDOR_CHICO)
    expect(i.colocados).toBe(d.secuencia.length)
  })

  it('lista los que quedaron afuera CADA UNO con su motivo', () => {
    const item = itemDe({ id: 'c', cantidad: 100, largo: 600, ancho: 400, alto: 300, peso: 10 })
    const d = acomodar([item], CONTENEDOR_CHICO)
    const i = informeDe(d, [item], CONTENEDOR_CHICO)
    expect(i.afuera).toHaveLength(d.afuera.length)
    for (const a of i.afuera) expect(['peso', 'volumen']).toContain(a.motivo)
  })
})
