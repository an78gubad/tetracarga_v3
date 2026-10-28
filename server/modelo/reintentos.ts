/**
 * El dueño del presupuesto de 10 s y de los 3 intentos (FR-016).
 *
 * Envuelve a cualquier `Modelo`, así que la política de reintentos no se duplica en cada
 * implementación: la implementación traduce errores, esto decide si vale la pena volver.
 */

import type {
  Modelo,
  PedidoInterpretacion,
  ResultadoInterpretacion,
} from './interfaz.js'

export const INTENTOS_MAXIMOS = 3
/**
 * El presupuesto total, punta a punta (FR-016, RNF-01).
 *
 * Eran 10 s y **se subió a 20 después de medir**: el p95 del proveedor es 16,5 s con
 * `deepseek-flash` y 22,6 s con `deepseek-v4-pro`, así que los 10 s no eran alcanzables con
 * ninguno de los dos. La mediana sigue siendo 3,2 s: lo que este número tolera es el peor 5%.
 */
export const PRESUPUESTO_MS = 20_000

/**
 * Espera antes del intento n (1-based): nada antes del primero, 500 ms antes del segundo,
 * 1.500 ms antes del tercero.
 *
 * Un límite de velocidad reintentado al instante vuelve a fallar igual; una espera larga se
 * come el presupuesto.
 */
export const ESPERAS_MS: readonly number[] = [0, 500, 1_500]

export type Reloj = {
  readonly ahora: () => number
  readonly esperar: (ms: number) => Promise<void>
}

export const relojReal: Reloj = {
  ahora: () => Date.now(),
  esperar: (ms) => new Promise((listo) => setTimeout(listo, ms)),
}

export type ResultadoConIntentos = {
  readonly resultado: ResultadoInterpretacion
  readonly intentos: number
  /** `true` si se cortó porque no quedaba presupuesto, no porque se agotaran los intentos. */
  readonly presupuestoAgotado: boolean
}

/**
 * Llama al modelo reintentando solo las fallas transitorias —y la respuesta vacía, que es un
 * modo de falla documentado del proveedor— dentro del presupuesto.
 *
 * `arranqueMs` es **el momento en que el pedido entró al intermediario**, no el momento en que
 * se llama a esta función: FR-016 mide los 10 s punta a punta, y lo que pasó antes —validar el
 * cuerpo, medir el largo, contar el pedido por IP— también cuenta. Si no se pasa, el
 * presupuesto arranca acá, que es lo correcto solo cuando nadie llamó antes.
 *
 * El reloj se inyecta para que los tests no tarden 2 segundos en verificar las esperas.
 */
export async function interpretarConReintentos(
  modelo: Modelo,
  pedido: PedidoInterpretacion,
  reloj: Reloj = relojReal,
  arranqueMs?: number,
): Promise<ResultadoConIntentos> {
  const arranque = arranqueMs ?? reloj.ahora()
  const restante = () => PRESUPUESTO_MS - (reloj.ahora() - arranque)

  let ultimo: ResultadoInterpretacion = { tipo: 'vacia' }

  for (let intento = 1; intento <= INTENTOS_MAXIMOS; intento++) {
    const espera = ESPERAS_MS[intento - 1] ?? 0

    // Si lo que queda no alcanza para la espera más un intento, se corta sin esperar: dormir
    // 1,5 s para descubrir después que no hay tiempo de llamar no tiene sentido.
    if (restante() <= espera) {
      return { resultado: falla(), intentos: intento - 1, presupuestoAgotado: true }
    }
    if (espera > 0) await reloj.esperar(espera)

    // El intento no puede durar más que lo que queda del presupuesto: así los 10 s de FR-016
    // se cumplen de verdad y no solo al decidir si arrancar otro intento.
    ultimo = await modelo.interpretar(pedido, { topeMs: Math.max(1, restante()) })

    if (ultimo.tipo === 'items') {
      return { resultado: ultimo, intentos: intento, presupuestoAgotado: false }
    }
    // Una falla definitiva corta en el primer intento: reintentar una clave equivocada o un
    // saldo agotado vuelve a fallar igual y quema el presupuesto.
    if (ultimo.tipo === 'falla' && !ultimo.falla.transitoria) {
      return { resultado: ultimo, intentos: intento, presupuestoAgotado: false }
    }
    if (restante() <= 0) {
      return { resultado: falla(), intentos: intento, presupuestoAgotado: true }
    }
  }

  // Agotados los intentos sobre algo transitorio: se informa falla del proveedor, no vacío.
  // El usuario tiene que poder distinguir "el proveedor no contesta" de "no entendí tu texto".
  return { resultado: falla('intentos-agotados'), intentos: INTENTOS_MAXIMOS, presupuestoAgotado: false }
}

function falla(codigo = 'presupuesto-agotado'): ResultadoInterpretacion {
  return { tipo: 'falla', falla: { transitoria: true, codigo } }
}
