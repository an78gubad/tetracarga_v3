/** Las etiquetas del dataset de RNF-02. Ver `README.md` en esta carpeta. */

export type Eje = 'largo' | 'ancho' | 'alto' | 'peso'

export type ItemEsperado = {
  /** Entero ≥ 1. Si la descripción no la dice, va `null`: tiene que quedar preguntada. */
  readonly cantidad: number | null
  /**
   * Los campos que **la descripción declara**, ya convertidos a milímetros y gramos enteros.
   * SC-003 mide que estos se extraigan con coincidencia exacta, sin tolerancia.
   */
  readonly declarados: Readonly<Partial<Record<Eje, number>>>
  /**
   * Los campos que **la descripción no dice**. SC-004 mide que el 100% de estos queden
   * estimados desde el catálogo o preguntados: completarlos con un valor que no salga del
   * catálogo cuenta como error.
   */
  readonly ausentes: readonly Eje[]
  /** La entrada del catálogo que corresponde, o `null` si no corresponde ninguna (SC-005). */
  readonly entradaCatalogo: string | null
}

export type CasoDataset = {
  readonly id: string
  readonly descripcion: string
  readonly itemsEsperados: readonly ItemEsperado[]
  /** Para leer los resultados por grupo cuando una métrica no llega. */
  readonly etiquetas: readonly string[]
}
