import { describe, expect, it } from 'vitest'
import { crearCatalogo } from '../catalogo/catalogo'
import { completarItems, type ItemCrudo } from './completar'
import { camposFaltantes, consolidacionBloqueada } from './faltantes'

const TAMBOR = {
  id: 'tambor-215l',
  nombre: 'Tambor de acero de 215 L',
  sinonimos: ['tambor', 'tambores', 'tambor de 200 litros'],
  largo: 585,
  ancho: 585,
  alto: 877,
  peso: null,
  noApilable: null,
  orientacionObligatoria: null,
  fuente: 'Ficha de prueba de este archivo, no es una fuente real',
}

/** Una entrada que sí trae peso, para distinguir los dos motivos de AC-18. */
const LADRILLO = { ...TAMBOR, id: 'ladrillo', nombre: 'Ladrillo', sinonimos: ['ladrillos'], largo: 240, ancho: 115, alto: 70, peso: 3_000 }

const catalogo = crearCatalogo([TAMBOR, LADRILLO], [])

const cm = (valor: number) => ({ valor, unidad: 'cm' })

describe('AC-01 — lo declarado se extrae tal cual', () => {
  const crudos: ItemCrudo[] = [
    { nombre: 'cajas', cantidad: 40, largo: cm(60), ancho: cm(40), alto: cm(30), peso: { valor: 12, unidad: 'kg' } },
    { nombre: 'tambores', cantidad: 15, capacidad: { valor: 200, unidad: 'l' }, idCatalogo: 'tambor-215l' },
  ]
  const items = completarItems(crudos, { catalogo })

  it('la lista tiene dos ítems con cantidades 40 y 15', () => {
    expect(items).toHaveLength(2)
    expect(items[0]!.cantidad).toEqual({ estado: 'declarado', valor: 40 })
    expect(items[1]!.cantidad).toEqual({ estado: 'declarado', valor: 15 })
  })

  it('las cajas miden 600 × 400 × 300 mm y pesan 12 kg', () => {
    expect(items[0]!.largo).toEqual({ estado: 'declarado', valor: 600 })
    expect(items[0]!.ancho).toEqual({ estado: 'declarado', valor: 400 })
    expect(items[0]!.alto).toEqual({ estado: 'declarado', valor: 300 })
    expect(items[0]!.pesoUnitario).toEqual({ estado: 'declarado', valor: 12_000 })
  })
})

describe('AC-02 — lo que falta se completa del catálogo y queda estimado', () => {
  const items = completarItems(
    [{ nombre: 'tambores', cantidad: 15, capacidad: { valor: 200, unidad: 'l' }, idCatalogo: 'tambor-215l' }],
    { catalogo },
  )

  it('las medidas salen de la entrada y quedan marcadas como estimadas', () => {
    expect(items[0]!.largo).toEqual({ estado: 'estimado', valor: 585, entradaCatalogo: 'tambor-215l' })
    expect(items[0]!.alto).toEqual({ estado: 'estimado', valor: 877, entradaCatalogo: 'tambor-215l' })
  })

  it('indica qué entrada del catálogo usó', () => {
    expect(items[0]!.largo).toHaveProperty('entradaCatalogo', 'tambor-215l')
  })
})

describe('AC-03 — un ítem sin entrada se pregunta entero y bloquea', () => {
  const items = completarItems([{ nombre: 'algo que nadie conoce', cantidad: 3 }], { catalogo })

  it('los campos quedan faltantes con el motivo, sin ningún valor escrito', () => {
    for (const campo of ['largo', 'ancho', 'alto', 'pesoUnitario'] as const) {
      expect(items[0]![campo]).toEqual({ estado: 'faltante', motivo: 'sin-entrada-en-catalogo' })
      expect(items[0]![campo]).not.toHaveProperty('valor')
    }
  })

  it('la consolidación queda bloqueada', () => {
    expect(consolidacionBloqueada(items)).toBe(true)
  })
})

