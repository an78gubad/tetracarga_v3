/**
 * La línea base congelada (FR-018, RNF-05, AC-14, SC-008).
 *
 * Recalcula las 10 disposiciones y las compara **bulto por bulto** contra el archivo:
 * identidad, posición, orientación y **orden de colocación**. Sin tolerancia. Cualquier
 * diferencia hace fallar el build.
 *
 * **Sin snapshots de Vitest**, y es la razón de que este test exista escrito a mano: `vitest -u`
 * reescribiría la línea base sin que nadie lo decida, y entonces no sería una línea base.
 *
 * Si este test falla, **el error está en el código, no en el archivo**. Tocar `linea-base.json`
 * lo decide el usuario, explícitamente, y nunca para que algo pase.
 */

import { describe, expect, it } from 'vitest'
import { acomodar } from '../src/acomodador/acomodar'
import { ESCENARIOS } from './escenarios'
import lineaBase from './linea-base.json' with { type: 'json' }

type ColocacionCongelada = {
  readonly itemId: string
  readonly indice: number
  readonly x: number
  readonly y: number
  readonly z: number
  readonly orientacion: { readonly ejeX: string; readonly ejeY: string; readonly ejeZ: string }
}

type EscenarioCongelado = {
  readonly contenedorId: string
  readonly colocados: number
  readonly afuera: number
  readonly secuencia: readonly ColocacionCongelada[]
  readonly bultosAfuera: readonly { readonly itemId: string; readonly indice: number; readonly motivo: string }[]
}

const CONGELADOS = (lineaBase as { escenarios: Record<string, EscenarioCongelado> }).escenarios
const TIMEOUT_MS = 120_000

describe('AC-14 / SC-008 — las 10 disposiciones coinciden con la línea base', () => {
  it('la línea base cubre los 10 escenarios y ninguno más', () => {
    expect(Object.keys(CONGELADOS).sort()).toEqual(ESCENARIOS.map((e) => e.id).sort())
  })

  it.each(ESCENARIOS.map((e) => [e.id, e] as const))(
    '%s coincide bulto por bulto',
    (id, escenario) => {
      const congelado = CONGELADOS[id]
      expect(congelado, `falta ${id} en la línea base`).toBeDefined()
      if (congelado === undefined) return

      const recalculada = acomodar(escenario.items, escenario.contenedor)

      expect(recalculada.contenedorId).toBe(congelado.contenedorId)
      expect(recalculada.secuencia.length, `cantidad de colocados en ${id}`).toBe(congelado.colocados)
      expect(recalculada.afuera.length, `cantidad de bultos afuera en ${id}`).toBe(congelado.afuera)

      // Bulto por bulto, en orden. El índice del array ES el orden de colocación: dos
      // disposiciones con las mismas colocaciones en otro orden no coinciden.
      for (const [i, esperada] of congelado.secuencia.entries()) {
        const obtenida = recalculada.secuencia[i]
        expect(obtenida, `${id}: falta la colocación ${i}`).toBeDefined()
        if (obtenida === undefined) return

        // Sin tolerancia: son enteros, coinciden exacto o no coinciden.
        expect(
          {
            itemId: obtenida.bulto.itemId,
            indice: obtenida.bulto.indice,
            x: obtenida.x,
            y: obtenida.y,
            z: obtenida.z,
            orientacion: obtenida.orientacion,
          },
          `${id}: la colocación ${i} no coincide con la línea base`,
        ).toEqual(esperada)
      }

      for (const [i, esperado] of congelado.bultosAfuera.entries()) {
        const obtenido = recalculada.afuera[i]
        expect(
          obtenido === undefined
            ? undefined
            : { itemId: obtenido.bulto.itemId, indice: obtenido.bulto.indice, motivo: obtenido.motivo },
          `${id}: el bulto afuera ${i} no coincide`,
        ).toEqual(esperado)
      }
    },
    TIMEOUT_MS,
  )
})

describe('la línea base está bien formada', () => {
  it('declara cuándo se registró', () => {
    expect((lineaBase as { registradaEl: string }).registradaEl).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('todas las coordenadas son enteras (FR-009)', () => {
    for (const [id, e] of Object.entries(CONGELADOS)) {
      for (const c of e.secuencia) {
        expect(Number.isInteger(c.x) && Number.isInteger(c.y) && Number.isInteger(c.z), `${id}`).toBe(true)
      }
    }
  })

  it('la orientación se guarda con nombres de eje y no con un número', () => {
    // Un índice de 0 a 5 no dice nada cuando el test falla; el nombre sí.
    for (const e of Object.values(CONGELADOS)) {
      for (const c of e.secuencia) {
        expect(['largo', 'ancho', 'alto']).toContain(c.orientacion.ejeZ)
      }
    }
  })

  it('cada bulto aparece una sola vez por escenario', () => {
    for (const [id, e] of Object.entries(CONGELADOS)) {
      const claves = e.secuencia.map((c) => `${c.itemId}#${c.indice}`)
      expect(new Set(claves).size, `${id} tiene bultos repetidos`).toBe(claves.length)
    }
  })
})
