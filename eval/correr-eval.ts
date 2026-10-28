/**
 * La evaluación de precisión de RNF-02. **Llama al proveedor real: es el único comando que
 * gasta plata.** Corre con `npm run eval`, nunca con `npm test` (FR-020, AC-16).
 *
 * Mide tres cosas **por separado, sin promediarlas** (SC-003, SC-004, SC-005):
 *
 *   SC-003  ≥ 90% de los campos que la descripción declara, extraídos con coincidencia exacta
 *           tras convertir a milímetros y gramos enteros, sin tolerancia.
 *   SC-004  100% de los campos ausentes, estimados desde el catálogo o preguntados. Un campo
 *           ausente completado con un valor que no salga del catálogo cuenta como error.
 *   SC-005  ≥ 90% de los ítems asociados a la entrada correcta del catálogo.
 *
 * Y de paso SC-002: el p95 de la interpretación punta a punta, **con 5 llamadas en paralelo**,
 * porque con una sola el número queda por debajo del que ve una persona cuando hay otras
 * usando el sistema.
 */

import { existsSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterAll, describe, expect, it } from 'vitest'
import { catalogo } from '../src/catalogo/catalogo'
import { completarItems } from '../src/interpretacion/completar'
import { configuracionDesdeEntorno, crearModeloDeepSeek } from '../server/modelo/deepseek.js'
import { interpretarConReintentos } from '../server/modelo/reintentos.js'
import { validarRespuesta } from '../server/proxy/esquema-respuesta.js'
import { CASOS } from './dataset/casos'
import type { CasoDataset, Eje } from './dataset/tipos'

/**
 * Carga el `.env` a `process.env`.
 *
 * Hace falta porque vitest **no** expone las variables sin prefijo a `process.env`: sin esto,
 * con el `.env` lleno el eval igual falla diciendo que falta la credencial. Lo descubrí
 * probándolo con un `.env` real.
 *
 * Lo que ya está en el entorno manda, para poder correr el eval contra otra configuración sin
 * tocar el archivo.
 */
function cargarEnv(): void {
  const archivo = resolve(import.meta.dirname, '..', '.env')
  if (!existsSync(archivo)) return
  // process.loadEnvFile existe desde Node 20.12 y no agrega dependencias.
  try {
    process.loadEnvFile(archivo)
  } catch {
    // Si el archivo está mal formado, se sigue: configuracionDesdeEntorno dice qué falta.
  }
}
cargarEnv()

const CONCURRENCIA = 5
/**
 * Cuántas veces corre el dataset (SC-003 a SC-005).
 *
 * El proveedor no es determinístico: la misma descripción puede dar resultados distintos. Con
 * una sola corrida el número que se reporta puede ser suerte, así que se corre tres veces y
 * **se reporta la peor**. Es el criterio conservador: si una da 92% y otra 87%, no cumple.
 */
const CORRIDAS = 3
const EJES: readonly Eje[] = ['largo', 'ancho', 'alto', 'peso']

type Medicion = {
  readonly caso: CasoDataset
  readonly ms: number
  readonly declaradosBien: number
  readonly declaradosTotal: number
  readonly ausentesBien: number
  readonly ausentesTotal: number
  readonly entradasBien: number
  readonly entradasTotal: number
  readonly problemas: readonly string[]
}

const mediciones: Medicion[] = []
const corridas: { sc003: number; sc004: number; sc005: number }[] = []

