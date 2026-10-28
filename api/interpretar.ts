/**
 * La función serverless. **Solo envuelve al manejador**, sin lógica propia, para que el
 * manejador se pueda probar sin levantar nada (AGENTS.md).
 *
 * En producción la corre Vercel; en desarrollo la sirve Vite como middleware, con los mismos
 * request y response de Node, así que este archivo no sabe en cuál de los dos está.
 */

import type { IncomingMessage, ServerResponse } from 'node:http'
import { configuracionDesdeEntorno, crearModeloDeepSeek } from '../server/modelo/deepseek.js'
import type { EntradaPrompt, Modelo } from '../server/modelo/interfaz.js'
import { manejar } from '../server/proxy/manejador.js'
import objetos from '../src/catalogo/objetos.json' with { type: 'json' }

/**
 * El catálogo que se le ofrece al modelo: ids y nombres, **sin medidas**.
 *
 * Se lee del mismo archivo que el navegador, pero se recorta acá: el modelo tiene que elegir
 * un id, no copiar un número (Principio I).
 */
const CATALOGO_PARA_PROMPT: readonly EntradaPrompt[] = (
  objetos as readonly { id: string; nombre: string; sinonimos: readonly string[] }[]
).map((o) => ({ id: o.id, nombre: o.nombre, sinonimos: o.sinonimos }))

/** `null` si falta la credencial: el manejador lo distingue de una credencial inválida. */
function modeloConfigurado(): Modelo | null {
  try {
    return crearModeloDeepSeek(configuracionDesdeEntorno())
  } catch {
    return null
  }
}

export default async function interpretar(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ codigo: 'metodo-no-permitido', mensaje: 'Usá POST.' }))
    return
  }

  const trozos: Buffer[] = []
  for await (const trozo of req) trozos.push(trozo as Buffer)

  let cuerpo: unknown = undefined
  try {
    const texto = Buffer.concat(trozos).toString('utf8')
    cuerpo = texto === '' ? undefined : JSON.parse(texto)
  } catch {
    cuerpo = undefined // El manejador lo rechaza con cuerpo-invalido.
  }

  const remoteAddress = req.socket?.remoteAddress
  const respuesta = await manejar(
    {
      cuerpo,
      encabezados: req.headers,
      // Se omite en vez de pasar undefined: con exactOptionalPropertyTypes no es lo mismo.
      ...(remoteAddress === undefined ? {} : { remoteAddress }),
    },
    { modelo: modeloConfigurado(), catalogo: CATALOGO_PARA_PROMPT },
  )

  res.statusCode = respuesta.estado
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(respuesta.cuerpo))
}
