/**
 * Los 10 escenarios de referencia (FR-018, RNF-05).
 *
 * Todos los campos van **declarados**: un escenario no depende del catálogo ni del modelo, así
 * que mide el acomodador y nada más.
 *
 * **Calibración**: traen más carga de la que entra —alrededor del 115% de lo que el acomodador
 * coloca— salvo los que miden sobrecarga de peso, que traen ~115% de la carga útil. Calibrados
 * al 115% del *volumen interno* quedaban tipos enteros afuera, porque el acomodador llena entre
 * el 50% y el 80% (CONTEXTO.md). La calibración fina es T091; esto es el punto de partida.
 *
 * **Estado de la calibración**: las cantidades están puestas para que cada escenario desborde y
 * para que ningún tipo quede con cero colocados, que es lo que hace falta para usarlos como
 * fixtures. La calibración fina al ~115% es **T091**, y va después de US4 a propósito: US4
 * extiende el orden de colocación para respetar las marcas, y eso cambia qué entra. Calibrar
 * ahora sería calibrar dos veces.
 *
 * **No se recalibran para que un número salga mejor.**
 */

import type { Contenedor } from '../src/dominio/disposicion'
import type { Item } from '../src/dominio/items'
import type { Gramos, Milimetros } from '../src/dominio/unidades'

type Espec = {
  readonly id: string
  readonly cantidad: number
  readonly largo: number
  readonly ancho: number
  readonly alto: number
  readonly peso: number
  readonly noApilable?: boolean
  readonly orientacionObligatoria?: boolean
  readonly pesoMaximoEncima?: number
}

function item(e: Espec, color: number): Item {
  return {
    id: e.id,
    nombre: e.id,
    cantidad: { estado: 'declarado', valor: e.cantidad },
    largo: { estado: 'declarado', valor: e.largo as Milimetros },
    ancho: { estado: 'declarado', valor: e.ancho as Milimetros },
    alto: { estado: 'declarado', valor: e.alto as Milimetros },
    pesoUnitario: { estado: 'declarado', valor: e.peso as Gramos },
    marcas: {
      noApilable: { estado: 'declarado', valor: e.noApilable ?? false },
      orientacionObligatoria: { estado: 'declarado', valor: e.orientacionObligatoria ?? false },
      pesoMaximoEncima:
        e.pesoMaximoEncima === undefined
          ? { estado: 'faltante', motivo: 'entrada-sin-el-dato' }
          : { estado: 'declarado', valor: e.pesoMaximoEncima as Gramos },
    },
    color: (color % 12) as Item['color'],
  }
}

/** Los tres contenedores, con las medidas de las fichas de Maersk. */
export const CONTENEDORES: Readonly<Record<'20' | '40' | '40hc', Contenedor>> = {
  '20': { id: '20', largoInterior: 5898 as Milimetros, anchoInterior: 2352 as Milimetros, altoInterior: 2393 as Milimetros, cargaUtil: 28_300_000 as Gramos },
  '40': { id: '40', largoInterior: 12032 as Milimetros, anchoInterior: 2352 as Milimetros, altoInterior: 2393 as Milimetros, cargaUtil: 28_870_000 as Gramos },
  '40hc': { id: '40hc', largoInterior: 12032 as Milimetros, anchoInterior: 2352 as Milimetros, altoInterior: 2698 as Milimetros, cargaUtil: 28_690_000 as Gramos },
}

export type EscenarioReferencia = {
  readonly id: string
  readonly queMide: string
  /**
   * Contra qué está calibrado el exceso.
   *
   * `volumen`: la carga es ~115% de lo que el acomodador coloca.
   * `peso`: la carga es ~115% de la **carga útil**, que es lo que estos escenarios miden.
   */
  readonly calibradoPor: 'volumen' | 'peso'
  readonly contenedor: Contenedor
  readonly items: readonly Item[]
  /** Ítems que no entran en ninguna orientación, a propósito. */
  readonly itemsQueNoEntran: readonly string[]
}

function escenario(
  id: string,
  queMide: string,
  calibradoPor: 'volumen' | 'peso',
  contenedor: Contenedor,
  especs: readonly Espec[],
  itemsQueNoEntran: readonly string[] = [],
): EscenarioReferencia {
  return { id, queMide, calibradoPor, contenedor, items: especs.map(item), itemsQueNoEntran }
}

