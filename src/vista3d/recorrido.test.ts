import { describe, expect, it } from 'vitest'
import { acomodar } from '../acomodador/acomodar'
import { CONTENEDOR_CHICO, itemDe } from '../acomodador/fixtures'
import { validar } from '../validador/validar'
import { POSICION_INICIAL, posicionTrasRecalcular, recorridoCompleto, recorridoEn } from './recorrido'

const ITEMS = [
  itemDe({ id: 'grandes', cantidad: 6, largo: 600, ancho: 400, alto: 300, peso: 1000 }),
  itemDe({ id: 'chicos', cantidad: 20, largo: 200, ancho: 200, alto: 200, peso: 100 }),
]
const DISPOSICION = acomodar(ITEMS, CONTENEDOR_CHICO)

describe('AC-08 — en la posición k se ven exactamente los primeros k bultos', () => {
  it('para todo k, la cantidad visible es k', () => {
    for (let k = 0; k <= DISPOSICION.secuencia.length; k++) {
      expect(recorridoEn(DISPOSICION, k).visibles).toHaveLength(k)
    }
  })

  it('son los primeros k de la secuencia, en ese orden', () => {
    const k = 5
    expect(recorridoEn(DISPOSICION, k).visibles).toEqual(DISPOSICION.secuencia.slice(0, k))
  })

  it('k = 0 muestra el contenedor vacío', () => {
    expect(POSICION_INICIAL).toBe(0)
    expect(recorridoEn(DISPOSICION, 0).visibles).toEqual([])
  })

  it('el recorrido completo muestra todos los colocados', () => {
    const r = recorridoCompleto(DISPOSICION)
    expect(r.visibles).toHaveLength(DISPOSICION.secuencia.length)
    expect(r.posicion).toBe(r.total)
  })

  it('una posición fuera de rango se acota en vez de explotar', () => {
    expect(recorridoEn(DISPOSICION, -5).visibles).toEqual([])
    expect(recorridoEn(DISPOSICION, 9999).visibles).toHaveLength(DISPOSICION.secuencia.length)
  })

  it('una posición con decimales se trunca', () => {
    expect(recorridoEn(DISPOSICION, 3.7).posicion).toBe(3)
  })
})

describe('AC-24 — ningún paso del recorrido muestra bultos flotando', () => {
  it('cada prefijo pasa el validador', () => {
    for (let k = 1; k <= DISPOSICION.secuencia.length; k++) {
      const prefijo = { ...DISPOSICION, secuencia: recorridoEn(DISPOSICION, k).visibles }
      const r = validar(prefijo, CONTENEDOR_CHICO, ITEMS)
      if (!r.valida) {
        throw new Error(`el paso ${k} del recorrido falla por ${r.motivo}`)
      }
    }
  })

  it('el bulto que aparece en cada paso está apoyado sobre los anteriores o en el piso', () => {
    for (let k = 1; k <= DISPOSICION.secuencia.length; k++) {
      const visibles = recorridoEn(DISPOSICION, k).visibles
      const ultimo = visibles[k - 1]!
      if ((ultimo.z as number) === 0) continue
      // Si está elevado, tiene que haber algo antes que lo sostenga.
      expect(visibles.slice(0, k - 1).length, `paso ${k}`).toBeGreaterThan(0)
    }
  })
})

describe('qué pasa con el recorrido al recalcular (FR-006)', () => {
  it('se conserva la posición si todavía existe', () => {
    expect(posicionTrasRecalcular(7, 20)).toBe(7)
  })

  it('si la disposición se acortó, se va al final en vez de volver a 0', () => {
    // Volver a 0 obligaría a recorrer todo de nuevo por haber corregido una medida.
    expect(posicionTrasRecalcular(18, 5)).toBe(5)
  })

  it('una disposición vacía deja la posición en 0', () => {
    expect(posicionTrasRecalcular(9, 0)).toBe(0)
  })
})
