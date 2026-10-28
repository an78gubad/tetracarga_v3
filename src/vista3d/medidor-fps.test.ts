import { describe, expect, it } from 'vitest'
import { DURACION_MS, VENTANA_MS, informeDe, type Medicion } from './medidor-fps'

const MEDICION: Medicion = {
  fpsMinimoSostenido: 42.5,
  fpsPromedio: 58.1,
  cuadros: 580,
  maquina: {
    gpu: 'GPU de prueba',
    nucleos: 8,
    memoriaGb: 8,
    resolucion: '1600×900 css, 1920×1080 pantalla',
    navegador: 'Chrome/999 de prueba',
    relacionDePixeles: 1.5,
  },
}

describe('el procedimiento declarado (research.md §15)', () => {
  it('mide durante 10 segundos', () => {
    expect(DURACION_MS).toBe(10_000)
  })

  it('el mínimo sostenido se toma sobre ventanas de medio segundo', () => {
    expect(VENTANA_MS).toBe(500)
  })
})

describe('el informe que produce', () => {
  const texto = informeDe(MEDICION, 200, 12)

  it('reporta el mínimo sostenido, no el promedio, como el número que cuenta', () => {
    expect(texto).toContain('**Mínimo sostenido** | **42.5 fps**')
  })

  it('igual muestra el promedio, para poder ver si hay caídas', () => {
    expect(texto).toContain('58.1 fps')
  })

  it('anota la máquina: sin eso un número de fps no es reproducible', () => {
    expect(texto).toContain('GPU de prueba')
    expect(texto).toContain('Núcleos: 8')
    expect(texto).toContain('1600×900')
    expect(texto).toContain('Chrome/999 de prueba')
  })

  it('dice la carga con la que se midió', () => {
    expect(texto).toContain('200 bultos en 12 tipos')
  })

  it('marca si cumple el objetivo de 30 fps', () => {
    expect(informeDe(MEDICION, 200, 12)).toContain('✅')
    expect(informeDe({ ...MEDICION, fpsMinimoSostenido: 22 }, 200, 12)).toContain('❌')
  })

  it('declara el procedimiento, no solo el resultado', () => {
    expect(texto).toContain('órbita continua')
    expect(texto).toContain('10 s')
  })
})
