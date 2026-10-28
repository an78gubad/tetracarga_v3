/**
 * La implementación de `Modelo` para DeepSeek. **La única pieza que habla con la red.**
 *
 * Toda la especificidad del proveedor vive acá: su URL, su clave, la forma de su pedido y la
 * traducción de sus códigos de error. Cambiar de proveedor es escribir otro archivo como este
 * (RNF-08).
 */

import type {
  ItemPropuesto,
  Modelo,
  OpcionesIntento,
  PedidoInterpretacion,
  ResultadoInterpretacion,
} from './interfaz.js'

export const MODELO_POR_DEFECTO = 'deepseek-flash'

/**
 * Tope de la respuesta que se le pide al modelo (FR-017).
 *
 * **Medido el 2026-10-28** sobre los 10 casos del dataset con más ítems: la salida fue de 137 a
 * **1.383 tokens**, y el prompt pesa 944. Ver `eval/ultimo-informe.md`.
 *
 * Se fija en 8.000, que es casi 6 veces el máximo medido. El margen es amplio a propósito: este
 * número es un **techo de seguridad**, no un presupuesto. Solo se paga por los tokens que el
 * modelo genera de verdad, así que un techo alto no cuesta nada — y uno bajo sí: una respuesta
 * truncada es JSON inválido, se descarta entera y se reintenta, y eso sí quema el presupuesto de
 * tiempo. Lo que acota es que el modelo se desboque.
 */
export const MAX_TOKENS = 8_000

export type ConfiguracionDeepSeek = {
  readonly apiKey: string
  readonly baseUrl: string
  readonly modelo?: string
}

export class ConfiguracionFaltanteError extends Error {
  readonly variable: string

  constructor(variable: string) {
    super(
      `Falta la variable de entorno ${variable}. Está nombrada en .env.example; ` +
        'copialo a .env y completala.',
    )
    this.name = 'ConfiguracionFaltanteError'
    this.variable = variable
  }
}

/**
 * Lee la configuración del entorno y falla nombrando **qué variable falta** (AC-28, SC-013).
 *
 * Ninguna lleva prefijo `VITE_`: las que lo llevan terminan en el bundle del navegador.
 */
export function configuracionDesdeEntorno(
  entorno: Record<string, string | undefined> = process.env,
): ConfiguracionDeepSeek {
  const apiKey = entorno['DEEPSEEK_API_KEY']?.trim()
  if (!apiKey) throw new ConfiguracionFaltanteError('DEEPSEEK_API_KEY')
  const baseUrl = entorno['DEEPSEEK_BASE_URL']?.trim()
  if (!baseUrl) throw new ConfiguracionFaltanteError('DEEPSEEK_BASE_URL')
  const modelo = entorno['DEEPSEEK_MODELO']?.trim()
  return modelo ? { apiKey, baseUrl, modelo } : { apiKey, baseUrl }
}

/**
 * Códigos que **no** se reintentan, con su causa.
 *
 * Salen de la tabla de códigos de error que publica DeepSeek. 400 y 422 están acá porque
 * indican un error nuestro al armar el pedido: reintentarlo vuelve a fallar igual.
 */
const DEFINITIVOS: Readonly<Record<number, string>> = {
  400: 'cuerpo-invalido',
  401: 'credencial-invalida',
  402: 'saldo-agotado',
  422: 'parametros-invalidos',
}

/** 429 (ritmo o concurrencia), 500 (falla del servidor) y 503 (sobrecarga) sí se reintentan. */
const TRANSITORIOS: Readonly<Record<number, string>> = {
  429: 'limite-de-velocidad',
  500: 'error-del-proveedor',
  503: 'proveedor-sobrecargado',
}

export function clasificar(estado: number): { transitoria: boolean; codigo: string } {
  const definitivo = DEFINITIVOS[estado]
  if (definitivo !== undefined) return { transitoria: false, codigo: definitivo }
  const transitorio = TRANSITORIOS[estado]
  if (transitorio !== undefined) return { transitoria: true, codigo: transitorio }
  // Un código que la documentación no enumera se trata como transitorio: es más seguro
  // reintentar una vez de más que descartar un pedido que podía salir bien.
  return { transitoria: true, codigo: `estado-${estado}` }
}

/**
 * El prompt. Las tres condiciones del JSON mode de DeepSeek son obligatorias: `response_format`
 * solo no alcanza, hace falta la palabra "json" y un ejemplo del formato, y hay que acotar
 * `max_tokens` para que la respuesta no se trunque.
 */
