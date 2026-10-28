/**
 * Los dos avisos de la vista (FR-013, FR-024).
 *
 * Ninguno de los dos bloquea ni recorta nada: avisan y la disposición se muestra igual.
 */

import { CANTIDAD_COLORES } from '../vista3d/paleta'

export const LIMITE_BULTOS_GARANTIZADO = 200

export type AvisosProps = {
  readonly cantidadDeTipos: number
  readonly hayColoresReciclados: boolean
  readonly cantidadDeBultos: number
}

export function Avisos({ cantidadDeTipos, hayColoresReciclados, cantidadDeBultos }: AvisosProps) {
  const porEncimaDelLimite = cantidadDeBultos > LIMITE_BULTOS_GARANTIZADO
  if (!hayColoresReciclados && !porEncimaDelLimite) return null

  return (
    <aside role="status">
      {hayColoresReciclados ? (
        <p>
          Hay {cantidadDeTipos} tipos de ítem y la paleta tiene {CANTIDAD_COLORES} colores, así
          que algunos tipos comparten color. En la lista cada uno sigue identificado por su
          nombre.
        </p>
      ) : null}

      {porEncimaDelLimite ? (
        <p>
          Esta carga tiene {cantidadDeBultos} bultos, por encima de los{' '}
          {LIMITE_BULTOS_GARANTIZADO} hasta los que garantizamos el tiempo de consolidación y la
          fluidez de la vista 3D. Se calcula y se muestra igual, pero puede ir más lento.
        </p>
      ) : null}
    </aside>
  )
}
