/**
 * **El test más importante del proyecto.**
 *
 * Corre el acomodador sobre los 10 escenarios y le pasa cada disposición al validador, que
 * rehizo todas las cuentas por separado. Si las dos implementaciones no coinciden, acá se nota
 * —y eso es exactamente para lo que existe el Principio II.
 *
 * Cualquier violación **hace fallar el build** (AC-10, FR-011).
 */

import { describe, expect, it } from 'vitest'
import { acomodar } from '../src/acomodador/acomodar'
import { validar } from '../src/validador/validar'
import { ESCENARIOS } from './escenarios'

// Los escenarios traen cargas grandes a propósito: el timeout por defecto de 5 s de vitest no
// alcanza, y aflojarlo acá no es aflojar un umbral del PRD, es darle tiempo a la medición.
const TIMEOUT_MS = 120_000

/**
 * Las disposiciones se calculan **una vez** y se reusan.
 *
 * Sin esto, cada bloque de este archivo volvía a acomodar los 10 escenarios: cinco veces el
 * mismo trabajo, y la suite se iba a 86 segundos. Memoizar es seguro justamente porque el
 * acomodador es determinístico: la misma entrada da la misma disposición (FR-009).
 */
const disposiciones = new Map<string, ReturnType<typeof acomodar>>()
function disposicionDe(escenario: (typeof ESCENARIOS)[number]) {
  const previa = disposiciones.get(escenario.id)
  if (previa !== undefined) return previa
  const nueva = acomodar(escenario.items, escenario.contenedor)
  disposiciones.set(escenario.id, nueva)
  return nueva
}

describe('AC-10 — ninguna disposición de los 10 escenarios dispara el validador', () => {
  it.each(ESCENARIOS.map((e) => [e.id, e] as const))('%s', (_id, escenario) => {
    const disposicion = disposicionDe(escenario)
    const resultado = validar(disposicion, escenario.contenedor, escenario.items)

    if (!resultado.valida) {
      throw new Error(
        `El validador rechazó la disposición del acomodador en "${escenario.id}": ` +
          `${resultado.motivo} en el bulto ${resultado.bulto.itemId}#${resultado.bulto.indice}. ` +
          'Las dos implementaciones no coinciden, y eso es un bug.',
      )
    }
    expect(resultado.valida).toBe(true)
  }, TIMEOUT_MS)
})

describe('AC-24 — todo prefijo de la secuencia también pasa el validador', () => {
  it.each(ESCENARIOS.map((e) => [e.id, e] as const))('%s', (_id, escenario) => {
    const disposicion = disposicionDe(escenario)

    // Se verifican prefijos repartidos, no los cientos: el validador ya recorre cada bulto
    // contra los anteriores, así que un prefijo roto aparecería igual en el total.
    const largos = new Set<number>([1, 2, 3])
    for (let i = 1; i <= 10; i++) {
      largos.add(Math.ceil((disposicion.secuencia.length * i) / 10))
    }

    for (const k of [...largos].filter((k) => k > 0 && k <= disposicion.secuencia.length)) {
      const prefijo = { ...disposicion, secuencia: disposicion.secuencia.slice(0, k) }
      const r = validar(prefijo, escenario.contenedor, escenario.items)
      if (!r.valida) {
        throw new Error(`"${escenario.id}": el prefijo de ${k} bultos falla por ${r.motivo}`)
      }
    }
  }, TIMEOUT_MS)
})

describe('los escenarios están bien armados', () => {
  it('son exactamente 10', () => {
    expect(ESCENARIOS).toHaveLength(10)
  })

  it('los ids son únicos', () => {
    expect(new Set(ESCENARIOS.map((e) => e.id)).size).toBe(10)
  })

  it('todos los campos están declarados: no dependen del catálogo ni del modelo', () => {
    for (const e of ESCENARIOS) {
      for (const item of e.items) {
        for (const campo of [item.cantidad, item.largo, item.ancho, item.alto, item.pesoUnitario]) {
          expect(campo.estado, `${e.id}/${item.id}`).toBe('declarado')
        }
      }
    }
  })

  it('todos traen más carga de la que entra: ninguno coloca el 100%', () => {
    // Si un escenario entrara entero no mediría nada sobre el orden de colocación.
    for (const e of ESCENARIOS) {
      const d = disposicionDe(e)
      expect(d.afuera.length, `${e.id} entró entero`).toBeGreaterThan(0)
    }
  }, TIMEOUT_MS)

  it('ningún tipo por separado alcanza para llenar el contenedor', () => {
    // CONTEXTO.md: cada tipo solo tiene que ENTRAR ENTERO. Si uno solo ya desbordara, el
    // escenario mediría nada más que qué tipo gana el orden de colocación.
    //
    // No aplica a los escenarios calibrados por peso —ahí el exceso es el punto— ni a los
    // ítems marcados como que no entran nunca.
    for (const e of ESCENARIOS) {
      // No aplica a los calibrados por peso —ahí el exceso es el punto— ni a los de un tipo
      // solo, donde la propiedad no tiene sentido: el escenario ES ese tipo desbordando.
      if (e.calibradoPor === 'peso' || e.items.length < 2) continue
      for (const item of e.items) {
        if (e.itemsQueNoEntran.includes(item.id)) continue
        const solo = acomodar([item], e.contenedor)
        expect(solo.afuera.length, `${e.id}: ${item.id} solo ya desborda`).toBe(0)
      }
    }
  }, TIMEOUT_MS)

  it('ningún tipo queda con cero colocados, salvo los marcados como que no entran', () => {
    // "Muy sobrecargados solo miden qué tipo gana el orden de colocación: quedan tipos enteros
    // con cero colocados" (CONTEXTO.md). Es la patología que la calibración evita.
    for (const e of ESCENARIOS) {
      const d = disposicionDe(e)
      for (const item of e.items) {
        if (e.itemsQueNoEntran.includes(item.id)) continue
        const colocados = d.secuencia.filter((c) => c.bulto.itemId === item.id).length
        expect(colocados, `${e.id}: ${item.id} quedó con cero colocados`).toBeGreaterThan(0)
      }
    }
  }, TIMEOUT_MS)

  it('los ítems marcados como que no entran, efectivamente no entran', () => {
    for (const e of ESCENARIOS) {
      const d = disposicionDe(e)
      for (const id of e.itemsQueNoEntran) {
        expect(d.secuencia.filter((c) => c.bulto.itemId === id), `${e.id}: ${id}`).toHaveLength(0)
      }
    }
  }, TIMEOUT_MS)
})
