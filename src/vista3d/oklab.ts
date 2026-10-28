/**
 * Conversión de sRGB a OKLab, para medir distancia perceptual entre colores (research.md §9).
 *
 * OKLab está diseñado para que la **distancia euclídea** se corresponda con la diferencia que
 * percibe el ojo, y se implementa en unas pocas decenas de líneas sin agregar dependencias
 * —que es una restricción dura de este proyecto.
 *
 * Se eligió sobre CIEDE2000, que es más preciso pero cuya fórmula es larga y llena de casos
 * especiales: implementarla a mano para un test es más superficie de error que la que resuelve.
 * Y sobre ΔE76 en CIELAB, que es el que se sabe que miente más en azules y saturados, justo
 * donde una paleta de 12 va a apretar.
 *
 * Constantes de Björn Ottosson, el autor de OKLab.
 */

export type OkLab = { readonly L: number; readonly a: number; readonly b: number }

/** Deshace la curva de gamma de sRGB. */
function aLineal(canal: number): number {
  const c = canal / 255
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

/** `#rrggbb` a sus tres canales de 0 a 255. */
export function canalesDe(hex: string): readonly [number, number, number] {
  const limpio = hex.replace('#', '')
  if (!/^[0-9a-fA-F]{6}$/.test(limpio)) throw new Error(`Color inválido: ${hex}`)
  return [
    Number.parseInt(limpio.slice(0, 2), 16),
    Number.parseInt(limpio.slice(2, 4), 16),
    Number.parseInt(limpio.slice(4, 6), 16),
  ]
}

export function aOkLab(hex: string): OkLab {
  const [r255, g255, b255] = canalesDe(hex)
  const r = aLineal(r255)
  const g = aLineal(g255)
  const b = aLineal(b255)

  const l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
  const m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
  const s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b

  const lc = Math.cbrt(l)
  const mc = Math.cbrt(m)
  const sc = Math.cbrt(s)

  return {
    L: 0.2104542553 * lc + 0.793617785 * mc - 0.0040720468 * sc,
    a: 1.9779984951 * lc - 2.428592205 * mc + 0.4505937099 * sc,
    b: 0.0259040371 * lc + 0.7827717662 * mc - 0.808675766 * sc,
  }
}

/** Distancia euclídea en OKLab. Es la medida que usa SC-015. */
export function distancia(hexA: string, hexB: string): number {
  const a = aOkLab(hexA)
  const b = aOkLab(hexB)
  return Math.hypot(a.L - b.L, a.a - b.a, a.b - b.b)
}

/** La distancia mínima entre todos los pares de una lista, y cuáles son ese par. */
export function parMasCercano(
  colores: readonly string[],
): { readonly distancia: number; readonly par: readonly [string, string] } {
  let minima = Number.POSITIVE_INFINITY
  let par: readonly [string, string] = ['', '']
  for (let i = 0; i < colores.length; i++) {
    for (let j = i + 1; j < colores.length; j++) {
      const d = distancia(colores[i]!, colores[j]!)
      if (d < minima) {
        minima = d
        par = [colores[i]!, colores[j]!]
      }
    }
  }
  return { distancia: minima, par }
}
