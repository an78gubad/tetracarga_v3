# Feature Specification: Consolidación de carga en contenedor desde una descripción en castellano, con vista 3D

**Feature Branch**: `main` (directorio del spec: `specs/001-consolidacion-carga-3d`)

**Created**: 2026-10-28

**Status**: Draft

**Input**: User description: "Generá el spec a partir del PRD en @PRD.md" (PRD-001v5)

> Trazabilidad: cada requerimiento y criterio de este spec cita el identificador del PRD del que
> sale (RF/RNF/AC). Los identificadores del PRD no se renumeran. Si algo de este spec contradice
> al PRD, gana el PRD.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Describir la carga hablando normalmente y ver la lista (Priority: P1)

El encargado de depósito llega con el pedido ya armado y escribe de corrido, en un único campo,
lo que tiene que despachar: "40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros". El
sistema le devuelve la lista de ítems con nombre, cantidad y medidas, distinguiendo a simple
vista lo que él declaró de lo que el sistema completó desde el catálogo, y mostrando de qué
entrada del catálogo salió cada dato completado. Lo que no puede completar se lo pregunta, con el
motivo.

**Why this priority**: Es la parte que hace que la herramienta se use. Tipear cincuenta filas en
una planilla es exactamente lo que hoy hace que nadie use las alternativas. Sin esta historia no
hay nada que consolidar, y por sí sola ya entrega valor: el pedido queda estructurado y auditable.

**Independent Test**: Se prueba con el dataset de 50 descripciones etiquetadas, verificando campo
por campo qué se extrajo, qué quedó estimado con su entrada de catálogo y qué se preguntó, sin
necesidad de consolidar ni de renderizar nada.

**Acceptance Scenarios**:

1. **Dado** "40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros", **cuando** se
   interpreta, **entonces** la lista tiene dos ítems con cantidades 40 y 15, y las cajas miden
   600 × 400 × 300 mm y pesan 12 kg cada una. (AC-01)
2. **Dado** "15 tambores de 200 litros" sin medidas y existiendo esa entrada en el catálogo,
   **cuando** se interpreta, **entonces** las medidas se completan con esa entrada, quedan
   marcadas como estimadas y la interfaz indica qué entrada se usó. (AC-02)
3. **Dado** un ítem sin entrada en el catálogo y sin medidas, **cuando** se interpreta,
   **entonces** sus campos quedan vacíos con el motivo, el sistema pide el dato, no escribe
   ningún valor y la consolidación queda bloqueada. (AC-03)
4. **Dada** una entrada de catálogo que trae medidas y no trae peso, **cuando** se interpreta,
   **entonces** las medidas quedan estimadas, el peso queda faltante con otro motivo y la
   consolidación queda bloqueada. (AC-18)
5. **Dado** "cajas de 60x40x30 de 12 kilos", sin cantidad, **cuando** se interpreta, **entonces**
   la cantidad queda faltante, el sistema la pide y la consolidación queda bloqueada. (AC-22)
6. **Dada** una descripción escrita de corrido, con varios ítems en una misma frase y sin
   formato, **cuando** se envía, **entonces** se interpreta sin pedir que se reformatee ni que se
   separen los ítems. (AC-11)
7. **Dado** que la interpretación propone un id de catálogo que no existe, **cuando** se
   interpreta, **entonces** la propuesta se descarta entera, en lugar de completarse con algo
   parecido. (AC-17)

---

### User Story 2 - Saber si entra y en qué contenedor (Priority: P2)

Con la lista lista, el usuario elige el contenedor —20', 40' o 40' high cube— y pide consolidar.
Obtiene el aprovechamiento de volumen y de peso, qué bultos entraron y cuáles quedaron afuera,
cada uno con su motivo. Con eso decide qué contenedor reservar y puede justificarlo ante quien
firma la reserva.

**Why this priority**: Es la decisión que el usuario viene a tomar. Depende de la lista de la
historia 1, pero se prueba por separado partiendo de una lista de ítems fija.

**Independent Test**: Se prueba con los 10 escenarios de referencia y con listas de ítems
armadas a mano, sin pasar por la interpretación: para cada carga se verifica el informe
(colocados, afuera, motivo, aprovechamiento) y que ninguna disposición dispare el validador.

