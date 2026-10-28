/**
 * La vista 3D navegable (FR-013, FR-014, FR-028).
 *
 * Los controles son los tres que la historia 3 pide: **girar** arrastrando, **acercar** con la
 * rueda y **desplazar** arrastrando con el botón derecho. Están escritos a mano, sin
 * `OrbitControls`, para no depender de un módulo de ejemplos de Three.
 *
 * Si el navegador no puede inicializar WebGL, **no se pierde la consolidación**: se informa y
 * el informe sigue disponible (FR-028).
 */

import { useEffect, useRef, useState } from 'react'
import {
  AmbientLight,
  DirectionalLight,
  PerspectiveCamera,
  Scene,
  Vector3,
  WebGLRenderer,
} from 'three'
import type { Contenedor, Disposicion } from '../dominio/disposicion'
import type { Item } from '../dominio/items'
import { aristasDelContenedor, mallasDe } from './instanciado'
import { informeDe, medirFps, type Medicion } from './medidor-fps'
import { COLOR_DE_FONDO } from './paleta'

export type EscenaProps = {
  readonly disposicion: Disposicion
  readonly items: readonly Item[]
  readonly contenedor: Contenedor
  /** La posición del recorrido: se ven los primeros `hasta` bultos (FR-014). */
  readonly hasta: number
}

