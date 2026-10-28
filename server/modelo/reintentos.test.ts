import { describe, expect, it } from 'vitest'
import { clasificar } from './deepseek.js'
import type { Modelo, PedidoInterpretacion } from './interfaz.js'
import { crearModeloDePrueba, respuestas } from './prueba.js'
import {
  ESPERAS_MS,
  INTENTOS_MAXIMOS,
  PRESUPUESTO_MS,
  interpretarConReintentos,
  type Reloj,
} from './reintentos.js'

const PEDIDO: PedidoInterpretacion = { descripcion: '40 cajas', catalogo: [] }

/** Reloj falso: avanza solo cuando alguien espera. Los tests no tardan 2 segundos. */
function relojFalso(avancePorLlamada = 0) {
  let t = 0
  const esperas: number[] = []
  const reloj: Reloj = {
    ahora: () => {
      t += avancePorLlamada
      return t
    },
    esperar: (ms) => {
      esperas.push(ms)
      t += ms
      return Promise.resolve()
    },
  }
  return { reloj, esperas, avanzar: (ms: number) => (t += ms) }
}

describe('reintentos sobre fallas transitorias (FR-016)', () => {
  it('devuelve los ítems en el primer intento cuando sale bien', async () => {
    const modelo = crearModeloDePrueba([respuestas.items({ nombre: 'cajas' })])
    const { reloj } = relojFalso()
    const r = await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(r.resultado.tipo).toBe('items')
    expect(r.intentos).toBe(1)
    expect(modelo.llamadas()).toBe(1)
  })

  it('hace 3 intentos y no 4', async () => {
    const modelo = crearModeloDePrueba([respuestas.fallaTransitoria()])
    const { reloj } = relojFalso()
    const r = await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(modelo.llamadas()).toBe(INTENTOS_MAXIMOS)
    expect(r.intentos).toBe(3)
    expect(r.resultado.tipo).toBe('falla')
  })

  it('una respuesta vacía se reintenta: es un modo de falla del proveedor (AC-20)', async () => {
    const modelo = crearModeloDePrueba([
      respuestas.vacia(),
      respuestas.vacia(),
      respuestas.items({ nombre: 'cajas' }),
    ])
    const { reloj } = relojFalso()
    const r = await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(r.resultado.tipo).toBe('items')
    expect(modelo.llamadas()).toBe(3)
  })

  it('una falla definitiva corta en el primer intento', async () => {
    const modelo = crearModeloDePrueba([respuestas.fallaDefinitiva('401')])
    const { reloj } = relojFalso()
    const r = await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(modelo.llamadas()).toBe(1)
    expect(r.intentos).toBe(1)
  })

  it('agotados los intentos informa falla y no vacío', async () => {
    // El usuario tiene que distinguir "el proveedor no contesta" de "no entendí tu texto".
    const modelo = crearModeloDePrueba([respuestas.vacia()])
    const { reloj } = relojFalso()
    const r = await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(r.resultado.tipo).toBe('falla')
  })
})

describe('las esperas entre intentos', () => {
  it('no espera antes del primero, 500 ms antes del segundo y 1.500 antes del tercero', async () => {
    const modelo = crearModeloDePrueba([respuestas.fallaTransitoria()])
    const { reloj, esperas } = relojFalso()
    await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(esperas).toEqual([500, 1500])
    expect(ESPERAS_MS).toEqual([0, 500, 1500])
  })

  it('no espera si el intento sale bien', async () => {
    const modelo = crearModeloDePrueba([respuestas.items({ nombre: 'cajas' })])
    const { reloj, esperas } = relojFalso()
    await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(esperas).toEqual([])
  })
})

