import { describe, expect, it } from 'vitest'
import type { Gramos, MilimetrosCuadrados } from '../dominio/unidades'
import { repartirPorArea } from './peso'

const g = (n: number) => n as Gramos
const mm2 = (n: number) => n as MilimetrosCuadrados

describe('el reparto proporcional al área, en enteros (FR-027)', () => {
  it('un solo apoyo recibe todo', () => {
    expect(repartirPorArea(g(1000), [mm2(500)])).toEqual([1000])
  })

  it('dos apoyos iguales reciben la mitad cada uno', () => {
    expect(repartirPorArea(g(1000), [mm2(500), mm2(500)])).toEqual([500, 500])
  })

  it('reparte en proporción al área, no en partes iguales', () => {
    // 900 g sobre áreas de 3 y 1: 675 y 225.
    expect(repartirPorArea(g(900), [mm2(300), mm2(100)])).toEqual([675, 225])
  })

  it('redondea HACIA ARRIBA: la suma nunca queda por debajo del peso repartido', () => {
    const partes = repartirPorArea(g(1000), [mm2(1), mm2(1), mm2(1)])
    expect(partes).toEqual([334, 334, 334])
    expect(partes.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(1000)
  })

  it('la suma nunca queda por debajo, con cualquier combinación', () => {
    for (const [total, areas] of [
      [1000, [1, 1, 1]],
      [7, [3, 5, 11]],
      [999_999, [17, 19]],
      [1, [1, 1, 1, 1]],
    ] as const) {
      const partes = repartirPorArea(g(total), areas.map(mm2))
      expect(partes.reduce((a, b) => a + b, 0)).toBeGreaterThanOrEqual(total)
    }
  })

  it('todas las partes son enteras: cero punto flotante', () => {
    for (const parte of repartirPorArea(g(7), [mm2(3), mm2(5), mm2(11)])) {
      expect(Number.isInteger(parte)).toBe(true)
    }
  })

  it('sin apoyos no reparte nada: el bulto está en el piso', () => {
    expect(repartirPorArea(g(1000), [])).toEqual([])
  })

  it('un área total de 0 no divide por cero', () => {
    expect(() => repartirPorArea(g(1000), [mm2(0)])).not.toThrow()
  })

  it('el resultado es el mismo siempre: es la cuenta que el validador tiene que clavar igual', () => {
    const primera = repartirPorArea(g(12_345), [mm2(7), mm2(13), mm2(29)])
    for (let i = 0; i < 20; i++) {
      expect(repartirPorArea(g(12_345), [mm2(7), mm2(13), mm2(29)])).toEqual(primera)
    }
  })
})
