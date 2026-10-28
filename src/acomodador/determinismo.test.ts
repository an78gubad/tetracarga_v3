import { describe, expect, it } from 'vitest'
import { acomodar } from './acomodar'
import { CONTENEDOR_40HC, CONTENEDOR_CHICO, itemDe } from './fixtures'

const CARGA = [
  itemDe({ id: 'cajas', cantidad: 30, largo: 600, ancho: 400, alto: 300, peso: 12_000 }),
  itemDe({ id: 'tambores', cantidad: 8, largo: 585, ancho: 585, alto: 877, peso: 200_000, noApilable: true }),
  itemDe({ id: 'fragiles', cantidad: 10, largo: 400, ancho: 400, alto: 400, peso: 5_000, pesoMaximoEncima: 10_000 }),
]

describe('AC-21 — la misma entrada da la misma disposición, sin tolerancia', () => {
  it('dos corridas coinciden bulto por bulto', () => {
    const a = acomodar(CARGA, CONTENEDOR_40HC)
    const b = acomodar(CARGA, CONTENEDOR_40HC)
    expect(b).toEqual(a)
  })

  it('veinte corridas dan exactamente lo mismo', () => {
    const primera = JSON.stringify(acomodar(CARGA, CONTENEDOR_CHICO))
    for (let i = 0; i < 20; i++) {
      expect(JSON.stringify(acomodar(CARGA, CONTENEDOR_CHICO))).toBe(primera)
    }
  })

  it('coinciden la posición, la orientación Y el orden de colocación', () => {
    const a = acomodar(CARGA, CONTENEDOR_40HC)
    const b = acomodar(CARGA, CONTENEDOR_40HC)
    for (const [i, c] of a.secuencia.entries()) {
      expect(b.secuencia[i]!.bulto).toEqual(c.bulto)
      expect(b.secuencia[i]!.orientacion).toEqual(c.orientacion)
      expect([b.secuencia[i]!.x, b.secuencia[i]!.y, b.secuencia[i]!.z]).toEqual([c.x, c.y, c.z])
    }
  })
})

describe('FR-009 — reordenar la lista de ítems da la misma disposición', () => {
  it('con los ítems en otro orden, la disposición es idéntica', () => {
    const normal = acomodar(CARGA, CONTENEDOR_40HC)
    const alReves = acomodar([...CARGA].reverse(), CONTENEDOR_40HC)
    expect(alReves).toEqual(normal)
  })

  it('con cualquier permutación de la lista', () => {
    const esperado = JSON.stringify(acomodar(CARGA, CONTENEDOR_CHICO))
    const permutaciones = [
      [CARGA[1]!, CARGA[0]!, CARGA[2]!],
      [CARGA[2]!, CARGA[1]!, CARGA[0]!],
      [CARGA[1]!, CARGA[2]!, CARGA[0]!],
    ]
    for (const p of permutaciones) {
      expect(JSON.stringify(acomodar(p, CONTENEDOR_CHICO))).toBe(esperado)
    }
  })
})