**Acceptance Scenarios**:

1. **Dado** un contenedor elegido, **cuando** se consolida, **entonces** usa las medidas
   internas y la carga útil de esa entrada del catálogo; y al cambiarlo, recalcula con las del
   nuevo. (AC-13)
2. **Dada** una carga cuyo volumen excede al del contenedor, **cuando** se consolida,
   **entonces** coloca lo que entra y lista los restantes con el motivo "volumen". (AC-07)
3. **Dada** una carga cuyo peso total supera la carga máxima, **cuando** se consolida,
   **entonces** los bultos colocados no la superan y los restantes se listan con el motivo
   "peso". (AC-15)
4. **Dado** un bulto que no entra por volumen y que además superaría la carga máxima, **cuando**
   se consolida, **entonces** queda afuera con el motivo "peso". (AC-23)
5. **Dada** la misma entrada dos veces, **cuando** se consolida, **entonces** las dos
   disposiciones coinciden bulto por bulto, sin tolerancia. (AC-21)
6. **Dado** cada uno de los 10 escenarios de referencia, **cuando** se consolida en integración
   continua, **entonces** la disposición coincide bulto por bulto con la congelada —posición,
   orientación y orden de colocación— y cualquier diferencia rompe el build. (AC-14)
7. **Dado** el set de 10 escenarios, **cuando** corre la suite en integración continua,
   **entonces** ninguna disposición dispara el validador y cualquier violación hace fallar el
   build. (AC-10)

---

### User Story 3 - Ver la disposición en 3D y recorrer la carga bulto por bulto (Priority: P3)

El usuario gira y recorre el contenedor en 3D, distingue los tipos de ítem por color y mueve un
control deslizante para ver cómo se va cargando, bulto por bulto, en el orden en que hay que
cargarlo en el depósito.

**Why this priority**: Es lo que convierte un número en una instrucción de carga y lo que hace
defendible la reserva ante un tercero. Necesita una disposición ya calculada, así que va después
de la historia 2.

**Independent Test**: Se prueba en el navegador sobre disposiciones ya calculadas —las de los 10
escenarios—: navegación, colores, control deslizante y fluidez con 200 bultos.

**Acceptance Scenarios**:

1. **Dada** una disposición de N bultos, **cuando** el control deslizante está en la posición k,
   **entonces** se ven exactamente los primeros k bultos de la secuencia. (AC-08)
2. **Dado** un mismo conjunto de ítems, **cuando** se consolida dos veces, **entonces** cada
   tipo conserva su color, también después de eliminar otro ítem de la lista; y dada una carga de
   dos tipos, los dos colores son distinguibles. (AC-09)
3. **Dada** una pila de bultos del mismo tipo, **cuando** se la mira en la vista 3D, **entonces**
   cada bulto se distingue de los otros de su misma pila. (RF-10)
4. **Dada** una disposición de N bultos, **cuando** se toma cualquier prefijo de la secuencia,
   **entonces** cada bulto elevado del prefijo tiene al menos el 80% de su base apoyada sobre el
   piso o sobre bultos del mismo prefijo, de modo que ningún paso del recorrido muestra bultos
   flotando. (AC-24)

---

### User Story 4 - Corregir lo interpretado y declarar las restricciones de cada ítem (Priority: P4)

El usuario ajusta la lista antes de consolidar: edita una medida que el sistema estimó mal,
agrega el ítem que faltaba, elimina uno que no va, y marca por ítem lo que el catálogo no puede
saber: que no es apilable, que tiene una orientación obligatoria, y cuánto peso admite encima.

**Why this priority**: Hace confiable al resto —es la vía por la que se corrige una entrada de
catálogo mal asociada— y sin las marcas por ítem hay cargas cuya disposición válida no se puede
expresar. Va al final porque todas las historias anteriores entregan valor sin ella.

**Independent Test**: Se prueba sobre una lista ya interpretada: se edita un campo estimado, se
agregan y eliminan ítems, se ponen las marcas y se verifica que la disposición resultante las
respeta.

**Acceptance Scenarios**:

