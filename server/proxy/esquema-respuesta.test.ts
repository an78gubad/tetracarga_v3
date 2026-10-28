import { describe, expect, it } from 'vitest'
import { validarRespuesta } from './esquema-respuesta.js'

const CAJAS = {
  nombre: 'cajas',
  cantidad: 40,
  largo: { valor: 60, unidad: 'cm' },
  ancho: { valor: 40, unidad: 'cm' },
  alto: { valor: 30, unidad: 'cm' },
  peso: { valor: 12, unidad: 'kg' },
}

describe('la forma se valida por respuesta entera y la descarta completa (AC-26)', () => {
  it('un ítem que no es objeto invalida toda la respuesta', () => {
    expect(validarRespuesta([CAJAS, 'no soy un objeto']).tipo).toBe('forma-invalida')
  })

  it('un ítem sin nombre invalida toda la respuesta', () => {
    expect(validarRespuesta([{ cantidad: 3 }]).tipo).toBe('forma-invalida')
  })

  it('una medida que no es {valor, unidad} invalida toda la respuesta', () => {
    expect(validarRespuesta([{ nombre: 'cajas', largo: 60 }]).tipo).toBe('forma-invalida')
    expect(validarRespuesta([{ nombre: 'cajas', largo: { valor: 60 } }]).tipo).toBe('forma-invalida')
  })

  it('un idCatalogo que no es texto invalida toda la respuesta', () => {
    expect(validarRespuesta([{ nombre: 'cajas', idCatalogo: 7 }]).tipo).toBe('forma-invalida')
  })

  it('la respuesta bien formada pasa', () => {
    const r = validarRespuesta([CAJAS])
    expect(r.tipo).toBe('ok')
  })
})

describe('el rango se valida ítem por ítem y no descarta el resto (AC-27)', () => {
  it('"-5 cajas" deja la cantidad faltante: no queda en 5 ni en -5', () => {
    const r = validarRespuesta([{ nombre: 'cajas', cantidad: -5, largo: { valor: 60, unidad: 'cm' } }])
    expect(r.tipo).toBe('ok')
    if (r.tipo !== 'ok') return
    expect(r.items[0]).not.toHaveProperty('cantidad')
    expect(r.descartados).toEqual([
      { nombreItem: 'cajas', campo: 'cantidad', motivo: 'valor-fuera-de-rango' },
    ])
    // El resto del ítem sobrevive: el largo sigue ahí.
    expect(r.items[0]).toHaveProperty('largo')
  })

  it.each([0, -5, 2.5, -0])('una cantidad de %s no se toma como dato declarado', (cantidad) => {
    const r = validarRespuesta([{ nombre: 'cajas', cantidad }])
    expect(r.tipo).toBe('ok')
    if (r.tipo !== 'ok') return
    expect(r.items[0]).not.toHaveProperty('cantidad')
    expect(r.descartados).toHaveLength(1)
  })

  it('NO se salva por su valor absoluto: -5 no se convierte en 5', () => {
    const r = validarRespuesta([{ nombre: 'cajas', cantidad: -5 }])
    if (r.tipo !== 'ok') throw new Error('debería ser ok')
    expect(JSON.stringify(r.items[0])).not.toContain('5')
  })

  it('un ítem con un valor malo no arrastra a los otros 39', () => {
    const r = validarRespuesta([
      CAJAS,
      { nombre: 'cajas chicas', cantidad: -5 },
      { nombre: 'tambores', cantidad: 15 },
    ])
    if (r.tipo !== 'ok') throw new Error('debería ser ok')
    expect(r.items).toHaveLength(3)
    expect(r.items[0]).toHaveProperty('cantidad', 40)
    expect(r.items[2]).toHaveProperty('cantidad', 15)
    expect(r.descartados).toHaveLength(1)
  })

  it.each(['largo', 'ancho', 'alto', 'peso'])('un %s de 0 o negativo queda faltante', (campo) => {
    for (const valor of [0, -1]) {
      const r = validarRespuesta([{ nombre: 'cajas', [campo]: { valor, unidad: 'cm' } }])
      if (r.tipo !== 'ok') throw new Error('debería ser ok')
      expect(r.items[0]).not.toHaveProperty(campo)
      expect(r.descartados[0]?.campo).toBe(campo)
    }
  })

  it('una respuesta sana no descarta nada', () => {
    const r = validarRespuesta([CAJAS])
    if (r.tipo !== 'ok') throw new Error('debería ser ok')
    expect(r.descartados).toEqual([])
    expect(r.items[0]).toEqual(CAJAS)
  })

  it('la capacidad en litros pasa tal cual: es una clave, no una medida', () => {
    const r = validarRespuesta([
      { nombre: 'tambores', cantidad: 15, capacidad: { valor: 200, unidad: 'l' }, idCatalogo: 'tambor-215l' },
    ])
    if (r.tipo !== 'ok') throw new Error('debería ser ok')
    expect(r.items[0]).toHaveProperty('capacidad')
    expect(r.items[0]).toHaveProperty('idCatalogo', 'tambor-215l')
  })
})
