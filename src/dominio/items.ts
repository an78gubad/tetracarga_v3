/** El ítem y el estado de cada uno de sus campos. Solo tipos (ver `unidades.ts`). */

import type { Gramos, Milimetros } from './unidades'

/**
 * Por qué un campo quedó sin valor. Son los tres motivos de FR-004, y están separados
 * porque al usuario se le dice algo distinto en cada caso.
 */
export type MotivoFaltante =
  /** El ítem no está en el catálogo: no hay de dónde completar nada. */
  | 'sin-entrada-en-catalogo'
  /** La entrada existe pero no trae ese dato. El caso normal del peso. */
  | 'entrada-sin-el-dato'
  /** Vino un valor que no cumple el rango de FR-021: no se toma como dato declarado. */
  | 'valor-fuera-de-rango'

/**
 * Un campo del ítem con su procedencia.
 *
 * `faltante` **no tiene valor**, y es a propósito: un valor fuera de rango no se guarda "por
 * si acaso", no se corrige por su signo y no se salva por su valor absoluto (FR-021).
 */
export type Campo<T> =
  | { readonly estado: 'declarado'; readonly valor: T }
  | { readonly estado: 'estimado'; readonly valor: T; readonly entradaCatalogo: string }
  | { readonly estado: 'faltante'; readonly motivo: MotivoFaltante }

/**
 * Una marca que el catálogo puede traer precargada.
 *
 * No hay estado `faltante`: una marca ausente es simplemente `false`. Lo que el catálogo no
 * declara, no se marca.
 */
export type Marca<T> =
  | { readonly estado: 'declarado'; readonly valor: T }
  | { readonly estado: 'del-catalogo'; readonly valor: T }

/**
 * Lo que el catálogo no puede saber porque depende del contenido y no del tipo de bulto.
 *
 * `noApilable` y `orientacionObligatoria` pueden venir del catálogo cuando la ficha las
 * declara; `pesoMaximoEncima` **nunca** viene precargado, así que o lo declara el usuario o
 * está faltante (FR-008).
 */
export type MarcasItem = {
  readonly noApilable: Marca<boolean>
  readonly orientacionObligatoria: Marca<boolean>
  readonly pesoMaximoEncima: Campo<Gramos>
}

/** Índice en la paleta fija de 12 colores (FR-013). */
export type IndiceColor = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11

/**
 * Un tipo de bulto del pedido. Un ítem de cantidad 40 son 40 bultos.
 *
 * El `color` va atado al ítem y no a su posición en la lista: con FR-004 se eliminan ítems, y
 * si el color saliera de la posición se correrían los de todos los demás (AC-09).
 */
export type Item = {
  readonly id: string
  readonly nombre: string
  /** Entero ≥ 1. **Nunca** se completa desde el catálogo: si falta, se pregunta (FR-004). */
  readonly cantidad: Campo<number>
  readonly largo: Campo<Milimetros>
  readonly ancho: Campo<Milimetros>
  readonly alto: Campo<Milimetros>
  readonly pesoUnitario: Campo<Gramos>
  readonly marcas: MarcasItem
  readonly color: IndiceColor
}