1. **Dado** un campo marcado como estimado, **cuando** el usuario lo edita, **entonces** pierde
   la marca, queda como declarado y la disposición se recalcula. (AC-12)
2. **Dado** un ítem marcado como no apilable, **cuando** se consolida, **entonces** ningún otro
   bulto queda apoyado sobre él. (AC-04)
3. **Dado** un ítem con orientación obligatoria, **cuando** se consolida, **entonces** su altura
   declarada coincide con su altura final. (AC-05)
4. **Dado** un ítem que admite 50 kg encima, **cuando** se consolida, **entonces** el peso
   apoyado sobre él no supera los 50 kg, contando lo que se propaga hacia abajo por toda la
   pila. (AC-06)
5. **Dada** una entrada de catálogo que trae "no apilable" u "orientación obligatoria",
   **cuando** se interpreta, **entonces** esas marcas vienen precargadas, señaladas como
   provenientes del catálogo y editables; el peso máximo admitido encima nunca viene precargado.
   (RF-06)

---

### Edge Cases

- **Descripción demasiado larga**: con 2.001 caracteres, el pedido se rechaza con un mensaje que
  dice el límite y no se le pasa ninguna llamada al proveedor del modelo. (AC-25)
- **Respuesta que no cumple el esquema de ítems**: no se muestra ningún ítem de esa respuesta y se
  trata como una respuesta vacía. (AC-26)
- **Respuesta vacía del proveedor**: se vuelve a preguntar hasta un número acotado de veces.
  (AC-20)
- **Límite de velocidad del proveedor**: se reintenta. **Credenciales inválidas o saldo agotado**:
  no se reintenta y se informa. (AC-20)
- **Entrada de catálogo parcial**: medidas sí, peso no → medidas estimadas, peso faltante con otro
  motivo, consolidación bloqueada. (AC-18)
- **Ítem sin cantidad**: la cantidad nunca se completa; se pregunta y bloquea. (AC-22, RF-03)
- **Ítem que no está en el catálogo**: se pregunta todo, no se escribe ningún valor. (AC-03)
- **Carga que excede por volumen y por peso al mismo tiempo**: el motivo que se informa es
  "peso". (AC-23)
- **Un solo bulto que no entra en ninguna orientación en el contenedor elegido**: queda afuera con
  su motivo, sin romper la consolidación del resto. (RF-09)
- **Eliminar un ítem de la lista**: los colores de los demás tipos no se corren. (AC-09)
- **Cambiar de contenedor con la carga ya consolidada**: se recalcula con las medidas y la carga
  útil del nuevo. (AC-13)
- **Carga de 200 bultos**: se consolida dentro del tiempo objetivo y la vista 3D se mantiene
  fluida. (RNF-04, RNF-06)
- **Sin red y sin credenciales**: la suite completa de tests pasa contra una implementación de
  prueba de la interfaz del modelo. (AC-16)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001** (RF-01): El sistema MUST aceptar la descripción de la carga en lenguaje natural, en
  castellano, en un único campo de texto libre, sin exigir formato, separadores ni una línea por
  ítem.
- **FR-002** (RF-02): El sistema MUST convertir esa descripción en una lista de ítems con nombre,
  cantidad, largo, ancho, alto y peso unitario en kilos. Una medida sin unidad está en
  centímetros, "AxBxC" se lee largo × ancho × alto, y un peso declarado para todo el ítem se
  divide por la cantidad.
- **FR-003** (RF-03): El sistema MUST completar las medidas y el peso faltantes únicamente desde
  el catálogo versionado en el repositorio, marcando cada dato completado como estimado e
  indicando qué entrada del catálogo usó. MUST NOT completar ningún dato con un valor que no
  salga del catálogo.
- **FR-004** (RF-03): Lo que el sistema no puede completar MUST preguntárselo al usuario,
  distinguiendo si el ítem no está en el catálogo o si la entrada existe pero no trae ese dato, y
  MUST bloquear la consolidación hasta que el dato esté. La cantidad nunca se completa: si falta,
  se pregunta.
