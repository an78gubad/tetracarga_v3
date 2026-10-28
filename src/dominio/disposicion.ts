/** El contenedor, la disposición y el informe. Solo tipos (ver `unidades.ts`). */

import type { Gramos, Milimetros, MilimetrosCuadrados } from './unidades'

/**
 * El contenedor elegido, tal como lo reciben el acomodador y el validador: **por argumento**.
 *
 * Ninguno de los dos importa `src/catalogo/`. Si los dos lo leyeran, compartirían un origen de
 * valores y un error al leerlo lo cometerían igual los dos — con lo cual el validador no lo
 * detectaría, que es justo lo que el Principio II existe para evitar. Lo lee el orquestador,
 * una sola vez, y les pasa el mismo valor.
 */
export type Contenedor = {
  readonly id: string
  readonly largoInterior: Milimetros
  readonly anchoInterior: Milimetros
  readonly altoInterior: Milimetros
  /** La carga útil (max payload), **no** el peso bruto (FR-007). */
  readonly cargaUtil: Gramos
}

/**
 * Una unidad física de un ítem.
 *
 * La identidad es el par completo: los bultos de un mismo ítem son intercambiables entre sí,
 * así que sin el índice la comparación bulto por bulto contra la línea base no tendría sujeto
 * (FR-018).
 */
export type Bulto = {
  readonly itemId: string
  readonly indice: number
}

/** Cuál de las tres medidas del bulto queda sobre un eje. */
export type MedidaEnEje = 'largo' | 'ancho' | 'alto'

/**
 * Qué medida del bulto queda sobre cada eje. Las tres son distintas entre sí: es una
 * permutación, no una elección libre. Hay 6 (research.md §4).
 */
export type Orientacion = {
  readonly ejeX: MedidaEnEje
  readonly ejeY: MedidaEnEje
  readonly ejeZ: MedidaEnEje
}

/**
 * Un bulto puesto en un lugar.
 *
 * El origen está en la esquina del fondo abajo a la izquierda; `x` es el largo hacia la
 * puerta, `y` el ancho y `z` el alto (FR-009). Las coordenadas son de la esquina de **menor**
 * valor en cada eje, y el intervalo que ocupa el bulto es semiabierto —`[x, x + medida)`—, de
 * modo que dos bultos pegados comparten una cara y no se superponen (research.md §5).
 */
export type Colocacion = {
  readonly bulto: Bulto
  readonly x: Milimetros
  readonly y: Milimetros
  readonly z: Milimetros
  readonly orientacion: Orientacion
}

/**
 * Por qué un bulto quedó afuera, con esta **precedencia** (FR-012, AC-23, AC-30):
 *
 *   1. `peso` — colocarlo superaba la carga máxima. Gana sobre los otros dos aunque además no
 *      entrara por volumen.
 *   2. `restriccion` — ninguna posición es válida por su tamaño o por sus marcas de FR-008.
 *   3. `volumen` — no quedaba lugar.
 *
 * El tercero existe porque decir "volumen" de un bulto bloqueado por "no apilable" manda a
 * reservar un contenedor más grande, que no resuelve nada.
 */
export type MotivoAfuera = 'peso' | 'restriccion' | 'volumen'

export type BultoAfuera = {
  readonly bulto: Bulto
  readonly motivo: MotivoAfuera
}

/**
 * El resultado de la consolidación.
 *
 * El **índice** en `secuencia` es el orden de colocación: es lo que recorre el control
 * deslizante de FR-014, y es parte del dato que se congela en la línea base. Dos disposiciones
 * con las mismas colocaciones en otro orden no coinciden.
 */
export type Disposicion = {
  readonly contenedorId: string
  readonly secuencia: readonly Colocacion[]
  readonly afuera: readonly BultoAfuera[]
}

export type InformeConsolidacion = {
  /** Σ volumen de los bultos colocados ÷ volumen interior (research.md §8). */
  readonly aprovechamientoVolumen: number
  /** Σ peso de los bultos colocados ÷ carga útil. */
  readonly aprovechamientoPeso: number
  readonly colocados: number
  readonly afuera: readonly BultoAfuera[]
}

/** Por qué el validador rechazó una disposición. */
export type MotivoRechazo =
  | 'superposicion'
  | 'fuera-de-limites'
  | 'apoyo-insuficiente'
  | 'carga-maxima-excedida'
  | 'no-apilable-con-carga-encima'
  | 'orientacion-obligatoria-violada'
  | 'peso-maximo-encima-excedido'

/**
 * Lo que devuelve el validador. Una disposición que no pasa no se renderiza ni se guarda
 * (FR-011), así que el rechazo viaja con el bulto y el motivo para poder decir por qué
 * (FR-028).
 */
export type ResultadoValidacion =
  | { readonly valida: true }
  | {
      readonly valida: false
      readonly motivo: MotivoRechazo
      readonly bulto: Bulto
      readonly areaApoyada?: MilimetrosCuadrados
    }
