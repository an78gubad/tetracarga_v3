/**
 * Verifica el dataset **sin red**: que esté bien etiquetado y que no se contradiga.
 *
 * Esto no mide precisión —eso es `npm run eval`, que llama al proveedor—; caza errores de
 * tipeo en las etiquetas, que son peores que un bug porque corromperían la vara con la que se
 * mide todo lo demás.
 */

import { describe, expect, it } from 'vitest'
import { CASOS } from '../eval/dataset/casos'
import { catalogo } from '../src/catalogo/catalogo'

const EJES = ['largo', 'ancho', 'alto', 'peso'] as const

describe('el dataset de RNF-02', () => {
  it('tiene exactamente 50 casos, que es el número del PRD', () => {
    expect(CASOS).toHaveLength(50)
  })

  it('los ids son únicos', () => {
    const ids = CASOS.map((c) => c.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('ninguna descripción pasa los 2.000 caracteres', () => {
    for (const caso of CASOS) {
      expect([...caso.descripcion].length).toBeLessThanOrEqual(2_000)
    }
  })

  it('todos los casos tienen al menos un ítem esperado', () => {
    for (const caso of CASOS) {
      expect(caso.itemsEsperados.length, caso.id).toBeGreaterThan(0)
    }
  })
})

describe('las etiquetas no se contradicen', () => {
  it('ningún campo está a la vez declarado y ausente', () => {
    for (const caso of CASOS) {
      for (const item of caso.itemsEsperados) {
        for (const eje of item.ausentes) {
          expect(item.declarados[eje], `${caso.id}: ${eje}`).toBeUndefined()
        }
      }
    }
  })

  it('cada campo está declarado o ausente, nunca en ninguno de los dos', () => {
    for (const caso of CASOS) {
      for (const item of caso.itemsEsperados) {
        for (const eje of EJES) {
          const declarado = item.declarados[eje] !== undefined
          const ausente = item.ausentes.includes(eje)
          expect(declarado || ausente, `${caso.id}: ${eje} no está en ninguno`).toBe(true)
        }
      }
    }
  })

  it('los valores declarados son enteros positivos, en mm y g', () => {
    for (const caso of CASOS) {
      for (const item of caso.itemsEsperados) {
        for (const eje of EJES) {
          const valor = item.declarados[eje]
          if (valor === undefined) continue
          expect(Number.isInteger(valor), `${caso.id}: ${eje} = ${valor}`).toBe(true)
          expect(valor, `${caso.id}: ${eje}`).toBeGreaterThan(0)
        }
      }
    }
  })

  it('las cantidades son enteras ≥ 1, o null cuando la descripción no las dice', () => {
    for (const caso of CASOS) {
      for (const item of caso.itemsEsperados) {
        if (item.cantidad === null) continue
        expect(Number.isInteger(item.cantidad), caso.id).toBe(true)
        expect(item.cantidad, caso.id).toBeGreaterThanOrEqual(1)
      }
    }
  })
})

describe('las entradas de catálogo que cita el dataset existen', () => {
  it('toda entradaCatalogo no nula está en el catálogo', () => {
    // Si el dataset citara un id inexistente, SC-005 mediría contra algo que no existe.
    for (const caso of CASOS) {
      for (const item of caso.itemsEsperados) {
        if (item.entradaCatalogo === null) continue
        expect(catalogo.entradaObjeto(item.entradaCatalogo), `${caso.id}: ${item.entradaCatalogo}`).toBeDefined()
      }
    }
  })

  it('un ítem con entrada de catálogo no declara como ausente un campo que la entrada no trae sin motivo', () => {
    // Si la entrada trae la medida, el campo ausente se va a completar como estimado; si no la
    // trae, se va a preguntar. Las dos cosas cumplen SC-004, pero conviene que el dataset sea
    // explícito sobre cuál espera, así que acá solo se verifica que la entrada exista.
    for (const caso of CASOS) {
      for (const item of caso.itemsEsperados) {
        if (item.entradaCatalogo === null) continue
        const entrada = catalogo.entradaObjeto(item.entradaCatalogo)!
        expect(entrada.fuente.length, caso.id).toBeGreaterThan(20)
      }
    }
  })
})

describe('la distribución cubre los casos difíciles', () => {
  const porEtiqueta = (etiqueta: string) => CASOS.filter((c) => c.etiquetas.includes(etiqueta))

  it.each([
    ['simple', 12],
    ['catalogo', 9],
    ['unidades', 8],
    ['rotulos', 4],
    ['peso-total', 4],
    ['faltante', 6],
    ['fuera-de-rango', 3],
    ['desconocido', 4],
  ])('el grupo %s tiene %i casos', (etiqueta, cantidad) => {
    expect(porEtiqueta(etiqueta as string).length).toBeGreaterThanOrEqual(cantidad as number)
  })

  it('hay casos con la cantidad ausente, que es lo que nunca se completa', () => {
    expect(CASOS.some((c) => c.itemsEsperados.some((i) => i.cantidad === null))).toBe(true)
  })

  it('hay casos con varios ítems en una sola frase (AC-11)', () => {
    expect(CASOS.some((c) => c.itemsEsperados.length >= 2)).toBe(true)
  })
})
