/**
 * La única frontera con el proveedor del modelo (RNF-08, FR-016).
 *
 * **Ningún tipo de este archivo nombra a DeepSeek.** Si lo hiciera, el contrato estaría mal:
 * cambiar de proveedor tiene que ser escribir otra implementación de `Modelo` y nada más.
 *
 * Nadie de `src/` importa esto: `src/` llega al navegador, y el proveedor vive del lado del
 * servidor. Un test de arquitectura lo verifica.
 */

/** Lo que se le manda al modelo para que pueda proponer un id: nombres, nunca medidas. */
export type EntradaPrompt = {
  readonly id: string
  readonly nombre: string
  readonly sinonimos: readonly string[]
}

export type PedidoInterpretacion = {
  /** Ya validada de largo por el intermediario (FR-017). */
  readonly descripcion: string
  /** Los ids que el modelo puede proponer. Sin medidas: no las tiene que copiar, tiene que elegir. */
  readonly catalogo: readonly EntradaPrompt[]
}

/**
 * Un valor con la unidad **tal como aparece en el texto**.
 *
 * El modelo no convierte: una conversión es una cuenta, y las cuentas no se le piden al modelo
 * (Principio I). La conversión a milímetros y gramos enteros la hace `src/interpretacion/`.
 */
export type ValorConUnidad = {
  readonly valor: number
  readonly unidad: string
  /** El eje que la descripción rotuló explícitamente, si rotuló alguno (FR-002). */
  readonly ejeRotulado?: 'largo' | 'ancho' | 'alto'
}

export type PesoPropuesto = ValorConUnidad & {
  /** `true` si el peso es del ítem completo y hay que dividirlo por la cantidad. */
  readonly esDelItemCompleto?: boolean
}

export type ItemPropuesto = {
  readonly nombre: string
  readonly cantidad?: number
  readonly largo?: ValorConUnidad
  readonly ancho?: ValorConUnidad
  readonly alto?: ValorConUnidad
  readonly peso?: PesoPropuesto
  /** "tambor de 200 litros": una clave para buscar en el catálogo, no una medida. */
  readonly capacidad?: { readonly valor: number; readonly unidad: 'l' }
  /** Propuesto por el modelo. **El código lo verifica** contra el catálogo (FR-005, AC-17). */
  readonly idCatalogo?: string
}

/**
 * Por qué falló una llamada al proveedor, en términos que no son del proveedor.
 *
 * La implementación traduce sus códigos a esto; quien llama solo necesita saber si reintentar.
 */
export type FallaModelo = {
  readonly transitoria: boolean
  /** Para el registro y los tests. No se le reenvía al navegador (FR-015). */
  readonly codigo: string
}

export type ResultadoInterpretacion =
  | { readonly tipo: 'items'; readonly items: readonly ItemPropuesto[] }
  /** Transitorio: el proveedor contestó, pero sin contenido. Modo de falla documentado. */
  | { readonly tipo: 'vacia' }
  | { readonly tipo: 'falla'; readonly falla: FallaModelo }

/** Lo que quien llama le impone a un intento. */
export type OpcionesIntento = {
  /**
   * Tope de tiempo para **este** intento, en milisegundos.
   *
   * Hace falta porque el presupuesto de FR-016 se mide punta a punta: sin un tope por intento,
   * una sola llamada lenta se pasa de los 10 s y el presupuesto no se cumple. Medido: el p95
   * daba 15,5 s y el máximo 23,9 s con un presupuesto de 10.
   */
  readonly topeMs?: number
}

export interface Modelo {
  interpretar(
    pedido: PedidoInterpretacion,
    opciones?: OpcionesIntento,
  ): Promise<ResultadoInterpretacion>
}
