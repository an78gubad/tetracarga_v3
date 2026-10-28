import { describe, expect, it } from 'vitest'
import { catalogo, CatalogoInvalidoError, crearCatalogo } from './catalogo'
import { validarContenedores, validarObjetos } from './esquema'

/** Una entrada válida, para mutarla en cada caso y probar una sola cosa por test. */
function objeto(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'tambor-200l',
    nombre: 'Tambor de 200 litros',
    sinonimos: ['tambor', 'tacho'],
    largo: 585,
    ancho: 585,
    alto: 880,
    peso: null,
    noApilable: null,
    orientacionObligatoria: null,
    fuente: 'Ficha de prueba (este archivo), no es una fuente real',
    ...cambios,
  }
}

function contenedor(cambios: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: '20',
    nombre: "20' Dry Container",
    largoInterior: 5898,
    anchoInterior: 2352,
    altoInterior: 2393,
    cargaUtil: 28_180_000,
    tara: 2_200_000,
    fuente: 'Ficha de prueba (este archivo), no es una fuente real',
    ...cambios,
  }
}

describe('el esquema exige una fuente para cada entrada', () => {
  it('rechaza una entrada sin fuente', () => {
    const { errores } = validarObjetos([objeto({ fuente: undefined })])
    expect(errores.map((e) => e.campo)).toContain('fuente')
  })

  it('rechaza una fuente vacía o en blanco', () => {
    expect(validarObjetos([objeto({ fuente: '' })]).errores).not.toHaveLength(0)
    expect(validarObjetos([objeto({ fuente: '   ' })]).errores).not.toHaveLength(0)
  })

  it('también la exige en los contenedores', () => {
    const { errores } = validarContenedores([contenedor({ fuente: '' })])
    expect(errores.map((e) => e.campo)).toContain('fuente')
  })
})

describe('el esquema rechaza datos que no son datos', () => {
  it('rechaza un id repetido', () => {
    const { errores } = validarObjetos([objeto(), objeto({ nombre: 'Otro', sinonimos: [] })])
    expect(errores.map((e) => e.problema)).toContain('está repetido')
  })

  it('rechaza un sinónimo que ya pertenece a otra entrada: haría ambiguo el matcheo', () => {
    const { errores } = validarObjetos([
      objeto(),
      objeto({ id: 'bidon-200l', nombre: 'Bidón', sinonimos: ['tacho'] }),
    ])
    expect(errores.some((e) => e.campo === 'sinonimos')).toBe(true)
  })

  it('rechaza medidas que no son enteros mayores que 0', () => {
    for (const largo of [0, -585, 585.5]) {
      expect(validarObjetos([objeto({ largo })]).errores.map((e) => e.campo)).toContain('largo')
    }
  })

  it('acepta peso null, que es el caso normal, y rechaza un peso de 0 o negativo', () => {
    expect(validarObjetos([objeto({ peso: null })]).errores).toHaveLength(0)
    expect(validarObjetos([objeto({ peso: 0 })]).errores.map((e) => e.campo)).toContain('peso')
    expect(validarObjetos([objeto({ peso: -1 })]).errores.map((e) => e.campo)).toContain('peso')
  })

  it('acepta las marcas en null, porque hoy ninguna ficha las declara', () => {
    const { errores } = validarObjetos([
      objeto({ noApilable: null, orientacionObligatoria: null }),
    ])
    expect(errores).toHaveLength(0)
  })
})

describe('un catálogo que no cumple el esquema no se construye', () => {
  it('falla al crearlo, no al usarlo', () => {
    expect(() => crearCatalogo([objeto({ fuente: '' })], [])).toThrow(CatalogoInvalidoError)
  })

  it('el error nombra la entrada y el campo, para poder arreglarlo', () => {
    try {
      crearCatalogo([objeto({ fuente: '' })], [])
      expect.unreachable('tendría que haber fallado')
    } catch (error) {
      expect((error as Error).message).toContain('tambor-200l')
      expect((error as Error).message).toContain('fuente')
    }
  })
})