describe('AC-18 — entrada parcial: medidas estimadas y peso faltante con OTRO motivo', () => {
  const items = completarItems([{ nombre: 'tambores', cantidad: 15 }], { catalogo })

  it('las medidas quedan estimadas', () => {
    expect(items[0]!.largo.estado).toBe('estimado')
  })

  it('el peso queda faltante con "entrada-sin-el-dato", distinto de "sin-entrada"', () => {
    expect(items[0]!.pesoUnitario).toEqual({ estado: 'faltante', motivo: 'entrada-sin-el-dato' })
  })

  it('la consolidación queda bloqueada', () => {
    expect(consolidacionBloqueada(items)).toBe(true)
  })
})

describe('AC-22 — sin cantidad se pregunta y bloquea; la cantidad NUNCA se completa', () => {
  const items = completarItems([{ nombre: 'tambores', largo: cm(60), ancho: cm(40), alto: cm(30), peso: { valor: 12, unidad: 'kg' } }], { catalogo })

  it('la cantidad queda faltante aunque el catálogo conozca el ítem', () => {
    expect(items[0]!.cantidad.estado).toBe('faltante')
  })

  it('bloquea', () => {
    expect(consolidacionBloqueada(items)).toBe(true)
  })
})

describe('AC-17 — el id propuesto se verifica y la propuesta se descarta entera', () => {
  it('un id inexistente NO cae en la entrada más parecida', () => {
    // "tambor-200l" se parece muchísimo a "tambor-215l". Justamente por eso.
    const items = completarItems(
      [{ nombre: 'tambores', cantidad: 15, idCatalogo: 'tambor-200l' }],
      { catalogo },
    )
    expect(items[0]!.largo).toEqual({ estado: 'faltante', motivo: 'sin-entrada-en-catalogo' })
  })

  it('tampoco cae al nombre: la propuesta se descarta ENTERA', () => {
    // El nombre "tambores" resolvería solo, pero el modelo propuso un id que no existe.
    const items = completarItems(
      [{ nombre: 'tambores', cantidad: 15, idCatalogo: 'no-existe' }],
      { catalogo },
    )
    expect(items[0]!.largo.estado).toBe('faltante')
  })

  it('sin id propuesto, el nombre sí resuelve', () => {
    const items = completarItems([{ nombre: 'tambores', cantidad: 15 }], { catalogo })
    expect(items[0]!.largo.estado).toBe('estimado')
  })
})

describe('AC-27 — un valor fuera de rango queda faltante con su propio motivo', () => {
  it('la cantidad descartada por el intermediario llega como "valor-fuera-de-rango"', () => {
    const items = completarItems([{ nombre: 'cajas', largo: cm(60), ancho: cm(40), alto: cm(30), peso: { valor: 12, unidad: 'kg' } }], {
      catalogo,
      descartados: [{ nombreItem: 'cajas', campo: 'cantidad' }],
    })
    expect(items[0]!.cantidad).toEqual({ estado: 'faltante', motivo: 'valor-fuera-de-rango' })
  })

  it('no se salva por su valor absoluto: no hay ningún valor guardado', () => {
    const items = completarItems([{ nombre: 'cajas' }], {
      catalogo,
      descartados: [{ nombreItem: 'cajas', campo: 'cantidad' }],
    })
    expect(items[0]!.cantidad).not.toHaveProperty('valor')
  })
})

describe('el peso del ítem completo se divide por la cantidad', () => {
  it('500 kg entre 40 cajas dan 12,5 kg por caja', () => {
    const items = completarItems(
      [{ nombre: 'cajas', cantidad: 40, largo: cm(60), ancho: cm(40), alto: cm(30), peso: { valor: 500, unidad: 'kg', esDelItemCompleto: true } }],
      { catalogo },
    )
    expect(items[0]!.pesoUnitario).toEqual({ estado: 'declarado', valor: 12_500 })
  })

  it('sin cantidad no se puede dividir, y no se inventa', () => {
    const items = completarItems(
      [{ nombre: 'cajas', peso: { valor: 500, unidad: 'kg', esDelItemCompleto: true } }],
      { catalogo },
    )
    expect(items[0]!.pesoUnitario.estado).toBe('faltante')
  })
})

