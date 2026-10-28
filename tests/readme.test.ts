/**
 * Verifica que el README alcance para correr el proyecto (FR-022, SC-013, AC-28).
 *
 * `intermediario.md` CHK017 preguntaba si SC-013 es medible con un criterio objetivo o depende
 * del juicio de quien lo prueba. Esto hace medible la parte mecánica: que todo comando que el
 * README menciona exista, que toda variable que el código lee esté nombrada en `.env.example`,
 * y que ninguna lleve el prefijo que la metería en el bundle del navegador.
 *
 * Lo que **no** cubre: si el texto se entiende. Eso lo sigue juzgando una persona.
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const raiz = resolve(import.meta.dirname, '..')
const readme = readFileSync(join(raiz, 'README.md'), 'utf8')
const ejemploEnv = readFileSync(join(raiz, '.env.example'), 'utf8')
const paquete = JSON.parse(readFileSync(join(raiz, 'package.json'), 'utf8')) as {
  scripts: Record<string, string>
}

function archivosDe(carpeta: string): string[] {
  const absoluta = join(raiz, carpeta)
  if (!existsSync(absoluta)) return []
  return readdirSync(absoluta).flatMap((entrada) => {
    const ruta = join(absoluta, entrada)
    if (statSync(ruta).isDirectory()) return archivosDe(join(carpeta, entrada))
    return /\.tsx?$/.test(entrada) ? [readFileSync(ruta, 'utf8')] : []
  })
}

const codigo = ['src', 'server', 'api', 'eval', 'escenarios'].flatMap(archivosDe).join('\n')

describe('el README alcanza para correr el proyecto (SC-013)', () => {
  it('todo comando que menciona existe en package.json', () => {
    const citados = [...readme.matchAll(/npm run ([a-z:]+)/g)].map((m) => m[1]!)
    const faltan = citados.filter((c) => !(c in paquete.scripts))
    expect(faltan).toEqual([])
  })

  it('menciona los tres comandos que exige FR-022: desarrollo, tests y evaluación', () => {
    expect(readme).toContain('npm run dev')
    expect(readme).toContain('npm test')
    expect(readme).toContain('npm run eval')
  })

  it('dice que la suite pasa sin red y sin credenciales (AC-16)', () => {
    expect(readme.toLowerCase()).toMatch(/sin red y sin credenciales/)
  })
})

describe('.env.example nombra todas las variables (AC-28)', () => {
  /** Las variables que el código lee de verdad. */
  const leidas = new Set(
    [...codigo.matchAll(/(?:process\.env|entorno)\[\s*'([A-Z_][A-Z0-9_]*)'\s*\]/g)].map((m) => m[1]!),
  )
  const nombradas = new Set([...ejemploEnv.matchAll(/^([A-Z_][A-Z0-9_]*)=/gm)].map((m) => m[1]!))

  it('encuentra variables para revisar: si no, el test no está midiendo nada', () => {
    expect(leidas.size).toBeGreaterThan(0)
  })

  it('toda variable que el código lee está en .env.example', () => {
    // Si falta una, alguien tiene que descubrir su nombre leyendo código, que es justo lo que
    // RNF-10 prohíbe.
    expect([...leidas].filter((v) => !nombradas.has(v))).toEqual([])
  })

  it('no hay variables en .env.example que nadie lea', () => {
    // Una variable de más también desorienta: hace pensar que falta configurar algo.
    expect([...nombradas].filter((v) => !leidas.has(v))).toEqual([])
  })
})

describe('ninguna variable de configuración llega al navegador (FR-015)', () => {
  it('ninguna lleva el prefijo VITE_', () => {
    // Vite mete las que lo llevan en el bundle. Las menciones en comentarios no cuentan: se
    // busca una variable declarada o leída, no la palabra.
    const declaradas = [...ejemploEnv.matchAll(/^(VITE_[A-Z0-9_]*)=/gm)].map((m) => m[1]!)
    expect(declaradas).toEqual([])

    const leidas = [...codigo.matchAll(/env\[\s*'(VITE_[A-Z0-9_]*)'\s*\]/g)].map((m) => m[1]!)
    expect(leidas).toEqual([])
  })
})

describe('las carpetas que el README nombra existen', () => {
  it('todas', () => {
    const carpetas = [...readme.matchAll(/`([a-z0-9]+(?:\/[a-z0-9]+)*\/)`/g)].map((m) => m[1]!)
    const faltan = carpetas.filter((c) => !existsSync(join(raiz, c)))
    expect(faltan).toEqual([])
  })
})