export function armarPrompt(pedido: PedidoInterpretacion): { sistema: string; usuario: string } {
  const catalogo = pedido.catalogo
    .map((e) => `  - ${e.id}: ${[e.nombre, ...e.sinonimos].join(', ')}`)
    .join('\n')

  const sistema = [
    'Convertís una descripción de carga en castellano a json. No hacés nada más.',
    '',
    'Devolvés un objeto json con una clave "items", una lista. Cada ítem puede tener:',
    '  nombre (texto, obligatorio), cantidad (entero), largo, ancho, alto, peso, capacidad,',
    '  idCatalogo.',
    'Las medidas y el peso son objetos {valor, unidad} con la unidad TAL COMO APARECE en el',
    'texto. No convertís unidades: eso lo hace el programa.',
    'La clave "unidad" va SIEMPRE. Si el texto no dice la unidad, poné "": el programa decide,',
    'y sabe que una medida entera sin unidad está en centímetros y una con decimales en metros.',
    'No la adivines vos.',
    'Si la descripción rotula un eje ("60 de alto"), agregás ejeRotulado: "alto" a esa medida.',
    'Si el peso es del ítem completo y no de cada bulto, agregás esDelItemCompleto: true.',
    'Lo que la descripción no dice, lo omitís. NO lo inventás, no lo estimás y no lo completás.',
    '',
    'idCatalogo solo puede ser uno de estos, o estar omitido:',
    catalogo || '  (el catálogo está vacío: omitís idCatalogo siempre)',
    '',
    'Ejemplo 1, con las unidades dichas. Para "40 cajas de 60x40x30 cm de 12 kilos y 15',
    'tambores de 200 litros":',
    '{"items":[',
    '  {"nombre":"cajas","cantidad":40,"largo":{"valor":60,"unidad":"cm"},',
    '   "ancho":{"valor":40,"unidad":"cm"},"alto":{"valor":30,"unidad":"cm"},',
    '   "peso":{"valor":12,"unidad":"kg"}},',
    '  {"nombre":"tambores","cantidad":15,"capacidad":{"valor":200,"unidad":"l"},',
    '   "idCatalogo":"tambor-215l"}',
    ']}',
    '',
    'Ejemplo 2, SIN unidades en el texto. Para "15 bultos de 120 por 80 por 100 de 45 kilos":',
    '{"items":[',
    '  {"nombre":"bultos","cantidad":15,"largo":{"valor":120,"unidad":""},',
    '   "ancho":{"valor":80,"unidad":""},"alto":{"valor":100,"unidad":""},',
    '   "peso":{"valor":45,"unidad":"kg"}}',
    ']}',
    '',
    'Ejemplo 3, con un eje rotulado. Para "6 cajones de 1,5 de alto, base de 1,20 por 0,80":',
    '{"items":[',
    '  {"nombre":"cajones","cantidad":6,',
    '   "alto":{"valor":1.5,"unidad":"m","ejeRotulado":"alto"},',
    '   "largo":{"valor":1.2,"unidad":"m"},"ancho":{"valor":0.8,"unidad":"m"}}',
    ']}',
  ].join('\n')

  return { sistema, usuario: pedido.descripcion }
}

export function crearModeloDeepSeek(
  configuracion: ConfiguracionDeepSeek,
  fetchImpl: typeof fetch = fetch,
): Modelo {
  const { apiKey, baseUrl } = configuracion
  const modelo = configuracion.modelo ?? MODELO_POR_DEFECTO

  return {
    async interpretar(
      pedido: PedidoInterpretacion,
      opciones?: OpcionesIntento,
    ): Promise<ResultadoInterpretacion> {
      const { sistema, usuario } = armarPrompt(pedido)

      // Sin este tope, un solo pedido lento se pasa del presupuesto de 10 s de FR-016: lo
      // medí, el p95 daba 15,5 s y el máximo 23,9 s.
      const corte =
        opciones?.topeMs === undefined ? undefined : AbortSignal.timeout(opciones.topeMs)

      let respuesta: Response
      try {
        respuesta = await fetchImpl(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
          method: 'POST',
          ...(corte === undefined ? {} : { signal: corte }),
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: modelo,
            messages: [
              { role: 'system', content: sistema },
              { role: 'user', content: usuario },
            ],
            response_format: { type: 'json_object' },
            max_tokens: MAX_TOKENS,
            temperature: 0,
          }),
        })
      } catch (error) {
        // Error de red o corte por tiempo: los dos transitorios. El mensaje no se le reenvía al
        // navegador, porque suele traer la URL del proveedor (FR-015).
        const corteDeTiempo = (error as Error)?.name === 'TimeoutError'
        return {
          tipo: 'falla',
          falla: { transitoria: true, codigo: corteDeTiempo ? 'corte-por-tiempo' : 'error-de-red' },
        }
      }

      if (!respuesta.ok) {
        return { tipo: 'falla', falla: clasificar(respuesta.status) }
      }

      let contenido: unknown
      try {
        const cuerpo = (await respuesta.json()) as {
          choices?: readonly { message?: { content?: string } }[]
        }
        const texto = cuerpo.choices?.[0]?.message?.content
        // La guía de DeepSeek avisa que con response_format la API puede devolver contenido
        // vacío. No es una hipótesis: es un modo de falla conocido, y es transitorio.
        if (texto === undefined || texto.trim() === '') return { tipo: 'vacia' }
        contenido = JSON.parse(texto)
      } catch {
        // JSON inválido, o truncado por max_tokens: se trata como vacía y se reintenta.
        return { tipo: 'vacia' }
      }

      const items = (contenido as { items?: unknown })?.items
      if (!Array.isArray(items)) return { tipo: 'vacia' }

      // Acá no se valida nada más: la forma y el rango los decide el intermediario, con la
      // regla de FR-017 y FR-021. Esta pieza solo traduce del proveedor a la interfaz.
      return { tipo: 'items', items: items as readonly ItemPropuesto[] }
    },
  }
}