describe('FR-002 — el rótulo explícito manda sobre la posición', () => {
  it('"60 de alto por 40 por 30" pone 60 en el alto', () => {
    const items = completarItems(
      [{
        nombre: 'cajas',
        cantidad: 1,
        largo: { valor: 60, unidad: 'cm', ejeRotulado: 'alto' },
        ancho: cm(40),
        alto: cm(30),
        peso: { valor: 1, unidad: 'kg' },
      }],
      { catalogo },
    )
    expect(items[0]!.alto).toEqual({ estado: 'declarado', valor: 600 })
    expect(items[0]!.largo).toEqual({ estado: 'declarado', valor: 400 })
  })

  it('rótulos contradictorios dejan los campos faltantes: no se adivina', () => {
    const items = completarItems(
      [{
        nombre: 'cajas',
        cantidad: 1,
        largo: { valor: 60, unidad: 'cm', ejeRotulado: 'alto' },
        ancho: { valor: 40, unidad: 'cm', ejeRotulado: 'alto' },
      }],
      { catalogo },
    )
    expect(items[0]!.alto.estado).toBe('faltante')
    expect(items[0]!.largo.estado).toBe('faltante')
  })
})

describe('FR-008 — las marcas', () => {
  const items = completarItems([{ nombre: 'tambores', cantidad: 15 }], { catalogo })

  it('el peso máximo encima NUNCA viene precargado', () => {
    expect(items[0]!.marcas.pesoMaximoEncima.estado).toBe('faltante')
  })

  it('no bloquea la consolidación: si bloqueara, ninguna carga se podría consolidar', () => {
    const soloEseFaltante = completarItems(
      [{ nombre: 'ladrillos', cantidad: 100 }],
      { catalogo },
    )
    expect(camposFaltantes(soloEseFaltante).map((f) => f.campo)).toEqual(['pesoMaximoEncima'])
    expect(consolidacionBloqueada(soloEseFaltante)).toBe(false)
  })
})

describe('AC-09 — el color va atado al ítem, no a su posición', () => {
  it('ítems agregados después siguen la numeración y no corren los de antes', () => {
    const primeros = completarItems([{ nombre: 'tambores', cantidad: 1 }], { catalogo })
    const siguientes = completarItems([{ nombre: 'ladrillos', cantidad: 1 }], {
      catalogo,
      desdeIndice: primeros.length,
    })
    expect(primeros[0]!.color).toBe(0)
    expect(siguientes[0]!.color).toBe(1)
    expect(siguientes[0]!.id).toBe('item-1')
  })
})

describe('la lista vacía bloquea (FR-028)', () => {
  it('no hay nada que consolidar', () => {
    expect(consolidacionBloqueada([])).toBe(true)
  })
})

describe('la capacidad en litros no se usa para buscar en el catálogo', () => {
  it('"15 tambores de 200 litros" resuelve por el sinónimo, no por la capacidad', () => {
    const items = completarItems(
      [{ nombre: 'tambores', cantidad: 15, capacidad: { valor: 200, unidad: 'l' } }],
      { catalogo },
    )
    expect(items[0]!.largo.estado).toBe('estimado')
  })

  it('un nombre desconocido con capacidad no se resuelve inventando una clave', () => {
    // Concatenar "pipotes de 200 litros" y buscarlo sería adivinar (Principio I).
    const items = completarItems(
      [{ nombre: 'pipotes', cantidad: 15, capacidad: { valor: 200, unidad: 'l' } }],
      { catalogo },
    )
    expect(items[0]!.largo).toEqual({ estado: 'faltante', motivo: 'sin-entrada-en-catalogo' })
  })
})