async function medirCaso(caso: CasoDataset, modelo: ReturnType<typeof crearModeloDeepSeek>): Promise<Medicion> {
  const arranque = Date.now()
  const { resultado } = await interpretarConReintentos(modelo, {
    descripcion: caso.descripcion,
    catalogo: catalogo.paraPrompt(),
  })
  const ms = Date.now() - arranque

  const problemas: string[] = []
  let declaradosBien = 0
  let ausentesBien = 0
  let entradasBien = 0

  const declaradosTotal = caso.itemsEsperados.reduce((n, i) => n + Object.keys(i.declarados).length, 0)
  const ausentesTotal = caso.itemsEsperados.reduce((n, i) => n + i.ausentes.length, 0)
  const entradasTotal = caso.itemsEsperados.length

  if (resultado.tipo !== 'items') {
    problemas.push(`no devolvió ítems: ${resultado.tipo}`)
    return { caso, ms, declaradosBien: 0, declaradosTotal, ausentesBien: 0, ausentesTotal, entradasBien: 0, entradasTotal, problemas }
  }

  const validacion = validarRespuesta(resultado.items)
  if (validacion.tipo !== 'ok') {
    problemas.push(`forma inválida: ${validacion.porque}`)
    return { caso, ms, declaradosBien: 0, declaradosTotal, ausentesBien: 0, ausentesTotal, entradasBien: 0, entradasTotal, problemas }
  }

  const obtenidos = completarItems(validacion.items, {
    catalogo,
    descartados: validacion.descartados,
  })

  for (const [i, esperado] of caso.itemsEsperados.entries()) {
    const obtenido = obtenidos[i]
    if (obtenido === undefined) {
      problemas.push(`falta el ítem ${i}`)
      continue
    }

    // --- SC-003: los declarados, coincidencia exacta ---
    for (const eje of EJES) {
      const valorEsperado = esperado.declarados[eje]
      if (valorEsperado === undefined) continue
      const campo = eje === 'peso' ? obtenido.pesoUnitario : obtenido[eje]
      if (campo.estado === 'declarado' && campo.valor === valorEsperado) declaradosBien++
      else problemas.push(`ítem ${i} ${eje}: esperaba declarado ${valorEsperado}, vino ${JSON.stringify(campo)}`)
    }

    // --- SC-004: los ausentes, estimados o preguntados. En binario ---
    for (const eje of esperado.ausentes) {
      const campo = eje === 'peso' ? obtenido.pesoUnitario : obtenido[eje]
      if (campo.estado === 'estimado' || campo.estado === 'faltante') ausentesBien++
      else problemas.push(`ítem ${i} ${eje}: ausente en el texto pero vino declarado ${JSON.stringify(campo)}`)
    }

    // --- SC-005: la entrada del catálogo ---
    const usada = [obtenido.largo, obtenido.ancho, obtenido.alto, obtenido.pesoUnitario].find(
      (c) => c.estado === 'estimado',
    )
    const entradaObtenida = usada?.estado === 'estimado' ? usada.entradaCatalogo : null
    if (entradaObtenida === esperado.entradaCatalogo) entradasBien++
    else problemas.push(`ítem ${i} entrada: esperaba ${esperado.entradaCatalogo}, vino ${entradaObtenida}`)

    // La cantidad entra en los declarados solo cuando el caso la declara.
    if (esperado.cantidad !== null) {
      if (obtenido.cantidad.estado !== 'declarado' || obtenido.cantidad.valor !== esperado.cantidad) {
        problemas.push(`ítem ${i} cantidad: esperaba ${esperado.cantidad}, vino ${JSON.stringify(obtenido.cantidad)}`)
      }
    } else if (obtenido.cantidad.estado !== 'faltante') {
      problemas.push(`ítem ${i} cantidad: tenía que quedar faltante y vino ${JSON.stringify(obtenido.cantidad)}`)
    }
  }

  return { caso, ms, declaradosBien, declaradosTotal, ausentesBien, ausentesTotal, entradasBien, entradasTotal, problemas }
}

function p95(valores: readonly number[]): number {
  const ordenados = [...valores].sort((a, b) => a - b)
  return ordenados[Math.min(ordenados.length - 1, Math.ceil(ordenados.length * 0.95) - 1)] ?? 0
}

function porcentaje(bien: number, total: number): number {
  return total === 0 ? 100 : (bien / total) * 100
}

