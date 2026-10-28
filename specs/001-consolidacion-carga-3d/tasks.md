---

description: "Task list for Consolidación de carga en contenedor desde una descripción en castellano, con vista 3D"
---

# Tasks: Consolidación de carga en contenedor desde una descripción en castellano, con vista 3D

**Input**: Design documents from `/specs/001-consolidacion-carga-3d/`

**Prerequisites**: [plan.md](./plan.md), [spec.md](./spec.md), [research.md](./research.md), [data-model.md](./data-model.md), [contracts/](./contracts/)

**Tests**: incluidos y **obligatorios**. No es una elección de estilo: FR-020 y AC-16 piden que la
suite completa pase sin red y sin credenciales, el Principio VI prohíbe debilitarla, y
`INSTRUCCIONES.md` exige que en `src/acomodador/` y `src/validador/` el test entre **en su propio
commit, antes** del código que lo hace pasar.

**Organization**: por historia de usuario, en el orden de prioridad del spec.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: se puede hacer en paralelo (archivos distintos, sin dependencias pendientes)
- **[Story]**: US1 a US4, según la historia del spec
- Cada tarea nombra su archivo exacto

## Reglas que atraviesan todas las tareas

1. **El commit del test primero** aplica solo a `src/acomodador/` y `src/validador/`: el test se
   commitea antes del código, el mensaje dice que falla hasta el commit siguiente, y el siguiente
   lo pone en verde. En el resto del proyecto el test entra en el commit de la feature.
2. **Nada de `.skip`, `.only` ni `.todo`**, ni umbrales aflojados, ni tolerancias donde el criterio
   dice "sin tolerancia".
3. **Ningún dato sin fuente**: toda entrada de catálogo nombra su ficha. Si no hay fuente, **se
   pregunta al usuario**; no se inventa, no se estima, no se promedia entre fuentes.
4. **Ningún número medido sale de la nada**: va a `eval/ultimo-informe.md` con fecha y comando.
5. En `server/` y `api/`, los imports relativos llevan extensión `.js`.

---

## Phase 1: Setup

**Purpose**: que el repositorio arranque, corra tests y se pueda clonar siguiendo solo el README.

- [X] T001 Crear `package.json` con las dependencias del PRD (React, Vite, Three.js, Vitest) y los scripts `dev`, `test`, `typecheck` y `eval`; fijar `typescript` en la **versión 6, no 7** (Vercel compila las funciones con la API JavaScript de `typescript`, que la 7 no trae) y `engines.node` en 22
- [X] T002 [P] Crear `tsconfig.json` con `strict`, módulos ESM y `verbatimModuleSyntax` activado, para que `import type` no se degrade a import de valores
- [X] T003 [P] Crear `vite.config.ts` que sirva `api/` como middleware en desarrollo, de modo que `npm run dev` alcance sin levantar un segundo servidor
- [X] T004 [P] Crear `vitest.config.ts` incluyendo `src/`, `server/`, `escenarios/` y `tests/`
- [X] T005 [P] Crear `.env.example` nombrando `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL` y `DEEPSEEK_MODELO`, sin valores y **sin prefijo `VITE_`** en ninguna (Vite mete las que lo llevan en el bundle del navegador)
- [X] T006 [P] Crear `README.md` con los comandos de desarrollo, de tests y del eval, y la lista de variables de entorno, para que el proyecto se corra sin leer código (FR-022, SC-013, AC-28)
- [X] T007 [P] Crear `.gitignore` con `node_modules/`, `dist/` y `.env` (las exclusiones **locales** de cada quien van por `.git/info/exclude`, no acá)
- [X] T008 [P] Crear `vercel.json` declarando `api/` como función serverless

**Checkpoint**: `npm install`, `npm test` y `npm run typecheck` corren (sin tests todavía).

---

## Phase 2: Foundational (prerrequisitos bloqueantes)

**Purpose**: los tipos compartidos y el catálogo. **Ninguna historia puede empezar sin esto.**

**⚠️ El catálogo es el primer entregable (FR-019) y es el único origen de todo dato completado.**

