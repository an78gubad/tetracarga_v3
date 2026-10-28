/**
 * Las unidades del sistema. **Este archivo no exporta ni un valor, solo tipos.**
 *
 * Es a propósito: `src/dominio/` es lo único que el acomodador y el validador comparten, y
 * el Principio II deja que compartan tipos y nunca valores. Si acá hubiera una función para
 * construir un `Milimetros`, los dos la usarían y compartirían una cuenta — que es lo que no
 * tiene que pasar. Cada uno construye sus valores con un cast y los valida por su cuenta.
 *
 * Las tres son **enteras**. En milímetros y gramos enteros, "sin tolerancia" es verificable:
 * dos implementaciones independientes dan el mismo número o no lo dan.
 */

declare const unidad: unique symbol

/** Longitud en milímetros enteros. */
export type Milimetros = number & { readonly [unidad]: 'mm' }

/** Área en milímetros cuadrados enteros. */
export type MilimetrosCuadrados = number & { readonly [unidad]: 'mm2' }

/** Volumen en milímetros cúbicos enteros. */
export type MilimetrosCubicos = number & { readonly [unidad]: 'mm3' }

/**
 * Peso en gramos enteros.
 *
 * El usuario los declara en kilos y la interfaz los muestra en kilos (FR-002); la
 * representación interna es en gramos. La conversión ocurre una sola vez, en el borde.
 */
export type Gramos = number & { readonly [unidad]: 'g' }
