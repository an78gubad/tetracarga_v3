/**
 * El control deslizante del recorrido de carga (FR-014, AC-08).
 *
 * En la posición k se ven exactamente los primeros k bultos, en el orden en que hay que
 * cargarlos en el depósito.
 */

export type RecorridoProps = {
  readonly posicion: number
  readonly total: number
  readonly onMover: (k: number) => void
}

export function Recorrido({ posicion, total, onMover }: RecorridoProps) {
  if (total === 0) return null

  return (
    <section>
      <label htmlFor="recorrido">
        Recorrido de carga: <strong>{posicion}</strong> de {total} bultos
      </label>
      <input
        id="recorrido"
        type="range"
        min={0}
        max={total}
        step={1}
        value={posicion}
        onChange={(e) => onMover(Number(e.target.value))}
        style={{ width: '100%' }}
      />
      <div>
        <button type="button" onClick={() => onMover(0)} disabled={posicion === 0}>
          Vacío
        </button>
        <button type="button" onClick={() => onMover(posicion - 1)} disabled={posicion === 0}>
          Anterior
        </button>
        <button type="button" onClick={() => onMover(posicion + 1)} disabled={posicion === total}>
          Siguiente
        </button>
        <button type="button" onClick={() => onMover(total)} disabled={posicion === total}>
          Completo
        </button>
      </div>
    </section>
  )
}
