/**
 * AC-19 / SC-010: en lo que llega al navegador hay **cero apariciones** de la clave del
 * proveedor, de su URL y de cualquier encabezado de autorización.
 *
 * Dos cosas que este test hace a propósito:
 *
 *   1. **Arma su propio bundle.** No mira `dist/`, que puede estar viejo y dar un verde falso.
 *   2. **Busca los valores reales**, no patrones genéricos. Un patrón como `sk-` da falsos
 *      positivos con el código de React (AGENTS.md).
 */

import { readdirSync, readFileSync, rmSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { build } from 'vite'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

const raiz = resolve(import.meta.dirname, '../..')
const salida = join(raiz, '.tmp-bundle-test')

/** Centinelas: valores inventados pero con forma real, para buscarlos literalmente después. */
const CLAVE = 'sk-centinela-de-bundle-test-9f3a7c1e'
const URL_PROVEEDOR = 'https://centinela.proveedor-del-modelo.test/v1'

let archivos: { ruta: string; contenido: string }[] = []

function recorrer(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap((entrada) => {
    const ruta = join(carpeta, entrada)
    return statSync(ruta).isDirectory() ? recorrer(ruta) : [ruta]
  })
}

beforeAll(async () => {
  // Las variables se ponen con los centinelas: si el bundle filtrara la configuración, acá
  // aparecerían. Ninguna lleva prefijo VITE_, que es justamente lo que se está verificando.
  process.env['DEEPSEEK_API_KEY'] = CLAVE
  process.env['DEEPSEEK_BASE_URL'] = URL_PROVEEDOR

  rmSync(salida, { recursive: true, force: true })
  await build({
    root: raiz,
    logLevel: 'error',
    build: { outDir: salida, emptyOutDir: true, sourcemap: true },
  })

  archivos = recorrer(salida).map((ruta) => ({
    ruta: ruta.slice(salida.length + 1),
    contenido: readFileSync(ruta, 'utf8'),
  }))
}, 180_000)

afterAll(() => {
  rmSync(salida, { recursive: true, force: true })
  delete process.env['DEEPSEEK_API_KEY']
  delete process.env['DEEPSEEK_BASE_URL']
})

describe('lo que llega al navegador (AC-19, SC-010)', () => {
  it('el bundle se armó y tiene javascript', () => {
    expect(archivos.length).toBeGreaterThan(0)
    expect(archivos.some((a) => a.ruta.endsWith('.js'))).toBe(true)
  })

  it('cero apariciones de la clave del proveedor', () => {
    const culpables = archivos.filter((a) => a.contenido.includes(CLAVE)).map((a) => a.ruta)
    expect(culpables).toEqual([])
  })

  it('cero apariciones de la URL del proveedor', () => {
    const culpables = archivos.filter((a) => a.contenido.includes(URL_PROVEEDOR)).map((a) => a.ruta)
    expect(culpables).toEqual([])
  })

  it('cero encabezados de autorización', () => {
    const culpables = archivos
      .filter((a) => /authorization\s*[:=]|Bearer /i.test(a.contenido))
      .map((a) => a.ruta)
    expect(culpables).toEqual([])
  })

  it('cero menciones del nombre del proveedor, ni en los mapas de origen', () => {
    // Los mapas de origen entran en la cuenta: también llegan al navegador.
    const culpables = archivos
      .filter((a) => /deepseek/i.test(a.contenido))
      .map((a) => a.ruta)
    expect(culpables).toEqual([])
  })

  it('cero nombres de variable de entorno del proveedor', () => {
    const culpables = archivos
      .filter((a) => a.contenido.includes('DEEPSEEK_API_KEY'))
      .map((a) => a.ruta)
    expect(culpables).toEqual([])
  })
})
