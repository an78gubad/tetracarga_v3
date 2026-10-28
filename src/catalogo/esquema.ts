/**
 * El esquema del catálogo. Lo que hace cumplir el Principio IV: **ningún dato sin fuente**.
 *
 * Valida datos crudos, así que se puede probar con entradas inventadas en un test sin tocar el
 * catálogo real. Una entrada que no pasa no entra: no se corrige, no se completa y no se
 * promedia entre fuentes.
 */

import type { Gramos, Milimetros } from '../dominio/unidades'

export type EntradaObjeto = {
  readonly id: string
  readonly nombre: string
  /** Cómo lo llama la gente: "tambor", "tacho", "bidón de 200". Puede estar vacío. */
  readonly sinonimos: readonly string[]
  readonly largo: Milimetros
  readonly ancho: Milimetros
  readonly alto: Milimetros
  /** `null` es el caso normal: el peso de un tambor o un IBC depende del contenido. */
  readonly peso: Gramos | null
  /** `null` si la ficha no lo dice. Hoy ninguna lo dice. */
  readonly noApilable: boolean | null
  readonly orientacionObligatoria: boolean | null
  /** La ficha exacta de la que sale. No admite vacío. */
  readonly fuente: string
}

export type EntradaContenedor = {
  readonly id: string
  readonly nombre: string
  readonly largoInterior: Milimetros
  readonly anchoInterior: Milimetros
  readonly altoInterior: Milimetros
  /** La carga útil (max payload), **no** el peso bruto (FR-007). */
  readonly cargaUtil: Gramos
  /** Se guarda porque la ficha la trae y porque cierra la cuenta: cargaUtil + tara = bruto. */
  readonly tara: Gramos
  readonly fuente: string
}

export type ErrorDeCatalogo = {
  /** El id de la entrada, o su posición si todavía no se le pudo leer el id. */
  readonly entrada: string
  readonly campo: string
  readonly problema: string
}

type Resultado<T> = { readonly entradas: readonly T[]; readonly errores: readonly ErrorDeCatalogo[] }

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor)
}

function medidaValida(valor: unknown): boolean {
  return typeof valor === 'number' && Number.isInteger(valor) && valor > 0
}

function textoValido(valor: unknown): boolean {
  return typeof valor === 'string' && valor.trim() !== ''
}

/** Acumula los errores de una entrada: se devuelven todos, no solo el primero. */
function revisarComunes(
  fila: Record<string, unknown>,
  nombreEntrada: string,
  medidas: readonly string[],
  errores: ErrorDeCatalogo[],
): void {
  if (!textoValido(fila['id'])) {
    errores.push({ entrada: nombreEntrada, campo: 'id', problema: 'falta o está vacío' })
  }
  if (!textoValido(fila['nombre'])) {
    errores.push({ entrada: nombreEntrada, campo: 'nombre', problema: 'falta o está vacío' })
  }
  // El Principio IV en una línea: sin fuente la entrada no entra.
  if (!textoValido(fila['fuente'])) {
    errores.push({
      entrada: nombreEntrada,
      campo: 'fuente',
      problema: 'falta la ficha de la que sale el dato; sin fuente la entrada no entra',
    })
  }
  for (const campo of medidas) {
    if (!medidaValida(fila[campo])) {
      errores.push({
        entrada: nombreEntrada,
        campo,
        problema: 'tiene que ser un entero mayor que 0',
      })
    }
  }
}

function revisarDuplicados(
  filas: readonly Record<string, unknown>[],
  errores: ErrorDeCatalogo[],
  conSinonimos: boolean,
): void {
  const idsVistos = new Set<string>()
  const sinonimosVistos = new Map<string, string>()

  for (const [i, fila] of filas.entries()) {
    const id = typeof fila['id'] === 'string' ? fila['id'] : `#${i}`

    if (idsVistos.has(id)) {
      errores.push({ entrada: id, campo: 'id', problema: 'está repetido' })
    }
    idsVistos.add(id)

    if (!conSinonimos) continue
    const sinonimos = fila['sinonimos']
    if (!Array.isArray(sinonimos)) continue

    for (const sinonimo of sinonimos) {
      if (typeof sinonimo !== 'string') continue
      const clave = sinonimo.trim().toLowerCase()
      const duenio = sinonimosVistos.get(clave)
      if (duenio !== undefined && duenio !== id) {
        // Un sinónimo en dos entradas haría ambiguo el matcheo, y el matcheo ambiguo es
        // justo lo que el catálogo existe para evitar.
        errores.push({
          entrada: id,
          campo: 'sinonimos',
          problema: `"${sinonimo}" ya es sinónimo de "${duenio}"`,
        })
      }
      sinonimosVistos.set(clave, id)
    }
  }
}

export function validarObjetos(crudo: unknown): Resultado<EntradaObjeto> {
  const errores: ErrorDeCatalogo[] = []
  if (!Array.isArray(crudo)) {
    return { entradas: [], errores: [{ entrada: '(archivo)', campo: '', problema: 'no es una lista' }] }
  }

  const filas: Record<string, unknown>[] = []
  for (const [i, fila] of crudo.entries()) {
    if (!esObjeto(fila)) {
      errores.push({ entrada: `#${i}`, campo: '', problema: 'no es un objeto' })
      continue
    }
    filas.push(fila)
    const nombreEntrada = typeof fila['id'] === 'string' ? fila['id'] : `#${i}`
    revisarComunes(fila, nombreEntrada, ['largo', 'ancho', 'alto'], errores)

    const peso = fila['peso']
    if (peso !== null && !medidaValida(peso)) {
      errores.push({
        entrada: nombreEntrada,
        campo: 'peso',
        problema: 'tiene que ser un entero mayor que 0, o null si la ficha no lo declara',
      })
    }
    for (const campo of ['noApilable', 'orientacionObligatoria'] as const) {
      const valor = fila[campo]
      if (valor !== null && typeof valor !== 'boolean') {
        errores.push({
          entrada: nombreEntrada,
          campo,
          problema: 'tiene que ser true, false o null si la ficha no dice nada',
        })
      }
    }
    if (!Array.isArray(fila['sinonimos'])) {
      errores.push({ entrada: nombreEntrada, campo: 'sinonimos', problema: 'tiene que ser una lista' })
    }
  }

  revisarDuplicados(filas, errores, true)
  return { entradas: errores.length === 0 ? (filas as unknown as EntradaObjeto[]) : [], errores }
}

export function validarContenedores(crudo: unknown): Resultado<EntradaContenedor> {
  const errores: ErrorDeCatalogo[] = []
  if (!Array.isArray(crudo)) {
    return { entradas: [], errores: [{ entrada: '(archivo)', campo: '', problema: 'no es una lista' }] }
  }

  const filas: Record<string, unknown>[] = []
  for (const [i, fila] of crudo.entries()) {
    if (!esObjeto(fila)) {
      errores.push({ entrada: `#${i}`, campo: '', problema: 'no es un objeto' })
      continue
    }
    filas.push(fila)
    const nombreEntrada = typeof fila['id'] === 'string' ? fila['id'] : `#${i}`
    revisarComunes(
      fila,
      nombreEntrada,
      ['largoInterior', 'anchoInterior', 'altoInterior', 'cargaUtil', 'tara'],
      errores,
    )
  }

  revisarDuplicados(filas, errores, false)
  return { entradas: errores.length === 0 ? (filas as unknown as EntradaContenedor[]) : [], errores }
}
