import { describe, expect, it } from 'vitest'
import { colocacionDe, contenedorDe, disposicionDe, tipoDe } from './fixtures'
import { validar } from './validar'

const contenedor = contenedorDe(2000, 1000, 1000, 1_000_000)
const tipos = [
  tipoDe({ id: 'c', largo: 600, ancho: 400, alto: 300, peso: 10_000 }),
  tipoDe({ id: 'fragil', largo: 600, ancho: 400, alto: 300, peso: 5_000, pesoMaximoEncima: 1_000 }),
  tipoDe({ id: 'tambor', largo: 585, ancho: 585, alto: 877, peso: 100_000, noApilable: true }),
]

describe('una disposición sana pasa', () => {
  it('dos bultos apilados bien', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 1, x: 0, y: 0, z: 300 }),
    ])
    expect(validar(d, contenedor, tipos)).toEqual({ valida: true })
  })

  it('la disposición vacía pasa: no hay nada imposible en no colocar nada', () => {
    expect(validar(disposicionDe([]), contenedor, tipos).valida).toBe(true)
  })
})

describe('las cinco razones de rechazo', () => {
  it('superposición', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 1, x: 100, y: 0, z: 0 }),
    ])
    const r = validar(d, contenedor, tipos)
    expect(r.valida).toBe(false)
    if (!r.valida) expect(r.motivo).toBe('superposicion')
  })

  it('fuera de los límites', () => {
    const d = disposicionDe([colocacionDe({ itemId: 'c', x: 1900, y: 0, z: 0 })])
    const r = validar(d, contenedor, tipos)
    if (!r.valida) expect(r.motivo).toBe('fuera-de-limites')
    else expect.unreachable('tendría que haber fallado')
  })

  it('apoyo insuficiente: un bulto flotando', () => {
    const d = disposicionDe([colocacionDe({ itemId: 'c', x: 0, y: 0, z: 600 })])
    const r = validar(d, contenedor, tipos)
    if (!r.valida) expect(r.motivo).toBe('apoyo-insuficiente')
    else expect.unreachable('tendría que haber fallado')
  })

  it('carga máxima excedida', () => {
    const chico = contenedorDe(5000, 1000, 2000, 50_000)
    const d = disposicionDe([
      colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 1, x: 600, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 2, x: 1200, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 3, x: 1800, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 4, x: 2400, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 5, x: 3000, y: 0, z: 0 }),
    ])
    const r = validar(d, chico, tipos)
    if (!r.valida) expect(r.motivo).toBe('carga-maxima-excedida')
    else expect.unreachable('tendría que haber fallado')
  })

  it('peso encima excedido', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'fragil', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 300 }),
    ])
    const r = validar(d, contenedor, tipos)
    if (!r.valida) expect(r.motivo).toBe('peso-maximo-encima-excedido')
    else expect.unreachable('tendría que haber fallado')
  })

  it('algo apoyado sobre un no apilable', () => {
    // Contenedor más alto a propósito: el tambor mide 877 y la caja encima llega a 1.177, así
    // que con el de 1.000 fallaría por límites antes de llegar a la marca.
    const alto = contenedorDe(2000, 1000, 2000, 1_000_000)
    const d = disposicionDe([
      colocacionDe({ itemId: 'tambor', indice: 0, x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 877 }),
    ])
    const r = validar(d, alto, tipos)
    if (!r.valida) expect(r.motivo).toBe('no-apilable-con-carga-encima')
    else expect.unreachable('tendría que haber fallado')
  })
})

describe('el rechazo dice QUÉ bulto, para poder informarlo (FR-028)', () => {
  it('nombra el bulto culpable', () => {
    const d = disposicionDe([colocacionDe({ itemId: 'c', indice: 7, x: 0, y: 0, z: 600 })])
    const r = validar(d, contenedor, tipos)
    if (!r.valida) expect(r.bulto).toEqual({ itemId: 'c', indice: 7 })
    else expect.unreachable('tendría que haber fallado')
  })
})

describe('un bulto cuyo tipo no existe se rechaza en vez de ignorarse', () => {
  it('no se asume nada sobre un tipo desconocido', () => {
    const d = disposicionDe([colocacionDe({ itemId: 'fantasma', x: 0, y: 0, z: 0 })])
    expect(validar(d, contenedor, tipos).valida).toBe(false)
  })
})

describe('AC-24 — se valida cada prefijo, no solo la disposición final', () => {
  it('una pila armada de arriba hacia abajo se rechaza, aunque la final se vea sana', () => {
    // Al final todo está apoyado; pero en el prefijo de 1 bulto, el primero flota.
    const d = disposicionDe([
      colocacionDe({ itemId: 'c', indice: 0, x: 0, y: 0, z: 300 }),
      colocacionDe({ itemId: 'c', indice: 1, x: 0, y: 0, z: 0 }),
    ])
    const r = validar(d, contenedor, tipos)
    expect(r.valida).toBe(false)
    if (!r.valida) expect(r.motivo).toBe('apoyo-insuficiente')
  })
})