describe('el presupuesto de 10 s', () => {
  it('corta sin esperar si lo que queda no alcanza para la espera más un intento', async () => {
    const modelo = crearModeloDePrueba([respuestas.fallaTransitoria()])
    const { reloj, esperas, avanzar } = relojFalso()
    // El primer intento falla y después queda menos de 500 ms: no tiene sentido dormir.
    const modeloLento: Modelo = {
      interpretar: async (p) => {
        avanzar(PRESUPUESTO_MS - 200)
        return modelo.interpretar(p)
      },
    }
    const r = await interpretarConReintentos(modeloLento, PEDIDO, reloj)
    expect(esperas).toEqual([])
    expect(r.presupuestoAgotado).toBe(true)
    expect(modelo.llamadas()).toBe(1)
  })

  it('no arranca ningún intento si el presupuesto ya venía agotado', async () => {
    // El presupuesto se mide desde que el pedido entró al intermediario, no desde acá: lo que
    // se gastó antes también cuenta (FR-016).
    const modelo = crearModeloDePrueba([respuestas.items({ nombre: 'cajas' })])
    const { reloj, avanzar } = relojFalso()
    const entroAlIntermediario = 0
    avanzar(PRESUPUESTO_MS + 1)
    const r = await interpretarConReintentos(modelo, PEDIDO, reloj, entroAlIntermediario)
    expect(modelo.llamadas()).toBe(0)
    expect(r.presupuestoAgotado).toBe(true)
    expect(r.resultado.tipo).toBe('falla')
  })
})

describe('clasificación de los códigos del proveedor', () => {
  it.each([429, 500, 503])('%i es transitorio: se reintenta', (estado) => {
    expect(clasificar(estado).transitoria).toBe(true)
  })

  it.each([400, 401, 402, 422])('%i es definitivo: no se reintenta', (estado) => {
    expect(clasificar(estado).transitoria).toBe(false)
  })

  it('401 y 402 se distinguen entre sí: no es lo mismo clave mala que saldo agotado', () => {
    expect(clasificar(401).codigo).toBe('credencial-invalida')
    expect(clasificar(402).codigo).toBe('saldo-agotado')
  })

  it('un código no documentado se trata como transitorio', () => {
    // Reintentar una vez de más es más seguro que descartar un pedido que podía salir bien.
    expect(clasificar(418).transitoria).toBe(true)
  })
})

describe('cada intento recibe como tope lo que queda del presupuesto', () => {
  it('el primer intento recibe casi los 10 s completos', async () => {
    const topes: (number | undefined)[] = []
    const modelo: Modelo = {
      interpretar: (_p, o) => {
        topes.push(o?.topeMs)
        return Promise.resolve(respuestas.items({ nombre: 'cajas' }))
      },
    }
    const { reloj } = relojFalso()
    await interpretarConReintentos(modelo, PEDIDO, reloj)
    expect(topes[0]).toBe(PRESUPUESTO_MS)
  })

  it('cada reintento recibe menos, descontando la espera y lo ya gastado', async () => {
    const topes: (number | undefined)[] = []
    const { reloj, avanzar } = relojFalso()
    const modelo: Modelo = {
      interpretar: (_p, o) => {
        topes.push(o?.topeMs)
        avanzar(2_000) // cada intento tarda 2 s
        return Promise.resolve(respuestas.fallaTransitoria())
      },
    }
    await interpretarConReintentos(modelo, PEDIDO, reloj)
    // Del presupuesto se descuentan los 2 s de cada intento y las esperas de 500 y 1.500 ms.
    expect(topes).toEqual([
      PRESUPUESTO_MS,
      PRESUPUESTO_MS - 2_000 - 500,
      PRESUPUESTO_MS - 4_000 - 2_000,
    ])
  })

  it('el tope nunca es 0 ni negativo: un intento con tope 0 fallaría al instante', async () => {
    const topes: (number | undefined)[] = []
    const { reloj, avanzar } = relojFalso()
    const modelo: Modelo = {
      interpretar: (_p, o) => {
        topes.push(o?.topeMs)
        avanzar(PRESUPUESTO_MS - 100)
        return Promise.resolve(respuestas.fallaTransitoria())
      },
    }
    await interpretarConReintentos(modelo, PEDIDO, reloj)
    for (const t of topes) expect(t).toBeGreaterThan(0)
  })
})
