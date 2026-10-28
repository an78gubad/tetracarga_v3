/**
 * Editar un ítem: sus campos y sus tres marcas (FR-006, FR-008, AC-12).
 *
 * Lo que el usuario escribe queda **declarado**, y editar un campo estimado le saca la marca.
 * Es la vía por la que se corrige una entrada de catálogo mal asociada.
 */

import type { Campo, Item } from '../dominio/items'
import { EXPLICACION } from '../interpretacion/faltantes'
import {
  borrarCampo,
  declararPesoMaximoEncima,
  editarCampo,
  marcarItem,
  type CampoEditable,
} from '../interpretacion/editar'

/** Los campos se muestran en kilos y se guardan en gramos: la conversión vive en el borde. */
const EN_KILOS: readonly CampoEditable[] = ['pesoUnitario']

function valorMostrado(campo: Campo<number>, enKilos: boolean): string {
  if (campo.estado === 'faltante') return ''
  return String(enKilos ? campo.valor / 1000 : campo.valor)
}

function Celda({
  item,
  campo,
  etiqueta,
  onCambiar,
}: {
  readonly item: Item
  readonly campo: CampoEditable
  readonly etiqueta: string
  readonly onCambiar: (item: Item) => void
}) {
  const valor: Campo<number> = item[campo]
  const enKilos = EN_KILOS.includes(campo)

  return (
    <label>
      <span>{etiqueta}</span>
      <input
        type="number"
        min={campo === 'cantidad' ? 1 : 0}
        step={campo === 'cantidad' ? 1 : 'any'}
        value={valorMostrado(valor, enKilos)}
        placeholder={valor.estado === 'faltante' ? EXPLICACION[valor.motivo] : ''}
        data-estado={valor.estado}
        onChange={(e) => {
          const texto = e.target.value
          if (texto === '') {
            onCambiar(borrarCampo(item, campo))
            return
          }
          const numero = Number(texto)
          onCambiar(editarCampo(item, campo, enKilos ? Math.round(numero * 1000) : numero))
        }}
      />
      {valor.estado === 'estimado' ? (
        <small>estimado, del catálogo: {valor.entradaCatalogo}. Si lo editás, pasa a declarado.</small>
      ) : null}
      {valor.estado === 'faltante' ? <small>{EXPLICACION[valor.motivo]}</small> : null}
    </label>
  )
}

export type EdicionItemProps = {
  readonly item: Item
  readonly onCambiar: (item: Item) => void
  readonly onEliminar: () => void
}

export function EdicionItem({ item, onCambiar, onEliminar }: EdicionItemProps) {
  const tope = item.marcas.pesoMaximoEncima

  return (
    <fieldset>
      <legend>{item.nombre}</legend>

      <Celda item={item} campo="cantidad" etiqueta="Cantidad" onCambiar={onCambiar} />
      <Celda item={item} campo="largo" etiqueta="Largo (mm)" onCambiar={onCambiar} />
      <Celda item={item} campo="ancho" etiqueta="Ancho (mm)" onCambiar={onCambiar} />
      <Celda item={item} campo="alto" etiqueta="Alto (mm)" onCambiar={onCambiar} />
      <Celda item={item} campo="pesoUnitario" etiqueta="Peso por bulto (kg)" onCambiar={onCambiar} />

      <h4>Restricciones de este ítem</h4>

      <label>
        <input
          type="checkbox"
          checked={item.marcas.noApilable.valor}
          onChange={(e) => onCambiar(marcarItem(item, 'noApilable', e.target.checked))}
        />
        No apilable
        {item.marcas.noApilable.estado === 'del-catalogo' ? <small> — lo trae el catálogo</small> : null}
      </label>

      <label>
        <input
          type="checkbox"
          checked={item.marcas.orientacionObligatoria.valor}
          onChange={(e) => onCambiar(marcarItem(item, 'orientacionObligatoria', e.target.checked))}
        />
        Orientación obligatoria (su alto declarado va para arriba)
        {item.marcas.orientacionObligatoria.estado === 'del-catalogo' ? (
          <small> — lo trae el catálogo</small>
        ) : null}
      </label>

      <label>
        <span>Peso máximo que admite encima (kg)</span>
        <input
          type="number"
          min={0}
          step="any"
          value={tope.estado === 'faltante' ? '' : String(tope.valor / 1000)}
          placeholder="sin límite declarado"
          onChange={(e) => {
            const texto = e.target.value
            onCambiar(
              declararPesoMaximoEncima(item, texto === '' ? null : Math.round(Number(texto) * 1000)),
            )
          }}
        />
        {/* Nunca viene del catálogo: depende del contenido, no del tipo de bulto (FR-008). */}
        <small>Esto el catálogo no lo puede saber: depende de lo que lleve adentro.</small>
      </label>

      <button type="button" onClick={onEliminar}>
        Eliminar este ítem
      </button>
    </fieldset>
  )
}
