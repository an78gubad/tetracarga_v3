import { describe, expect, it } from 'vitest'
import { crearCatalogo } from '../catalogo/catalogo'
import { completarItems } from './completar'
import { declararPesoMaximoEncima, editarCampo } from './editar'
import { agregarAlFinal, eliminarPorId, proximoIndice, reemplazarPorId } from './fusionar'

const TAMBOR = {
  id: 'tambor-215l',
  nombre: 'Tambor de acero de 215 L',
  sinonimos: ['tambor', 'tambores'],
  largo: 585, ancho: 585, alto: 877, peso: null,
  noApilable: null, orientacionObligatoria: null,
  fuente: 'Ficha de prueba de este archivo, no es una fuente real',
}
const catalogo = crearCatalogo([TAMBOR], [])
const cm = (valor: number) => ({ valor, unidad: 'cm' })

describe('FR-025 — una segunda descripción agrega al final', () => {
  // Primera descripción, con un campo corregido a mano y una marca cargada.
  const primeros = completarItems([{ nombre: 'tambores', cantidad: 15 }], { catalogo })
  const corregido = declararPesoMaximoEncima(editarCampo(primeros[0]!, 'largo', 600), 50_000)
  const lista = reemplazarPorId(primeros, corregido)

  // Segunda descripción.
  const nuevos = completarItems(
    [{ nombre: 'cajas', cantidad: 40, largo: cm(60), ancho: cm(40), alto: cm(30), peso: { valor: 12, unidad: 'kg' } }],
    { catalogo, desdeIndice: proximoIndice(lista) },
  )
  const final = agregarAlFinal(lista, nuevos)

  it('los ítems nuevos quedan al final', () => {
    expect(final.map((i) => i.nombre)).toEqual(['tambores', 'cajas'])
  })

  it('el ítem corregido conserva su VALOR', () => {
    expect(final[0]!.largo).toEqual({ estado: 'declarado', valor: 600 })
  })

  it('conserva su MARCA', () => {
    expect(final[0]!.marcas.pesoMaximoEncima).toEqual({ estado: 'declarado', valor: 50_000 })
  })

  it('conserva su COLOR', () => {
    expect(final[0]!.color).toBe(primeros[0]!.color)
  })

  it('el nuevo no choca de id ni de color con el que ya estaba', () => {
    expect(final[1]!.id).not.toBe(final[0]!.id)
    expect(final[1]!.color).not.toBe(final[0]!.color)
  })

  it('NO se reinterpreta lo ya cargado: el campo corregido no vuelve a estimado', () => {
    expect(final[0]!.largo.estado).toBe('declarado')
  })

  it('NO se fusionan ítems por parecido de nombre', () => {
    // "tambores" y "tambor de repuesto" son dos ítems, aunque se parezcan.
    const masTambores = completarItems([{ nombre: 'tambores', cantidad: 5 }], {
      catalogo,
      desdeIndice: proximoIndice(final),
    })
    const conDuplicado = agregarAlFinal(final, masTambores)
    expect(conDuplicado).toHaveLength(3)
    expect(conDuplicado.filter((i) => i.nombre === 'tambores')).toHaveLength(2)
  })
})

describe('eliminar un ítem (AC-09)', () => {
  const tres = completarItems(
    [{ nombre: 'a' }, { nombre: 'b' }, { nombre: 'c' }],
    { catalogo },
  )

  it('saca el ítem pedido', () => {
    expect(eliminarPorId(tres, tres[1]!.id).map((i) => i.nombre)).toEqual(['a', 'c'])
  })

  it('los colores de los demás NO se corren', () => {
    const quedan = eliminarPorId(tres, tres[1]!.id)
    expect(quedan[0]!.color).toBe(tres[0]!.color)
    expect(quedan[1]!.color).toBe(tres[2]!.color)
  })

  it('eliminar algo que no está no rompe nada', () => {
    expect(eliminarPorId(tres, 'fantasma')).toHaveLength(3)
  })
})