- **FR-005** (RF-03, AC-17): El sistema MUST verificar contra el catálogo toda entrada propuesta
  para un ítem; si el id propuesto no existe, MUST descartar la propuesta entera y MUST NOT
  buscar ni usar una entrada parecida.
- **FR-006** (RF-04): El usuario MUST poder editar, agregar y eliminar ítems y campos antes de
  consolidar. Editar un campo estimado lo convierte en declarado y dispara el recálculo de la
  disposición.
- **FR-007** (RF-05): El usuario MUST poder elegir el contenedor entre 20', 40' y 40' high cube.
  El sistema MUST usar las medidas internas y la carga máxima de esa entrada del catálogo, y la
  carga máxima MUST ser la carga útil (max payload), no el peso bruto.
- **FR-008** (RF-06): El usuario MUST poder marcar por ítem: no apilable, orientación obligatoria
  y peso máximo admitido encima. Las dos primeras MUST venir precargadas del catálogo cuando la
  entrada las trae, señaladas como tales y editables; el peso máximo admitido encima MUST
  declararlo siempre el usuario.
- **FR-009** (RF-07, AC-21): El sistema MUST calcular la disposición de forma determinística y
  sin intervención del modelo de lenguaje: la misma entrada da la misma disposición bulto por
  bulto —posición, orientación y orden de colocación—, sin tolerancia. Las longitudes son enteras
  en milímetros, el origen está en la esquina del fondo abajo a la izquierda, x es el largo hacia
  la puerta, y el ancho y z el alto, y la orientación dice qué medida del bulto queda sobre cada
  eje.
- **FR-010** (RF-08): El sistema MUST validar toda disposición antes de mostrarla: sin
  superposiciones entre bultos, dentro de los límites del contenedor, con al menos el 80% de la
  base de cada bulto elevado apoyada sobre el piso o sobre bultos cargados antes en la secuencia,
  sin superar la carga máxima total y respetando las marcas de FR-008. La validación MUST llevar
  sus propias cuentas, sin compartir código ni constantes con el cálculo de la disposición.
- **FR-011** (RNF-03): La validación de FR-010 MUST ser bloqueante: una disposición que no pasa
  MUST NOT renderizarse ni guardarse, y cualquier violación detectada sobre los escenarios de
  referencia MUST hacer fallar el build.
- **FR-012** (RF-09): El sistema MUST informar el aprovechamiento de volumen y de peso, los
  bultos colocados y los que quedaron afuera, cada uno con su motivo: "peso" si colocarlo
  superaba la carga máxima; si no, "volumen".
- **FR-013** (RF-10): El sistema MUST renderizar la disposición en 3D navegable y pintar cada
  tipo de ítem con un color fijo, atado al ítem y no a su posición en la lista. Dos tipos
  cualesquiera MUST distinguirse a simple vista y dos bultos del mismo tipo MUST distinguirse uno
  de otro dentro de una pila.
- **FR-014** (RF-10, AC-08): El usuario MUST poder recorrer la secuencia de carga bulto por
  bulto; en la posición k del recorrido se ven exactamente los primeros k bultos de la secuencia.
- **FR-015** (RNF-07): La credencial del proveedor del modelo MUST NOT estar en el código ni
  llegar al navegador —ni la clave, ni la URL del proveedor, ni ningún encabezado de
  autorización—: vive del lado del servidor y el cliente alcanza al modelo únicamente a través de
  un intermediario propio.
- **FR-016** (RNF-08): El acceso al modelo MUST pasar por una interfaz propia que distinga una
  falla del proveedor de un error de interpretación y reintente las fallas transitorias un número
  acotado de veces. Un límite de velocidad y una respuesta vacía son transitorios; credenciales
  inválidas o saldo agotado no lo son y MUST NOT reintentarse. Cambiar de proveedor MUST ser
  escribir otra implementación de esa interfaz.
- **FR-017** (RNF-09): El intermediario MUST rechazar, sin llamar al proveedor, las descripciones
  de más de 2.000 caracteres, con un mensaje que dice el límite; MUST acotar la longitud de la
  respuesta que le pide al modelo; y MUST descartar entera toda respuesta que no cumpla el
  esquema de ítems, tratándola como una respuesta vacía.
