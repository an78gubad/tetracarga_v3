import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Sirve `api/` como middleware en desarrollo, para que `npm run dev` alcance y no haya
 * que levantar un segundo servidor (AGENTS.md).
 *
 * En producción la función la corre Vercel; acá se la carga con `ssrLoadModule`, que la
 * transpila al vuelo, y se le pasan el request y el response de Node tal como se los pasa
 * Vercel. Así `api/interpretar.ts` no necesita saber en qué de los dos está corriendo.
 */
function apiEnDesarrollo(): Plugin {
  return {
    name: 'tetracarga:api-en-desarrollo',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req, res, next) => {
        const url = req.url ?? ''
        if (!url.startsWith('/api/')) return next()

        const ruta = url.split('?')[0]?.replace(/^\/api\//, '') ?? ''
        if (!/^[a-z0-9-]+$/.test(ruta)) return next()

        try {
          const modulo = await server.ssrLoadModule(`/api/${ruta}.ts`)
          const manejador = modulo.default
          if (typeof manejador !== 'function') {
            throw new Error(`api/${ruta}.ts no exporta un manejador por defecto`)
          }
          await manejador(req, res)
        } catch (error) {
          // Todavía no existe la función, o se rompió al cargarla: se dice cuál y por qué,
          // en vez de devolver un 404 que se confunde con una ruta mal escrita.
          res.statusCode = 501
          res.setHeader('content-type', 'application/json')
          res.end(
            JSON.stringify({
              codigo: 'funcion-no-disponible',
              mensaje: `No se pudo cargar api/${ruta}.ts: ${(error as Error).message}`,
            }),
          )
        }
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), apiEnDesarrollo()],
  build: { outDir: 'dist' },
})
