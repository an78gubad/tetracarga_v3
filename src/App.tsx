import { useCallback, useMemo, useState } from 'react'
import { catalogo } from './catalogo/catalogo'
import { interpretarDescripcion } from './cliente-modelo/interpretar'
import { CampoDescripcion } from './interfaz/CampoDescripcion'
import { InformeConsolidacion } from './interfaz/InformeConsolidacion'
import { ListaItems } from './interfaz/ListaItems'
import { SelectorContenedor } from './interfaz/SelectorContenedor'
import { consolidar } from './interfaz/consolidar'
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

      <footer>
        <p>
          Catálogo: {catalogo.objetos.length} objetos y {catalogo.contenedores.length} contenedores,
          cada uno con su ficha de origen.
        </p>
      </footer>
    </main>
  )
}