describe('evaluación de precisión (RNF-02)', () => {
  it(
    `corre los ${CASOS.length} casos del dataset contra el proveedor real`,
    async () => {
      let modelo: ReturnType<typeof crearModeloDeepSeek>
      try {
        modelo = crearModeloDeepSeek(configuracionDesdeEntorno())
      } catch (error) {
        // Sin credencial el eval NO pasa en silencio: dice qué falta.
        throw new Error(
          `El eval necesita la credencial del proveedor. ${(error as Error).message}`,
        )
      }

      const porCorrida: { sc003: number; sc004: number; sc005: number }[] = []

      for (let corrida = 1; corrida <= CORRIDAS; corrida++) {
        const deEstaCorrida: Medicion[] = []
        // De a 5 en paralelo, que es la concurrencia con la que SC-002 declara su p95.
        for (let i = 0; i < CASOS.length; i += CONCURRENCIA) {
          const tanda = CASOS.slice(i, i + CONCURRENCIA)
          deEstaCorrida.push(...(await Promise.all(tanda.map((c) => medirCaso(c, modelo)))))
        }
        mediciones.push(...deEstaCorrida)

        const suma = (f: (m: Medicion) => number) => deEstaCorrida.reduce((n, m) => n + f(m), 0)
        porCorrida.push({
          sc003: porcentaje(suma((m) => m.declaradosBien), suma((m) => m.declaradosTotal)),
          sc004: porcentaje(suma((m) => m.ausentesBien), suma((m) => m.ausentesTotal)),
          sc005: porcentaje(suma((m) => m.entradasBien), suma((m) => m.entradasTotal)),
        })
      }

      // El número que vale es el PEOR de las tres corridas, no el promedio: un promedio de 90%
      // puede esconder una corrida en 85%.
      const sc003 = Math.min(...porCorrida.map((c) => c.sc003))
      const sc004 = Math.min(...porCorrida.map((c) => c.sc004))
      const sc005 = Math.min(...porCorrida.map((c) => c.sc005))
      corridas.push(...porCorrida)

      // Los tres por separado: NO se promedian entre sí (SC-005).
      expect(sc003, 'SC-003: campos declarados bien extraídos').toBeGreaterThanOrEqual(90)
      expect(sc004, 'SC-004: campos ausentes estimados o preguntados').toBe(100)
      expect(sc005, 'SC-005: ítems en la entrada correcta').toBeGreaterThanOrEqual(90)
      expect(p95(mediciones.map((m) => m.ms)), 'SC-002: p95 de interpretación').toBeLessThan(10_000)
    },
  )
})

afterAll(() => {
  if (mediciones.length === 0) return

  const sc003 = corridas.length === 0 ? 0 : Math.min(...corridas.map((c) => c.sc003))
  const sc004 = corridas.length === 0 ? 0 : Math.min(...corridas.map((c) => c.sc004))
  const sc005 = corridas.length === 0 ? 0 : Math.min(...corridas.map((c) => c.sc005))
  const ms = mediciones.map((m) => m.ms)

  const conProblemas = mediciones.filter((m) => m.problemas.length > 0)

  // Los números medidos van al informe con la fecha y el comando que los produjo, nunca al
  // PRD (Principio IV).
  const informe = [
    '# Último informe de evaluación',
    '',
    `**Fecha**: ${new Date().toISOString()}`,
    `**Comando**: \`npm run eval\``,
    `**Modelo**: \`${process.env['DEEPSEEK_MODELO'] ?? 'deepseek-flash'}\``,
    `**Concurrencia**: ${CONCURRENCIA} llamadas en paralelo`,
    `**Corridas**: ${CORRIDAS}; se reporta **la peor**, no el promedio`,
    `**Casos medidos**: ${mediciones.length} (${CASOS.length} por corrida)`,
    '',
    '## Precisión (RNF-02)',
    '',
    '| Criterio | Objetivo | Medido |',
    '|---|---|---|',
    `| SC-003 campos declarados bien extraídos | ≥ 90% | **${sc003.toFixed(1)}%** |`,
    `| SC-004 campos ausentes estimados o preguntados | 100% | **${sc004.toFixed(1)}%** |`,
    `| SC-005 ítems en la entrada correcta | ≥ 90% | **${sc005.toFixed(1)}%** |`,
    '',
    'Los tres se reportan por separado y **no se promedian entre sí**.',
    '',
    `Por corrida: ${corridas.map((c, i) => `#${i + 1} ${c.sc003.toFixed(1)}/${c.sc004.toFixed(1)}/${c.sc005.toFixed(1)}`).join(' · ')}`,
    '',
    '## Tiempo (RNF-01)',
    '',
    '| Criterio | Objetivo | Medido |',
    '|---|---|---|',
    `| SC-002 p95 de interpretación | < 10.000 ms | **${p95(ms)} ms** |`,
    `| mediana | — | ${p95(ms.slice(0, Math.ceil(ms.length / 2)))} ms |`,
    `| máximo | — | ${Math.max(...ms)} ms |`,
    '',
    `Medido con ${CONCURRENCIA} llamadas en paralelo. Con una sola, el p95 queda por debajo del`,
    'que ve una persona cuando hay otras usando el sistema.',
    '',
    `## Casos con diferencias (${conProblemas.length})`,
    '',
    ...conProblemas.flatMap((m) => [
      `### ${m.caso.id} — ${m.caso.etiquetas.join(', ')}`,
      '',
      `> ${m.caso.descripcion}`,
      '',
      ...m.problemas.map((p) => `- ${p}`),
      '',
    ]),
  ].join('\n')

  writeFileSync(join(import.meta.dirname, 'ultimo-informe.md'), informe, 'utf8')
})
