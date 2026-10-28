import { describe, expect, it } from 'vitest'
import type { Gramos } from '../dominio/unidades'
import {
  aGramos,
  aMilimetros,
  asignarEjes,
  dividirPesoDelItem,
  type MedidaCruda,
} from './convertir'

describe('longitudes a milímetros enteros', () => {
  it.each([
    [60, 'cm', 600],
    [600, 'mm', 600],
    [2, 'm', 2000],
    [1, 'metro', 1000],
    [10, 'pulgadas', 254],
    [1, 'in', 26], // 25,4 mm redondeado hacia arriba: una caja más grande puede quedar afuera,
    //                 nunca entrar de prepo. Mismo lado seguro que en los pesos.
  ])('%s %s = %s mm', (valor, unidad, esperado) => {
    const r = aMilimetros(valor, unidad)
    expect(r.ok && r.valor).toBe(esperado)
  })

  it('sin unidad está en centímetros (FR-002)', () => {
    const r = aMilimetros(60)
    expect(r.ok && r.valor).toBe(600)
  })

  it('redondea hacia arriba cuando no da entero', () => {
    // 1 pulgada son 25,4 mm: queda 26, nunca 25.
    const r = aMilimetros(1, 'in')
    expect(r.ok && r.valor).toBe(26)
  })

  it('un valor entero no se mueve', () => {
    const r = aMilimetros(600, 'mm')
    expect(r.ok && r.valor).toBe(600)
  })

  it('rechaza una unidad que no conoce en vez de suponer', () => {
    expect(aMilimetros(60, 'codos').ok).toBe(false)
    expect(aMilimetros(60, 'ft').ok).toBe(false)
  })

  it.each([0, -60, Number.NaN, Number.POSITIVE_INFINITY])('rechaza el valor %s', (valor) => {
    expect(aMilimetros(valor, 'cm').ok).toBe(false)
  })
})

describe('pesos a gramos enteros', () => {
  it.each([
    [12, 'kg', 12000],
    [500, 'g', 500],
    [1.5, 'toneladas', 1_500_000],
    [0.5, 'kg', 500],
  ])('%s %s = %s g', (valor, unidad, esperado) => {
    const r = aGramos(valor, unidad)
    expect(r.ok && r.valor).toBe(esperado)
  })

  it('sin unidad está en kilos', () => {
    const r = aGramos(12)
    expect(r.ok && r.valor).toBe(12000)
  })

  it('rechaza una unidad que no conoce', () => {
    expect(aGramos(12, 'libras').ok).toBe(false)
  })
})

describe('el peso del ítem completo se divide por la cantidad', () => {
  it('cuando divide exacto, divide exacto', () => {
    expect(dividirPesoDelItem(500_000 as Gramos, 40)).toBe(12_500)
  })

  it('cuando no divide exacto, redondea HACIA ARRIBA al gramo', () => {
    // 10 kg entre 3: 3.333,33 → 3.334. La suma da 10.002 g, dos de más.
    expect(dividirPesoDelItem(10_000 as Gramos, 3)).toBe(3_334)
  })

  it('la suma de los unitarios nunca queda por debajo del total declarado', () => {
    // Es el lado seguro: un redondeo puede dejar un bulto afuera, nunca meter uno que no entraba.
    for (const [total, cantidad] of [
      [10_000, 3],
      [1, 7],
      [99_999, 11],
      [12_345, 100],
    ] as const) {
      const unitario = dividirPesoDelItem(total as Gramos, cantidad)
      expect(unitario * cantidad).toBeGreaterThanOrEqual(total)
    }
  })

  it('no acepta una cantidad que no sea entera ≥ 1', () => {
    expect(() => dividirPesoDelItem(1000 as Gramos, 0)).toThrow()
    expect(() => dividirPesoDelItem(1000 as Gramos, -3)).toThrow()
    expect(() => dividirPesoDelItem(1000 as Gramos, 2.5)).toThrow()
  })
})

describe('asignación de ejes: el rótulo manda sobre la posición (FR-002)', () => {
  const m = (valor: number, ejeRotulado?: 'largo' | 'ancho' | 'alto'): MedidaCruda =>
    ejeRotulado === undefined ? { valor, unidad: 'cm' } : { valor, unidad: 'cm', ejeRotulado }

  it('sin rótulos, "AxBxC" se lee largo × ancho × alto', () => {
    const r = asignarEjes([m(60), m(40), m(30)])
    expect(r.ok && r.ejes.largo?.valor).toBe(60)
    expect(r.ok && r.ejes.ancho?.valor).toBe(40)
    expect(r.ok && r.ejes.alto?.valor).toBe(30)
  })

  it('"60 de alto por 40 por 30": el 60 va al alto, no al largo', () => {
    const r = asignarEjes([m(60, 'alto'), m(40), m(30)])
    expect(r.ok && r.ejes.alto?.valor).toBe(60)
    expect(r.ok && r.ejes.largo?.valor).toBe(40)
    expect(r.ok && r.ejes.ancho?.valor).toBe(30)
  })

  it('un rótulo en el medio también manda', () => {
    const r = asignarEjes([m(60), m(40, 'alto'), m(30)])
    expect(r.ok && r.ejes.largo?.valor).toBe(60)
    expect(r.ok && r.ejes.alto?.valor).toBe(40)
    expect(r.ok && r.ejes.ancho?.valor).toBe(30)
  })

  it('dos medidas que reclaman el mismo eje NO se adivinan', () => {
    const r = asignarEjes([m(60, 'alto'), m(40, 'alto')])
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.porque).toContain('alto')
  })

  it('más de tres medidas NO se adivinan', () => {
    expect(asignarEjes([m(1), m(2), m(3), m(4)]).ok).toBe(false)
  })

  it('más medidas sin rótulo que ejes libres NO se adivinan', () => {
    // Dos rotuladas dejan un eje libre, y quedan dos sin rótulo: no hay forma de saber.
    expect(asignarEjes([m(60, 'alto'), m(40, 'ancho'), m(30), m(20)]).ok).toBe(false)
  })

  it('con una sola medida rotulada, las otras dos quedan sin asignar y no se inventan', () => {
    const r = asignarEjes([m(60, 'alto')])
    expect(r.ok && r.ejes.alto?.valor).toBe(60)
    expect(r.ok && r.ejes.largo).toBeUndefined()
    expect(r.ok && r.ejes.ancho).toBeUndefined()
  })
})
