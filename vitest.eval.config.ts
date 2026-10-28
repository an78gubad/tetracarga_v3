import { defineConfig } from 'vitest/config'

/**
 * La evaluación de precisión (RNF-02). **Llama al proveedor real y gasta plata.**
 *
 * Tiene su propia configuración a propósito: así `npm test` no la puede correr por accidente,
 * que es lo que FR-020 pide cuando dice que la evaluación corre aparte.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['eval/correr-eval.ts'],
    // Las 50 descripciones por 3 intentos posibles, de a 5 en paralelo: con 10 s de
    // presupuesto cada una, el peor caso está por arriba del minuto.
    testTimeout: 600_000,
    hookTimeout: 600_000,
  },
})
