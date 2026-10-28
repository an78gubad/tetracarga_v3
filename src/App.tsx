import { useCallback, useEffect, useMemo, useState } from 'react'
import { catalogo } from './catalogo/catalogo'
import { interpretarDescripcion } from './cliente-modelo/interpretar'
import { CampoDescripcion } from './interfaz/CampoDescripcion'
import { InformeConsolidacion } from './interfaz/InformeConsolidacion'
import { ListaItems } from './interfaz/ListaItems'
import { Avisos } from './interfaz/Avisos'
import { Recorrido } from './interfaz/Recorrido'
import { SelectorContenedor } from './interfaz/SelectorContenedor'
import { consolidar } from './interfaz/consolidar'
import { Escena } from './vista3d/Escena'
import { coloresDe } from './vista3d/color-por-item'
import { posicionTrasRecalcular } from './vista3d/recorrido'
import { aplicarResultado, eliminarItem, ESTADO_INICIAL, type Estado } from './interfaz/estado'

export function App() {
  const [estado, setEstado] = useState<Estado>(ESTADO_INICIAL)
  const [contenedorId, setContenedorId] = useState<string | null>(null)

  // Se recalcula con cada cambio de la lista o del contenedor: editar un campo estimado
  // dispara el recálculo (FR-006), y cambiar de contenedor también (AC-13).
  const consolidacion = useMemo(
    () => consolidar(estado.items, contenedorId),
    [estado.items, contenedorId],
  )

  const colocados = consolidacion.fase === 'lista' ? consolidacion.disposicion.secuencia.length : 0
  const [posicion, setPosicion] = useState(0)

  // Al recalcular se conserva la posición si todavía existe, y si no se va al final: volver a 0
  // obligaría a recorrer todo de nuevo por haber corregido una medida (FR-006).
  useEffect(() => {
    setPosicion((previa) => posicionTrasRecalcular(previa === 0 ? colocados : previa, colocados))
  }, [colocados])

  const colores = useMemo(() => coloresDe(estado.items), [estado.items])
  const bultos = useMemo(
    () => estado.items.reduce((n, i) => n + (i.cantidad.estado === 'declarado' ? i.cantidad.valor : 0), 0),
    [estado.items],
  )

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
        onEliminar={(itemId) => setEstado((p) => eliminarItem(p, itemId))}
      />

      <SelectorContenedor contenedorId={contenedorId} onElegir={setContenedorId} />

      <InformeConsolidacion estado={consolidacion} />

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
      </footer>
    </main>
  )
}
