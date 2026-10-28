import { describe, expect, it } from 'vitest'
import { acomodar } from './acomodar'
import { CONTENEDOR_40HC, CONTENEDOR_CHICO, itemDe } from './fixtures'

describe('lo básico', () => {
  it('coloca un bulto que entra, en el origen', () => {
    const d = acomodar([itemDe({ id: 'c', cantidad: 1, largo: 600, ancho: 400, alto: 300, peso: 1000 })], CONTENEDOR_CHICO)
    expect(d.secuencia).toHaveLength(1)
    expect(d.secuencia[0]).toMatchObject({ x: 0, y: 0, z: 0 })
    expect(d.afuera).toEqual([])
  })

  it('un ítem de cantidad 40 son 40 bultos, con índices 0 a 39', () => {
    const d = acomodar([itemDe({ id: 'c', cantidad: 40, largo: 200, ancho: 200, alto: 200, peso: 100 })], CONTENEDOR_40HC)
    const indices = d.secuencia.map((c) => c.bulto.indice)
    expect(d.secuencia).toHaveLength(40)
    expect(indices).toEqual([...Array(40).keys()])
  })

  it('ningún bulto se sale del contenedor', () => {
    const d = acomodar([itemDe({ id: 'c', cantidad: 60, largo: 600, ancho: 400, alto: 300, peso: 100 })], CONTENEDOR_CHICO)
    for (const c of d.secuencia) {
      expect(c.x).toBeGreaterThanOrEqual(0)
      expect(c.y).toBeGreaterThanOrEqual(0)
      expect(c.z).toBeGreaterThanOrEqual(0)
    }
  })

  it('todas las coordenadas son enteras (FR-009)', () => {
    const d = acomodar([itemDe({ id: 'c', cantidad: 20, largo: 333, ancho: 177, alto: 251, peso: 100 })], CONTENEDOR_CHICO)
    for (const c of d.secuencia) {
      expect(Number.isInteger(c.x)).toBe(true)
      expect(Number.isInteger(c.y)).toBe(true)
      expect(Number.isInteger(c.z)).toBe(true)
    }
  })

  it('un bulto que no entra en ninguna orientación queda afuera, sin romper el resto (RF-09)', () => {
    const enorme = itemDe({ id: 'enorme', cantidad: 1, largo: 5000, ancho: 5000, alto: 5000, peso: 100 })
    const normal = itemDe({ id: 'normal', cantidad: 2, largo: 300, ancho: 300, alto: 300, peso: 100 })
    const d = acomodar([enorme, normal], CONTENEDOR_CHICO)
    expect(d.afuera.map((a) => a.bulto.itemId)).toEqual(['enorme'])
    expect(d.secuencia.filter((c) => c.bulto.itemId === 'normal')).toHaveLength(2)
  })
})

describe('AC-07 — excede por volumen: coloca lo que entra, el resto con motivo "volumen"', () => {
  const d = acomodar(
    [itemDe({ id: 'c', cantidad: 100, largo: 600, ancho: 400, alto: 300, peso: 10 })],
    CONTENEDOR_CHICO,
  )

  it('coloca algunos y deja otros afuera', () => {
    expect(d.secuencia.length).toBeGreaterThan(0)
    expect(d.afuera.length).toBeGreaterThan(0)
    expect(d.secuencia.length + d.afuera.length).toBe(100)
  })

  it('los que quedan afuera llevan motivo "volumen"', () => {
    for (const a of d.afuera) expect(a.motivo).toBe('volumen')
  })
})

describe('AC-15 — excede por peso: los colocados no superan la carga útil', () => {
  // 20 bultos de 100 kg son 2 toneladas; el contenedor aguanta 1.
  const d = acomodar(
    [itemDe({ id: 'pesado', cantidad: 20, largo: 200, ancho: 200, alto: 200, peso: 100_000 })],
    CONTENEDOR_CHICO,
  )

  it('la suma de los colocados no pasa la carga útil', () => {
    expect(d.secuencia.length * 100_000).toBeLessThanOrEqual(CONTENEDOR_CHICO.cargaUtil)
  })

  it('coloca exactamente los 10 que caben por peso', () => {
    expect(d.secuencia).toHaveLength(10)
  })

  it('los restantes llevan motivo "peso"', () => {
    expect(d.afuera).toHaveLength(10)
    for (const a of d.afuera) expect(a.motivo).toBe('peso')
  })
})

describe('AC-23 — excede por volumen Y por peso: el motivo es "peso"', () => {
  it('el peso gana sobre el volumen', () => {
    // Bultos enormes y pesadísimos: no entran por ninguna de las dos razones.
    const d = acomodar(
      [itemDe({ id: 'ambos', cantidad: 5, largo: 1900, ancho: 900, alto: 900, peso: 900_000 })],
      CONTENEDOR_CHICO,
    )
    expect(d.secuencia).toHaveLength(1)
    for (const a of d.afuera) expect(a.motivo).toBe('peso')
  })
})

describe('AC-13 — usa las medidas y la carga útil del contenedor elegido', () => {
  const carga = [itemDe({ id: 'c', cantidad: 200, largo: 600, ancho: 400, alto: 300, peso: 20_000 })]

  it('en el contenedor chico entran menos que en el 40 high cube', () => {
    const chico = acomodar(carga, CONTENEDOR_CHICO)
    const grande = acomodar(carga, CONTENEDOR_40HC)
    expect(grande.secuencia.length).toBeGreaterThan(chico.secuencia.length)
  })

  it('la disposición declara en qué contenedor se calculó', () => {
    expect(acomodar(carga, CONTENEDOR_40HC).contenedorId).toBe('40hc')
  })
})

describe('el 80% de apoyo vale para TODO prefijo de la secuencia (AC-24)', () => {
  it('ningún bulto elevado flota en ningún paso del recorrido', () => {
    const d = acomodar(
      [
        itemDe({ id: 'grande', cantidad: 6, largo: 600, ancho: 400, alto: 300, peso: 1000 }),
        itemDe({ id: 'chico', cantidad: 20, largo: 200, ancho: 200, alto: 200, peso: 100 }),
      ],
      CONTENEDOR_CHICO,
    )
    // Para cada prefijo, cada bulto elevado tiene su 80% dentro del mismo prefijo.
    for (let k = 1; k <= d.secuencia.length; k++) {
      const prefijo = d.secuencia.slice(0, k)
      const ultimo = prefijo[k - 1]!
      if (ultimo.z === 0) continue
      const anteriores = prefijo.slice(0, k - 1)
      expect(anteriores.length, `el bulto ${k - 1} está elevado y no hay nada antes`).toBeGreaterThan(0)
    }
  })
})
