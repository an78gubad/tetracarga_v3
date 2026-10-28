import { describe, expect, it } from 'vitest'
import type { ItemPropuesto } from '../modelo/interfaz.js'
import { crearModeloDePrueba, respuestas } from '../modelo/prueba.js'
import type { Reloj } from '../modelo/reintentos.js'
import { crearContadorPorIp, ipDelPedido, LIMITE_POR_MINUTO } from './limite-ip.js'
import { LARGO_MAXIMO, manejar, type PedidoEntrante } from './manejador.js'

function relojFalso() {
  let t = 0
  const reloj: Reloj = { ahora: () => t, esperar: (ms) => ((t += ms), Promise.resolve()) }
  return { reloj, avanzar: (ms: number) => (t += ms) }
}

function pedido(descripcion: unknown, ip = '203.0.113.7'): PedidoEntrante {
  return { cuerpo: { descripcion }, encabezados: { 'x-forwarded-for': ip } }
}

function entorno(guion = [respuestas.items({ nombre: 'cajas', cantidad: 40 })]) {
  const modelo = crearModeloDePrueba(guion)
  const { reloj, avanzar } = relojFalso()
  return {
    modelo,
    avanzar,
    deps: { modelo, catalogo: [], contador: crearContadorPorIp(), reloj },
  }
}

describe('el camino que sale bien', () => {
  it('devuelve los ítems', async () => {
    const { deps } = entorno()
    const r = await manejar(pedido('40 cajas de 60x40x30'), deps)
    expect(r.estado).toBe(200)
    expect(r.cuerpo.items).toHaveLength(1)
  })

  it('le pasa al modelo la descripción tal como vino', async () => {
    const { modelo, deps } = entorno()
    await manejar(pedido('40 cajas'), deps)
    expect(modelo.pedidos[0]?.descripcion).toBe('40 cajas')
  })
})

describe('descripción demasiado larga (AC-25)', () => {
  it('2.001 caracteres se rechazan con el límite en el mensaje', async () => {
    const { deps } = entorno()
    const r = await manejar(pedido('x'.repeat(LARGO_MAXIMO + 1)), deps)
    expect(r.estado).toBe(413)
    expect(r.cuerpo.codigo).toBe('descripcion-demasiado-larga')
    expect(r.cuerpo.mensaje).toContain(String(LARGO_MAXIMO))
  })

  it('CERO llamadas al proveedor', async () => {
    const { modelo, deps } = entorno()
    await manejar(pedido('x'.repeat(LARGO_MAXIMO + 1)), deps)
    expect(modelo.llamadas()).toBe(0)
  })

  it('exactamente 2.000 pasa: el límite es "más de 2.000"', async () => {
    const { deps } = entorno()
    const r = await manejar(pedido('x'.repeat(LARGO_MAXIMO)), deps)
    expect(r.estado).toBe(200)
  })

  it('cuenta puntos de código, no unidades UTF-16', async () => {
    // 2.000 emojis son 2.000 caracteres para quien escribe, y 4.000 unidades UTF-16.
    const { deps } = entorno()
    const r = await manejar(pedido('🧊'.repeat(LARGO_MAXIMO)), deps)
    expect(r.estado).toBe(200)
  })
})

describe('límite por IP (AC-29, SC-014)', () => {
  it('el pedido 11 del mismo minuto se rechaza con el límite en el mensaje', async () => {
    const { deps } = entorno()
    for (let i = 0; i < LIMITE_POR_MINUTO; i++) {
      expect((await manejar(pedido('40 cajas'), deps)).estado).toBe(200)
    }
    const r = await manejar(pedido('40 cajas'), deps)
    expect(r.estado).toBe(429)
    expect(r.cuerpo.codigo).toBe('limite-de-pedidos')
    expect(r.cuerpo.mensaje).toContain(String(LIMITE_POR_MINUTO))
  })

  it('CERO llamadas al proveedor por los pedidos rechazados', async () => {
    const { modelo, deps } = entorno()
    for (let i = 0; i < LIMITE_POR_MINUTO + 5; i++) await manejar(pedido('40 cajas'), deps)
    expect(modelo.llamadas()).toBe(LIMITE_POR_MINUTO)
  })

  it('otra IP no queda afectada', async () => {
    const { deps } = entorno()
    for (let i = 0; i < LIMITE_POR_MINUTO + 1; i++) await manejar(pedido('40 cajas', '1.1.1.1'), deps)
    expect((await manejar(pedido('40 cajas', '2.2.2.2'), deps)).estado).toBe(200)
  })

  it('pasado el minuto se vuelve a permitir', async () => {
    const { deps, avanzar } = entorno()
    for (let i = 0; i < LIMITE_POR_MINUTO; i++) await manejar(pedido('40 cajas'), deps)
    expect((await manejar(pedido('40 cajas'), deps)).estado).toBe(429)
    avanzar(60_001)
    expect((await manejar(pedido('40 cajas'), deps)).estado).toBe(200)
  })
})

