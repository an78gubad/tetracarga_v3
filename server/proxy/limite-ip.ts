/**
 * El límite de pedidos por IP (FR-023, AC-29).
 *
 * **Deuda declarada**: cuenta en la memoria de esta instancia y se reinicia con cada arranque
 * en frío, así que el tope efectivo es más laxo que el declarado y no frena a un tercero
 * distribuido. El PRD ya lo acepta; el total se acota con el tope de gasto del proveedor.
 */

export const LIMITE_POR_MINUTO = 10
export const LIMITE_POR_HORA = 60

const MINUTO_MS = 60_000
const HORA_MS = 3_600_000

export type Veredicto =
  | { readonly permitido: true }
  | { readonly permitido: false; readonly ventana: 'minuto' | 'hora'; readonly limite: number }

export type ContadorPorIp = {
  readonly registrar: (ip: string, ahoraMs: number) => Veredicto
}

/**
 * Ventanas deslizantes: se guardan las marcas de tiempo de la última hora por IP.
 *
 * Deslizantes y no fijas porque una ventana fija deja pasar el doble del límite a caballo del
 * borde: 10 pedidos al final de un minuto y 10 al principio del siguiente.
 */
export function crearContadorPorIp(): ContadorPorIp {
  const marcas = new Map<string, number[]>()

  return {
    registrar(ip, ahoraMs) {
      const previas = (marcas.get(ip) ?? []).filter((t) => ahoraMs - t < HORA_MS)
      const ultimoMinuto = previas.filter((t) => ahoraMs - t < MINUTO_MS)

      if (ultimoMinuto.length >= LIMITE_POR_MINUTO) {
        marcas.set(ip, previas)
        return { permitido: false, ventana: 'minuto', limite: LIMITE_POR_MINUTO }
      }
      if (previas.length >= LIMITE_POR_HORA) {
        marcas.set(ip, previas)
        return { permitido: false, ventana: 'hora', limite: LIMITE_POR_HORA }
      }

      previas.push(ahoraMs)
      marcas.set(ip, previas)
      return { permitido: true }
    },
  }
}

/**
 * La IP del cliente.
 *
 * Detrás de la red de Vercel, `x-forwarded-for` es el único lugar donde está; `remoteAddress`
 * sería la del borde. Se toma el **primer** valor, que es el cliente original.
 */
export function ipDelPedido(
  encabezados: Record<string, string | string[] | undefined>,
  remoteAddress?: string,
): string {
  const crudo = encabezados['x-forwarded-for']
  const texto = Array.isArray(crudo) ? crudo[0] : crudo
  const primera = texto?.split(',')[0]?.trim()
  return primera && primera !== '' ? primera : (remoteAddress ?? 'desconocida')
}
