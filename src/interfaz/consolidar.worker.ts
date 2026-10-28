/**
 * Corre la consolidación **fuera del hilo principal** (FR-031, AC-33).
 *
 * El acomodo es NP-duro: con miles de bultos tarda minutos, y hecho en el hilo principal la
 * pestaña deja de responder y el navegador ofrece cerrarla, que es peor que tardar.
 *
 * Este archivo es **solo transporte**: la lógica vive en `consolidar.ts` y se prueba ahí, de
 * forma sincrónica. Cancelar es terminar el worker.
 */

import type { Item } from '../dominio/items'
import { consolidar, type PedidoConsolidacion } from './consolidar'

export type MensajeAlWorker = {
  readonly items: readonly Item[]
  readonly contenedorId: string
}

self.onmessage = (evento: MessageEvent<MensajeAlWorker>) => {
  const { items, contenedorId } = evento.data
  const pedido: PedidoConsolidacion = { items, contenedorId }
  self.postMessage(consolidar(pedido.items, pedido.contenedorId))
}