- [X] T009 [P] Crear `src/dominio/unidades.ts` con los tipos marcados `Milimetros`, `Gramos` y `MilimetrosCuadrados`, todos enteros, para que el compilador no deje sumar milímetros con gramos
- [X] T010 [P] Crear `src/dominio/items.ts` con `Item`, `Campo<T>` (`declarado` | `estimado` con su entrada de catálogo | `faltante` con su motivo), `MotivoFaltante` con sus **tres** valores (`sin-entrada-en-catalogo`, `entrada-sin-el-dato`, `valor-fuera-de-rango`), `Marca<T>` y `MarcasItem`
- [X] T011 [P] Crear `src/dominio/disposicion.ts` con `Bulto` (identidad `itemId` + `indice`), `Orientacion` (permutación de los tres ejes), `Colocacion`, `Disposicion`, `BultoAfuera` con motivo `'peso' | 'volumen'`, `InformeConsolidacion` y `Contenedor` (medidas interiores y `cargaUtil`), que es lo que el acomodador y el validador reciben **por argumento** en vez de leer del catálogo
- [X] T012 Crear `src/catalogo/esquema.ts` que valide cada entrada y **falle** si: falta `fuente` o está vacía, un `id` está repetido, una medida es ≤ 0 o no entera, un `peso` no nulo es ≤ 0, o un sinónimo aparece en dos entradas distintas
- [X] T013 Crear `src/catalogo/contenedores.json` con el 20', el 40' y el 40' high cube: medidas interiores, `cargaUtil` (**la carga útil / max payload, no el peso bruto**) y `tara`, los tres de fichas "Container specifications" de Maersk, **sin mezclar navieras**, donde `cargaUtil + tara = peso bruto`; cada entrada nombra su ficha en `fuente`
- [ ] T014 Crear `src/catalogo/objetos.json` con las entradas de objetos, cada una con su ficha exacta en `fuente` y `sinonimos` para que "tambor", "tacho" y "bidón de 200" lleguen a la misma entrada. `peso: null` es el caso normal (depende del contenido). **Ninguna marca de FR-008 precargada**: hoy ninguna ficha dice "no apilable" ni "este lado arriba". **Si un objeto no tiene ficha, se pregunta al usuario antes de agregarlo**
- [X] T015 Crear `src/catalogo/catalogo.ts` que cargue los dos archivos, resuelva nombres y sinónimos, y exponga la verificación de id que **descarta la propuesta entera** cuando el id no existe, sin buscar ni usar una entrada parecida (FR-005, AC-17)
- [X] T016 Crear `src/catalogo/catalogo.test.ts`: el esquema rechaza una entrada sin `fuente`, un id repetido y un sinónimo ambiguo; un id inexistente se descarta sin caer en la entrada más parecida (AC-17)
- [X] T017 [P] Crear `tests/arquitectura/imports.test.ts` que recorra el árbol con la API de compilador de TypeScript y **falle** si: (a) `src/acomodador/` importa de `src/validador/` o al revés; (b) un import de `src/dominio/` desde esas dos carpetas no es `import type`; (c) algo de `src/` importa de `server/` —el Principio V custodiado por delante, no solo por el test de bundle—; (d) `src/acomodador/` o `src/validador/` importan de `src/catalogo/`: el contenedor llega por argumento, así que un error de lectura del catálogo no lo pueden cometer los dos igual (RF-08, Principios II y V)

**Checkpoint**: los tipos y el catálogo están firmes; el test de arquitectura ya custodia la frontera.

---

## Phase 3: User Story 1 — Describir la carga y ver la lista (P1) 🎯 MVP

**Goal**: el usuario escribe de corrido y obtiene la lista de ítems, distinguiendo lo declarado de
lo completado desde el catálogo, con lo que falta preguntado y la consolidación bloqueada.

**Independent Test**: con el dataset de 50 descripciones etiquetadas, campo por campo: qué se
extrajo, qué quedó estimado con su entrada de catálogo y qué se preguntó. Sin consolidar ni
renderizar nada.

### Interfaz del modelo y el intermediario

