/**
 * El informe de consolidación y los estados en que **no hay disposición que mostrar**
 * (FR-012, FR-028).
 *
 * Nunca una pantalla en blanco: cuando no hay nada que mostrar se dice por qué.
 */

import type {
  Contenedor,
  Disposicion,
  InformeConsolidacion as Informe,
  MotivoAfuera,
  MotivoRechazo,
} from '../dominio/disposicion'

/**
 * Por qué quedó afuera cada bulto, en palabras del usuario.
 *
 * "restricción" existe porque decir "volumen" de un bulto bloqueado por una marca mandaría a
 * reservar un contenedor más grande, que no resuelve nada (FR-012, AC-30).
 */
const EXPLICACION_MOTIVO: Readonly<Record<MotivoAfuera, string>> = {
  peso: 'peso: colocarlo superaba la carga útil del contenedor',
  restriccion:
    'restricción: no entra en ninguna orientación, o sus marcas lo bloquean en toda posición. Un contenedor más grande no lo arregla',
  volumen: 'volumen: no quedaba lugar',
}

/** Qué significa cada rechazo del validador, en palabras del usuario. */
const POR_QUE_SE_RECHAZO: Readonly<Record<MotivoRechazo, string>> = {
  superposicion: 'dos bultos se superponen',
  'fuera-de-limites': 'un bulto se sale del contenedor',
  'apoyo-insuficiente': 'un bulto quedaría sin apoyo suficiente',
  'carga-maxima-excedida': 'se superaría la carga útil del contenedor',
  'no-apilable-con-carga-encima': 'quedaría carga sobre un bulto marcado como no apilable',
  'orientacion-obligatoria-violada': 'no se respetaría una orientación obligatoria',
  'peso-maximo-encima-excedido': 'se superaría el peso que admite un bulto encima',
}

export type EstadoConsolidacion =
  | { readonly fase: 'sin-items' }
  | { readonly fase: 'sin-contenedor' }
  | { readonly fase: 'bloqueada'; readonly faltantes: number }
  | { readonly fase: 'calculando' }
  /** FR-011: no se renderiza ni se guarda. Pero sí se dice por qué (FR-028). */
  | { readonly fase: 'rechazada'; readonly motivo: MotivoRechazo }
  | {
      readonly fase: 'lista'
      readonly informe: Informe
      /** La disposición ya validada: la vista 3D solo dibuja lo que pasó el validador. */
      readonly disposicion: Disposicion
      readonly contenedor: Contenedor
    }

function Porcentaje({ valor }: { valor: number }) {
  return <strong>{valor.toFixed(1)}%</strong>
}

export function InformeConsolidacion({ estado }: { readonly estado: EstadoConsolidacion }) {
  // Los cinco casos sin disposición. Ninguno deja la pantalla vacía (FR-028).
  if (estado.fase === 'sin-items') {
    return <p>Cargá la lista de ítems y elegí un contenedor para consolidar.</p>
  }
  if (estado.fase === 'sin-contenedor') {
    return <p>Elegí un contenedor para ver si la carga entra.</p>
  }
  if (estado.fase === 'bloqueada') {
    return (
      <p role="alert">
        Faltan {estado.faltantes} {estado.faltantes === 1 ? 'dato' : 'datos'} en la lista. Sin
        ellos la disposición sería inventada, así que no se calcula.
      </p>
    )
  }
  if (estado.fase === 'calculando') {
    return <p role="status">Calculando la disposición…</p>
  }
  if (estado.fase === 'rechazada') {
    return (
      <div role="alert">
        <p>
          La disposición calculada no pasó la validación: {POR_QUE_SE_RECHAZO[estado.motivo]}. No
          se muestra ni se guarda.
        </p>
        <p>
          Esto es un error del programa, no de tu carga. Si lo podés reproducir, vale reportarlo.
        </p>
      </div>
    )
  }

  const { informe } = estado
  const hayAfuera = informe.afuera.length > 0

  return (
    <section>
      <h2>Informe</h2>

      <dl>
        <dt>Aprovechamiento de volumen</dt>
        <dd><Porcentaje valor={informe.aprovechamientoVolumen} /></dd>
        <dt>Aprovechamiento de peso</dt>
        <dd><Porcentaje valor={informe.aprovechamientoPeso} /> de la carga útil</dd>
        <dt>Bultos colocados</dt>
        <dd>{informe.colocados}</dd>
      </dl>

      {informe.colocados === 0 ? (
        // No colocar nada no es un error: es una respuesta, y hay que decirla (FR-028).
        <p role="alert">
          No entró ningún bulto en este contenedor. Abajo está el motivo de cada uno; probá con
          un contenedor más grande.
        </p>
      ) : null}

      {hayAfuera ? (
        <>
          <h3>Quedaron afuera: {informe.afuera.length}</h3>
          <ul>
            {informe.afuera.map((a) => (
              <li key={`${a.bulto.itemId}-${a.bulto.indice}`}>
                {a.bulto.itemId} #{a.bulto.indice + 1} — por {EXPLICACION_MOTIVO[a.motivo]}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p>Entró toda la carga.</p>
      )}
    </section>
  )
}
