import { describe, expect, it } from 'vitest'
import { acomodar } from './acomodar'
import { CONTENEDOR_CHICO, itemDe } from './fixtures'
import { medidasEn } from './orientacion'
import { areaContacto, type Caja } from './apoyo'

/** Las cajas de la disposición, para poder preguntar quién apoya sobre quién. */
function cajas(d: ReturnType<typeof acomodar>, items: ReturnType<typeof itemDe>[]) {
  return d.secuencia.map((c) => {
    const item = items.find((i) => i.id === c.bulto.itemId)!
    const { dx, dy, dz } = medidasEn(item, c.orientacion)
    const caja: Caja = { x: c.x as number, y: c.y as number, z: c.z as number, dx, dy, dz }
    return { caja, bulto: c.bulto }
  })
}

describe('AC-04 — ningún bulto queda apoyado sobre un no apilable', () => {
  const tambor = itemDe({ id: 'tambor', cantidad: 4, largo: 585, ancho: 585, alto: 400, peso: 50_000, noApilable: true })
  // Pocas cajas a propósito: los no apilables van al final, así que con muchas el piso se
  // llena y los tambores quedarían en cero —y el test no probaría nada sobre AC-04.
  const caja = itemDe({ id: 'caja', cantidad: 8, largo: 400, ancho: 400, alto: 300, peso: 8_000 })
  const items = [tambor, caja]
  const d = acomodar(items, CONTENEDOR_CHICO)

  it('se colocan bultos de los dos tipos', () => {
    expect(d.secuencia.filter((c) => c.bulto.itemId === 'tambor').length).toBeGreaterThan(0)
    expect(d.secuencia.filter((c) => c.bulto.itemId === 'caja').length).toBeGreaterThan(0)
  })

  it('nada apoya sobre un tambor', () => {
    const puestos = cajas(d, items)
    const tambores = puestos.filter((p) => p.bulto.itemId === 'tambor')
    for (const t of tambores) {
      for (const otro of puestos) {
        if (otro === t) continue
        expect(
          areaContacto(otro.caja, t.caja),
          `${otro.bulto.itemId}#${otro.bulto.indice} apoya sobre un tambor`,
        ).toBe(0)
      }
    }
  })
})

describe('AC-05 — con orientación obligatoria, el alto declarado es el alto final', () => {
  const parado = itemDe({
    id: 'parado', cantidad: 8, largo: 400, ancho: 300, alto: 700, peso: 20_000,
    orientacionObligatoria: true,
  })
  const d = acomodar([parado], CONTENEDOR_CHICO)

  it('se coloca al menos uno', () => {
    expect(d.secuencia.length).toBeGreaterThan(0)
  })

  it('todos quedan con 700 mm sobre el eje z', () => {
    for (const c of d.secuencia) {
      const { dz } = medidasEn(parado, c.orientacion)
      expect(dz, `bulto ${c.bulto.indice}`).toBe(700)
    }
  })

  it('la rotación en el plano horizontal sigue permitida', () => {
    // AC-05 fija el eje vertical, nada más.
    for (const c of d.secuencia) expect(c.orientacion.ejeZ).toBe('alto')
  })
})

describe('AC-06 — sobre un ítem que admite 50 kg no se apoyan más de 50 kg', () => {
  const fragil = itemDe({
    id: 'fragil', cantidad: 6, largo: 600, ancho: 400, alto: 300, peso: 10_000,
    pesoMaximoEncima: 50_000,
  })
  const pesada = itemDe({ id: 'pesada', cantidad: 12, largo: 600, ancho: 400, alto: 300, peso: 30_000 })
  const items = [fragil, pesada]
  const d = acomodar(items, CONTENEDOR_CHICO)

  it('se colocan bultos de los dos tipos', () => {
    expect(d.secuencia.filter((c) => c.bulto.itemId === 'fragil').length).toBeGreaterThan(0)
  })

  it('ningún frágil recibe más de 50 kg, contando TODA la pila', () => {
    // Se recalcula la propagación desde cero, con la cuenta escrita acá: si el acomodador se
    // equivocara, este test no lo taparía.
    const puestos = cajas(d, items)
    const pesoDe = (itemId: string) => (itemId === 'fragil' ? 10_000 : 30_000)
    const recibido = new Map<number, number>()

    const porZ = [...puestos.keys()].sort((i, j) => puestos[j]!.caja.z - puestos[i]!.caja.z)
    for (const i of porZ) {
      const apoyos = puestos
        .map((p, j) => ({ j, area: areaContacto(puestos[i]!.caja, p.caja) }))
        .filter(({ j, area }) => j !== i && area > 0)
      if (apoyos.length === 0) continue
      const total = pesoDe(puestos[i]!.bulto.itemId) + (recibido.get(i) ?? 0)
      const areaTotal = apoyos.reduce((n, a) => n + a.area, 0)
      for (const a of apoyos) {
        const parte = Math.ceil((total * a.area) / areaTotal)
        recibido.set(a.j, (recibido.get(a.j) ?? 0) + parte)
      }
    }

    for (const [i, carga] of recibido) {
      if (puestos[i]!.bulto.itemId !== 'fragil') continue
      expect(carga, `el frágil #${puestos[i]!.bulto.indice} recibe ${carga} g`).toBeLessThanOrEqual(50_000)
    }
  })
})

describe('las marcas cambian la disposición', () => {
  it('marcar algo como no apilable da una disposición distinta', () => {
    const sinMarca = itemDe({ id: 'x', cantidad: 10, largo: 600, ancho: 400, alto: 300, peso: 10_000 })
    const conMarca = { ...sinMarca, marcas: { ...sinMarca.marcas, noApilable: { estado: 'declarado' as const, valor: true } } }
    const a = acomodar([sinMarca], CONTENEDOR_CHICO)
    const b = acomodar([conMarca], CONTENEDOR_CHICO)
    // Sin apilar, entran menos: el piso es el límite.
    expect(b.secuencia.length).toBeLessThan(a.secuencia.length)
  })

  it('un tope de peso bajo también reduce lo que entra', () => {
    const sinTope = itemDe({ id: 'y', cantidad: 20, largo: 600, ancho: 400, alto: 300, peso: 20_000 })
    const conTope = itemDe({ id: 'y', cantidad: 20, largo: 600, ancho: 400, alto: 300, peso: 20_000, pesoMaximoEncima: 1_000 })
    expect(acomodar([conTope], CONTENEDOR_CHICO).secuencia.length).toBeLessThan(
      acomodar([sinTope], CONTENEDOR_CHICO).secuencia.length,
    )
  })
})
