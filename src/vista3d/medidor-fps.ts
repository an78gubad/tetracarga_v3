/**
 * Mide los fps de la vista 3D como lo especifica research.md §15, para SC-009.
 *
 * Solo en desarrollo. No es parte del producto: existe para que la medición sea **repetible**
 * en vez de una lectura manual de una sola vez.
 *
 * El procedimiento es el declarado, y cada parte tiene su razón:
 *
 *   - **10 segundos de órbita continua**, no vista fija: una vista fija deja al navegador sin
 *     trabajo y mide el caso más favorable.
 *   - Se reporta el **mínimo sostenido**, no el promedio: un promedio de 30 fps puede esconder
 *     caídas a 10, y lo que una persona percibe como tirón es el mínimo.
 *   - Se anotan **CPU, GPU, resolución y navegador**: sin eso un número de fps no es
 *     reproducible, y era uno de los huecos que encontraron los checklists.
 */

export const DURACION_MS = 10_000
/** El mínimo sostenido se mide sobre ventanas de medio segundo. */
export const VENTANA_MS = 500

export type Medicion = {
  readonly fpsMinimoSostenido: number
  readonly fpsPromedio: number
  readonly cuadros: number
  readonly maquina: DatosDeLaMaquina
}

export type DatosDeLaMaquina = {
  readonly gpu: string
  readonly nucleos: number
  readonly memoriaGb: number | null
  readonly resolucion: string
  readonly navegador: string
  readonly relacionDePixeles: number
}

/** Lo que el navegador deja saber de la máquina. Sin esto el número no es reproducible. */
export function datosDeLaMaquina(canvas: HTMLCanvasElement): DatosDeLaMaquina {
  let gpu = 'desconocida'
  try {
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl')
    const info = gl?.getExtension('WEBGL_debug_renderer_info')
    if (gl !== null && info !== null && info !== undefined) {
      gpu = String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL))
    }
  } catch {
    // Algunos navegadores no exponen la extensión. Se informa como desconocida.
  }
  const conMemoria = navigator as Navigator & { deviceMemory?: number }
  return {
    gpu,
    nucleos: navigator.hardwareConcurrency,
    memoriaGb: conMemoria.deviceMemory ?? null,
    resolucion: `${canvas.clientWidth}×${canvas.clientHeight} css, ${window.screen.width}×${window.screen.height} pantalla`,
    navegador: navigator.userAgent,
    relacionDePixeles: window.devicePixelRatio,
  }
}

/**
 * Mide durante `DURACION_MS`, llamando a `girar` en cada cuadro para que la cámara no pare.
 *
 * Devuelve el mínimo sostenido sobre ventanas de medio segundo, el promedio y los datos de la
 * máquina.
 */
export function medirFps(
  canvas: HTMLCanvasElement,
  /** Recibe el ángulo **absoluto** de la cámara en radianes y la ubica ahí. */
  girar: (anguloEnRadianes: number) => void,
): Promise<Medicion> {
  return new Promise((listo) => {
    const deltas: number[] = []
    let anterior = performance.now()
    const arranque = anterior

    function cuadro(ahora: number) {
      deltas.push(ahora - anterior)
      anterior = ahora
      // Una vuelta completa cada 5 segundos: órbita continua, no un giro brusco.
      const transcurrido = ahora - arranque
      girar((transcurrido / 5_000) * Math.PI * 2)

      if (transcurrido >= DURACION_MS) {
        listo(resumir(deltas, canvas))
        return
      }
      requestAnimationFrame(cuadro)
    }
    requestAnimationFrame(cuadro)
  })
}

function resumir(deltas: readonly number[], canvas: HTMLCanvasElement): Medicion {
  // Se descarta el primer cuadro: incluye el tiempo de armado de la escena, no de dibujo.
  const utiles = deltas.slice(1)
  const total = utiles.reduce((a, b) => a + b, 0)

  // Mínimo sostenido: se parte en ventanas de medio segundo y se toma la peor.
  let peor = Number.POSITIVE_INFINITY
  let acumulado = 0
  let cuadrosEnVentana = 0
  for (const delta of utiles) {
    acumulado += delta
    cuadrosEnVentana++
    if (acumulado >= VENTANA_MS) {
      peor = Math.min(peor, (cuadrosEnVentana * 1000) / acumulado)
      acumulado = 0
      cuadrosEnVentana = 0
    }
  }

  return {
    fpsMinimoSostenido: Number.isFinite(peor) ? Math.round(peor * 10) / 10 : 0,
    fpsPromedio: total === 0 ? 0 : Math.round(((utiles.length * 1000) / total) * 10) / 10,
    cuadros: utiles.length,
    maquina: datosDeLaMaquina(canvas),
  }
}

/** El informe en markdown, listo para pegar en `eval/ultimo-informe.md`. */
export function informeDe(medicion: Medicion, bultos: number, tipos: number): string {
  const { maquina: m } = medicion
  const cumple = medicion.fpsMinimoSostenido >= 30
  return [
    `### SC-009 — fluidez de la vista 3D`,
    '',
    `**Fecha**: ${new Date().toISOString()}`,
    `**Procedimiento**: ${DURACION_MS / 1000} s de órbita continua, mínimo sostenido sobre ventanas de ${VENTANA_MS} ms`,
    `**Carga**: ${bultos} bultos en ${tipos} tipos`,
    '',
    '| | Valor |',
    '|---|---|',
    `| Objetivo | ≥ 30 fps |`,
    `| **Mínimo sostenido** | **${medicion.fpsMinimoSostenido} fps** ${cumple ? '✅' : '❌'} |`,
    `| Promedio | ${medicion.fpsPromedio} fps |`,
    `| Cuadros medidos | ${medicion.cuadros} |`,
    '',
    '**Máquina** (sin esto el número no es reproducible):',
    '',
    `- GPU: ${m.gpu}`,
    `- Núcleos: ${m.nucleos}${m.memoriaGb === null ? '' : ` · Memoria: ${m.memoriaGb} GB`}`,
    `- Resolución: ${m.resolucion} · relación de píxeles ${m.relacionDePixeles}`,
    `- Navegador: ${m.navegador}`,
  ].join('\n')
}