- [ ] T018 [US1] Crear `server/modelo/interfaz.ts` con `Modelo`, `PedidoInterpretacion`, `ItemPropuesto` y `ResultadoInterpretacion` según [contracts/modelo.md](./contracts/modelo.md). **Ningún tipo de este archivo nombra a DeepSeek**: si lo hace, el contrato está mal
- [ ] T019 [P] [US1] Crear `server/modelo/prueba.ts`: implementación de prueba que devuelve respuestas fijas —ítems, vacía, falla transitoria, falla definitiva, fuera de esquema— sin tocar la red. Es contra esta que corre toda la suite (FR-020, AC-16)
- [ ] T020 [US1] Crear `server/modelo/deepseek.ts` con `response_format: { type: 'json_object' }`, la palabra "json" y un ejemplo del formato en el prompt, y `max_tokens` (las tres condiciones son obligatorias según la documentación; `response_format` solo no alcanza). El prompt lleva los ids y sinónimos del catálogo, **sin medidas**, para que el modelo solo pueda proponer un id
- [ ] T021 [US1] Crear `server/modelo/reintentos.ts`: hasta 3 intentos sobre fallas transitorias dentro de un presupuesto total de 10 s punta a punta; si el presupuesto se agota en medio de un intento no se arranca otro. Transitorias: 429, 500, 503 y respuesta vacía. Definitivas, sin reintento: 400, 401, 402 y 422 (FR-016)
- [ ] T022 [P] [US1] Crear `server/modelo/reintentos.test.ts`: 3 intentos y no 4; una falla definitiva corta en el primero; agotado el presupuesto devuelve falla del proveedor; una respuesta vacía se reintenta (AC-20)
- [ ] T023 [US1] Crear `server/proxy/esquema-respuesta.ts`: la **forma** se valida por respuesta entera y la descarta completa tratándola como vacía; el **rango** (cantidad entera ≥ 1, medidas y peso > 0) se valida **ítem por ítem**, deja ese campo faltante con motivo `valor-fuera-de-rango` y **no** descarta los demás ítems ni dispara reintento (FR-017, FR-021)
- [ ] T024 [P] [US1] Crear `server/proxy/esquema-respuesta.test.ts`: una respuesta mal formada se descarta entera (AC-26); `-5`, `0` y una cantidad no entera dejan ese campo faltante sin tocar los otros ítems, y **no** se salvan por su valor absoluto ni por su signo (AC-27)
- [ ] T025 [P] [US1] Crear `server/proxy/limite-ip.ts`: ventanas deslizantes de 1 minuto (10 pedidos) y 1 hora (60), en memoria del proceso, con la IP tomada del primer valor de `x-forwarded-for` y `remoteAddress` como respaldo (FR-023)
- [ ] T026 [US1] Crear `server/proxy/manejador.ts` con el orden de controles de [contracts/proxy.md](./contracts/proxy.md): cuerpo válido → largo ≤ 2.000 **puntos de código** → límite por IP → llamada → validación de esquema. Los tres primeros rechazan **sin llamar al proveedor**. Ningún mensaje de error reenvía el texto crudo del proveedor: por ahí se filtra una URL sin que nadie lo note (FR-015)
- [ ] T027 [P] [US1] Crear `server/proxy/manejador.test.ts`: 2.001 caracteres se rechazan con el límite en el mensaje y cero llamadas al modelo (AC-25); el pedido 11 de la misma IP en un minuto se rechaza con el límite y cero llamadas (AC-29, SC-014); falta de credencial se distingue de credencial inválida
- [ ] T028 [US1] Crear `api/interpretar.ts` que **solo** envuelva a `server/proxy/manejador.ts`, sin lógica propia, con los imports relativos con extensión `.js`

### Completado desde el catálogo

- [ ] T029 [US1] Crear `src/interpretacion/convertir.ts` que convierta a milímetros y gramos enteros: longitudes en mm, cm, m y pulgadas; pesos en g, kg y toneladas; sin unidad, una longitud está en centímetros y un peso en kilos; `"AxBxC"` se lee largo × ancho × alto; un peso declarado para todo el ítem se divide por la cantidad. **La conversión la hace el código, nunca el modelo** (FR-002)
- [ ] T030 [P] [US1] Crear `src/interpretacion/convertir.test.ts` cubriendo cada unidad aceptada, el default de centímetros y kilos, y el peso total dividido por la cantidad (FR-002)
- [ ] T031 [US1] Crear `src/interpretacion/completar.ts`: completa medidas y peso faltantes **únicamente** desde el catálogo, marca cada dato completado como `estimado` indicando qué entrada usó, y resuelve la capacidad en litros como **clave de búsqueda** y no como medida ("tambor de 200 litros" no da medidas: da una entrada)
- [ ] T032 [US1] Crear `src/interpretacion/faltantes.ts` que asigne los tres motivos y **bloquee la consolidación de la lista entera** mientras algún campo esté faltante. La cantidad nunca se completa: si falta, se pregunta (FR-004)
- [ ] T033 [P] [US1] Crear `src/interpretacion/interpretacion.test.ts`: AC-01 (dos ítems, 40 y 15, cajas de 600×400×300 mm y 12 kg), AC-02 (medidas del catálogo marcadas como estimadas indicando la entrada), AC-03 (sin entrada: campos vacíos con motivo, cero valores escritos, consolidación bloqueada), AC-18 (medidas estimadas y peso faltante con otro motivo en el mismo ítem), AC-22 (sin cantidad: se pide y bloquea), AC-11 (una frase de corrido con varios ítems, sin pedir que se reformatee)
- [ ] T034 [US1] Crear `src/cliente-modelo/interpretar.ts` que llame a `/api/interpretar` y traduzca los códigos de respuesta. **No conoce al proveedor**: ni su nombre, ni su URL, ni su forma de error

### Interfaz de usuario

