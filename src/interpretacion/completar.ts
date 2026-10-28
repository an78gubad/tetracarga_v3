/**
 * Convierte lo que propuso el modelo en una lista de ítems, completando **únicamente** desde el
 * catálogo (FR-003, FR-004, FR-005).
 *
 * Acá vive el Principio I: el modelo propuso, y de acá en adelante decide el código.
 *
 *   - Todo dato completado sale del catálogo y queda marcado como estimado, indicando qué
 *     entrada se usó. Nunca sale del modelo.
 *   - El id que propuso el modelo se verifica. Si no existe, la propuesta de ese ítem se
 *     descarta entera: no se busca una entrada parecida (AC-17).
 *   - La cantidad **nunca** se completa. Si falta, se pregunta.
 *   - Lo que no se puede completar se pregunta y bloquea la consolidación.
 */

import type { Campo, IndiceColor, Item, MarcasItem, MotivoFaltante } from '../dominio/items'
import type { Gramos, Milimetros } from '../dominio/unidades'
import type { Catalogo } from '../catalogo/catalogo'
import type { EntradaObjeto } from '../catalogo/esquema'
import { aGramos, aMilimetros, asignarEjes, dividirPesoDelItem, type Eje, type MedidaCruda } from './convertir'

/** Lo que llega del intermediario: los ítems que propuso el modelo y los campos descartados. */
export type ItemCrudo = {
  readonly nombre: string
  readonly cantidad?: number
  readonly largo?: MedidaCruda
  readonly ancho?: MedidaCruda
  readonly alto?: MedidaCruda
  readonly peso?: { readonly valor: number; readonly unidad: string; readonly esDelItemCompleto?: boolean }
  readonly capacidad?: { readonly valor: number; readonly unidad: 'l' }
  readonly idCatalogo?: string
}

export type CampoDescartado = {
  readonly nombreItem: string
  readonly campo: 'cantidad' | 'largo' | 'ancho' | 'alto' | 'peso'
}

const EJES: readonly Eje[] = ['largo', 'ancho', 'alto']

function faltante(motivo: MotivoFaltante): Campo<never> {
  return { estado: 'faltante', motivo }
}

function declarado<T>(valor: T): Campo<T> {
  return { estado: 'declarado', valor }
}

function estimado<T>(valor: T, entradaCatalogo: string): Campo<T> {
  return { estado: 'estimado', valor, entradaCatalogo }
}

/**
 * Busca la entrada del catálogo para un ítem.
 *
 * Dos caminos, en este orden: el id que propuso el modelo —verificado— y el nombre o un
 * sinónimo. Si el id propuesto no existe, **no se cae al segundo camino**: la propuesta se
 * descarta entera y el ítem se trata como si no tuviera entrada (AC-17).
 */
export function resolverEntrada(
  crudo: ItemCrudo,
  catalogo: Catalogo,
): { readonly entrada: EntradaObjeto | undefined; readonly idPropuestoInvalido: boolean } {
  if (crudo.idCatalogo !== undefined) {
    const entrada = catalogo.entradaObjeto(crudo.idCatalogo)
    return { entrada, idPropuestoInvalido: entrada === undefined }
  }
  // La capacidad en litros NO se usa para buscar. Armar una clave concatenando —"tambores de
  // 200 litros"— sería adivinar, y adivinar es lo que el Principio I prohíbe. Para buscar por
  // capacidad el catálogo necesitaría un campo `capacidad`, y agregarlo lo decide el usuario.
  // Mientras tanto "tambor de 200 litros" llega por sinónimo, que es el mecanismo correcto.
  return { entrada: catalogo.porNombre(crudo.nombre), idPropuestoInvalido: false }
}

function marcasDesde(entrada: EntradaObjeto | undefined): MarcasItem {
  return {
    // Vienen del catálogo solo si la ficha las declara, señaladas como tales y editables.
    noApilable:
      entrada?.noApilable === null || entrada?.noApilable === undefined
        ? { estado: 'declarado', valor: false }
        : { estado: 'del-catalogo', valor: entrada.noApilable },
    orientacionObligatoria:
      entrada?.orientacionObligatoria === null || entrada?.orientacionObligatoria === undefined
        ? { estado: 'declarado', valor: false }
        : { estado: 'del-catalogo', valor: entrada.orientacionObligatoria },
    // NUNCA viene del catálogo: depende del contenido, no del tipo de bulto (FR-008).
    pesoMaximoEncima: faltante('entrada-sin-el-dato'),
  }
}

