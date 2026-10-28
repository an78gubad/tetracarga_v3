/**
 * Las tres marcas de FR-008, verificadas con la cuenta **propia** del validador.
 *
 * Son los mismos criterios que fija `src/acomodador/marcas.test.ts`, mirados desde el otro
 * lado: ahí se verifica que el acomodador los respete al colocar, acá que el validador los
 * detecte si alguien los viola. Que los dos tests existan por separado es el Principio II.
 */

import { describe, expect, it } from 'vitest'
import { colocacionDe, contenedorDe, disposicionDe, tipoDe } from './fixtures'
import { pesoEncimaExcedido, pesoRecibidoPorBulto } from './peso'
import { validar } from './validar'

const GRANDE = contenedorDe(3000, 2000, 3000, 10_000_000)

describe('AC-04 — nada se apoya sobre un no apilable', () => {
  const tipos = [
    tipoDe({ id: 'tambor', largo: 600, ancho: 600, alto: 800, peso: 200_000, noApilable: true }),
    tipoDe({ id: 'caja', largo: 600, ancho: 600, alto: 300, peso: 10_000 }),
  ]

  it('una caja encima de un tambor se rechaza', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'tambor', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'caja', x: 0, y: 0, z: 800 }),
    ])
    const r = validar(d, GRANDE, tipos)
    expect(r.valida).toBe(false)
    if (!r.valida) expect(r.motivo).toBe('no-apilable-con-carga-encima')
  })

  it('una caja AL LADO del tambor pasa: al lado no es encima', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'tambor', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'caja', x: 600, y: 0, z: 0 }),
    ])
    expect(validar(d, GRANDE, tipos).valida).toBe(true)
  })

  it('una caja apenas apoyada sobre el tambor también se rechaza', () => {
    // No hay "un poquito encima": cualquier área de contacto mayor que 0 cuenta.
    const d = disposicionDe([
      colocacionDe({ itemId: 'tambor', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'caja', x: 599, y: 0, z: 800 }),
    ])
    expect(validar(d, GRANDE, tipos).valida).toBe(false)
  })

  it('el tambor solo pasa, y también apilado sobre OTRA cosa', () => {
    // No apilable significa que no admite carga encima, no que no pueda ir arriba.
    const d = disposicionDe([
      colocacionDe({ itemId: 'caja', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'tambor', x: 0, y: 0, z: 300 }),
    ])
    expect(validar(d, GRANDE, tipos).valida).toBe(true)
  })
})

describe('AC-06 — el tope de peso encima, con la cuenta del validador', () => {
  const tipos = [
    tipoDe({ id: 'base', largo: 600, ancho: 400, alto: 300, peso: 10_000, pesoMaximoEncima: 50_000 }),
    tipoDe({ id: 'encima', largo: 600, ancho: 400, alto: 300, peso: 25_000 }),
  ]

  it('25 kg sobre un tope de 50 pasan', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'base', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'encima', indice: 0, x: 0, y: 0, z: 300 }),
    ])
    expect(validar(d, GRANDE, tipos).valida).toBe(true)
  })

  it('50 kg justos pasan: el tope es "no supera"', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'base', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'encima', indice: 0, x: 0, y: 0, z: 300 }),
      colocacionDe({ itemId: 'encima', indice: 1, x: 0, y: 0, z: 600 }),
    ])
    expect(pesoRecibidoPorBulto(d.secuencia, tipos).get(0)).toBe(50_000)
    expect(validar(d, GRANDE, tipos).valida).toBe(true)
  })

  it('75 kg no pasan, y el peso se acumula por toda la pila', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'base', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'encima', indice: 0, x: 0, y: 0, z: 300 }),
      colocacionDe({ itemId: 'encima', indice: 1, x: 0, y: 0, z: 600 }),
      colocacionDe({ itemId: 'encima', indice: 2, x: 0, y: 0, z: 900 }),
    ])
    expect(pesoRecibidoPorBulto(d.secuencia, tipos).get(0)).toBe(75_000)
    const r = validar(d, GRANDE, tipos)
    expect(r.valida).toBe(false)
    if (!r.valida) expect(r.motivo).toBe('peso-maximo-encima-excedido')
  })

  it('el tope del de arriba también se verifica, no solo el del de abajo', () => {
    const conTopeArriba = [
      tipoDe({ id: 'base', largo: 600, ancho: 400, alto: 300, peso: 10_000 }),
      tipoDe({ id: 'medio', largo: 600, ancho: 400, alto: 300, peso: 5_000, pesoMaximoEncima: 1_000 }),
      tipoDe({ id: 'arriba', largo: 600, ancho: 400, alto: 300, peso: 40_000 }),
    ]
    const d = disposicionDe([
      colocacionDe({ itemId: 'base', x: 0, y: 0, z: 0 }),
      colocacionDe({ itemId: 'medio', x: 0, y: 0, z: 300 }),
      colocacionDe({ itemId: 'arriba', x: 0, y: 0, z: 600 }),
    ])
    expect(validar(d, GRANDE, conTopeArriba).valida).toBe(false)
  })
})

describe('AC-05 — la orientación obligatoria', () => {
  const tipos = [
    tipoDe({ id: 'parado', largo: 400, ancho: 300, alto: 700, peso: 20_000, orientacionObligatoria: true }),
  ]

  it('con el alto sobre z, pasa', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'parado', x: 0, y: 0, z: 0, orientacion: { ejeX: 'largo', ejeY: 'ancho', ejeZ: 'alto' } }),
    ])
    expect(validar(d, GRANDE, tipos).valida).toBe(true)
  })

  it('acostado, el validador lo RECHAZA', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'parado', x: 0, y: 0, z: 0, orientacion: { ejeX: 'alto', ejeY: 'ancho', ejeZ: 'largo' } }),
    ])
    const r = validar(d, GRANDE, tipos)
    expect(r.valida).toBe(false)
    if (!r.valida) expect(r.motivo).toBe('orientacion-obligatoria-violada')
  })

  it('la rotación en el plano horizontal sí se permite', () => {
    const d = disposicionDe([
      colocacionDe({ itemId: 'parado', x: 0, y: 0, z: 0, orientacion: { ejeX: 'ancho', ejeY: 'largo', ejeZ: 'alto' } }),
    ])
    expect(validar(d, GRANDE, tipos).valida).toBe(true)
  })
})
