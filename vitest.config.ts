import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    // Entorno de Node: la suite no necesita navegador. La vista 3D se verifica en el
    // navegador, no con tests (INSTRUCCIONES.md).
    environment: 'node',
    include: [
      'src/**/*.test.ts',
      'src/**/*.test.tsx',
      'server/**/*.test.ts',
      'escenarios/**/*.test.ts',
      'tests/**/*.test.ts',
    ],
    // La suite completa corre sin red y sin credenciales, contra la implementación de
    // prueba de la interfaz del modelo (FR-020, AC-16). El eval que llama al proveedor
    // real es `npm run eval` y queda fuera de acá a propósito.
    exclude: ['node_modules/**', 'dist/**', 'eval/**'],
  },
})
