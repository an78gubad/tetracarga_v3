import { describe, expect, it } from 'vitest'
import { aOkLab, distancia, parMasCercano } from './oklab'
import {
  CANTIDAD_COLORES,
  COLOR_DEL_CONTENEDOR,
  COLOR_DE_FONDO,
  DISTANCIA_MINIMA_MEDIDA,
  PALETA,
  UMBRAL_DISTANCIA,
  colorDeIndice,
  hayColoresReciclados,
} from './paleta'

describe('SC-015 — cero pares por debajo del umbral declarado', () => {
  it('la paleta tiene exactamente 12 colores, que es lo que fija el PRD', () => {
    expect(PALETA).toHaveLength(CANTIDAD_COLORES)
  })

  it('todos los pares están por encima del umbral', () => {
    const porDebajo: string[] = []
    for (let i = 0; i < PALETA.length; i++) {
      for (let j = i + 1; j < PALETA.length; j++) {
        const d = distancia(PALETA[i]!, PALETA[j]!)
        if (d < UMBRAL_DISTANCIA) {
          porDebajo.push(`${PALETA[i]} y ${PALETA[j]}: ${d.toFixed(4)} < ${UMBRAL_DISTANCIA}`)
        }
      }
    }
    expect(porDebajo).toEqual([])
  })

  it('la distancia mínima real coincide con la que dice la paleta', () => {
    // Si alguien cambia un color, este test dice que el número declarado quedó viejo.
    expect(parMasCercano(PALETA).distancia).toBeCloseTo(DISTANCIA_MINIMA_MEDIDA, 4)
  })

  it('hay margen entre lo medido y lo exigido', () => {
    expect(DISTANCIA_MINIMA_MEDIDA).toBeGreaterThan(UMBRAL_DISTANCIA)
  })

  it('no hay colores repetidos', () => {
    expect(new Set(PALETA).size).toBe(CANTIDAD_COLORES)
  })

  it('todos son #rrggbb válidos', () => {
    for (const color of PALETA) expect(color).toMatch(/^#[0-9a-f]{6}$/)
  })
})

describe('FR-033 — cada color también se distingue del fondo y del contenedor', () => {
  it('ningún color de la paleta está más cerca del fondo que el umbral', () => {
    // Un bulto del mismo tono que el fondo se pierde aunque se distinga de los demás bultos.
    const porDebajo = PALETA.filter((c) => distancia(c, COLOR_DE_FONDO) < UMBRAL_DISTANCIA).map(
      (c) => `${c}: ${distancia(c, COLOR_DE_FONDO).toFixed(4)}`,
    )
    expect(porDebajo).toEqual([])
  })

  it('ninguno está más cerca del color del contenedor que el umbral', () => {
    const porDebajo = PALETA.filter(
      (c) => distancia(c, COLOR_DEL_CONTENEDOR) < UMBRAL_DISTANCIA,
    ).map((c) => `${c}: ${distancia(c, COLOR_DEL_CONTENEDOR).toFixed(4)}`)
    expect(porDebajo).toEqual([])
  })

  it('el fondo y el contenedor se distinguen entre sí', () => {
    expect(distancia(COLOR_DE_FONDO, COLOR_DEL_CONTENEDOR)).toBeGreaterThanOrEqual(UMBRAL_DISTANCIA)
  })
})

describe('la conversión a OKLab', () => {
  it('el negro da L = 0', () => {
    expect(aOkLab('#000000').L).toBeCloseTo(0, 4)
  })

  it('el blanco da L = 1', () => {
    expect(aOkLab('#ffffff').L).toBeCloseTo(1, 3)
  })

  it('un color consigo mismo da distancia 0', () => {
    expect(distancia('#ff8ebb', '#ff8ebb')).toBe(0)
  })

  it('el negro y el blanco están lejos', () => {
    expect(distancia('#000000', '#ffffff')).toBeCloseTo(1, 2)
  })

  it('dos tonos casi iguales están cerca: la métrica mide lo que tiene que medir', () => {
    expect(distancia('#ff0000', '#fe0000')).toBeLessThan(0.01)
  })

  it('rechaza un color mal escrito en vez de devolver algo', () => {
    expect(() => aOkLab('rojo')).toThrow()
    expect(() => aOkLab('#fff')).toThrow()
  })
})

describe('con más de 12 tipos los colores se reciclan (FR-013)', () => {
  it('el tipo 12 vuelve al primer color', () => {
    expect(colorDeIndice(12)).toBe(PALETA[0])
    expect(colorDeIndice(13)).toBe(PALETA[1])
  })

  it('se reciclan en el MISMO orden, no al azar', () => {
    for (let i = 0; i < 36; i++) {
      expect(colorDeIndice(i)).toBe(PALETA[i % 12])
    }
  })

  it('avisa recién a partir del tipo 13', () => {
    expect(hayColoresReciclados(12)).toBe(false)
    expect(hayColoresReciclados(13)).toBe(true)
  })
})
