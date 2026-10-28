/**
 * Las 50 descripciones etiquetadas (RNF-02). Ver `README.md` de esta carpeta.
 *
 * **No se tocan para que una métrica llegue.** Si el eval no alcanza, se mejora el prompt o se
 * cambia el modelo; no se corrigen etiquetas.
 */

import type { CasoDataset, Eje, ItemEsperado } from './tipos'

function item(
  cantidad: number | null,
  declarados: Readonly<Partial<Record<Eje, number>>>,
  ausentes: readonly Eje[],
  entradaCatalogo: string | null = null,
): ItemEsperado {
  return { cantidad, declarados, ausentes, entradaCatalogo }
}

/** Todos los campos ausentes: para los ítems de los que la descripción no dice ninguna medida. */
const TODO: readonly Eje[] = ['largo', 'ancho', 'alto', 'peso']

export const CASOS: readonly CasoDataset[] = [
  // ---------- simple (12) ----------
  { id: 's01', etiquetas: ['simple'],
    descripcion: '40 cajas de 60x40x30 de 12 kilos',
    itemsEsperados: [item(40, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, [])] },
  { id: 's02', etiquetas: ['simple'],
    descripcion: '12 cajas de 100x80x60 de 25 kg cada una',
    itemsEsperados: [item(12, { largo: 1000, ancho: 800, alto: 600, peso: 25_000 }, [])] },
  { id: 's03', etiquetas: ['simple', 'multiple'],
    descripcion: '40 cajas de 60x40x30 de 12 kilos y 20 cajas de 40x30x20 de 5 kilos',
    itemsEsperados: [
      item(40, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, []),
      item(20, { largo: 400, ancho: 300, alto: 200, peso: 5_000 }, []),
    ] },
  { id: 's04', etiquetas: ['simple'],
    descripcion: 'Tengo 200 cajas de 30x30x30 que pesan 8 kilos cada una',
    itemsEsperados: [item(200, { largo: 300, ancho: 300, alto: 300, peso: 8_000 }, [])] },
  { id: 's05', etiquetas: ['simple', 'corrido'],
    descripcion: 'necesito despachar 15 bultos de 120 por 80 por 100 de 45 kilos y 8 cajones de 60 por 40 por 40 de 18 kilos, todo junto',
    itemsEsperados: [
      item(15, { largo: 1200, ancho: 800, alto: 1000, peso: 45_000 }, []),
      item(8, { largo: 600, ancho: 400, alto: 400, peso: 18_000 }, []),
    ] },
  { id: 's06', etiquetas: ['simple'],
    descripcion: '6 jaulas de 110x110x120, 95 kilos cada una',
    itemsEsperados: [item(6, { largo: 1100, ancho: 1100, alto: 1200, peso: 95_000 }, [])] },
  { id: 's07', etiquetas: ['simple'],
    descripcion: '300 cajas de zapatillas de 35x22x13, 1,2 kg',
    itemsEsperados: [item(300, { largo: 350, ancho: 220, alto: 130, peso: 1_200 }, [])] },
  { id: 's08', etiquetas: ['simple'],
    descripcion: '1 maquina de 240x120x180 de 1200 kilos',
    itemsEsperados: [item(1, { largo: 2400, ancho: 1200, alto: 1800, peso: 1_200_000 }, [])] },
  { id: 's09', etiquetas: ['simple', 'multiple'],
    descripcion: '50 cajas 50x40x30 10kg, 30 cajas 70x50x40 22kg, 10 cajas 90x60x50 35kg',
    itemsEsperados: [
      item(50, { largo: 500, ancho: 400, alto: 300, peso: 10_000 }, []),
      item(30, { largo: 700, ancho: 500, alto: 400, peso: 22_000 }, []),
      item(10, { largo: 900, ancho: 600, alto: 500, peso: 35_000 }, []),
    ] },
  { id: 's10', etiquetas: ['simple'],
    descripcion: 'Veinte cajas de 60x40x30 de 12 kilos',
    itemsEsperados: [item(20, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, [])] },
  { id: 's11', etiquetas: ['simple'],
    descripcion: '18 cajas de cartón de 45 x 35 x 25 centímetros, 7 kilos cada una',
    itemsEsperados: [item(18, { largo: 450, ancho: 350, alto: 250, peso: 7_000 }, [])] },
  { id: 's12', etiquetas: ['simple'],
    descripcion: '72 bultos de 80x60x55 de 30 kilos',
    itemsEsperados: [item(72, { largo: 800, ancho: 600, alto: 550, peso: 30_000 }, [])] },

  // ---------- catalogo (9) ----------
  { id: 'c01', etiquetas: ['catalogo'],
    descripcion: '15 tambores de 200 litros',
    itemsEsperados: [item(15, {}, TODO, 'tambor-215l')] },
  { id: 'c02', etiquetas: ['catalogo', 'multiple'],
    descripcion: '40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros',
    itemsEsperados: [
      item(40, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, []),
      item(15, {}, TODO, 'tambor-215l'),
    ] },
  { id: 'c03', etiquetas: ['catalogo'],
    descripcion: '8 tambores, cada uno con 180 kilos de producto',
    itemsEsperados: [item(8, { peso: 180_000 }, ['largo', 'ancho', 'alto'], 'tambor-215l')] },
  { id: 'c04', etiquetas: ['catalogo'],
    descripcion: '4 IBC de 1000 litros',
    itemsEsperados: [item(4, {}, TODO, 'ibc-1000l')] },
  { id: 'c05', etiquetas: ['catalogo'],
    descripcion: '6 contenedores IBC llenos, 1050 kilos cada uno',
    itemsEsperados: [item(6, { peso: 1_050_000 }, ['largo', 'ancho', 'alto'], 'ibc-1000l')] },
  { id: 'c06', etiquetas: ['catalogo'],
    descripcion: '120 bidones de 20 litros con 18 kilos de aceite',
    itemsEsperados: [item(120, { peso: 18_000 }, ['largo', 'ancho', 'alto'], 'bidon-20l')] },
  { id: 'c07', etiquetas: ['catalogo', 'pallet'],
    descripcion: '12 pallets ARLOG cargados, 1,80 de alto y 600 kilos cada uno',
    itemsEsperados: [item(12, { alto: 1800, peso: 600_000 }, ['largo', 'ancho'], 'pallet-arlog')] },
  { id: 'c08', etiquetas: ['catalogo', 'pallet'],
    descripcion: '20 europallets de 1,50 de alto, 450 kg',
    itemsEsperados: [item(20, { alto: 1500, peso: 450_000 }, ['largo', 'ancho'], 'pallet-epal-1')] },
  { id: 'c09', etiquetas: ['catalogo', 'pallet'],
    descripcion: '10 pallets',
    itemsEsperados: [item(10, {}, TODO, 'pallet-arlog')] },

  // ---------- unidades (8) ----------
  { id: 'u01', etiquetas: ['unidades'],
    descripcion: '5 bultos de 1,2 x 0,8 x 1 metro de 300 kilos',
    itemsEsperados: [item(5, { largo: 1200, ancho: 800, alto: 1000, peso: 300_000 }, [])] },
  { id: 'u02', etiquetas: ['unidades'],
    descripcion: '25 cajas de 600x400x300 mm de 12 kg',
    itemsEsperados: [item(25, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, [])] },
  { id: 'u03', etiquetas: ['unidades'],
    descripcion: '3 bultos de 2 metros por 1 metro por 1,5 metros, 1,2 toneladas cada uno',
    itemsEsperados: [item(3, { largo: 2000, ancho: 1000, alto: 1500, peso: 1_200_000 }, [])] },
  { id: 'u04', etiquetas: ['unidades'],
    descripcion: '500 cajas de 20x15x10 de 800 gramos',
    itemsEsperados: [item(500, { largo: 200, ancho: 150, alto: 100, peso: 800 }, [])] },
  { id: 'u05', etiquetas: ['unidades'],
    descripcion: '2 cajones de 48 x 40 x 36 pulgadas de 500 kilos',
    itemsEsperados: [item(2, { largo: 1220, ancho: 1016, alto: 915, peso: 500_000 }, [])] },
  { id: 'u06', etiquetas: ['unidades'],
    descripcion: '14 bultos de 0,5 toneladas, 90x90x90',
    itemsEsperados: [item(14, { largo: 900, ancho: 900, alto: 900, peso: 500_000 }, [])] },
  { id: 'u07', etiquetas: ['unidades'],
    descripcion: '60 cajas de 1200 x 800 x 600 milímetros, 55 kilogramos',
    itemsEsperados: [item(60, { largo: 1200, ancho: 800, alto: 600, peso: 55_000 }, [])] },
  { id: 'u08', etiquetas: ['unidades'],
    descripcion: '9 rollos de 0,9 m de diámetro y 1,2 m de alto, 400 kg',
    itemsEsperados: [item(9, { largo: 900, ancho: 900, alto: 1200, peso: 400_000 }, [])] },

  // ---------- rotulos (4) ----------
  { id: 'r01', etiquetas: ['rotulos'],
    descripcion: '20 cajas de 60 de alto por 40 por 30, 12 kilos',
    itemsEsperados: [item(20, { alto: 600, largo: 400, ancho: 300, peso: 12_000 }, [])] },
  { id: 'r02', etiquetas: ['rotulos'],
    descripcion: '10 bultos de 2 metros de largo, 80 de ancho y 1,10 de alto, 250 kilos',
    itemsEsperados: [item(10, { largo: 2000, ancho: 800, alto: 1100, peso: 250_000 }, [])] },
  { id: 'r03', etiquetas: ['rotulos'],
    descripcion: '6 cajones de 1,5 de alto, base de 1,20 por 0,80, 700 kg',
    itemsEsperados: [item(6, { alto: 1500, largo: 1200, ancho: 800, peso: 700_000 }, [])] },
  { id: 'r04', etiquetas: ['rotulos'],
    descripcion: '35 cajas, 50 de ancho, 70 de largo, 40 de alto, 15 kilos',
    itemsEsperados: [item(35, { ancho: 500, largo: 700, alto: 400, peso: 15_000 }, [])] },

  // ---------- peso-total (4) ----------
  { id: 'p01', etiquetas: ['peso-total'],
    descripcion: '40 cajas de 60x40x30, 500 kilos en total',
    itemsEsperados: [item(40, { largo: 600, ancho: 400, alto: 300, peso: 12_500 }, [])] },
  { id: 'p02', etiquetas: ['peso-total'],
    descripcion: '10 bultos de 80x60x50 que entre todos pesan 1 tonelada',
    itemsEsperados: [item(10, { largo: 800, ancho: 600, alto: 500, peso: 100_000 }, [])] },
  { id: 'p03', etiquetas: ['peso-total'],
    descripcion: '3 cajas de 40x30x20, 10 kilos el total',
    // 10 kg entre 3 no divide exacto: redondea hacia arriba, 3.334 g (FR-002).
    itemsEsperados: [item(3, { largo: 400, ancho: 300, alto: 200, peso: 3_334 }, [])] },
  { id: 'p04', etiquetas: ['peso-total'],
    descripcion: '25 cajas de 50x40x30 con un peso total de 625 kg',
    itemsEsperados: [item(25, { largo: 500, ancho: 400, alto: 300, peso: 25_000 }, [])] },

  // ---------- faltante (6) ----------
  { id: 'f01', etiquetas: ['faltante'],
    descripcion: 'cajas de 60x40x30 de 12 kilos',
    // Sin cantidad: nunca se completa, se pregunta (AC-22).
    itemsEsperados: [item(null, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, [])] },
  { id: 'f02', etiquetas: ['faltante'],
    descripcion: '30 cajas de 60x40x30',
    itemsEsperados: [item(30, { largo: 600, ancho: 400, alto: 300 }, ['peso'])] },
  { id: 'f03', etiquetas: ['faltante'],
    descripcion: '45 cajas de 15 kilos',
    itemsEsperados: [item(45, { peso: 15_000 }, ['largo', 'ancho', 'alto'])] },
  { id: 'f04', etiquetas: ['faltante'],
    descripcion: '8 bultos de 120x80',
    itemsEsperados: [item(8, { largo: 1200, ancho: 800 }, ['alto', 'peso'])] },
  { id: 'f05', etiquetas: ['faltante', 'catalogo'],
    descripcion: 'tambores de 200 litros, no sé cuántos todavía',
    itemsEsperados: [item(null, {}, TODO, 'tambor-215l')] },
  { id: 'f06', etiquetas: ['faltante'],
    descripcion: '100 cajas chicas',
    itemsEsperados: [item(100, {}, TODO)] },

  // ---------- fuera-de-rango (3) ----------
  { id: 'x01', etiquetas: ['fuera-de-rango'],
    descripcion: '-5 cajas de 60x40x30',
    // La cantidad no queda en 5 ni en -5: queda faltante (AC-27).
    itemsEsperados: [item(null, { largo: 600, ancho: 400, alto: 300 }, ['peso'])] },
  { id: 'x02', etiquetas: ['fuera-de-rango'],
    descripcion: '0 cajas de 60x40x30 de 12 kilos',
    itemsEsperados: [item(null, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, [])] },
  { id: 'x03', etiquetas: ['fuera-de-rango'],
    descripcion: '2,5 cajas de 60x40x30 de 12 kilos',
    itemsEsperados: [item(null, { largo: 600, ancho: 400, alto: 300, peso: 12_000 }, [])] },

  // ---------- desconocido (4) ----------
  { id: 'd01', etiquetas: ['desconocido'],
    descripcion: '20 pipotes de 60 litros',
    // El catálogo no tiene pipotes: se pregunta todo, no se estima nada (AC-03).
    itemsEsperados: [item(20, {}, TODO)] },
  { id: 'd02', etiquetas: ['desconocido'],
    descripcion: '5 big bags de arena',
    // Big bag queda explícitamente afuera del catálogo: la bolsa llena se deforma.
    itemsEsperados: [item(5, {}, TODO)] },
  { id: 'd03', etiquetas: ['desconocido'],
    descripcion: '300 bolsas de cemento de 50 kilos',
    // No hay ficha de fabricante para bolsas: el peso sí lo declara la descripción.
    itemsEsperados: [item(300, { peso: 50_000 }, ['largo', 'ancho', 'alto'])] },
  { id: 'd04', etiquetas: ['desconocido', 'multiple'],
    descripcion: '10 tambores de 200 litros y 4 motores',
    itemsEsperados: [item(10, {}, TODO, 'tambor-215l'), item(4, {}, TODO)] },
]