- [ ] T035 [P] [US1] Crear `src/interfaz/CampoDescripcion.tsx`: un único campo de texto libre, sin exigir formato ni una línea por ítem, con estado de carga visible mientras interpreta y sin necesidad de cancelar (FR-001, FR-026)
- [ ] T036 [US1] Crear `src/interfaz/ListaItems.tsx` que muestre, por campo, si es declarado, estimado —con **qué entrada del catálogo** lo completó— o faltante con su motivo, de modo que se distinga a simple vista (FR-003, SC-011)
- [ ] T037 [US1] Agregar en `src/interfaz/CampoDescripcion.tsx` el manejo de falla: la descripción tipeada **queda intacta**, el mensaje dice que la falla es del proveedor y no un error de interpretación, se ofrece reintentar y la lista ya cargada no se toca (FR-026)
- [ ] T038 [US1] Crear `src/App.tsx` y `src/main.tsx` cableando el campo y la lista

### Seguridad y precisión

- [ ] T039 [US1] Crear `tests/seguridad/bundle.test.ts` que **arme su propio bundle** (no dependa de un `dist/` que puede estar viejo) y busque la clave, la URL del proveedor y el encabezado de autorización **reales**. No busca patrones genéricos como `sk-`: dan falsos positivos con el código de React (AC-19, SC-010)
- [ ] T040 [US1] Crear `eval/dataset/` con las 50 descripciones etiquetadas: por ítem, la cantidad, qué campos declara la descripción con su valor, qué campos están ausentes y qué entrada del catálogo corresponde. La separación entre declarados y ausentes es la que permite calcular SC-003 y SC-004 **sin promediarlos**
- [ ] T041 [US1] Crear `eval/correr-eval.ts` que llame al proveedor real y reporte SC-003 (≥ 90% de campos declarados bien extraídos, donde "bien extraído" es **coincidencia exacta tras convertir a milímetros y gramos enteros, sin tolerancia**, y un campo declarado que quede marcado como estimado cuenta como error), SC-004 (100% de los ausentes estimados o preguntados; completar con un valor que no salga del catálogo **cuenta como error**) y SC-005 (≥ 90% de ítems en la entrada correcta), **los tres por separado**. Fuera de la suite: es el único comando que gasta plata
- [ ] T042 [US1] Medir `max_tokens` sobre el dataset y dejarlo escrito junto al prompt en `server/modelo/deepseek.ts`, con la medición que lo produjo anotada en `eval/ultimo-informe.md` (research.md §2)

**Checkpoint**: una descripción se convierte en lista auditable. **Entrega valor sola**: el pedido
queda estructurado aunque todavía no se consolide nada.

---

## Phase 4: User Story 2 — Saber si entra y en qué contenedor (P2)

**Goal**: con una lista firme y un contenedor elegido, el aprovechamiento de volumen y de peso, qué
entró y qué quedó afuera con su motivo.

**Independent Test**: con listas de ítems armadas a mano y los 10 escenarios, sin pasar por la
interpretación: para cada carga, el informe y que ninguna disposición dispare el validador.

**Qué parte es independiente de US1**: T043 a T068 —el acomodador, el validador y los escenarios—
no necesitan nada de US1: se prueban con listas armadas a mano. Las tres tareas de interfaz de esta
fase, **T065, T069 y T070, sí** necesitan `src/App.tsx`, que se crea en T038. Con una sola persona
no cambia nada; con dos, T043-T068 arrancan sin esperar a US1.

**⚠️ Test primero, en su propio commit**: todas las tareas de `src/acomodador/` y `src/validador/`
de esta fase. El commit del test dice que falla hasta el siguiente.

### Acomodador