- **FR-018** (RNF-05): Las disposiciones de los 10 escenarios de referencia MUST quedar
  congeladas en un archivo versionado junto a ellos, registrado una única vez cuando los
  escenarios estén cerrados. La suite MUST recalcularlas y compararlas bulto por bulto
  —posición, orientación y orden de colocación— y cualquier diferencia MUST hacer fallar el
  build. La comparación MUST NOT depender de una línea base que se reescriba sola con un flag de
  actualización.
- **FR-019** (Los tres artefactos versionados): El catálogo de objetos y contenedores, el dataset
  de 50 descripciones etiquetadas y la línea base de las 10 disposiciones MUST existir
  versionados en el repositorio como primer entregable. Toda entrada del catálogo MUST nombrar la
  ficha exacta de la que sale; ninguna MUST tener medidas inventadas. Los tres MUST modificarse
  solo por decisión explícita del usuario, nunca para que algo pase.
- **FR-020** (AC-16): La suite completa de tests MUST pasar sin red y sin credenciales, contra una
  implementación de prueba de la interfaz del modelo. La evaluación de precisión que llama al
  proveedor real MUST correr aparte.

### Key Entities *(include if feature involves data)*

- **Descripción**: el texto libre que escribe el usuario, de hasta 2.000 caracteres. Es la única
  entrada del sistema.
- **Ítem**: un tipo de bulto del pedido, con nombre, cantidad, largo, ancho, alto, peso unitario,
  sus marcas de FR-008 y un color fijo. Cada campo tiene estado: declarado, estimado (con la
  entrada de catálogo de origen) o faltante (con el motivo por el que falta).
- **Entrada de catálogo de objeto**: medidas y, cuando existe, peso y marcas de un objeto
  conocido, con la fuente de la que salen. Único origen de los datos completados.
- **Entrada de catálogo de contenedor**: medidas internas, carga útil y tara de un 20', un 40' o
  un 40' high cube, con la ficha de la que salen.
- **Bulto**: una unidad física de un ítem. Un ítem de cantidad 40 son 40 bultos.
- **Disposición**: el resultado de la consolidación: la secuencia ordenada de colocaciones, cada
  una con su bulto, su posición en milímetros enteros y su orientación.
- **Informe de consolidación**: aprovechamiento de volumen y de peso, bultos colocados y bultos
  afuera con su motivo.
- **Escenario de referencia**: una carga y un contenedor fijos, de los 10 congelados, usados para
  comparar contra la línea base y medir tiempos.
- **Caso del dataset**: una descripción con sus etiquetas: por ítem, la cantidad, qué campos
  declara la descripción con su valor, y qué entrada del catálogo corresponde.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001** (Objetivos): Una carga descrita hablando normalmente queda consolidada y visible en
  3D en menos de dos minutos, sin cargar ninguna planilla.
- **SC-002** (RNF-01): La interpretación de una descripción responde en menos de 10 s (p95), y la
  medición declara la concurrencia con la que se tomó.
- **SC-003** (RNF-02 a): Sobre el dataset de 50 descripciones etiquetadas, al menos el 90% de los
  campos declarados en la descripción se extraen correctamente.
- **SC-004** (RNF-02 b): Sobre el mismo dataset, el 100% de los campos ausentes en la descripción
  quedan marcados como estimados o preguntados. Un campo ausente completado con un valor que no
  salga del catálogo cuenta como error.
- **SC-005** (RNF-02 c): Sobre el mismo dataset, al menos el 90% de los ítems quedan asociados a
  la entrada correcta del catálogo. SC-003, SC-004 y SC-005 no se promedian entre sí.
- **SC-006** (RNF-03): Cero disposiciones inválidas mostradas o guardadas.
- **SC-007** (RNF-04): La consolidación de hasta 200 bultos se resuelve en menos de 5 s (p95),
  medida sobre los 10 escenarios.
- **SC-008** (RNF-05, AC-14): Los 10 escenarios coinciden bulto por bulto con la línea base
  congelada, sin tolerancia.
- **SC-009** (RNF-06): La vista 3D sostiene al menos 30 fps con 200 bultos en Chrome de
  escritorio, medido con la herramienta de rendimiento del navegador.
