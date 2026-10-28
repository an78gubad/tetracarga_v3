/**
 * La lista de ítems, mostrando **por campo** si es declarado, estimado —con qué entrada del
 * catálogo lo completó— o faltante con su motivo (FR-003, SC-011).
 *
 * Que se distinga a simple vista es el punto: el usuario tiene que poder auditar qué dijo él y
 * qué puso el sistema.
 */

import type { Campo, Item } from '../dominio/items'
import { EXPLICACION, camposFaltantes, consolidacionBloqueada } from '../interpretacion/faltantes'

function Medida({ campo, unidad }: { campo: Campo<number>; unidad: 'mm' | 'kg' }) {
  if (campo.estado === 'faltante') {
    return (
      <span data-estado="faltante" title={EXPLICACION[campo.motivo]}>
        falta — {EXPLICACION[campo.motivo]}
      </span>
    )
  }
  const mostrado = unidad === 'kg' ? `${(campo.valor / 1000).toLocaleString('es-AR')} kg` : `${campo.valor} mm`
  if (campo.estado === 'estimado') {
    return (
      <span data-estado="estimado">
        {mostrado} <em>estimado, del catálogo: {campo.entradaCatalogo}</em>
      </span>
    )
  }
  return <span data-estado="declarado">{mostrado}</span>
}

export type ListaItemsProps = {
  readonly items: readonly Item[]
  readonly onEliminar: (itemId: string) => void
}

export function ListaItems({ items, onEliminar }: ListaItemsProps) {
  if (items.length === 0) {
    // Nunca una pantalla en blanco (FR-028).
    return <p>Todavía no hay ítems. Describí la carga arriba y apretá Interpretar.</p>
  }

  const faltantes = camposFaltantes(items)
  const bloqueada = consolidacionBloqueada(items)

  return (
    <section>
      <h2>Ítems ({items.length})</h2>

      {bloqueada ? (
        <p role="alert">
          Falta completar {faltantes.length} {faltantes.length === 1 ? 'dato' : 'datos'} antes de
          consolidar. Quedar bloqueado acá es lo correcto: sin esos datos la disposición sería
          inventada.
        </p>
      ) : null}

      <table>
        <thead>
          <tr>
            {/* La columna de color la agrega T071, cuando la paleta exista con su umbral medido. */}
            <th>Nombre</th>
            <th>Cantidad</th>
            <th>Largo</th>
            <th>Ancho</th>
            <th>Alto</th>
            <th>Peso unitario</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.nombre}</td>
              <td>
                {item.cantidad.estado === 'faltante' ? (
                  <span data-estado="faltante">falta — {EXPLICACION[item.cantidad.motivo]}</span>
                ) : (
                  <span data-estado={item.cantidad.estado}>{item.cantidad.valor}</span>
                )}
              </td>
              <td><Medida campo={item.largo} unidad="mm" /></td>
              <td><Medida campo={item.ancho} unidad="mm" /></td>
              <td><Medida campo={item.alto} unidad="mm" /></td>
              <td><Medida campo={item.pesoUnitario} unidad="kg" /></td>
              <td>
                <button type="button" onClick={() => onEliminar(item.id)}>
                  Eliminar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  )
}