describe('el código verifica el id que propone el modelo (AC-17)', () => {
  const c = crearCatalogo([objeto()], [contenedor()])

  it('devuelve la entrada cuando el id existe', () => {
    expect(c.entradaObjeto('tambor-200l')?.nombre).toBe('Tambor de 200 litros')
  })

  it('un id inexistente NO cae en la entrada más parecida: se descarta', () => {
    // "tambor-200" se parece muchísimo a "tambor-200l". Justamente por eso.
    expect(c.entradaObjeto('tambor-200')).toBeUndefined()
    expect(c.entradaObjeto('TAMBOR-200L')).toBeUndefined()
    expect(c.entradaObjeto('')).toBeUndefined()
  })

  it('resuelve nombres y sinónimos exactos, sin distinguir mayúsculas', () => {
    expect(c.porNombre('tambor')?.id).toBe('tambor-200l')
    expect(c.porNombre('  TACHO ')?.id).toBe('tambor-200l')
    expect(c.porNombre('tambores')).toBeUndefined()
  })

  it('lo que se le manda al modelo no lleva medidas', () => {
    const paraPrompt = c.paraPrompt()
    expect(paraPrompt).toEqual([
      { id: 'tambor-200l', nombre: 'Tambor de 200 litros', sinonimos: ['tambor', 'tacho'] },
    ])
    expect(JSON.stringify(paraPrompt)).not.toContain('585')
  })
})

describe('el contenedor que reciben el acomodador y el validador', () => {
  const c = crearCatalogo([], [contenedor()])

  it('lleva la carga útil y no el peso bruto', () => {
    expect(c.contenedor('20')?.cargaUtil).toBe(28_180_000)
  })

  it('no lleva la tara: nadie calcula contra el peso bruto', () => {
    expect(c.contenedor('20')).not.toHaveProperty('tara')
  })

  it('un contenedor inexistente devuelve undefined', () => {
    expect(c.contenedor('45hc')).toBeUndefined()
  })
})

describe('el catálogo del repositorio', () => {
  it('trae los tres contenedores del PRD', () => {
    expect(catalogo.contenedores.map((c) => c.id)).toEqual(['20', '40', '40hc'])
  })

  it.each(['20', '40', '40hc'])(
    'en %s la cuenta cierra: carga útil + tara = peso bruto',
    (id) => {
      // Es la prueba con la que CONTEXTO.md acepta o descarta una ficha de contenedor.
      // Los pesos brutos son los de las fichas de Maersk: 30.480 kg el 20', 32.500 los 40'.
      const brutoEsperado: Record<string, number> = {
        '20': 30_480_000,
        '40': 32_500_000,
        '40hc': 32_500_000,
      }
      const c = catalogo.entradaContenedor(id)
      expect(c).toBeDefined()
      expect(c!.cargaUtil + c!.tara).toBe(brutoEsperado[id])
    },
  )

  it.each([
    ['20', 33.2],
    ['40', 67.7],
    ['40hc', 76.4],
  ])('en %s el volumen interior coincide con el publicado (%s m3)', (id, m3) => {
    const c = catalogo.entradaContenedor(id as string)!
    const calculado = (c.largoInterior * c.anchoInterior * c.altoInterior) / 1e9
    expect(calculado).toBeCloseTo(m3 as number, 1)
  })

  it('usa 2352 mm de ancho interior, no los 2350 de la ficha descartada', () => {
    // CONTEXTO.md descartó un PDF de Maersk Sudáfrica de 2014 justamente por los 2350 mm.
    for (const c of catalogo.contenedores) {
      expect(c.anchoInterior).toBe(2352)
    }
  })

  it('toda entrada nombra su ficha', () => {
    for (const entrada of [...catalogo.objetos, ...catalogo.contenedores]) {
      expect(entrada.fuente.trim().length).toBeGreaterThan(20)
    }
  })

  it('el pallet trae la base y deja el alto y el peso para preguntar', () => {
    const pallet = catalogo.porNombre('europallet')
    expect(pallet?.id).toBe('pallet-epal-1')
    expect(pallet?.largo).toBe(800)
    expect(pallet?.ancho).toBe(1200)
    // Como carga va cargado: el alto y el peso dependen de lo que lleva (CONTEXTO.md).
    expect(pallet?.alto).toBeNull()
    expect(pallet?.peso).toBeNull()
  })

  it('ninguna entrada trae marcas de FR-008 precargadas', () => {
    // Ninguna ficha dice "no apilable" ni "este lado arriba" (CONTEXTO.md).
    for (const o of catalogo.objetos) {
      expect(o.noApilable).toBeNull()
      expect(o.orientacionObligatoria).toBeNull()
    }
  })
})
