import { describe, expect, it } from 'vitest'
import { itemDe } from './fixtures'
import { ordenarParaColocar } from './orden'

describe('el orden de colocación (CONTEXTO.md, ya medido)', () => {
  it('los no apilables van AL FINAL, no primero', () => {
    // Puestos primero tapizan el piso y nada puede apoyarse encima: llevó un escenario de
    // tambores y cajas de 45,1% a 91,0%. No se vuelve a investigar.
    const chico = itemDe({ id: 'chico', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1 })
    const grandeNoApilable = itemDe({
      id: 'tambor', cantidad: 1, largo: 585, ancho: 585, alto: 877, peso: 1, noApilable: true,
    })
    expect(ordenarParaColocar([grandeNoApilable, chico]).map((i) => i.id)).toEqual(['chico', 'tambor'])
  })

  it('después, volumen decreciente', () => {
    const a = itemDe({ id: 'a', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1 })
    const b = itemDe({ id: 'b', cantidad: 1, largo: 200, ancho: 200, alto: 200, peso: 1 })
    const c = itemDe({ id: 'c', cantidad: 1, largo: 150, ancho: 150, alto: 150, peso: 1 })
    expect(ordenarParaColocar([a, b, c]).map((i) => i.id)).toEqual(['b', 'c', 'a'])
  })

  it('a igual volumen, primero el que aguanta MÁS peso encima', () => {
    // Un frágil abajo le pone techo a toda la pila. Llevó el escenario de frágiles de 33,5% a
    // 70,9%.
    const fragil = itemDe({ id: 'fragil', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1, pesoMaximoEncima: 10_000 })
    const robusto = itemDe({ id: 'robusto', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1, pesoMaximoEncima: 500_000 })
    expect(ordenarParaColocar([fragil, robusto]).map((i) => i.id)).toEqual(['robusto', 'fragil'])
  })

  it('un ítem sin tope declarado se trata como el que más aguanta', () => {
    // Sin límite declarado no hay techo que respetar, así que va primero.
    const sinTope = itemDe({ id: 'sinTope', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1 })
    const conTope = itemDe({ id: 'conTope', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1, pesoMaximoEncima: 50_000 })
    expect(ordenarParaColocar([conTope, sinTope]).map((i) => i.id)).toEqual(['sinTope', 'conTope'])
  })

  it('los frágiles NO van al final: cuando son el grueso de la carga quedan afuera enteros', () => {
    // Mandarlos al final llevó un escenario de heladeras de 51 colocadas a 3 (CONTEXTO.md).
    const fragilGrande = itemDe({ id: 'heladera', cantidad: 1, largo: 700, ancho: 700, alto: 1800, peso: 1, pesoMaximoEncima: 5_000 })
    const cajaChica = itemDe({ id: 'caja', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1 })
    expect(ordenarParaColocar([cajaChica, fragilGrande])[0]!.id).toBe('heladera')
  })

  it('el orden NO depende del orden de la lista de entrada (FR-009)', () => {
    const items = [
      itemDe({ id: 'a', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1 }),
      itemDe({ id: 'b', cantidad: 1, largo: 200, ancho: 200, alto: 200, peso: 1 }),
      itemDe({ id: 'c', cantidad: 1, largo: 300, ancho: 300, alto: 300, peso: 1, noApilable: true }),
    ]
    const esperado = ordenarParaColocar(items).map((i) => i.id)
    expect(ordenarParaColocar([...items].reverse()).map((i) => i.id)).toEqual(esperado)
    expect(ordenarParaColocar([items[1]!, items[2]!, items[0]!]).map((i) => i.id)).toEqual(esperado)
  })

  it('a igual volumen y tope, desempata por id para no depender del orden de entrada', () => {
    const x = itemDe({ id: 'x', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1 })
    const y = itemDe({ id: 'y', cantidad: 1, largo: 100, ancho: 100, alto: 100, peso: 1 })
    expect(ordenarParaColocar([y, x]).map((i) => i.id)).toEqual(['x', 'y'])
  })
})
