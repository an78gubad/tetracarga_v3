/**
 * Convierte en algo que rompe el build dos principios que de otro modo se incumplen sin
 * querer, con un import automático del editor, y no se notan hasta que es tarde:
 *
 *   II. El validador no comparte código ni constantes con el acomodador. Si compartieran
 *       código, el validador no podría detectar los errores del acomodador: duplicar las
 *       cuentas es a propósito.
 *    V. Nada de lo que llega al navegador habla con el proveedor del modelo.
 *
 * Usa la API de compilador de TypeScript en vez de una expresión regular: un `import type`
 * escrito en varias líneas, o la palabra "type" dentro de un comentario, dan falsos
 * resultados con texto plano.
 */

import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, resolve, dirname } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'

const raiz = resolve(import.meta.dirname, '../..')

type Import = {
  /** Ruta del archivo que importa, relativa a la raíz del repositorio. */
  readonly desde: string
  /** El especificador tal como está escrito. */
  readonly especificador: string
  /** Ruta del archivo importado, relativa a la raíz, o `null` si es un paquete. */
  readonly hacia: string | null
  readonly soloTipos: boolean
}

function archivosDe(carpeta: string): string[] {
  const absoluta = join(raiz, carpeta)
  let entradas: string[]
  try {
    entradas = readdirSync(absoluta)
  } catch {
    return [] // La carpeta todavía no existe: no hay nada que violar.
  }
  return entradas.flatMap((entrada) => {
    const ruta = join(absoluta, entrada)
    if (statSync(ruta).isDirectory()) return archivosDe(join(carpeta, entrada))
    return /\.tsx?$/.test(entrada) ? [join(carpeta, entrada)] : []
  })
}

function importsDe(rutaRelativa: string): Import[] {
  const contenido = readFileSync(join(raiz, rutaRelativa), 'utf8')
  const fuente = ts.createSourceFile(rutaRelativa, contenido, ts.ScriptTarget.Latest, true)
  const imports: Import[] = []

  for (const sentencia of fuente.statements) {
    const esImport = ts.isImportDeclaration(sentencia)
    const esExportDesde = ts.isExportDeclaration(sentencia) && sentencia.moduleSpecifier !== undefined
    if (!esImport && !esExportDesde) continue

    const especificadorNodo = esImport ? sentencia.moduleSpecifier : sentencia.moduleSpecifier
    if (especificadorNodo === undefined || !ts.isStringLiteral(especificadorNodo)) continue
    const especificador = especificadorNodo.text

    // Tres formas de que sea solo de tipos: `import type {...}`, `export type {...}`,
    // o `import { type A, type B }` con todos los bindings marcados.
    let soloTipos = false
    if (esImport) {
      const clausula = sentencia.importClause
      if (clausula === undefined) {
        soloTipos = false // `import './efecto'`: trae el módulo entero.
      } else if (clausula.isTypeOnly) {
        soloTipos = true
      } else if (clausula.namedBindings !== undefined && ts.isNamedImports(clausula.namedBindings)) {
        const elementos = clausula.namedBindings.elements
        soloTipos = elementos.length > 0 && elementos.every((e) => e.isTypeOnly)
      }
    } else if (ts.isExportDeclaration(sentencia)) {
      soloTipos = sentencia.isTypeOnly
    }

    let hacia: string | null = null
    if (especificador.startsWith('.')) {
      const sinExtension = especificador.replace(/\.js$/, '')
      hacia = relative(raiz, resolve(join(raiz, dirname(rutaRelativa)), sinExtension))
    }

    imports.push({ desde: rutaRelativa, especificador, hacia, soloTipos })
  }

  return imports
}

function normalizar(ruta: string): string {
  return ruta.split('\\').join('/')
}

function todosLosImports(...carpetas: string[]): Import[] {
  return carpetas.flatMap((c) => archivosDe(c).flatMap(importsDe))
}

function describir(i: Import): string {
  return `${normalizar(i.desde)} importa "${i.especificador}"`
}

describe('Principio II — el validador no comparte código con el acomodador (RF-08)', () => {
  it('el acomodador no importa nada del validador', () => {
    const violaciones = todosLosImports('src/acomodador')
      .filter((i) => i.hacia !== null && normalizar(i.hacia).startsWith('src/validador'))
      .map(describir)
    expect(violaciones).toEqual([])
  })

  it('el validador no importa nada del acomodador', () => {
    const violaciones = todosLosImports('src/validador')
      .filter((i) => i.hacia !== null && normalizar(i.hacia).startsWith('src/acomodador'))
      .map(describir)
    expect(violaciones).toEqual([])
  })

  it('de dominio/ traen tipos y nunca valores', () => {
    const violaciones = todosLosImports('src/acomodador', 'src/validador')
      .filter((i) => i.hacia !== null && normalizar(i.hacia).startsWith('src/dominio'))
      .filter((i) => !i.soloTipos)
      .map((i) => `${describir(i)} sin "import type"`)
    expect(violaciones).toEqual([])
  })

  it('ninguno importa del catálogo: el contenedor llega por argumento', () => {
    const violaciones = todosLosImports('src/acomodador', 'src/validador')
      .filter((i) => i.hacia !== null && normalizar(i.hacia).startsWith('src/catalogo'))
      .map(describir)
    expect(violaciones).toEqual([])
  })
})

describe('Principio V — el proveedor queda del lado del servidor (FR-015)', () => {
  it('nada de src/ importa de server/', () => {
    const violaciones = todosLosImports('src')
      .filter((i) => i.hacia !== null && normalizar(i.hacia).startsWith('server/'))
      .map(describir)
    expect(violaciones).toEqual([])
  })

  it('nada de src/ importa de api/', () => {
    const violaciones = todosLosImports('src')
      .filter((i) => i.hacia !== null && normalizar(i.hacia).startsWith('api/'))
      .map(describir)
    expect(violaciones).toEqual([])
  })
})

describe('el test se mira a sí mismo', () => {
  it('encuentra los imports de un archivo que sabemos que los tiene', () => {
    const imports = importsDe('src/catalogo/catalogo.ts')
    expect(imports.length).toBeGreaterThan(0)
    const dominio = imports.filter((i) => i.hacia !== null && normalizar(i.hacia).includes('dominio'))
    expect(dominio).not.toHaveLength(0)
    // catalogo.ts trae Contenedor solo como tipo: si algún día trae un valor, esto avisa.
    expect(dominio.every((i) => i.soloTipos)).toBe(true)
  })
})
