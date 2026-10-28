import { useCallback, useEffect, useMemo, useState } from 'react'
import { catalogo } from './catalogo/catalogo'
import { interpretarDescripcion } from './cliente-modelo/interpretar'
import { CampoDescripcion } from './interfaz/CampoDescripcion'
import { InformeConsolidacion } from './interfaz/InformeConsolidacion'
import { ListaItems } from './interfaz/ListaItems'
import { Avisos } from './interfaz/Avisos'
import { Recorrido } from './interfaz/Recorrido'
import { SelectorContenedor } from './interfaz/SelectorContenedor'
import {
  BULTOS_QUE_PIDEN_CONFIRMACION,
  cantidadDeBultos,
  type PedidoConsolidacion,
} from './interfaz/consolidar'
import { consolidarEnSegundoPlano } from './interfaz/consolidar-async'
import type { EstadoConsolidacion } from './interfaz/InformeConsolidacion'
import { IDS_DE_PRUEBA, itemsDelEscenarioDePrueba } from './interfaz/escenario-de-prueba'
import { Escena } from './vista3d/Escena'
import { coloresDe } from './vista3d/color-por-item'
import { posicionTrasRecalcular } from './vista3d/recorrido'
import { aplicarResultado, ESTADO_INICIAL, type Estado } from './interfaz/estado'
import { itemEnBlanco } from './interpretacion/editar'
import { eliminarPorId, proximoIndice, reemplazarPorId } from './interpretacion/fusionar'

export function App() {
  // En desarrollo, ?escenario=sc009 carga una disposición sin pasar por el modelo, para poder
  // verificar la vista 3D con los ojos y medir SC-009. En producción devuelve null.
  // La guarda va ACÁ y no adentro de la función: con `import.meta.env.DEV` reemplazado por
  // false al construir, la rama entera queda muerta y el empaquetador descarta el módulo. Con
  // la guarda adentro, la referencia sobrevivía y los datos viajaban al bundle —lo verifiqué
  // con el test de bundle, que me desmintió.
  const deLaUrl = import.meta.env.DEV ? itemsDelEscenarioDePrueba(window.location.search) : null
  const [estado, setEstado] = useState<Estado>(
    deLaUrl === null ? ESTADO_INICIAL : { ...ESTADO_INICIAL, items: deLaUrl },
  )
  const [contenedorId, setContenedorId] = useState<string | null>(deLaUrl === null ? null : '40hc')

  // Se recalcula con cada cambio de la lista o del contenedor: editar un campo estimado
  // dispara el recálculo (FR-006), y cambiar de contenedor también (AC-13).
  const bultos = useMemo(() => cantidadDeBultos(estado.items), [estado.items])
  const [confirmado, setConfirmado] = useState(false)
  const [consolidacion, setConsolidacion] = useState<EstadoConsolidacion>({ fase: 'sin-items' })

  // La consolidación corre en un worker, así que la pestaña sigue respondiendo con cargas
  // grandes (FR-031). Por encima de 5.000 bultos no arranca sin confirmación.
  useEffect(() => {
    const pedido: PedidoConsolidacion = { items: estado.items, contenedorId }
    if (pedido.items.length === 0) {
      setConsolidacion({ fase: 'sin-items' })
      return
    }
    if (contenedorId === null) {
      setConsolidacion({ fase: 'sin-contenedor' })
      return
    }
    if (bultos > BULTOS_QUE_PIDEN_CONFIRMACION && !confirmado) {
      setConsolidacion({ fase: 'pide-confirmacion', bultos })
      return
    }

    setConsolidacion({ fase: 'calculando' })
    const tarea = consolidarEnSegundoPlano(estado.items, contenedorId)
    let vigente = true
    void tarea.resultado.then((r) => {
      if (vigente) setConsolidacion(r)
    })
    return () => {
      vigente = false
      tarea.cancelar()
    }
  }, [estado.items, contenedorId, bultos, confirmado])

  // Un cambio en la lista o en el contenedor vuelve a pedir confirmación: la carga es otra.
  useEffect(() => setConfirmado(false), [estado.items, contenedorId])

  const colocados = consolidacion.fase === 'lista' ? consolidacion.disposicion.secuencia.length : 0
  const [posicion, setPosicion] = useState(0)

  // Al recalcular se conserva la posición si todavía existe, y si no se va al final: volver a 0
  // obligaría a recorrer todo de nuevo por haber corregido una medida (FR-006).
  useEffect(() => {
    setPosicion((previa) => posicionTrasRecalcular(previa === 0 ? colocados : previa, colocados))
  }, [colocados])

  const colores = useMemo(() => coloresDe(estado.items), [estado.items])

  // La descripción viaja como argumento en vez de leerse del estado: así el efecto queda
  // afuera del actualizador, que tiene que ser una función pura.
  const interpretar = useCallback(async (descripcion: string) => {
    setEstado((previo) => ({ ...previo, interpretacion: { fase: 'interpretando' } }))
    const resultado = await interpretarDescripcion(descripcion)
    setEstado((actual) => aplicarResultado(actual, resultado, catalogo))
  }, [])

  return (
    <main>
      <h1>Tetracarga</h1>
      <p>Describí la carga en castellano y consolidala en un contenedor.</p>

      <CampoDescripcion
        descripcion={estado.descripcion}
        estado={estado.interpretacion}
        onCambiar={(descripcion) => setEstado((p) => ({ ...p, descripcion }))}
        onInterpretar={() => void interpretar(estado.descripcion)}
      />

      <ListaItems
        items={estado.items}
        onEliminar={(itemId) =>
          setEstado((p) => ({ ...p, items: eliminarPorId(p.items, itemId) }))
        }
        onCambiar={(item) => setEstado((p) => ({ ...p, items: reemplazarPorId(p.items, item) }))}
        onAgregar={(nombre) =>
          setEstado((p) => ({
            ...p,
            // El ítem nuevo sigue la numeración: no se corren los ids ni los colores de los
            // que ya estaban (AC-09, FR-025).
            items: [...p.items, itemEnBlanco(nombre, proximoIndice(p.items))],
          }))
        }
      />

      <SelectorContenedor contenedorId={contenedorId} onElegir={setContenedorId} />

      <InformeConsolidacion estado={consolidacion} onConfirmar={() => setConfirmado(true)} />

      <Avisos
        cantidadDeTipos={estado.items.length}
        hayColoresReciclados={colores.hayReciclados}
        cantidadDeBultos={bultos}
      />

      {consolidacion.fase === 'lista' ? (
        <>
          <Escena
            disposicion={consolidacion.disposicion}
            items={estado.items}
            contenedor={consolidacion.contenedor}
            hasta={posicion}
          />
          <Recorrido posicion={posicion} total={colocados} onMover={setPosicion} />
        </>
      ) : null}

      <footer>
        <p>
          Catálogo: {catalogo.objetos.length} objetos y {catalogo.contenedores.length} contenedores,
          cada uno con su ficha de origen.
        </p>
        {import.meta.env.DEV ? (
          <p>
            Escenarios de prueba (solo en desarrollo):{' '}
            {IDS_DE_PRUEBA.map((id) => (
              <a key={id} href={`?escenario=${id}`} style={{ marginRight: '0.75rem' }}>
                {id}
              </a>
            ))}
          </p>
        ) : null}
      </footer>
    </main>
  )
}
