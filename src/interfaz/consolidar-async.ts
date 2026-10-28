/**
 * Lanza la consolidación en un worker y la deja cancelable (FR-031, AC-33).
 *
 * Si el navegador no soporta workers de módulo, cae a calcular en el hilo principal: tarda
 * igual pero no se pierde la funcionalidad. Con cargas chicas no se nota.
 */

import type { Item } from '../dominio/items'
import { consolidar } from './consolidar'
import type { EstadoConsolidacion } from './InformeConsolidacion'
import type { MensajeAlWorker } from './consolidar.worker'

export type Consolidacion = {
  readonly resultado: Promise<EstadoConsolidacion>
  /** Termina el worker. La promesa queda sin resolver: quien llama ya no la espera. */
  readonly cancelar: () => void
}

export function consolidarEnSegundoPlano(
  items: readonly Item[],
  contenedorId: string | null,
): Consolidacion {
  let worker: Worker | null = null

  const resultado = new Promise<EstadoConsolidacion>((listo, falla) => {
    try {
      worker = new Worker(new URL('./consolidar.worker.ts', import.meta.url), { type: 'module' })
    } catch {
      // Sin worker: se calcula acá. Bloquea, pero funciona.
      listo(consolidar(items, contenedorId))
      return
    }

    worker.onmessage = (e: MessageEvent<EstadoConsolidacion>) => {
      listo(e.data)
      worker?.terminate()
      worker = null
    }
    worker.onerror = (e) => {
      worker?.terminate()
      worker = null
      falla(new Error(`La consolidación falló en el worker: ${e.message}`))
    }

    const mensaje: MensajeAlWorker = { items, contenedorId: contenedorId ?? '' }
    worker.postMessage(mensaje)
  })

  return {
    resultado,
    cancelar: () => {
      worker?.terminate()
      worker = null
    },
  }
}