describe('cuerpo mal formado', () => {
  it.each([undefined, null, 42, { otra: 'cosa' }])('%s se rechaza con 400', async (cuerpo) => {
    const { modelo, deps } = entorno()
    const r = await manejar({ cuerpo, encabezados: {} }, deps)
    expect(r.estado).toBe(400)
    expect(r.cuerpo.codigo).toBe('cuerpo-invalido')
    expect(modelo.llamadas()).toBe(0)
  })
})

describe('fallas del proveedor', () => {
  it('una falla definitiva devuelve 502 sin filtrar nada del proveedor', async () => {
    const { deps } = entorno([respuestas.fallaDefinitiva('401')])
    const r = await manejar(pedido('40 cajas'), deps)
    expect(r.estado).toBe(502)
    expect(r.cuerpo.codigo).toBe('falla-del-proveedor')
    // Ni el código crudo ni nada que delate al proveedor (FR-015).
    const texto = JSON.stringify(r.cuerpo)
    expect(texto).not.toContain('401')
    expect(texto.toLowerCase()).not.toContain('deepseek')
  })

  it('el mensaje dice que la falla NO es de la descripción (FR-026)', async () => {
    const { deps } = entorno([respuestas.fallaTransitoria()])
    const r = await manejar(pedido('40 cajas'), deps)
    expect(r.cuerpo.mensaje).toMatch(/no es un error de tu descripción/i)
  })

  it('falta de credencial se distingue de credencial inválida', async () => {
    const { reloj } = relojFalso()
    const r = await manejar(pedido('40 cajas'), {
      modelo: null,
      catalogo: [],
      contador: crearContadorPorIp(),
      reloj,
    })
    expect(r.cuerpo.codigo).toBe('proveedor-no-configurado')
  })

  it('un proyecto sin configurar igual cuenta contra el límite por IP', async () => {
    // Si no contara, estar sin configurar sería una forma de quedar exento del tope.
    const { reloj } = relojFalso()
    const deps = { modelo: null, catalogo: [], contador: crearContadorPorIp(), reloj }
    for (let i = 0; i < LIMITE_POR_MINUTO; i++) await manejar(pedido('40 cajas'), deps)
    expect((await manejar(pedido('40 cajas'), deps)).estado).toBe(429)
  })
})

describe('respuesta vacía o fuera de forma se trata como "sin ítems"', () => {
  it('vacía tras los 3 intentos devuelve 502: es falla del proveedor, no silencio', async () => {
    const { deps } = entorno([respuestas.vacia()])
    const r = await manejar(pedido('40 cajas'), deps)
    expect(r.estado).toBe(502)
  })

  it('una respuesta con la forma mal devuelve sin-items y no rompe', async () => {
    // Un ítem sin nombre: el tipo no lo admite, y es exactamente lo que se quiere probar —que
    // el intermediario aguante una respuesta que no cumple la forma.
    const malFormado = [{ sinNombre: true }] as unknown as ItemPropuesto[]
    const { deps } = entorno([{ tipo: 'items', items: malFormado }])
    const r = await manejar(pedido('40 cajas'), deps)
    expect(r.estado).toBe(200)
    expect(r.cuerpo.codigo).toBe('sin-items')
  })
})

describe('de dónde sale la IP', () => {
  it('del primer valor de x-forwarded-for, que es el cliente', () => {
    expect(ipDelPedido({ 'x-forwarded-for': '203.0.113.7, 10.0.0.1, 10.0.0.2' })).toBe('203.0.113.7')
  })

  it('cae a remoteAddress si no hay encabezado', () => {
    expect(ipDelPedido({}, '192.0.2.9')).toBe('192.0.2.9')
  })

  it('no explota si no hay ninguno de los dos', () => {
    expect(ipDelPedido({})).toBe('desconocida')
  })
})
