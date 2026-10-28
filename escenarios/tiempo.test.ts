/**
 * El tiempo de consolidación (SC-007, RNF-04).
 *
 * Se mide **de a una consolidación por vez, con 10 corridas por escenario**, que es la
 * concurrencia que declara SC-007. No se mide con concurrencia porque el cálculo es local y no
 * compite con otros pedidos.
 *
 * El número se **reporta** en T091b, sobre los escenarios ya calibrados. Acá solo falla si se
 * pasa del objetivo.
 */

import { describe, expect, it } from 'vitest'
import { acomodar } from '../src/acomodador/acomodar'
import { ESCENARIOS } from './escenarios'

const CORRIDAS = 10
const OBJETIVO_MS = 5_000
const LIMITE_BULTOS_GARANTIZADO = 200

function p95(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.min(ordenados.length - 1, Math.ceil(ordenados.length * 0.95) - 1)] ?? 0
}

describe('SC-007 — la consolidación de hasta 200 bultos se resuelve en menos de 5 s (p95)', () => {
  it(
    'los escenarios dentro del rango garantizado cumplen',
    () => {
      const muestras: number[] = []

      for (const escenario of ESCENARIOS) {
        const bultos = escenario.items.reduce(
          (n, i) => n + (i.cantidad.estado === 'declarado' ? i.cantidad.valor : 0),
          0,
        )
        // El objetivo cubre hasta 200 bultos; por encima, FR-024 no garantiza nada y la
        // interfaz avisa. Medir ahí no verificaría SC-007.
        if (bultos > LIMITE_BULTOS_GARANTIZADO) continue

        for (let i = 0; i < CORRIDAS; i++) {
          const t = performance.now()
          acomodar(escenario.items, escenario.contenedor)
          muestras.push(performance.now() - t)
        }
      }

      expect(muestras.length, 'no hay ningún escenario de 200 bultos o menos').toBeGreaterThan(0)
      expect(p95(muestras)).toBeLessThan(OBJETIVO_MS)
    },
    300_000,
  )
})

describe('por encima de 200 bultos no se garantiza, pero tampoco se rompe', () => {
  it('los escenarios grandes igual terminan y devuelven una disposición', () => {
    for (const escenario of ESCENARIOS) {
      const d = acomodar(escenario.items, escenario.contenedor)
      // FR-024: no se rechaza ni se recorta la carga, pase lo que pase con el tiempo.
      const total = escenario.items.reduce(
        (n, i) => n + (i.cantidad.estado === 'declarado' ? i.cantidad.valor : 0),
        0,
      )
      expect(d.secuencia.length + d.afuera.length, escenario.id).toBe(total)
    }
  }, 300_000)
})