export const ESCENARIOS: readonly EscenarioReferencia[] = [
  escenario('carga-mixta', 'tres tamaños de caja, el caso más común', 'volumen', CONTENEDORES['40hc'], [
    { id: 'cajas-grandes', cantidad: 95, largo: 1200, ancho: 800, alto: 600, peso: 80_000 },
    { id: 'cajas-medianas', cantidad: 200, largo: 600, ancho: 400, alto: 400, peso: 25_000 },
    { id: 'cajas-chicas', cantidad: 300, largo: 400, ancho: 300, alto: 250, peso: 9_000 },
  ]),

  escenario('tambores-y-cajas', 'no apilables mezclados con apilables', 'volumen', CONTENEDORES['40'], [
    { id: 'tambores', cantidad: 70, largo: 585, ancho: 585, alto: 877, peso: 210_000, noApilable: true },
    { id: 'cajas', cantidad: 420, largo: 600, ancho: 400, alto: 400, peso: 22_000 },
  ]),

  escenario('fragiles', 'topes de peso encima bajos, que ponen techo a la pila', 'volumen', CONTENEDORES['40hc'], [
    { id: 'fragiles-grandes', cantidad: 60, largo: 800, ancho: 600, alto: 700, peso: 40_000, pesoMaximoEncima: 30_000 },
    { id: 'fragiles-chicos', cantidad: 120, largo: 400, ancho: 400, alto: 350, peso: 12_000, pesoMaximoEncima: 8_000 },
    { id: 'robustas', cantidad: 150, largo: 600, ancho: 400, alto: 300, peso: 18_000 },
  ]),

  escenario('heladeras', 'frágiles altos que son el grueso de la carga', 'volumen', CONTENEDORES['40hc'], [
    { id: 'heladeras', cantidad: 45, largo: 700, ancho: 700, alto: 1800, peso: 75_000, pesoMaximoEncima: 5_000, orientacionObligatoria: true },
    { id: 'accesorios', cantidad: 900, largo: 400, ancho: 300, alto: 200, peso: 6_000 },
  ]),

  // Este escenario tiene una ventana de calibración angosta y es inherente: los no apilables
  // van al final, así que cuanto más desborda, menos piso les queda. Con 310 cajas entran 4 de
  // 10 bobinas; con 340, ninguna. Por eso el exceso acá es chico a propósito.
  escenario('no-apilables', 'casi todo no apilable: el piso es el límite', 'volumen', CONTENEDORES['20'], [
    { id: 'bobinas', cantidad: 10, largo: 900, ancho: 900, alto: 1100, peso: 400_000, noApilable: true },
    { id: 'cajas', cantidad: 310, largo: 500, ancho: 400, alto: 300, peso: 15_000 },
  ]),

  escenario('sobrecarga-peso', 'alrededor del 115% de la carga útil: 330 x 98 kg contra 28,3 t', 'peso', CONTENEDORES['20'], [
    { id: 'bolsones', cantidad: 330, largo: 600, ancho: 400, alto: 400, peso: 98_000 },
  ]),

  escenario('sobrecarga-peso-mixta', 'sobrecarga de peso con dos tipos: 33,4 t contra 28,87', 'peso', CONTENEDORES['40'], [
    { id: 'pesados', cantidad: 200, largo: 800, ancho: 600, alto: 500, peso: 140_000 },
    { id: 'livianos', cantidad: 290, largo: 400, ancho: 300, alto: 300, peso: 18_000 },
  ]),

  escenario('un-solo-tipo', 'un tipo solo, para aislar el acomodo del orden', 'volumen', CONTENEDORES['40hc'], [
    { id: 'cajas', cantidad: 690, largo: 600, ancho: 400, alto: 400, peso: 18_000 },
  ]),

  escenario('pallets', 'bultos con la base de un pallet y alturas distintas', 'volumen', CONTENEDORES['40hc'], [
    { id: 'pallets-altos', cantidad: 18, largo: 1200, ancho: 1000, alto: 1600, peso: 600_000, orientacionObligatoria: true },
    { id: 'pallets-bajos', cantidad: 34, largo: 1200, ancho: 1000, alto: 900, peso: 350_000, orientacionObligatoria: true },
  ]),

  escenario('con-bulto-gigante', 'un bulto que no entra en ninguna orientación', 'volumen', CONTENEDORES['20'], [
    { id: 'gigante', cantidad: 3, largo: 7000, ancho: 2300, alto: 2300, peso: 500_000 },
    { id: 'cajas', cantidad: 240, largo: 600, ancho: 400, alto: 400, peso: 20_000 },
  ], ['gigante']),
]
