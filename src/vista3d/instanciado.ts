/**
 * La geometría de la vista 3D: **una malla instanciada por tipo de ítem** (FR-013, SC-009).
 *
 * Instanciada porque el costo de dibujo crece con la cantidad de **tipos**, no de bultos: 200
 * bultos de un tipo son una sola llamada de dibujo, y 200 repartidos en 12 tipos son doce. Por
 * eso SC-009 se mide con 12 tipos, que es el caso peor de la paleta.
 *
 * Dos bultos del mismo tipo se distinguen por **aristas**, no por color: variar el tono por
 * bulto reduciría la distancia entre tipos, que es justo lo que mide SC-015 (research.md §10).
 */

import {
  BoxGeometry,
  Color,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Matrix4,
  MeshLambertMaterial,
  Vector3,
} from 'three'
import type { Colocacion, Disposicion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { medidasEn } from '../acomodador/orientacion'
import { colorDe } from './color-por-item'

/** Un cubo de 1×1×1 centrado en el origen, escalado por instancia. */
const CUBO = new BoxGeometry(1, 1, 1)
const ARISTAS = new EdgesGeometry(CUBO)

export type MallasDeLaCarga = {
  readonly grupo: Group
  /** Para el recorrido: cuántas instancias mostrar de cada tipo según el prefijo. */
  readonly mostrarHasta: (k: number) => void
  readonly liberar: () => void
}

/**
 * Arma el grupo de mallas de una disposición.
 *
 * La matriz de cada instancia se calcula una vez; el recorrido de FR-014 solo cambia `count`,
 * que es una propiedad y no implica rearmar nada. Es lo que permite mover el control deslizante
 * sin recalcular geometría.
 */
export function mallasDe(
  disposicion: Disposicion,
  items: readonly Item[],
  { opacidad = 1 }: { readonly opacidad?: number } = {},
): MallasDeLaCarga {
  const grupo = new Group()
  const porTipo = new Map<string, Item>(items.map((i) => [i.id, i]))

  // Las colocaciones se agrupan por tipo manteniendo su posición en la secuencia: el recorrido
  // necesita saber, para un prefijo de k, cuántas instancias de cada tipo entran.
  const porItem = new Map<string, { colocacion: Colocacion; orden: number }[]>()
  for (const [orden, colocacion] of disposicion.secuencia.entries()) {
    const lista = porItem.get(colocacion.bulto.itemId) ?? []
    lista.push({ colocacion, orden })
    porItem.set(colocacion.bulto.itemId, lista)
  }

  const mallas: { malla: InstancedMesh; aristas: LineSegments; ordenes: number[] }[] = []

  for (const [itemId, colocaciones] of porItem) {
    const item = porTipo.get(itemId)
    if (item === undefined) continue

    const material = new MeshLambertMaterial({
      color: new Color(colorDe(item)),
      transparent: opacidad < 1,
      opacity: opacidad,
    })
    const malla = new InstancedMesh(CUBO, material, colocaciones.length)

    const materialAristas = new LineBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.55 })
    const aristas = new LineSegments(ARISTAS, materialAristas)
    // Las aristas se instancian con la misma matriz que los cubos, por eso se guardan aparte.
    const gruposAristas = new Group()

    const matriz = new Matrix4()
    for (const [i, { colocacion }] of colocaciones.entries()) {
      const { dx, dy, dz } = medidasEn(item, colocacion.orientacion)
      // El origen del contenedor está en una esquina; Three centra las cajas, así que se
      // desplaza media medida en cada eje.
      const centro = new Vector3(
        (colocacion.x as number) + dx / 2,
        (colocacion.z as number) + dz / 2,
        (colocacion.y as number) + dy / 2,
      )
      matriz.makeScale(dx, dz, dy).setPosition(centro)
      malla.setMatrixAt(i, matriz)

      const borde = aristas.clone()
      borde.applyMatrix4(matriz)
      gruposAristas.add(borde)
    }
    malla.instanceMatrix.needsUpdate = true

    grupo.add(malla)
    grupo.add(gruposAristas)
    mallas.push({ malla, aristas: aristas, ordenes: colocaciones.map((c) => c.orden) })
    // El grupo de aristas se recorta igual que las instancias, por índice.
    ;(gruposAristas as Group & { ordenes?: number[] }).ordenes = colocaciones.map((c) => c.orden)
  }

  return {
    grupo,
    mostrarHasta(k: number) {
      for (const { malla, ordenes } of mallas) {
        // Cuántas instancias de este tipo entran en el prefijo de k bultos.
        malla.count = ordenes.filter((orden) => orden < k).length
      }
      for (const hijo of grupo.children) {
        const ordenes = (hijo as Group & { ordenes?: number[] }).ordenes
        if (ordenes === undefined) continue
        for (const [i, borde] of hijo.children.entries()) {
          borde.visible = (ordenes[i] ?? 0) < k
        }
      }
    },
    liberar() {
      for (const { malla } of mallas) {
        malla.dispose()
        ;(malla.material as MeshLambertMaterial).dispose()
      }
    },
  }
}

/** Las aristas del contenedor, para que la caja se entienda sin tapar lo que hay adentro. */
export function aristasDelContenedor(largo: number, ancho: number, alto: number): LineSegments {
  const caja = new BoxGeometry(largo, alto, ancho)
  const geo = new EdgesGeometry(caja)
  const lineas = new LineSegments(geo, new LineBasicMaterial({ color: 0x888888 }))
  lineas.position.set(largo / 2, alto / 2, ancho / 2)
  caja.dispose()
  return lineas
}
