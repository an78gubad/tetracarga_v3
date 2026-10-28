/**
 * Carga una disposición **sin pasar por el modelo**, para poder verificar la vista 3D en el
 * navegador (INSTRUCCIONES.md) y para medir SC-009.
 *
 * Se activa con `?escenario=<id>` y solo en desarrollo: en producción no hay forma de llegar
 * acá. No es una funcionalidad del producto; es el equivalente de los 10 escenarios de
 * referencia, pero para los ojos en vez de para un test.
 */

import type { Item, IndiceColor } from '../dominio/items'
import type { Gramos, Milimetros } from '../dominio/unidades'

type Espec = {
  readonly id: string
  readonly cantidad: number
  readonly largo: number
  readonly ancho: number
  readonly alto: number
  readonly peso: number
}

function item(e: Espec, i: number): Item {
  return {
    id: e.id,
    nombre: e.id,
    cantidad: { estado: 'declarado', valor: e.cantidad },
    largo: { estado: 'declarado', valor: e.largo as Milimetros },
    ancho: { estado: 'declarado', valor: e.ancho as Milimetros },
    alto: { estado: 'declarado', valor: e.alto as Milimetros },
    pesoUnitario: { estado: 'declarado', valor: e.peso as Gramos },
    marcas: {
      noApilable: { estado: 'declarado', valor: false },
      orientacionObligatoria: { estado: 'declarado', valor: false },
      pesoMaximoEncima: { estado: 'declarado', valor: 2_000_000 as Gramos },
    },
    color: (i % 12) as IndiceColor,
  }
}

/**
 * **El caso peor de SC-009**: 200 bultos repartidos en 12 tipos.
 *
 * Doce tipos porque el costo de dibujo crece con la cantidad de tipos, no de bultos: con un
 * tipo serían 200 bultos en una sola llamada de dibujo, y con doce son doce llamadas. Es el
 * tope de la paleta, así que es el peor caso que la vista tiene que sostener.
 */
const DOCE_TIPOS: readonly Espec[] = [
  { id: 'tipo-1', cantidad: 17, largo: 600, ancho: 400, alto: 300, peso: 12_000 },
  { id: 'tipo-2', cantidad: 17, largo: 500, ancho: 400, alto: 300, peso: 10_000 },
  { id: 'tipo-3', cantidad: 17, largo: 400, ancho: 400, alto: 400, peso: 9_000 },
  { id: 'tipo-4', cantidad: 17, largo: 800, ancho: 600, alto: 400, peso: 25_000 },
  { id: 'tipo-5', cantidad: 17, largo: 300, ancho: 300, alto: 300, peso: 5_000 },
  { id: 'tipo-6', cantidad: 17, largo: 700, ancho: 500, alto: 500, peso: 20_000 },
  { id: 'tipo-7', cantidad: 17, largo: 450, ancho: 350, alto: 250, peso: 7_000 },
  { id: 'tipo-8', cantidad: 17, largo: 900, ancho: 700, alto: 600, peso: 40_000 },
  { id: 'tipo-9', cantidad: 17, largo: 350, ancho: 250, alto: 200, peso: 4_000 },
  { id: 'tipo-10', cantidad: 17, largo: 550, ancho: 450, alto: 350, peso: 11_000 },
  { id: 'tipo-11', cantidad: 16, largo: 650, ancho: 350, alto: 450, peso: 13_000 },
  { id: 'tipo-12', cantidad: 14, largo: 400, ancho: 300, alto: 600, peso: 8_000 },
]

/** Trece tipos, para ver el aviso de colores reciclados de FR-013 con los ojos. */
const TRECE_TIPOS: readonly Espec[] = [
  ...DOCE_TIPOS,
  { id: 'tipo-13', cantidad: 10, largo: 300, ancho: 300, alto: 500, peso: 6_000 },
]

/**
 * Los escenarios como **funciones**, no como valores.
 *
 * Si acá hubiera un `.map` en el nivel del módulo —como tenía antes para armar "muchos"— el
 * empaquetador no puede probar que sea puro, así que retiene el cálculo y con él los datos, y
 * terminan en el bundle de producción. Me lo dijo el test de bundle.
 */
const ESCENARIOS_DE_PRUEBA: Readonly<Record<string, () => readonly Espec[]>> = {
  sc009: () => DOCE_TIPOS,
  reciclados: () => TRECE_TIPOS,
  /** Muchos bultos, para ver el aviso de rendimiento de FR-024. */
  muchos: () => DOCE_TIPOS.map((e) => ({ ...e, cantidad: e.cantidad * 3 })),
}

export const IDS_DE_PRUEBA: readonly string[] = ['sc009', 'reciclados', 'muchos']

/**
 * Los ítems del escenario pedido por la URL, o `null`.
 *
 * **Quien llama tiene que envolver la llamada en `import.meta.env.DEV`**, no esta función: con
 * la guarda adentro, la referencia al módulo sobrevive y los datos viajan al bundle de
 * producción. Lo verifica `tests/seguridad/bundle.test.ts`.
 */
export function itemsDelEscenarioDePrueba(busqueda: string): readonly Item[] | null {
  const id = new URLSearchParams(busqueda).get('escenario')
  if (id === null) return null
  const armar = ESCENARIOS_DE_PRUEBA[id]
  if (armar === undefined) return null
  return armar().map(item)
}