- [ ] T043 [US2] Crear `src/acomodador/orientacion.test.ts`: las 6 permutaciones de eje están disponibles para un bulto sin marcas (research.md §4)
- [ ] T044 [US2] Crear `src/acomodador/orientacion.ts` enumerando las 6 permutaciones
- [ ] T045 [US2] Crear `src/acomodador/apoyo.test.ts`: el área de apoyo es la intersección en xy entre la cara inferior y las caras superiores que están **exactamente a la misma z**; pasa con exactamente 80% (el criterio es "al menos"); la comparación es `area_apoyada × 100 ≥ 80 × area_base`, **multiplicando y no dividiendo**, para no redondear
- [ ] T046 [US2] Crear `src/acomodador/apoyo.ts` con el área de contacto y el 80%
- [ ] T047 [US2] Crear `src/acomodador/peso.test.ts`: el reparto entre dos apoyos es proporcional al área de contacto; `ceil` entero como `(a*b + c - 1) / c`; la suma de las partes **nunca** es menor que el peso repartido; la carga se acumula por toda la pila resolviendo en orden inverso al de colocación; **cero punto flotante** (FR-027)
- [ ] T048 [US2] Crear `src/acomodador/peso.ts` con el reparto entero por área
- [ ] T049 [US2] Crear `src/acomodador/orden.test.ts`: los no apilables van **al final**; después, volumen decreciente; a igual volumen, primero el que **aguanta más peso encima** (CONTEXTO.md, ya medido: no hay que re-investigarlo)
- [ ] T050 [US2] Crear `src/acomodador/orden.ts` con ese orden de colocación
- [ ] T051 [US2] Crear `src/acomodador/acomodar.test.ts`: AC-07 (excede volumen: coloca lo que entra, el resto con motivo "volumen"), AC-15 (excede peso: los colocados no superan la carga útil, el resto con motivo "peso"), AC-23 (excede por volumen **y** por peso: el motivo que se informa es **"peso"**), AC-13 (usa medidas interiores y carga útil de la entrada elegida, y recalcula al cambiar de contenedor)
- [ ] T052 [US2] Crear `src/acomodador/acomodar.ts` con la firma `acomodar(items: Item[], contenedor: Contenedor): Disposicion` —el contenedor entra por argumento, no se lee del catálogo—, en aritmética entera, con el origen en la esquina del fondo abajo a la izquierda, x el largo hacia la puerta, y el ancho, z el alto, e intervalos semiabiertos `[inicio, inicio + medida)` para que dos bultos pegados no se superpongan
- [ ] T053 [US2] Crear `src/acomodador/informe.ts` con el aprovechamiento de **volumen** (Σ cajas envolventes de los colocados ÷ volumen interior, en mm³ enteros) y de **peso** (Σ pesos colocados ÷ carga útil, en gramos), los bultos afuera **no** entran en ningún numerador (research.md §8)
- [ ] T054 [P] [US2] Crear `src/acomodador/determinismo.test.ts`: la misma entrada dos veces da la misma disposición bulto por bulto —posición, orientación y orden de colocación—, **sin tolerancia**; y **la misma carga con los ítems en otro orden en la lista da la misma disposición** (FR-009, AC-21)

### Validador (cuentas escritas de nuevo, sin importar nada del acomodador)

- [ ] T055 [US2] Crear `src/validador/solapamiento.test.ts`: hay superposición solo si los intervalos se solapan en **más de 0 mm** en los tres ejes; compartir cara, arista o vértice **no** es superposición
- [ ] T056 [US2] Crear `src/validador/solapamiento.ts`
- [ ] T057 [US2] Crear `src/validador/limites.test.ts`: ningún bulto sale del contenedor, con el contenedor recibido por argumento y uno de prueba inventado en el test, sin leer el catálogo
- [ ] T058 [US2] Crear `src/validador/limites.ts`
- [ ] T059 [US2] Crear `src/validador/apoyo.test.ts`: el 80% de apoyo sobre el piso o sobre bultos **cargados antes en la secuencia**, verificado sobre **cada prefijo** y no solo sobre la disposición final (AC-24)
- [ ] T060 [US2] Crear `src/validador/apoyo.ts` con su propio 80% y su propio cálculo de área: **no importa nada de `src/acomodador/`**
- [ ] T061 [US2] Crear `src/validador/peso.test.ts`: la carga máxima total no se supera, y el reparto por la pila se verifica con la cuenta propia del validador
- [ ] T062 [US2] Crear `src/validador/peso.ts` con su propia fórmula de reparto
- [ ] T063 [US2] Crear `src/validador/validar.test.ts`: una disposición con superposición, una con un bulto flotando y una que excede la carga útil son rechazadas (FR-010)
- [ ] T064 [US2] Crear `src/validador/validar.ts` con la firma `validar(disposicion: Disposicion, contenedor: Contenedor): ResultadoValidacion` —el mismo contenedor que recibió el acomodador, por argumento— que junte las cuatro verificaciones y devuelva el motivo del rechazo (FR-010)
- [ ] T065 [US2] Hacer bloqueante la validación en `src/App.tsx`: una disposición que no pasa **no se renderiza ni se guarda** (FR-011)

### Escenarios e interfaz