export type OpcionesCompletado = {
  readonly catalogo: Catalogo
  readonly descartados?: readonly CampoDescartado[]
  /** Para que los ids y los colores sean estables al agregar ítems con FR-025. */
  readonly desdeIndice?: number
}

export function completarItems(
  crudos: readonly ItemCrudo[],
  opciones: OpcionesCompletado,
): readonly Item[] {
  const { catalogo } = opciones
  const descartados = opciones.descartados ?? []
  const desde = opciones.desdeIndice ?? 0

  return crudos.map((crudo, i) => {
    const { entrada, idPropuestoInvalido } = resolverEntrada(crudo, catalogo)
    // Si el id propuesto no existe, el ítem queda sin entrada: se pregunta todo.
    const fuente = idPropuestoInvalido ? undefined : entrada

    const descartadosDelItem = new Set(
      descartados.filter((d) => d.nombreItem === crudo.nombre).map((d) => d.campo),
    )

    const motivoSinDato: MotivoFaltante =
      fuente === undefined ? 'sin-entrada-en-catalogo' : 'entrada-sin-el-dato'

    // --- Cantidad: nunca se completa (FR-004) ---
    const cantidad: Campo<number> = descartadosDelItem.has('cantidad')
      ? faltante('valor-fuera-de-rango')
      : crudo.cantidad !== undefined
        ? declarado(crudo.cantidad)
        : faltante(motivoSinDato)

    // --- Medidas: el rótulo manda; lo que falta sale del catálogo o se pregunta ---
    const medidas: MedidaCruda[] = []
    for (const eje of EJES) {
      const m = crudo[eje]
      if (m !== undefined) medidas.push(m)
    }
    const asignacion = asignarEjes(medidas)

    const ejes: Partial<Record<Eje, Campo<Milimetros>>> = {}
    for (const eje of EJES) {
      if (descartadosDelItem.has(eje)) {
        ejes[eje] = faltante('valor-fuera-de-rango')
        continue
      }
      // Rótulos ambiguos: no se adivina, se pregunta.
      if (!asignacion.ok) {
        ejes[eje] = faltante('valor-fuera-de-rango')
        continue
      }
      const cruda = asignacion.ejes[eje]
      if (cruda !== undefined) {
        const convertida = aMilimetros(cruda.valor, cruda.unidad)
        ejes[eje] = convertida.ok ? declarado(convertida.valor) : faltante('valor-fuera-de-rango')
        continue
      }
      const delCatalogo = fuente?.[eje]
      ejes[eje] =
        delCatalogo === null || delCatalogo === undefined
          ? faltante(motivoSinDato)
          : estimado(delCatalogo as Milimetros, fuente!.id)
    }

    // --- Peso unitario ---
    let pesoUnitario: Campo<Gramos>
    if (descartadosDelItem.has('peso')) {
      pesoUnitario = faltante('valor-fuera-de-rango')
    } else if (crudo.peso !== undefined) {
      const convertido = aGramos(crudo.peso.valor, crudo.peso.unidad)
      if (!convertido.ok) {
        pesoUnitario = faltante('valor-fuera-de-rango')
      } else if (crudo.peso.esDelItemCompleto === true) {
        // Dividir necesita la cantidad: sin ella no se puede, y no se inventa.
        pesoUnitario =
          cantidad.estado === 'faltante'
            ? faltante(motivoSinDato)
            : declarado(dividirPesoDelItem(convertido.valor, cantidad.valor))
      } else {
        pesoUnitario = declarado(convertido.valor)
      }
    } else if (fuente?.peso !== null && fuente?.peso !== undefined) {
      pesoUnitario = estimado(fuente.peso as Gramos, fuente.id)
    } else {
      pesoUnitario = faltante(motivoSinDato)
    }

    return {
      id: `item-${desde + i}`,
      nombre: crudo.nombre,
      cantidad,
      largo: ejes.largo!,
      ancho: ejes.ancho!,
      alto: ejes.alto!,
      pesoUnitario,
      marcas: marcasDesde(fuente),
      // El color sale de la posición en que el ítem ENTRÓ, no de la que ocupa: eliminar un
      // ítem no corre los colores de los demás (AC-09).
      color: (((desde + i) % 12) as IndiceColor),
    }
  })
}
