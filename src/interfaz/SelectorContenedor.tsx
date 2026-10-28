/**
 * Elegir el contenedor entre 20', 40' y 40' high cube (FR-007, AC-13).
 *
 * Usa las medidas interiores y la **carga útil** —max payload, no peso bruto— de la entrada del
 * catálogo, y al cambiar recalcula con las del nuevo.
 */

import { catalogo } from '../catalogo/catalogo'

export type SelectorContenedorProps = {
  readonly contenedorId: string | null
  readonly onElegir: (id: string) => void
}

export function SelectorContenedor({ contenedorId, onElegir }: SelectorContenedorProps) {
  return (
    <section>
      <h2>Contenedor</h2>
      <ul>
        {catalogo.contenedores.map((c) => (
          <li key={c.id}>
            <label>
              <input
                type="radio"
                name="contenedor"
                value={c.id}
                checked={contenedorId === c.id}
                onChange={() => onElegir(c.id)}
              />
              {c.nombre}
            </label>
            <small>
              {c.largoInterior} × {c.anchoInterior} × {c.altoInterior} mm interiores ·{' '}
              carga útil {(c.cargaUtil / 1_000_000).toLocaleString('es-AR')} t
            </small>
          </li>
        ))}
      </ul>
    </section>
  )
}