- [ ] T066 [P] [US2] Crear `escenarios/escenarios.ts` con los 10 escenarios de referencia, todos los campos en `declarado` para que no dependan del catálogo ni del modelo, cubriendo carga mixta, frágiles, tambores y cajas, no apilables y sobrecarga de peso
- [ ] T067 [US2] Crear `escenarios/validador.test.ts`: ninguna de las 10 disposiciones dispara el validador, y cualquier violación **hace fallar el build** (AC-10, FR-011, SC-006)
- [ ] T068 [US2] Crear `escenarios/tiempo.test.ts` que mida la consolidación de los 10 escenarios y **falle** si el p95 supera los 5 s para hasta 200 bultos, medido **de a una consolidación por vez, con 10 corridas por escenario** (SC-007). El número **no** se reporta acá: se reporta en T091b, sobre los escenarios ya calibrados
- [ ] T069 [P] [US2] Crear `src/interfaz/SelectorContenedor.tsx` con 20', 40' y 40' high cube, usando las medidas interiores y la carga útil (max payload, no el peso bruto) de la entrada elegida, y que recalcule al cambiar (FR-007, AC-13)
- [ ] T070 [US2] Crear `src/interfaz/InformeConsolidacion.tsx` con los dos aprovechamientos, los colocados y los que quedaron afuera **cada uno con su motivo** (FR-012)

- [ ] T070b [US2] Agregar en `src/interfaz/InformeConsolidacion.tsx` los estados sin disposición de FR-028: lista de ítems vacía; ningún bulto colocado, con todos los motivos a la vista; y disposición rechazada por el validador, informando el rechazo y conservando la lista intacta. **Nunca una pantalla en blanco** (FR-028)

**Checkpoint**: se responde "¿entra?" con un informe defendible, y ninguna disposición imposible
llega a la pantalla.

---

## Phase 5: User Story 3 — Ver la disposición en 3D y recorrerla (P3)

**Goal**: girar y recorrer el contenedor, distinguir tipos por color y ver cómo se carga bulto por
bulto.

**Independent Test**: en el navegador, sobre las disposiciones ya calculadas de los 10 escenarios:
navegación, colores, control deslizante y fluidez con 200 bultos.

**Depende de US2**: necesita una disposición calculada. El spec lo dice explícitamente; no es una
historia independiente y no se finge que lo sea.

- [ ] T071 [US3] Crear `src/vista3d/paleta.ts` con los 12 colores, la conversión sRGB → OKLab y el umbral de distancia **declarado como constante al lado de la paleta** (research.md §9)
- [ ] T072 [US3] Crear `src/vista3d/paleta.test.ts` que falle si **algún par** de los 12 queda por debajo del umbral (SC-015)
- [ ] T073 [US3] Generar la paleta, medir la distancia mínima entre pares y **declarar el umbral con el número medido**, anotándolo en `eval/ultimo-informe.md` con el comando. Si los 12 colores no alcanzan un umbral razonable, **se informa y lo decide el usuario**: no se afloja el umbral hasta que el test pase, ni se cambia la cantidad de colores, que la fija el PRD
- [ ] T074 [US3] Crear `src/vista3d/instanciado.ts` con una malla instanciada por tipo de ítem, y **aristas por instancia** para que dos bultos del mismo tipo se distingan dentro de una pila sin tocar el color —que es lo que mide SC-015 (research.md §10)
- [ ] T075 [US3] Crear `src/vista3d/color-por-item.ts` que ate el color al **ítem** y no a su posición en la lista, de modo que eliminar un ítem no corra los colores de los demás (AC-09, FR-013)
- [ ] T076 [P] [US3] Crear `src/vista3d/color-por-item.test.ts`: consolidar dos veces conserva el color de cada tipo, también después de eliminar otro ítem (AC-09)
- [ ] T077 [US3] Crear `src/vista3d/recorrido.ts`: en la posición k se ven **exactamente** los primeros k bultos de la secuencia, con k=0 mostrando el contenedor vacío (FR-014, AC-08)
- [ ] T078 [P] [US3] Crear `src/vista3d/recorrido.test.ts`: para todo k, el prefijo tiene exactamente k bultos y **ninguno flotando** —cada bulto elevado del prefijo tiene su 80% de apoyo dentro del mismo prefijo (AC-08, AC-24)
- [ ] T079 [US3] Crear `src/vista3d/Escena.tsx` con la cámara navegable —girar, acercar y desplazar— y las paredes del contenedor
- [ ] T080 [US3] Crear `src/interfaz/Avisos.tsx` con los dos avisos: colores reciclados cuando hay más de 12 tipos (FR-013) y rendimiento no garantizado por encima de 200 bultos, **sin dejar de mostrar la disposición ni recortar la carga** (FR-024)
- [ ] T081 [US3] Medir SC-009 **en el navegador**: 200 bultos en 12 tipos, 10 segundos de órbita continua en Chrome de escritorio, reportando el **mínimo sostenido** y no el promedio, y anotando CPU, GPU, resolución y versión de Chrome en `eval/ultimo-informe.md` (research.md §15)

- [ ] T080b [US3] Agregar en `src/vista3d/Escena.tsx` el caso de FR-028 en que el navegador no puede inicializar la vista 3D: se informa y **el informe de FR-012 sigue estando disponible**, en vez de perder la consolidación entera (FR-028)

