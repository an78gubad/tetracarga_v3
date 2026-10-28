import { describe, expect, it } from 'vitest'
import type { Item } from '../dominio/items'
import { ORIENTACIONES, medidasEn, orientacionesPara } from './orientacion'

function item(parcial: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    nombre: 'caja',
    cantidad: { estado: 'declarado', valor: 1 },
    largo: { estado: 'declarado', valor: 600 as never },
    ancho: { estado: 'declarado', valor: 400 as never },
    alto: { estado: 'declarado', valor: 300 as never },
    pesoUnitario: { estado: 'declarado', valor: 12_000 as never },
    marcas: {
      noApilable: { estado: 'declarado', valor: false },
      orientacionObligatoria: { estado: 'declarado', valor: false },
      pesoMaximoEncima: { estado: 'faltante', motivo: 'entrada-sin-el-dato' },
    },
    color: 0,
    ...parcial,
  }
}

describe('las orientaciones admitidas (research.md §4)', () => {
  it('son las 6 permutaciones de eje', () => {
    expect(ORIENTACIONES).toHaveLength(6)
  })

  it('cada una usa las tres medidas, una por eje', () => {
    for (const o of ORIENTACIONES) {
      expect(new Set([o.ejeX, o.ejeY, o.ejeZ]).size).toBe(3)
    }
  })

  it('no hay dos iguales', () => {
    const claves = ORIENTACIONES.map((o) => `${o.ejeX}-${o.ejeY}-${o.ejeZ}`)
    expect(new Set(claves).size).toBe(6)
  })

  it('el orden es fijo: el determinismo de FR-009 depende de eso', () => {
    expect(ORIENTACIONES[0]).toEqual({ ejeX: 'largo', ejeY: 'ancho', ejeZ: 'alto' })
  })
})

describe('un bulto sin marcas puede ir en cualquiera de las 6', () => {
  it('devuelve las 6', () => {
    expect(orientacionesPara(item())).toHaveLength(6)
  })
})

describe('con orientación obligatoria quedan solo 2 (AC-05)', () => {
  const obligada = item({
    marcas: { ...item().marcas, orientacionObligatoria: { estado: 'declarado', valor: true } },
  })

  it('son las 2 que dejan el alto declarado sobre z', () => {
    const permitidas = orientacionesPara(obligada)
    expect(permitidas).toHaveLength(2)
    for (const o of permitidas) expect(o.ejeZ).toBe('alto')
  })

  it('son las dos rotaciones horizontales de esa cara', () => {
    const permitidas = orientacionesPara(obligada)
    expect(permitidas.map((o) => o.ejeX).sort()).toEqual(['ancho', 'largo'])
  })
})

describe('las medidas sobre cada eje', () => {
  it('en la orientación natural, x es el largo', () => {
    const m = medidasEn(item(), { ejeX: 'largo', ejeY: 'ancho', ejeZ: 'alto' })
    expect(m).toEqual({ dx: 600, dy: 400, dz: 300 })
  })

  it('acostado, el alto pasa a x', () => {
    const m = medidasEn(item(), { ejeX: 'alto', ejeY: 'ancho', ejeZ: 'largo' })
    expect(m).toEqual({ dx: 300, dy: 400, dz: 600 })
  })

  it('el volumen no cambia con la orientación', () => {
    const volumenes = ORIENTACIONES.map((o) => {
      const m = medidasEn(item(), o)
      return m.dx * m.dy * m.dz
    })
    expect(new Set(volumenes).size).toBe(1)
  })
})
