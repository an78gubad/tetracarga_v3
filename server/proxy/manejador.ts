/**
 * El intermediario: el único punto que habla con el proveedor del modelo (FR-015).
 *
 * El **orden de los controles** es lo que vuelve medibles a AC-25, AC-29 y SC-014: los tres
 * primeros rechazan sin llamar al proveedor, y eso se puede afirmar porque el rechazo ocurre
 * antes, en este archivo.
 *
 *   1. cuerpo válido  →  2. largo ≤ 2.000  →  3. límite por IP  →  4. llamada  →  5. esquema
 */

import { interpretarConReintentos, relojReal, type Reloj } from '../modelo/reintentos.js'
import type { EntradaPrompt, Modelo } from '../modelo/interfaz.js'
import { crearContadorPorIp, ipDelPedido, type ContadorPorIp } from './limite-ip.js'
import { validarRespuesta, type CampoDescartado } from './esquema-respuesta.js'

/** El límite se cuenta en **puntos de código**: es la cuenta que coincide con lo que se ve. */
export const LARGO_MAXIMO = 2_000

export type CodigoRespuesta =
  | 'origen-no-permitido'
  | 'cuerpo-invalido'
  | 'descripcion-demasiado-larga'
  | 'limite-de-pedidos'
  | 'falla-del-proveedor'
  | 'proveedor-no-configurado'
  | 'sin-items'

export type RespuestaProxy = {
  readonly estado: number
  readonly cuerpo: {
    readonly items?: readonly unknown[]
    readonly descartados?: readonly CampoDescartado[]
    readonly codigo?: CodigoRespuesta
    readonly mensaje?: string
  }
}

export type PedidoEntrante = {
  readonly cuerpo: unknown
  readonly encabezados: Record<string, string | string[] | undefined>
  readonly remoteAddress?: string
}

function encabezado(
  encabezados: Record<string, string | string[] | undefined>,
  nombre: string,
): string | undefined {
  const valor = encabezados[nombre]
  return Array.isArray(valor) ? valor[0] : valor
}

/**
 * Lo que se registra de cada pedido.
 *
 * **Nunca la descripción del usuario ni la respuesta del modelo** (FR-029). Lo que la gente
 * escribe dice qué despacha y cuánto: es dato comercial de su empresa, no material de
 * depuración. Si hace falta reproducir un caso, se reproduce con el dataset.
 */
export type Registro = {
  readonly codigo: CodigoRespuesta | 'ok'
  readonly estado: number
  readonly duracionMs: number
  readonly intentos: number
}

export type Dependencias = {
  /** `null` cuando falta la credencial: se distingue de una credencial inválida. */
  readonly modelo: Modelo | null
  readonly catalogo: readonly EntradaPrompt[]
  readonly contador?: ContadorPorIp
  readonly reloj?: Reloj
  /**
   * Los orígenes que pueden llamar (FR-030). Vacío significa que no se verifica, que es lo
   * correcto en desarrollo y en los tests.
   */
  readonly origenesPermitidos?: readonly string[]
  readonly registrar?: (registro: Registro) => void
}

const contadorCompartido = crearContadorPorIp()