**Checkpoint**: un número se volvió una instrucción de carga.

---

## Phase 6: User Story 4 — Corregir lo interpretado y declarar las restricciones (P4)

**Goal**: editar lo que el sistema estimó mal, agregar y eliminar ítems, y marcar por ítem lo que el
catálogo no puede saber.

**Independent Test**: sobre una lista ya interpretada: se edita un campo estimado, se agregan y
eliminan ítems, se ponen las marcas y se verifica que la disposición las respeta.

**⚠️ Test primero, en su propio commit** en las tareas de `src/acomodador/` y `src/validador/`.

- [ ] T082 [US4] Crear `src/interfaz/EdicionItem.tsx` para editar, agregar y eliminar ítems y campos antes de consolidar; editar un campo `estimado` lo pasa a `declarado` y **dispara el recálculo** de la disposición (FR-006, AC-12)
- [ ] T083 [P] [US4] Crear `src/interfaz/EdicionItem.test.tsx`: un campo estimado editado pierde la marca y queda declarado (AC-12); no hay transición hacia `estimado` desde la edición
- [ ] T084 [US4] Crear `src/interfaz/EditorDeMarcas.tsx` —no `MarcasItem.tsx`, que chocaría con el tipo `MarcasItem`— con las tres marcas: no apilable y orientación obligatoria **precargadas del catálogo cuando la entrada las trae, señaladas como tales y editables**; peso máximo admitido encima **siempre declarado por el usuario**, nunca precargado (FR-008)
- [ ] T085 [US4] Crear `src/interpretacion/fusionar.ts`: una segunda descripción **agrega sus ítems al final**; los que ya estaban conservan sus valores, el estado de cada campo, sus marcas y su color. **No** se reemplaza la lista, **no** se fusionan ítems por parecido de nombre y **no** se reinterpreta lo cargado (FR-025)
- [ ] T086 [P] [US4] Crear `src/interpretacion/fusionar.test.ts`: con un campo corregido a mano y una marca cargada, una segunda descripción agrega al final y el ítem corregido conserva valor, marca y color (FR-025)
- [ ] T087 [US4] Crear `src/acomodador/marcas.test.ts`: AC-04 (ningún bulto queda apoyado sobre un no apilable), AC-05 (con orientación obligatoria, el alto declarado coincide con el alto final, quedando solo las 2 rotaciones horizontales), AC-06 (sobre un ítem que admite 50 kg no se apoyan más de 50 kg, **contando lo que se propaga por toda la pila**)
- [ ] T088 [US4] Extender `src/acomodador/orden.ts` y `src/acomodador/acomodar.ts` para respetar las tres marcas
- [ ] T089 [US4] Crear `src/validador/marcas.test.ts`: las mismas tres verificaciones, con la cuenta propia del validador
- [ ] T090 [US4] Extender `src/validador/validar.ts` para verificar las tres marcas por su cuenta

**Checkpoint**: las cuatro historias funcionan. **El acomodador queda completo: desde acá se congela.**

---

## Phase 7: Polish & Cross-Cutting

- [ ] T091 Calibrar los 10 escenarios de `escenarios/escenarios.ts` a ~115% de lo que entra —salvo los que miden sobrecarga de peso, que traen ~115% de la carga útil— y verificar que **ningún tipo de ítem por separado alcance** para llenar el contenedor. Calibrados a 115% del volumen interno quedaban tipos enteros afuera (CONTEXTO.md)
- [ ] T091b Correr `escenarios/tiempo.test.ts` **sobre los escenarios ya calibrados** por T091 y anotar el p95 en `eval/ultimo-informe.md` con la fecha y el comando. Antes de calibrar, el número nace viejo (SC-007)
- [ ] T091c Medir SC-001 una vez a mano: de descripción tipeada a disposición visible en 3D, cronometrando que sean menos de dos minutos sin cargar ninguna planilla, y anotarlo en `eval/ultimo-informe.md`
- [ ] T092 Registrar `escenarios/linea-base.json` con las 10 disposiciones, **una única vez**, según [contracts/linea-base.md](./contracts/linea-base.md)
- [ ] T093 Crear `escenarios/linea-base.test.ts` que recalcule y compare bulto por bulto —identidad `(itemId, indice)`, posición, orientación y orden de colocación— **sin tolerancia**, rompiendo el build ante cualquier diferencia. **Sin snapshots de Vitest**: `vitest -u` reescribiría la línea base sin que nadie lo decida. Entra en el **mismo commit** que T092: un test que pasa porque el archivo falta es un `.skip` disfrazado (AC-14, SC-008, FR-018)
- [ ] T094 [P] Correr `npm run eval` y escribir `eval/ultimo-informe.md` con SC-002 a SC-005, midiendo el p95 de la interpretación con **5 llamadas en paralelo** y dejando esa concurrencia escrita al lado del número, más la fecha y el comando de cada número
- [ ] T095 [P] Verificar `npm test` en un clon limpio, **sin red y sin `.env`**, y dejar constancia del resultado en `eval/ultimo-informe.md` con la fecha y el comando (AC-16, SC-012)
- [ ] T096 [P] Recorrer `README.md` como si fuera la primera vez y confirmar que la aplicación arranca sin leer código, con cero nombres de variable que haya que descubrir (SC-013, AC-28)
- [ ] T097 Verificar a mano en el navegador lo que ningún test cubre sobre `src/vista3d/` (`Escena.tsx`, `paleta.ts`, `recorrido.ts`): que los 12 colores se distingan de verdad en pantalla, que dos bultos de la misma pila se distingan, y que el control deslizante no muestre ningún bulto flotando en ningún paso. La vista 3D se verifica en el navegador, no solo con tests

