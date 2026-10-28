# Implementation Plan: Consolidación de carga en contenedor desde una descripción en castellano, con vista 3D

**Branch**: `001-consolidacion-carga-3d` | **Date**: 2026-10-28 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-consolidacion-carga-3d/spec.md` (PRD-001v7)

## Summary

El usuario escribe la carga de corrido en castellano; el modelo la convierte en una lista de ítems
y nada más. El código decide: completa solo desde el catálogo versionado, verifica contra él todo
id que el modelo propone, pregunta lo que falta y bloquea. Con la lista firme, un acomodador
escrito a mano calcula una disposición determinística, un validador que no comparte código con él
la aprueba o la rechaza, y Three.js la dibuja con geometría instanciada y un recorrido bulto por
bulto.

El stack lo fija el PRD y no se re-decide acá. Lo que este plan resuelve son las decisiones de
diseño que el spec dejó abiertas: cómo se reparte el peso en aritmética entera, qué orientaciones
se admiten, qué cuenta como contacto, cómo se clasifican las fallas de DeepSeek entre transitorias
y definitivas, y cómo se hace cumplir en el árbol de archivos que el validador no comparta ni una
constante con el acomodador.

## Technical Context

**Language/Version**: TypeScript 6 sobre Node 22 LTS. **No** TypeScript 7: Vercel compila las
funciones con la API JavaScript de `typescript`, que la 7 no trae (AGENTS.md).

**Primary Dependencies**: React + Vite (navegador), Three.js con geometría instanciada (vista 3D),
Vitest (tests). Ninguna librería de packing: el acomodador y el validador se escriben a mano
(Principio de arquitectura, CONTEXTO.md). Ninguna dependencia nueva sin acordarla.

**Storage**: N/A. No hay persistencia en servidor ni cuentas de usuario; cada consolidación vive en
la sesión del navegador. Los tres artefactos versionados —catálogo, dataset y línea base— son
archivos del repositorio, no una base de datos.

**Testing**: Vitest. La suite corre sin red y sin credenciales contra una implementación de prueba
de la interfaz del modelo (FR-020, AC-16). La línea base de FR-018 **no** usa snapshots de Vitest:
`vitest -u` las reescribiría sin que nadie lo decida.

**Target Platform**: navegador Chrome de escritorio como objetivo de medición de SC-009; función
serverless en Vercel para el intermediario. En desarrollo, Vite sirve la función como middleware,
así que `npm run dev` alcanza.

**Project Type**: aplicación web de una sola página más una función serverless que actúa de
intermediario con el proveedor del modelo.

**Performance Goals**: interpretación < 10 s p95 punta a punta con reintentos incluidos (SC-002);
consolidación de hasta 200 bultos < 5 s p95 sobre los 10 escenarios (SC-007); vista 3D ≥ 30 fps con
200 bultos en 12 tipos (SC-009).

**Constraints**: el acomodador y el validador **reciben el contenedor por argumento** y ninguno
importa `src/catalogo/` —`acomodar(items, contenedor)` y `validar(disposicion, contenedor)`—: quien
lee el catálogo es el orquestador, una sola vez, y le pasa el mismo valor a los dos, de modo que un
error de lectura no lo puedan cometer los dos igual; longitudes en milímetros enteros y pesos en
gramos enteros, sin punto flotante en
el reparto de peso (FR-009, FR-027); el validador no comparte código ni constantes con el
acomodador, solo tipos (FR-010); la credencial del proveedor nunca llega al navegador, ni la clave
ni la URL ni ningún encabezado (FR-015); descripción de hasta 2.000 caracteres y 10 pedidos por
minuto y 60 por hora por IP (FR-017, FR-023).

**Scale/Scope**: un contenedor por vez entre 20', 40' y 40' high cube; 200 bultos como límite hasta
el cual se garantizan los objetivos de rendimiento, sin tope duro por encima (FR-024); catálogo de
objetos y contenedores, dataset de 50 descripciones etiquetadas y 10 escenarios de referencia.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Cómo lo hace cumplir este plan | Estado |
|---|---|---|
| **I. El modelo interpreta, el código decide** | El modelo solo devuelve la lista de ítems. Completar sale de `src/catalogo/`; el id propuesto lo verifica `catalogo.ts` y si no existe se descarta la propuesta entera, sin buscar parecidos. El acomodador no importa nada de `cliente-modelo/` ni de `server/` | PASS |
| **II. Ninguna disposición imposible llega a la pantalla** | `src/validador/` corre antes de renderizar y bloquea. Vive en su propia carpeta, con sus propias constantes y sus propias cuentas; de `src/dominio/` solo trae tipos, con `import type`. `tests/arquitectura/imports.test.ts` verifica cuatro reglas parseando los imports: ninguna de las dos carpetas importa de la otra, los imports de `dominio/` son de tipos, nada de `src/` importa de `server/`, y ninguna de las dos importa del catálogo —el contenedor llega por argumento | PASS |
| **III. Determinística y congelada** | Aritmética entera en todo el acomodador. La línea base es `escenarios/linea-base.json`, comparada bulto por bulto por un test propio; no hay snapshots de Vitest en ese camino | PASS |
| **IV. Ningún dato sin fuente** | Cada entrada del catálogo trae el campo `fuente` con la ficha exacta; el esquema del catálogo lo exige y un test falla si falta. Los números medidos van a `eval/ultimo-informe.md` con fecha y comando | PASS |
| **V. El proveedor aislado detrás del servidor** | `server/modelo/interfaz.ts` es el único contrato; `deepseek.ts` la única implementación que habla con la red. El navegador llama a `/api/interpretar` y a nada más. Un test arma su propio bundle y busca la clave, la URL y el encabezado reales | PASS |
| **VI. Los tests no se debilitan** | La suite corre contra `server/modelo/prueba.ts`, sin red ni credenciales. El eval que llama al proveedor real es otro comando, fuera de la suite | PASS |

Sin violaciones: **Complexity Tracking queda vacío**.

## Project Structure

### Documentation (this feature)

```text
specs/001-consolidacion-carga-3d/
├── plan.md              # Este archivo
├── research.md          # Phase 0: las decisiones que el spec dejó abiertas
├── data-model.md        # Phase 1: entidades, campos y reglas de validación
├── quickstart.md        # Phase 1: cómo correr y cómo verificar
├── contracts/           # Phase 1: interfaz del modelo, proxy, catálogo, línea base
│   ├── modelo.md
│   ├── proxy.md
│   ├── catalogo.md
│   └── linea-base.md
├── checklists/          # Calidad de requerimientos (reviewer-owned)
└── tasks.md             # Phase 2: lo genera /speckit-tasks, no este comando
```

### Source Code (repository root)

```text
src/                            # Todo lo que llega al navegador. Nada de acá habla con el proveedor
├── main.tsx
├── App.tsx
├── dominio/                    # SOLO tipos. Es lo único que acomodador y validador comparten
│   ├── items.ts                #   Item, EstadoCampo, MotivoFaltante, MarcasItem
│   ├── disposicion.ts          #   Bulto, Colocacion, Orientacion, Disposicion, Informe
│   └── unidades.ts             #   Milimetros, Gramos, MilimetrosCuadrados (tipos marcados)
├── catalogo/
│   ├── objetos.json            #   Entradas de objetos, cada una con su ficha de origen
│   ├── contenedores.json       #   20', 40', 40' HC, todos de Maersk, sin mezclar navieras
│   ├── catalogo.ts             #   Carga, verifica ids y resuelve nombres
│   ├── esquema.ts              #   Exige el campo `fuente` en cada entrada
│   └── catalogo.test.ts
├── acomodador/                 # Solo importa de sí mismo y tipos de dominio/
│   ├── acomodar.ts
│   ├── orden.ts                #   No apilables al final; volumen decreciente; a igual volumen,
│   │                           #   primero el que aguanta más peso encima (CONTEXTO.md)
│   ├── apoyo.ts                #   Área de contacto y el 80%
│   ├── peso.ts                 #   Reparto entero por área, redondeo hacia arriba (FR-027)
│   ├── orientacion.ts
│   ├── informe.ts              #   Aprovechamiento de volumen y de peso (FR-012)
│   └── *.test.ts
├── validador/                  # Mismas cuentas, escritas de nuevo. Sin importar del acomodador
│   ├── validar.ts
│   ├── solapamiento.ts
│   ├── limites.ts
│   ├── apoyo.ts
│   ├── peso.ts
│   └── *.test.ts
├── interpretacion/
│   ├── completar.ts            #   Completa desde el catálogo y marca estimado
│   ├── faltantes.ts            #   Los tres motivos de FR-004
│   ├── fusionar.ts             #   Segunda descripción: agrega al final (FR-025)
│   └── *.test.ts
├── cliente-modelo/
│   └── interpretar.ts          #   Llama a /api/interpretar. No conoce al proveedor
├── vista3d/
│   ├── Escena.tsx
│   ├── instanciado.ts          #   Una malla instanciada por tipo de ítem
│   ├── paleta.ts               #   Los 12 colores y el umbral declarado al lado
│   ├── paleta.test.ts          #   Falla si algún par queda por debajo del umbral (SC-015)
│   ├── color-por-item.ts       #   El color atado al ítem, no a la posición (AC-09)
│   └── recorrido.ts            #   El prefijo de k bultos (FR-014)
└── interfaz/
    ├── CampoDescripcion.tsx
    ├── ListaItems.tsx
    ├── SelectorContenedor.tsx
    ├── InformeConsolidacion.tsx
    ├── EdicionItem.tsx         #   Editar, agregar y eliminar ítems y campos (FR-006)
    ├── EditorDeMarcas.tsx      #   Las tres marcas por ítem (FR-008)
    └── Avisos.tsx              #   Colores reciclados (>12 tipos) y rendimiento (>200 bultos)

