/**
 * El catálogo: **único origen de todo dato que el sistema completa** (FR-003).
 *
 * Acá vive la regla que sostiene el Principio I: el modelo *propone* un id y el código lo
 * *verifica*. Si el id no existe, la propuesta de ese ítem se descarta entera. **No se busca
 * el id más parecido, no se completa con lo más cercano** (FR-005, AC-17). Si el que decide
 * "esto lo reconozco" fuera el modelo, siempre reconocería y siempre contestaría un número con
 * cara de seguridad.
 *
 * El acomodador y el validador **no importan este archivo**: reciben el contenedor por
 * argumento. Un test de arquitectura lo verifica.
 */

import type { Contenedor } from '../dominio/disposicion'
import type { Gramos, Milimetros } from '../dominio/unidades'
import objetosCrudos from './objetos.json'
import contenedoresCrudos from './contenedores.json'
import {
  validarContenedores,
  validarObjetos,
  type EntradaContenedor,
  type EntradaObjeto,
  type ErrorDeCatalogo,
} from './esquema'

/** Lo que se le manda al modelo para que pueda proponer un id: nombres, nunca medidas. */
export type EntradaParaPrompt = {
  readonly id: string
  readonly nombre: string
  readonly sinonimos: readonly string[]
}

export type Catalogo = {
  /**
   * Verifica un id propuesto. Devuelve `undefined` si no existe —y ahí termina: quien llama
   * descarta la propuesta, no busca un parecido.
   */
  readonly entradaObjeto: (id: string) => EntradaObjeto | undefined
  /** Resuelve un nombre o sinónimo exacto (sin distinguir mayúsculas) a una entrada. */
  readonly porNombre: (nombre: string) => EntradaObjeto | undefined
  readonly entradaContenedor: (id: string) => EntradaContenedor | undefined
  /** El contenedor como lo reciben el acomodador y el validador, por argumento. */
  readonly contenedor: (id: string) => Contenedor | undefined
  readonly paraPrompt: () => readonly EntradaParaPrompt[]
  readonly objetos: readonly EntradaObjeto[]
  readonly contenedores: readonly EntradaContenedor[]
}

export class CatalogoInvalidoError extends Error {
  readonly errores: readonly ErrorDeCatalogo[]

  // Sin propiedad de parámetro (`constructor(readonly errores)`) a propósito: Node corre
  // TypeScript sacándole los tipos y nada más, y esa sintaxis no se puede sacar sin generar
  // código. `npm run eval` usa ese modo, así que lo que el eval importe no la puede usar.
  constructor(errores: readonly ErrorDeCatalogo[]) {
    const detalle = errores.map((e) => `  - ${e.entrada}.${e.campo}: ${e.problema}`).join('\n')
    super(`El catálogo no cumple su esquema:\n${detalle}`)
    this.name = 'CatalogoInvalidoError'
    this.errores = errores
  }
}

/**
 * Arma un catálogo a partir de datos crudos y **falla fuerte** si no cumplen el esquema.
 *
 * Falla al construirlo, no al usarlo: un catálogo inválido es un error del repositorio, y
 * arrancar con él a medias sería peor que no arrancar.
 */
export function crearCatalogo(objetos: unknown, contenedores: unknown): Catalogo {
  const o = validarObjetos(objetos)
  const c = validarContenedores(contenedores)
  const errores = [...o.errores, ...c.errores]
  if (errores.length > 0) throw new CatalogoInvalidoError(errores)

  const porId = new Map(o.entradas.map((e) => [e.id, e]))
  const porNombre = new Map<string, EntradaObjeto>()
  for (const entrada of o.entradas) {
    porNombre.set(entrada.nombre.trim().toLowerCase(), entrada)
    for (const sinonimo of entrada.sinonimos) {
      porNombre.set(sinonimo.trim().toLowerCase(), entrada)
    }
  }
  const contenedoresPorId = new Map(c.entradas.map((e) => [e.id, e]))

  return {
    entradaObjeto: (id) => porId.get(id),
    porNombre: (nombre) => porNombre.get(nombre.trim().toLowerCase()),
    entradaContenedor: (id) => contenedoresPorId.get(id),
    contenedor: (id) => {
      const entrada = contenedoresPorId.get(id)
      if (entrada === undefined) return undefined
      // La tara no viaja: el acomodador y el validador calculan contra la carga útil (FR-007).
      return {
        id: entrada.id,
        largoInterior: entrada.largoInterior as Milimetros,
        anchoInterior: entrada.anchoInterior as Milimetros,
        altoInterior: entrada.altoInterior as Milimetros,
        cargaUtil: entrada.cargaUtil as Gramos,
      }
    },
    paraPrompt: () =>
      o.entradas.map((e) => ({ id: e.id, nombre: e.nombre, sinonimos: e.sinonimos })),
    objetos: o.entradas,
    contenedores: c.entradas,
  }
}

/** El catálogo del repositorio. */
export const catalogo: Catalogo = crearCatalogo(objetosCrudos, contenedoresCrudos)