- **SC-010** (AC-19): En lo que llega al navegador hay cero apariciones de la clave del
  proveedor, de la URL del proveedor y de cualquier encabezado de autorización.
- **SC-011** (RF-03): El 100% de los campos completados por el sistema están marcados como
  estimados e indican la entrada del catálogo de la que salen; cero campos completados sin
  fuente.
- **SC-012** (AC-16): La suite completa de tests pasa sin red y sin credenciales.

## Assumptions

- Se trabaja sobre un contenedor a la vez, elegido por el usuario entre 20', 40' y 40' high cube;
  no se optimiza la distribución entre varios contenedores.
- Los bultos van directo al contenedor: no hay armado de pallets. Un pallet cargado se describe
  como un bulto, y su altura la declara el usuario.
- Las geometrías no rectangulares —tambores, bidones, IBC— se modelan y se dibujan por su caja
  envolvente.
- No hay cuentas de usuario, login ni persistencia en servidor: cada consolidación vive en la
  sesión del usuario.
- La interfaz y el vocabulario son en castellano; se usa "consolidación", no "cubicaje" ni
  "packing".
- La puerta del contenedor es más chica que su interior y no se modela: un bulto puede entrar en
  el interior y no pasar por la puerta. Si hace falta, es un requerimiento nuevo.
- Ninguna entrada del catálogo trae peso propio ni marcas de FR-008 precargadas si su ficha no las
  declara: en esos casos el dato se pregunta.
- El objetivo de medición de la vista 3D es Chrome de escritorio.
- El límite de 2.000 caracteres de la descripción, el tamaño del dataset (50 descripciones) y la
  cantidad de escenarios de referencia (10) son los del PRD y no se ajustan para que una métrica
  llegue.
- Los escenarios de referencia traen más carga de la que entra y ningún tipo de ítem por separado
  alcanza para llenar el contenedor.

## Out of Scope

- Armado de pallets.
- Optimizar la distribución entre varios contenedores.
- Geometrías no rectangulares más allá de su caja envolvente.
- Cuentas de usuario, login y persistencia en servidor.
- Integración con ERP o WMS, y cotización de flete.
- Peso por eje, normativa de pesos y dimensiones, y orden de descarga por destino.
- Centro de gravedad y distribución de peso.
- Agregar o editar entradas del catálogo desde la interfaz.
- Mejorar el aprovechamiento de volumen por encima de la línea base registrada.
- Limitar la cantidad de pedidos por cliente en el intermediario; el costo se acota con el tope de
  gasto configurado en el proveedor.

## Dependencies and Risks

- **Dependencia**: un proveedor de modelo de lenguaje, alcanzable solo detrás de la interfaz de
  FR-016.
- **Dependencia**: medidas internas y cargas máximas oficiales de contenedores, de fichas
  publicadas por una única naviera, sin mezclar fuentes.
- **Riesgo**: el ítem queda asociado a la entrada equivocada del catálogo → FR-003 muestra cuál
  usó, FR-006 la hace corregible y SC-005 lo mide.
- **Riesgo**: se completa una medida que no existe en el catálogo → SC-004 lo verifica en binario.
- **Riesgo**: un tercero usa el intermediario público y agota el saldo → FR-017 acota el costo de
  cada pedido y el tope de gasto del proveedor acota el total.
- **Riesgo**: una falla intermitente del proveedor se confunde con un error de interpretación →
  FR-016.
- **Riesgo**: el acomodo es NP-duro y puede comerse el proyecto → se congela contra la línea base
  de FR-018 apenas los escenarios estén cerrados; mejorarlo queda fuera de alcance.
- **Riesgo**: la vista 3D es lo más incierto y SC-009 es el número que puede morder → el costo de
  dibujo crece con la cantidad de tipos de ítem, no de bultos, y el tope de 200 bultos queda
  alineado con el de la consolidación.
- **Deuda declarada**: el 80% de apoyo de FR-010 es un criterio propio, sin fuente.
- **Deuda declarada**: el aprovechamiento de volumen no se compara contra ningún óptimo; FR-018
  detecta que cambió, no si es bueno.