---

## ⚠️ Por qué la línea base se congela recién en Phase 7

La tentación es registrarla al terminar US2, cuando el acomodador ya calcula. **Sería un error**:
US4 extiende el orden de colocación para respetar las tres marcas de FR-008, y eso **cambia las
disposiciones**. Una línea base registrada antes de US4 se rompería al día siguiente, y la regla
dice que se registra una sola vez y que **no se toca para que algo pase**.

De ahí el orden: los escenarios se usan como fixtures desde T066, se calibran en T091 con el
acomodador completo, y recién entonces se congelan. Hasta ese momento `linea-base.json` **no
existe**, y su test tampoco.

---

## Dependencies & Execution Order

### Entre fases

- **Phase 1 (Setup)**: sin dependencias.
- **Phase 2 (Foundational)**: depende de Setup. **Bloquea todas las historias.**
- **Phase 3 (US1)**: depende de Foundational.
- **Phase 4 (US2)**: depende de Foundational. T043-T068 **no dependen de US1**: se prueban con listas armadas a mano. T065, T069 y T070 son interfaz y dependen de T038 (US1).
- **Phase 5 (US3)**: depende de **US2**. Necesita una disposición calculada.
- **Phase 6 (US4)**: depende de US1 (una lista que editar) y de US2 (una disposición que respete las marcas).
- **Phase 7 (Polish)**: depende de US4, por lo de la línea base.

### Dentro de cada historia

- En `acomodador/` y `validador/`: **el test se commitea antes del código**. Es la única excepción a
  commitear en verde y dura un commit.
- Tipos antes que cuentas; cuentas antes que interfaz.
- El validador se escribe **después** del acomodador pero **sin mirarlo**: si comparte una
  constante, `tests/arquitectura/imports.test.ts` rompe el build.

### Lo que se puede hacer en paralelo

- Todo Setup salvo T001.
- T009, T010 y T011 (tres archivos de tipos distintos).
- Dentro de US1: T019 con T020; los tests marcados [P].
- **US1 y US2 en paralelo**, si hay dos personas: US2 no necesita la interpretación.
- **El acomodador y el validador por personas distintas es lo ideal**: la duplicación es a propósito
  (Principio II), y dos cabezas distintas la hacen más genuina que una sola escribiendo las dos.

---

## Implementation Strategy

### MVP: US1 sola

Phase 1 → Phase 2 → Phase 3, y parar a validar. El pedido queda estructurado y auditable: la parte
que hace que la herramienta se use, porque tipear cincuenta filas en una planilla es exactamente lo
que hoy hace que nadie use las alternativas.

### Entrega incremental

1. Setup + Foundational → el catálogo existe y la frontera está custodiada.
2. + US1 → se describe y se ve la lista (**MVP**).
3. + US2 → se responde "¿entra?" con informe.
4. + US3 → se ve y se recorre en 3D.
5. + US4 → se corrige y se declaran las restricciones.
6. + Polish → se congela la línea base y se reportan los números medidos.

---

## Notes

- `[P]` = archivos distintos, sin dependencias pendientes.
- Un commit por cambio con sentido propio; una tarea suele dar más de uno.
- **El commit que solo tilda una línea de este archivo no existe**: el tick viaja en el commit del
  paso que lo completa.
- La historia no se reescribe: nada de `amend`, `reset` sobre lo pusheado, `rebase` ni
  `push --force`. Lo que sale mal se deshace con un commit nuevo.
- Los identificadores RF/RNF/AC/FR **no se renumeran**: los tests y los comentarios los citan.
- Antes de cerrar cada tarea, verificar que no viole ninguno de los seis principios. Una violación
  es un bug, no una decisión de diseño pendiente.
