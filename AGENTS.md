# AGENTS.md — Tetracarga

## Qué leer y para qué

| Archivo | Qué es | Cuándo manda |
|---|---|---|
| `PRD.md` | **El qué.** Requerimientos (RF/RNF), criterios de aceptación (AC), alcance y lo que queda afuera | Siempre. Si otro archivo lo contradice, gana el PRD |
| `CONTEXTO.md` | **El porqué.** Las decisiones que tientan a "mejorar" y lo que ya se midió para tomarlas | Antes de cambiar el acomodador, el catálogo o cualquier cosa que parezca mejorable |
| `INSTRUCCIONES.md` | **El cómo.** Proceso de trabajo: plan, commits, dónde van los números medidos | En cada paso |
| `AGENTS.md` (este) | Stack, dónde vive cada cosa y qué no hacer | En cada paso |

Leé `CONTEXTO.md` e `INSTRUCCIONES.md` antes de empezar; el PRD, cuando el paso toque un requerimiento.

## Stack
- TypeScript 6, no 7: Vercel compila las funciones con la API JavaScript de `typescript`, que la 7 no trae.

## Dónde vive cada cosa
- `src/`: todo lo que llega al navegador. Nada de acá habla con el proveedor.
- `src/acomodador/` y `src/validador/`: cada uno solo trae código de su propia carpeta. Pueden compartir tipos, nunca valores (RF-08).
- `server/`: la interfaz del modelo, sus implementaciones y el manejador del proxy. No sabe de Vercel ni de Vite.
- `api/`: la función de Vercel, que solo envuelve al manejador. En desarrollo lo sirve Vite como middleware, así que `npm run dev` alcanza.
- En `server/` y `api/` los imports relativos llevan extensión `.js`: Vercel compila archivo por archivo y Node, en ESM, no completa extensiones.
- `PLAN.md`: el plan vigente, un paso por vez. Si no existe, se arma y se acuerda antes de escribir código.

## Qué NO hacer
- **No tocar la línea base, el dataset ni el catálogo para que algo pase.** Si falla AC-14, el error está en el código, no en la disposición congelada. Si el eval de RNF-02 no llega, no se "corrigen" etiquetas. Cambiar cualquiera de los tres lo decide el usuario.
- **No usar snapshots de Vitest para la línea base de RNF-05.** `vitest -u` la reescribe sin que nadie lo decida.
- **No inventar datos del catálogo.** Toda entrada nombra la ficha exacta de la que sale; si no hay fuente, se pregunta.
- **No debilitar tests:** nada de `.skip`, `.only` ni `.todo` commiteados, ni umbrales aflojados, ni tolerancias donde el AC dice "sin tolerancia".
- **No agregar dependencias sin acordarlo.** En particular, ninguna librería de packing (ver CONTEXTO.md).
- **No reportar números que no salgan de una corrida real.** Van a `eval/ultimo-informe.md` con la fecha y el comando que los produjo.
- **No usar variables con prefijo `VITE_` para nada secreto.** Vite las mete en el bundle del navegador; la API key va en `.env` sin prefijo.
- **No probar AC-19 con patrones genéricos.** El test busca la clave, la URL del proveedor y el encabezado de autorización reales: patrones como `sk-` dan falsos positivos con el código de React. El test arma su propio bundle; no depende de un `dist/` que puede estar viejo.