export async function manejar(
  pedido: PedidoEntrante,
  dependencias: Dependencias,
): Promise<RespuestaProxy> {
  const reloj = dependencias.reloj ?? relojReal
  const contador = dependencias.contador ?? contadorCompartido
  // El presupuesto de 10 s arranca acá: FR-016 lo mide punta a punta, así que lo que gastan
  // los controles de abajo también cuenta.
  const entroAlIntermediario = reloj.ahora()
  let intentos = 0

  /** Registra y devuelve, para que no haya un camino de salida sin registrar. */
  const salir = (respuesta: RespuestaProxy): RespuestaProxy => {
    dependencias.registrar?.({
      codigo: respuesta.cuerpo.codigo ?? 'ok',
      estado: respuesta.estado,
      duracionMs: reloj.ahora() - entroAlIntermediario,
      intentos,
    })
    return respuesta
  }

  // 0 — Origen. Antes que todo lo demás: una página ajena no tiene por qué consumir ni el
  // cupo por IP (FR-030, AC-32).
  const permitidos = dependencias.origenesPermitidos ?? []
  if (permitidos.length > 0) {
    const origen = encabezado(pedido.encabezados, 'origin')
    if (origen === undefined || !permitidos.includes(origen)) {
      return salir(rechazo(403, 'origen-no-permitido', 'Este pedido no viene de la aplicación.'))
    }
  }

  // 1 — Cuerpo
  const cuerpo = pedido.cuerpo
  const descripcion =
    typeof cuerpo === 'object' && cuerpo !== null
      ? (cuerpo as { descripcion?: unknown }).descripcion
      : undefined
  if (typeof descripcion !== 'string') {
    return salir(rechazo(400, 'cuerpo-invalido', 'El pedido tiene que traer { "descripcion": "..." }.'))
  }

  // 2 — Largo. Sin llamar al proveedor (AC-25).
  const largo = [...descripcion].length
  if (largo > LARGO_MAXIMO) {
    return salir(rechazo(
      413,
      'descripcion-demasiado-larga',
      `La descripción tiene ${largo} caracteres y el límite es ${LARGO_MAXIMO}.`,
    ))
  }

  // 3 — Límite por IP. Sin llamar al proveedor (AC-29, SC-014).
  const ip = ipDelPedido(pedido.encabezados, pedido.remoteAddress)
  const veredicto = contador.registrar(ip, reloj.ahora())
  if (!veredicto.permitido) {
    const porVentana = veredicto.ventana === 'minuto' ? 'por minuto' : 'por hora'
    return salir(rechazo(
      429,
      'limite-de-pedidos',
      `Se alcanzó el límite de ${veredicto.limite} pedidos ${porVentana}. Probá en un rato.`,
    ))
  }

  // La credencial se mira después del límite, a propósito: un proyecto sin configurar no
  // tiene por qué quedar exento del tope por IP.
  if (dependencias.modelo === null) {
    return salir(rechazo(
      502,
      'proveedor-no-configurado',
      'Falta la configuración del proveedor del modelo. Mirá .env.example.',
    ))
  }

  // 4 — La llamada, con los 3 intentos y el presupuesto
  const { resultado, intentos: hechos } = await interpretarConReintentos(
    dependencias.modelo,
    { descripcion, catalogo: dependencias.catalogo },
    reloj,
    entroAlIntermediario,
  )
  intentos = hechos

  if (resultado.tipo === 'falla') {
    // El texto crudo del proveedor NO se reenvía: por ahí se filtra su URL sin que nadie lo
    // note (FR-015). El usuario necesita saber que la falla es del proveedor, no cuál fue.
    return salir(rechazo(
      502,
      'falla-del-proveedor',
      'El proveedor del modelo no respondió. No es un error de tu descripción: podés reintentar.',
    ))
  }
  if (resultado.tipo === 'vacia') {
    return salir({ estado: 200, cuerpo: { codigo: 'sin-items', items: [], descartados: [] } })
  }

  // 5 — El esquema: forma por respuesta entera, rango por ítem
  const validacion = validarRespuesta(resultado.items)
  if (validacion.tipo === 'forma-invalida') {
    // Ya se reintentó adentro de interpretarConReintentos y volvió igual: se trata como vacía.
    return salir({ estado: 200, cuerpo: { codigo: 'sin-items', items: [], descartados: [] } })
  }

  return salir({
    estado: 200,
    cuerpo: { items: validacion.items, descartados: validacion.descartados },
  })
}

function rechazo(estado: number, codigo: CodigoRespuesta, mensaje: string): RespuestaProxy {
  return { estado, cuerpo: { codigo, mensaje } }
}