server/                         # No sabe de Vercel ni de Vite. Imports relativos con extensión .js
├── modelo/
│   ├── interfaz.ts             #   El contrato de RNF-08: cambiar de proveedor es otra implementación
│   ├── deepseek.ts             #   La única pieza que habla con la red
│   ├── prueba.ts               #   Implementación de prueba: la suite corre contra esta
│   └── reintentos.ts           #   3 intentos dentro del presupuesto de 10 s
├── proxy/
│   ├── manejador.ts            #   Largo, límite por IP, llamada, validación de esquema
│   ├── limite-ip.ts            #   10/min y 60/h, en memoria de la instancia (deuda declarada)
│   ├── esquema-respuesta.ts    #   Forma por respuesta entera; rango por ítem (FR-017, FR-021)
│   └── *.test.ts
api/
└── interpretar.ts              # La función de Vercel: solo envuelve a manejador.ts

escenarios/
├── escenarios.ts               # Los 10 de referencia, calibrados a ~115% (CONTEXTO.md)
├── linea-base.json             # Congelada una sola vez, cuando los escenarios estén cerrados
├── linea-base.test.ts          # Recalcula y compara bulto por bulto, sin tolerancia
├── validador.test.ts           # Ninguna de las 10 dispara el validador (AC-10)
└── tiempo.test.ts              # p95 de consolidación sobre los 10 escenarios (SC-007)

