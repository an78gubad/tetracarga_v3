# Phase 1 — Cómo correr y cómo verificar

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-28

Guía de validación: qué comando prueba qué criterio. No lleva código de implementación; eso va en
`tasks.md` y en el código.

> Estos comandos describen el proyecto que este plan define. El repositorio todavía no tiene
> `package.json`: hasta que `/speckit-tasks` y la implementación lo creen, lo de acá es el contrato
> que esos pasos tienen que cumplir —y es también lo que el README tiene que decir para que SC-013
> se cumpla (correr el proyecto leyendo solo el README).

## Arrancar

```bash
npm install
cp .env.example .env     # y completar DEEPSEEK_API_KEY
npm run dev              # Vite sirve la app y la función del intermediario como middleware
```

`npm run dev` alcanza: no hay que levantar un servidor aparte para que `/api/interpretar` responda.

Sin `.env`, la aplicación arranca y dice exactamente qué variable falta, con su nombre tal como
aparece en `.env.example` (AC-28). No hay que leer código para averiguarlo.

### Variables de entorno

| Variable | Para qué | Secreta |
|---|---|---|
| `DEEPSEEK_API_KEY` | Credencial del proveedor | **Sí** |
| `DEEPSEEK_BASE_URL` | URL del proveedor | Sí: tampoco debe llegar al navegador |
| `DEEPSEEK_MODELO` | Modelo a usar; por defecto `deepseek-flash` | No |

Ninguna lleva prefijo `VITE_`: Vite mete las que lo llevan en el bundle del navegador, y la clave
vive solo del lado del servidor (FR-015). `.env.example` las nombra todas, sin valores.

## Verificar

```bash
npm test                 # la suite completa: sin red y sin credenciales
npm run typecheck
npm run eval             # SOLO esto llama al proveedor real. Fuera de la suite
```

`npm test` tiene que pasar en un repositorio recién clonado, sin `.env` y sin conexión (AC-16,
SC-012). Si algún test necesita red, está mal escrito: la suite corre contra
`server/modelo/prueba.ts`.

## Qué comando prueba qué criterio

| Criterio | Cómo se verifica |
|---|---|
| AC-01 a AC-03, AC-18, AC-22, AC-27 (interpretación) | `npm test` sobre `src/interpretacion/` con respuestas fijas de `prueba.ts` |
| AC-17 (id de catálogo inexistente) | `npm test` sobre `src/catalogo/` |
| AC-04 a AC-07, AC-15, AC-23 (disposición) | `npm test` sobre `src/acomodador/` |
| AC-10 (ninguna disposición dispara el validador) | `npm test`: los 10 escenarios pasan por el validador |
| AC-14, AC-21 (determinismo y línea base) | `npm test` sobre `escenarios/linea-base.test.ts` |
| AC-24 (todo prefijo tiene apoyo) | `npm test`: se valida cada prefijo de la secuencia, no solo la final |
| AC-16 (suite sin red) | `npm test` con la red apagada y sin `.env` |
| AC-19 / SC-010 (nada del proveedor en el navegador) | `npm test` sobre `tests/seguridad/bundle.test.ts`: arma su propio bundle |
| RF-08 (validador sin código compartido) | `npm test` sobre `tests/arquitectura/imports.test.ts` |
| SC-015 (paleta) | `npm test` sobre `src/vista3d/paleta.test.ts` |
| AC-25, AC-29 (largo y límite por IP) | `npm test` sobre `server/proxy/` |
| RNF-02 / SC-003 a SC-005 (precisión) | `npm run eval` — llama al proveedor, cuesta plata |
| RNF-01 / SC-002 (10 s p95) | `npm run eval`, declarando la concurrencia de la medición |
| RNF-04 / SC-007 (5 s p95) | `npm test` mide los 10 escenarios y reporta |
| **RNF-06 / SC-009 (30 fps)** | **A mano, en el navegador.** Ver abajo |

## Lo que no se verifica con tests

**La vista 3D se verifica en el navegador**, no solo con tests (INSTRUCCIONES.md). Con la aplicación
corriendo:

1. Cargar un escenario de 200 bultos repartidos en 12 tipos —el caso peor de la paleta, porque el
   costo de dibujo crece con la cantidad de tipos.
2. Abrir la herramienta de rendimiento de Chrome y grabar **10 segundos con la cámara en órbita
   continua**, que es el caso peor realista.
3. Reportar el **mínimo sostenido**, no el promedio: un promedio de 30 fps puede esconder caídas a
   10, y lo que una persona percibe como tirón es el mínimo.
4. Anotar CPU, GPU, resolución de la ventana y versión de Chrome. Sin eso, el número no es
   reproducible.

A mano también: que los 12 colores se distingan de verdad en pantalla (el test mide la distancia
declarada, no lo que ve un ojo), que dos bultos de la misma pila se distingan, y que el control
deslizante no muestre ningún bulto flotando en ningún paso del recorrido.

## Dónde van los números

A `eval/ultimo-informe.md`, con **la fecha y el comando que los produjo**. Nunca al PRD. Un número
que no salió de una corrida real no se reporta (Principio IV).

## Las tres cosas que no se tocan para que algo pase

El catálogo, el dataset y la línea base. Si falla AC-14, el error está en el código, no en la
disposición congelada. Si el eval de RNF-02 no llega al 90%, no se corrigen etiquetas: se mejora el
prompt, o se cambia el modelo con `DEEPSEEK_MODELO`. Tocar cualquiera de los tres lo decide el
usuario, explícitamente.