export function Escena({ disposicion, items, contenedor, hasta }: EscenaProps) {
  const lienzo = useRef<HTMLCanvasElement | null>(null)
  const mostrarHasta = useRef<((k: number) => void) | null>(null)
  /** Para el medidor de SC-009: ubica la cámara en un ángulo absoluto. */
  const ubicarEnAngulo = useRef<((angulo: number) => void) | null>(null)
  const [sin3D, setSin3D] = useState<string | null>(null)
  const [medicion, setMedicion] = useState<Medicion | null>(null)
  const [midiendo, setMidiendo] = useState(false)

  useEffect(() => {
    const canvas = lienzo.current
    if (canvas === null) return
    // Alias con el tipo ya estrechado: dentro de los manejadores, TypeScript no puede saber
    // que el lienzo sigue existiendo.
    const lienzoFirme: HTMLCanvasElement = canvas

    let render: WebGLRenderer
    try {
      render = new WebGLRenderer({ canvas, antialias: true })
    } catch (error) {
      // Sin aceleración de hardware, o sin contexto disponible. No es una falla de la carga.
      setSin3D((error as Error).message || 'el navegador no pudo inicializar WebGL')
      return
    }

    const escena = new Scene()
    escena.add(new AmbientLight(0xffffff, 1.6))
    const sol = new DirectionalLight(0xffffff, 1.1)
    sol.position.set(1, 2, 1.5)
    escena.add(sol)

    const largo = contenedor.largoInterior as number
    const ancho = contenedor.anchoInterior as number
    const alto = contenedor.altoInterior as number
    escena.add(aristasDelContenedor(largo, ancho, alto))

    const mallas = mallasDe(disposicion, items)
    escena.add(mallas.grupo)
    mostrarHasta.current = mallas.mostrarHasta
    mallas.mostrarHasta(hasta)

    const centro = new Vector3(largo / 2, alto / 2, ancho / 2)
    const camara = new PerspectiveCamera(50, 1, 10, largo * 8)

    // Coordenadas esféricas alrededor del centro del contenedor: así girar y acercar son dos
    // números, y no hay que mantener una matriz de cámara a mano.
    let giro = Math.PI * 0.75
    let inclinacion = Math.PI * 0.3
    let radio = largo * 1.4
    const desplazamiento = new Vector3()

    function ubicarCamara() {
      camara.position.set(
        centro.x + desplazamiento.x + radio * Math.sin(inclinacion) * Math.cos(giro),
        centro.y + desplazamiento.y + radio * Math.cos(inclinacion),
        centro.z + desplazamiento.z + radio * Math.sin(inclinacion) * Math.sin(giro),
      )
      camara.lookAt(centro.clone().add(desplazamiento))
    }

    function ajustarTamanio() {
      // Nombres distintos de los del contenedor a propósito: ahí arriba `ancho` y `alto` son
      // milímetros de carga, acá son píxeles de pantalla.
      const anchoEnPx = lienzoFirme.clientWidth || 800
      const altoEnPx = lienzoFirme.clientHeight || 500
      render.setSize(anchoEnPx, altoEnPx, false)
      render.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      camara.aspect = anchoEnPx / altoEnPx
      camara.updateProjectionMatrix()
    }

    let arrastrando: 'girar' | 'desplazar' | null = null
    let ultimo = { x: 0, y: 0 }

    const alApretar = (e: PointerEvent) => {
      arrastrando = e.button === 2 ? 'desplazar' : 'girar'
      ultimo = { x: e.clientX, y: e.clientY }
      canvas.setPointerCapture(e.pointerId)
    }
    const alMover = (e: PointerEvent) => {
      if (arrastrando === null) return
      const dx = e.clientX - ultimo.x
      const dy = e.clientY - ultimo.y
      ultimo = { x: e.clientX, y: e.clientY }
      if (arrastrando === 'girar') {
        giro += dx * 0.01
        // Se acota para no pasar por el polo, donde la cámara se da vuelta.
        inclinacion = Math.min(Math.PI * 0.95, Math.max(0.05, inclinacion + dy * 0.01))
      } else {
        desplazamiento.x -= dx * radio * 0.0015
        desplazamiento.y += dy * radio * 0.0015
      }
      ubicarCamara()
    }
    const alSoltar = () => (arrastrando = null)
    const alRodar = (e: WheelEvent) => {
      e.preventDefault()
      radio = Math.min(largo * 6, Math.max(largo * 0.25, radio * (1 + Math.sign(e.deltaY) * 0.1)))
      ubicarCamara()
    }
    const sinMenu = (e: Event) => e.preventDefault()

    canvas.addEventListener('pointerdown', alApretar)
    canvas.addEventListener('pointermove', alMover)
    canvas.addEventListener('pointerup', alSoltar)
    canvas.addEventListener('wheel', alRodar, { passive: false })
    canvas.addEventListener('contextmenu', sinMenu)
    window.addEventListener('resize', ajustarTamanio)

    ajustarTamanio()
    ubicarCamara()
    ubicarEnAngulo.current = (angulo: number) => {
      giro = angulo
      ubicarCamara()
    }

    let vivo = true
    function dibujar() {
      if (!vivo) return
      render.render(escena, camara)
      requestAnimationFrame(dibujar)
    }
    dibujar()

    return () => {
      vivo = false
      canvas.removeEventListener('pointerdown', alApretar)
      canvas.removeEventListener('pointermove', alMover)
      canvas.removeEventListener('pointerup', alSoltar)
      canvas.removeEventListener('wheel', alRodar)
      canvas.removeEventListener('contextmenu', sinMenu)
      window.removeEventListener('resize', ajustarTamanio)
      mallas.liberar()
      render.dispose()
      mostrarHasta.current = null
      ubicarEnAngulo.current = null
    }
  }, [disposicion, items, contenedor, hasta])

  // El recorrido no rearma la escena: solo cambia cuántas instancias se dibujan.
  useEffect(() => {
    mostrarHasta.current?.(hasta)
  }, [hasta])

  if (sin3D !== null) {
    return (
      <div role="alert">
        <p>No se pudo mostrar la vista 3D: {sin3D}.</p>
        <p>
          La consolidación se calculó igual: el informe de arriba tiene el aprovechamiento y qué
          quedó afuera.
        </p>
      </div>
    )
  }

  const bultos = disposicion.secuencia.length
  const tipos = new Set(disposicion.secuencia.map((c) => c.bulto.itemId)).size

  async function medir() {
    const canvas = lienzo.current
    const girar = ubicarEnAngulo.current
    if (canvas === null || girar === null) return
    setMidiendo(true)
    setMedicion(await medirFps(canvas, girar))
    setMidiendo(false)
  }

  return (
    <>
      <canvas
        ref={lienzo}
        style={{ width: '100%', height: '60vh', display: 'block', background: COLOR_DE_FONDO }}
        aria-label="Vista 3D de la carga en el contenedor"
      />
      <p>
        Girar: arrastrar · Acercar: rueda · Desplazar: arrastrar con el botón derecho
      </p>

      {/* El medidor de SC-009 solo existe en desarrollo: no es parte del producto. */}
      {import.meta.env.DEV ? (
        <section>
          <button type="button" onClick={() => void medir()} disabled={midiendo}>
            {midiendo ? 'Midiendo 10 segundos…' : `Medir fps (SC-009) con ${bultos} bultos en ${tipos} tipos`}
          </button>
          {medicion !== null ? (
            <>
              <p>
                Mínimo sostenido: <strong>{medicion.fpsMinimoSostenido} fps</strong>{' '}
                {medicion.fpsMinimoSostenido >= 30 ? '— cumple SC-009' : '— NO cumple SC-009'} ·
                promedio {medicion.fpsPromedio} fps · GPU {medicion.maquina.gpu}
              </p>
              <textarea
                readOnly
                rows={14}
                style={{ width: '100%', fontFamily: 'monospace' }}
                value={informeDe(medicion, bultos, tipos)}
                aria-label="Informe para pegar en eval/ultimo-informe.md"
              />
            </>
          ) : null}
        </section>
      ) : null}
    </>
  )
}