eval/
├── dataset/                    # Las 50 descripciones etiquetadas
├── correr-eval.ts              # Llama al proveedor real. FUERA de la suite
└── ultimo-informe.md           # Los números medidos, con fecha y comando

tests/
├── arquitectura/
│   └── imports.test.ts         # Falla si acomodador y validador comparten valores (RF-08)
└── seguridad/
    └── bundle.test.ts          # Arma su propio bundle y busca la clave, la URL y el encabezado
```

**Structure Decision**: la del `AGENTS.md`, que ya fija las cuatro fronteras que importan: `src/`
es todo lo que llega al navegador y nada de ahí habla con el proveedor; `src/acomodador/` y
`src/validador/` son hermanos que solo comparten tipos; `server/` no sabe de Vercel ni de Vite; y
`api/` solo envuelve al manejador. Lo que este plan agrega son las carpetas que faltaban nombrar
—`dominio/`, `escenarios/`, `tests/arquitectura/`— y la razón de cada una.

Las dos carpetas de tests fuera de `src/` existen porque prueban propiedades del árbol de archivos
y del bundle, no de un módulo: no tienen un `src/` donde vivir.

## Complexity Tracking

Sin violaciones de la constitución que justificar: este plan no agrega proyectos, ni capas de
indirección, ni dependencias. La única duplicación deliberada —el validador rehaciendo las cuentas
del acomodador— no es complejidad accidental: es el Principio II, y existe justamente para que un
error del acomodador no pase desapercibido.

## Constitution Check — re-evaluación después del diseño

*Segundo paso del gate: se vuelve a mirar con los artefactos de Phase 1 escritos.*

| Principio | Qué agregó el diseño | Estado |
|---|---|---|
| **I** | El prompt manda ids y sinónimos, no medidas, justamente para que el modelo no pueda copiar un número: solo puede proponer un id, y lo verifica el código. La conversión de unidades quedó del lado del código ([research.md §13](./research.md)) | PASS |
| **II** | `tests/arquitectura/imports.test.ts` convierte el principio en algo que rompe el build: falla si una carpeta importa de la otra o si un import de `dominio/` no es `import type` | PASS |
| **III** | La fórmula del reparto quedó escrita en aritmética entera —`(a*b + c - 1) / c`— y la comparación del 80% multiplicando en vez de dividiendo: dos implementaciones independientes dan el mismo número | PASS |
| **IV** | Dos valores quedaron deliberadamente sin número —el umbral de la paleta y `max_tokens`— porque salen de medir, no de elegir. El contrato del catálogo usa `0` en sus ejemplos para no aparentar datos | PASS |
| **V** | `contracts/modelo.md` no nombra a DeepSeek en ningún tipo; la clasificación de errores vive en la implementación. El intermediario traduce las fallas y no reenvía el texto crudo del proveedor, que es por donde una URL se filtra sin que nadie lo note | PASS |
| **VI** | Se corrigió un `.skip` disfrazado: el test de la línea base entra en el mismo commit que el archivo, en vez de pasar por ausencia del archivo | PASS |

Sin violaciones nuevas. **Complexity Tracking sigue vacío.**

### Dos valores que quedan sin fijar, a propósito

| Valor | Por qué no está acá | Cuándo se fija |
|---|---|---|
| Umbral de distancia de la paleta | Elegir un número alto y después aflojarlo para que los 12 colores pasen es exactamente lo que `AGENTS.md` prohíbe | Se genera la paleta, se mide, y el número va al informe con su comando |
| `max_tokens` del pedido al modelo | Sale de medir tokens por ítem sobre el dataset; inventarlo sería un dato sin fuente | Al cerrar el prompt, contra el dataset |

No son clarificaciones pendientes: la **decisión** está tomada —qué métrica, cómo se deriva el
número, dónde queda declarado y qué test lo verifica. Lo que falta es la corrida que produce el
valor, y producirla antes de tener el código sería inventarla.
