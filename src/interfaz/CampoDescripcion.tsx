/**
 * El único campo de entrada del sistema: texto libre, sin formato, sin separadores y sin una
 * línea por ítem (FR-001, AC-11).
 */

import type { EstadoInterpretacion } from './estado'
import { LARGO_MAXIMO_DESCRIPCION } from './limites'

export type CampoDescripcionProps = {
  readonly descripcion: string
  readonly estado: EstadoInterpretacion
  readonly onCambiar: (texto: string) => void
  readonly onInterpretar: () => void
}

export function CampoDescripcion({
  descripcion,
  estado,
  onCambiar,
  onInterpretar,
}: CampoDescripcionProps) {
  const interpretando = estado.fase === 'interpretando'
  const largo = [...descripcion].length
  const demasiadoLarga = largo > LARGO_MAXIMO_DESCRIPCION

  return (
    <section>
      <label htmlFor="descripcion">Describí la carga</label>
      <textarea
        id="descripcion"
        rows={4}
        value={descripcion}
        disabled={interpretando}
        placeholder="40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros"
        onChange={(e) => onCambiar(e.target.value)}
      />

      <p aria-live="polite">
        {largo} / {LARGO_MAXIMO_DESCRIPCION} caracteres
        {demasiadoLarga ? ' — pasaste el límite' : ''}
      </p>

      <button type="button" onClick={onInterpretar} disabled={interpretando || descripcion.trim() === '' || demasiadoLarga}>
        {interpretando ? 'Interpretando…' : 'Interpretar'}
      </button>

      {/* El estado de carga es visible y no hace falta poder cancelar (FR-026). */}
      {interpretando ? <p role="status">Estamos leyendo lo que escribiste.</p> : null}

      {/*
        Ante una falla del proveedor la descripción sigue intacta en el campo, el mensaje dice
        que la falla NO es de la descripción, y se puede reintentar (FR-026). El reintento
        cuenta contra el límite por IP y abre un presupuesto nuevo de 10 s.
      */}
      {estado.fase === 'falla-del-proveedor' ? (
        <div role="alert">
          <p>{estado.mensaje}</p>
          <p>Tu descripción no se perdió y la lista de ítems quedó igual.</p>
          <button type="button" onClick={onInterpretar}>
            Reintentar
          </button>
        </div>
      ) : null}

      {estado.fase === 'rechazado' ? <p role="alert">{estado.mensaje}</p> : null}

      {estado.fase === 'sin-items' ? (
        <p role="alert">
          No reconocimos ninguna carga en ese texto. Probá nombrando los bultos y sus cantidades.
        </p>
      ) : null}
    </section>
  )
}
