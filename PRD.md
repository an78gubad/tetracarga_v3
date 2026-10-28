# PRD-001v9: Tetracarga — describís una carga en castellano y la ves consolidada en un contenedor, en 3D

## Contexto y Problema
Antes de exportar hay que responder si la mercadería entra en un contenedor y cómo acomodarla.
Hoy en una PyME eso se resuelve a ojo, con una planilla o con la experiencia del que carga, y el
error se descubre tarde: se contrata un 40' cuando alcanzaba un 20', o se llega al día de la
consolidación y no entra. Las herramientas que existen son caras, están en inglés y exigen tipear
cada bulto a mano —que es la parte que hace que nadie las use.

Personas: lo usa el encargado de depósito o el despachante que tiene que decidir qué contenedor
reservar. Llega con el pedido ya armado, con poco tiempo y sin ninguna intención de cargar
cincuenta filas en una planilla; necesita saber si va un 20' o un 40' y poder justificarlo ante
quien firma la reserva.

## Objetivos
Que una carga descrita hablando normalmente salga consolidada y visible en 3D en menos de dos
minutos, sin cargar una planilla. Que ninguna disposición mostrada sea físicamente imposible. Que
el usuario distinga siempre lo que declaró de lo que el sistema completó por él, y pueda ver de
dónde salió cada dato completado.

## Requerimientos Funcionales
- RF-01: Aceptar una descripción de la carga en lenguaje natural, en un único campo de texto libre.
- RF-02: Convertir esa descripción en una lista de ítems con nombre, cantidad, largo, ancho, alto y
  peso unitario en kilos. Sin unidad, una medida **entera** está en centímetros ("60x40x30") y una
  **con decimales** está en metros ("1,80 de alto"): es como habla la gente, y no hay ningún caso
  real de "1,80 centímetros" en carga. "AxBxC" se lee largo × ancho × alto, y un peso declarado
  para todo el ítem se divide por la cantidad.
- RF-03: Completar medidas y peso faltantes únicamente desde el catálogo versionado en el
  repositorio, marcando cada dato estimado e indicando qué entrada usó. Lo que no puede completar
  se lo pregunta al usuario, distinguiendo si el ítem no está en el catálogo o si la entrada existe
  pero no trae ese dato. La cantidad nunca se completa: si falta, se pregunta.
- RF-04: Permitir editar, agregar y eliminar ítems y campos antes de consolidar. Editar un campo
  estimado lo convierte en declarado.
- RF-05: Permitir elegir el contenedor entre 20', 40' y 40' high cube, con medidas internas y carga
  máxima tomadas del catálogo. La carga máxima es la carga útil (max payload), no el peso bruto.
- RF-06: Permitir marcar por ítem: no apilable, orientación obligatoria y peso máximo admitido
  encima. Las dos primeras vienen precargadas del catálogo cuando la entrada las trae, marcadas
  como tales y editables; el peso máximo encima lo declara siempre el usuario.
- RF-07: Calcular la disposición con un algoritmo determinístico, sin intervención del modelo de
  lenguaje. Las longitudes son enteras en milímetros. Ejes: origen en la esquina del fondo, abajo a
  la izquierda; x es el largo hacia la puerta, y el ancho, z el alto. La orientación dice qué medida
  del bulto queda sobre cada eje.
- RF-08: Validar toda disposición antes de mostrarla: sin superposiciones, dentro de los límites
  del contenedor, con al menos el 80% de la base de cada bulto elevado apoyada sobre el piso o sobre
  bultos cargados antes en la secuencia, sin superar la carga máxima total y respetando RF-06. El
  validador no comparte código con el acomodador, ni siquiera constantes.
- RF-09: Informar el aprovechamiento de volumen y de peso, los bultos colocados y los que quedaron
  afuera, cada uno con su motivo, en este orden de precedencia: **peso** si colocarlo superaba la
  carga máxima; **restricción** si ninguna posición es válida por su tamaño o por sus marcas de
  RF-06; **volumen** si no quedaba lugar. Decir "volumen" de un bulto bloqueado por una marca
  manda a reservar un contenedor más grande, que no resuelve nada.
- RF-10: Renderizar la disposición en 3D navegable, permitir recorrer la secuencia de carga bulto
  por bulto, y pintar cada tipo de ítem con un color fijo, atado al ítem y no a su posición en la
  lista. Dos tipos cualesquiera se distinguen a simple vista, y dos bultos del mismo tipo se
  distinguen uno de otro dentro de una pila.

## Requerimientos No Funcionales
- RNF-01: La interpretación responde en < 20 s (p95), con los reintentos incluidos. La medición
  declara su concurrencia. Eran 10 s y se subió después de medir: ver Deuda declarada.
- RNF-02: Sobre el dataset de 50 descripciones etiquetadas, en tres métricas que no se promedian
  entre sí:
  - (a) campos declarados en la descripción y extraídos correctamente: ≥ 90%;
  - (b) campos ausentes en la descripción, marcados como estimado o preguntados: 100%. Un campo
    ausente completado con un valor que no salga del catálogo cuenta como error;
  - (c) ítems asociados a la entrada correcta del catálogo: ≥ 90%.
- RNF-03: 0 disposiciones inválidas: el validador de RF-08 es bloqueante y lo que no pasa no se
  renderiza ni se guarda.
- RNF-04: La consolidación de hasta 200 bultos se resuelve en < 5 s (p95), medida sobre los 10
  escenarios.
- RNF-05: La disposición de los 10 escenarios está congelada en un archivo versionado junto a
  ellos, registrado una única vez cuando los escenarios estén cerrados. La suite las recalcula y
  las compara bulto por bulto —posición, orientación y orden de colocación—; cualquier diferencia
  hace fallar el build.
- RNF-06: La vista 3D sostiene ≥ 30 fps con 200 bultos, el mismo tope que admite RNF-04, en Chrome
  de escritorio y medido con la herramienta de rendimiento del navegador. El costo de dibujo crece
  con la cantidad de tipos de ítem, no de bultos.
- RNF-07: La API key del modelo no está en el código ni llega al navegador: vive del lado del
  servidor y el cliente lo alcanza a través de un proxy propio.
- RNF-08: El acceso al modelo pasa por una interfaz propia; cambiar de proveedor es escribir otra
  implementación de esa interfaz. Esa interfaz distingue una falla del proveedor de un error de
  interpretación y reintenta las transitorias un número acotado de veces. Un límite de velocidad es
  transitorio; credenciales inválidas o saldo agotado no lo son.
- RNF-09: El proxy rechaza, sin llamar al proveedor, las descripciones de más de 2.000
  caracteres, y acota la longitud de la respuesta que le pide al modelo. Una respuesta cuya forma
  no cumple el esquema de ítems —que no es una lista de ítems con los campos esperados— se
  descarta entera. El esquema exige además cantidad entera ≥ 1, y medidas y peso > 0: un valor
  fuera de rango no descarta la respuesta, se resuelve ítem por ítem, y ni el signo ni el valor se
  corrigen para salvarlo.
- RNF-10: El repositorio se clona y la aplicación se corre siguiendo solo el README, sin leer
  código: el README dice los comandos de desarrollo, de tests y del eval, y `.env.example` nombra
  todas las variables de entorno que hacen falta, sin valores.
- RNF-11: El proxy limita los pedidos por IP y rechaza, sin llamar al proveedor, los que exceden
  10 por minuto o 60 por hora, con un mensaje que dice el límite.
- RNF-12: El proxy no registra la descripción que escribe el usuario, ni la respuesta del modelo.
  Registra el código de resultado, la duración y la cantidad de intentos. Lo que la gente escribe
  dice qué despacha y cuánto: es dato comercial de su empresa, no material de depuración.
- RNF-13: El proxy rechaza los pedidos cuyo origen no sea el de la aplicación. No frena a alguien
  con una herramienta de línea de comandos, pero sí a una página ajena que quiera gastar el saldo
  desde el navegador de sus visitantes.
- RNF-14: Por encima de 5.000 bultos el sistema pide confirmación antes de consolidar, advirtiendo
  que va a tardar, y la consolidación no bloquea la interfaz. No se rechaza ni se recorta la carga
  (RNF-04).
- RNF-15: El despliegue no está completo sin el tope de gasto configurado en el proveedor, y el
  README lo nombra como un paso. Es lo único que acota el daño en pesos; RNF-11 solo acota la
  velocidad.

## Los tres artefactos versionados
Primer entregable: sin ellos, RNF-02 y RNF-05 son decorativos.

- **Catálogo** de objetos y contenedores, único origen de datos completados. Toda entrada con
  fuente; ninguna con medidas inventadas.
- **Dataset** de 50 descripciones, etiquetadas por ítem con la cantidad, qué campos declara la
  descripción con su valor, y qué entrada del catálogo corresponde. Sin casos ambiguos.
- **Línea base** de las 10 disposiciones. Cada escenario trae más carga de la que entra y ningún
  tipo de ítem por separado alcanza para llenar el contenedor.

## Criterios de Aceptación
- AC-01 (RF-02): Dado "40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros", cuando se
  interpreta, entonces la lista tiene dos ítems con cantidades 40 y 15, y las cajas miden
  600 × 400 × 300 mm y pesan 12 kg.
- AC-02 (RF-03): Dado "15 tambores de 200 litros" sin medidas, y existiendo esa entrada en el
  catálogo, cuando se interpreta, entonces se completan con esa entrada, quedan marcados como
  estimados y la interfaz indica qué entrada se usó.
- AC-03 (RF-03): Dado un ítem sin entrada en el catálogo y sin medidas, cuando se interpreta,
  entonces sus campos quedan vacíos con el motivo, el sistema pide el dato, no escribe ningún valor
  y la consolidación queda bloqueada.
- AC-04 (RF-06, RF-08): Dado un ítem marcado como no apilable, cuando se consolida, entonces ningún
  otro bulto queda apoyado sobre él.
- AC-05 (RF-06, RF-08): Dado un ítem con orientación obligatoria, cuando se consolida, entonces su
  altura declarada coincide con su altura final.
- AC-06 (RF-06, RF-08): Dado un ítem que admite 50 kg encima, cuando se consolida, entonces el peso
  apoyado sobre él no supera los 50 kg, contando lo que se propaga hacia abajo por toda la pila.
- AC-07 (RF-09): Dada una carga cuyo volumen excede al del contenedor, cuando se consolida,
  entonces coloca lo que entra y lista los restantes con el motivo "volumen".
- AC-08 (RF-10): Dada una disposición de N bultos, cuando el control deslizante está en la posición
  k, entonces se ven exactamente los primeros k bultos de la secuencia.
- AC-09 (RF-10): Dado un mismo conjunto de ítems, cuando se consolida dos veces, entonces cada tipo
  conserva su color, también después de eliminar otro ítem de la lista; y dada una carga de dos
  tipos, los dos colores son distinguibles.
- AC-10 (RNF-03): Dado el set de 10 escenarios, cuando corre la suite en CI, entonces ninguna
  disposición dispara el validador y cualquier violación hace fallar el build.
- AC-11 (RF-01): Dada una descripción escrita de corrido, con varios ítems en una misma frase y sin
  formato, cuando se envía, entonces se interpreta sin pedir que se reformatee ni se separen.
- AC-12 (RF-04): Dado un campo marcado como estimado, cuando el usuario lo edita, entonces pierde
  la marca, queda como declarado y la disposición se recalcula.
- AC-13 (RF-05): Dado un contenedor elegido, cuando se consolida, entonces usa las medidas y la
  carga máxima de esa entrada del catálogo; y al cambiarlo, recalcula con las del nuevo.
- AC-14 (RF-07, RNF-05): Dado cada uno de los 10 escenarios, cuando se consolida en CI, entonces la
  disposición coincide bulto por bulto con la congelada, y cualquier diferencia rompe el build.
- AC-15 (RF-08): Dada una carga cuyo peso total supera la carga máxima, cuando se consolida,
  entonces los bultos colocados no la superan y los restantes se listan con el motivo "peso".
- AC-16 (RNF-08): Dada la suite de tests, cuando corre en CI sin red y sin API key, entonces pasa
  completa usando una implementación de prueba de la interfaz del modelo. El eval de RNF-02 llama
  al proveedor real y corre aparte.
- AC-17 (RF-03): Dado que el modelo propone un id de catálogo que no existe, cuando se interpreta,
  entonces la propuesta se descarta entera, en lugar de completarse con algo parecido.
- AC-18 (RF-03): Dada una entrada de catálogo que trae medidas y no trae peso, cuando se
  interpreta, entonces las medidas quedan estimadas, el peso queda faltante con otro motivo y la
  consolidación queda bloqueada.
- AC-19 (RNF-07): Dado el bundle del cliente, cuando se lo inspecciona, entonces no contiene la API
  key, ni la URL del proveedor, ni ningún encabezado de autorización.
- AC-20 (RNF-08): Dado que el proveedor devuelve una respuesta vacía, cuando se interpreta,
  entonces se vuelve a preguntar hasta un número acotado de veces; dado un límite de velocidad,
  reintenta; y dado un error de autenticación o de saldo agotado, no reintenta.
- AC-21 (RF-07): Dada la misma entrada dos veces, cuando se consolida, entonces las dos
  disposiciones coinciden bulto por bulto, sin tolerancia.
- AC-22 (RF-03): Dado "cajas de 60x40x30 de 12 kilos", sin cantidad, cuando se interpreta, entonces
  la cantidad queda faltante, el sistema la pide y la consolidación queda bloqueada.
- AC-23 (RF-09): Dado un bulto que no entra por volumen y que además superaría la carga máxima,
  cuando se consolida, entonces queda afuera con el motivo "peso".
- AC-24 (RF-08, RF-10): Dada una disposición de N bultos, cuando se toma cualquier prefijo de la
  secuencia, entonces cada bulto elevado del prefijo tiene al menos el 80% de su base apoyada sobre
  el piso o sobre bultos del mismo prefijo.
- AC-25 (RNF-09): Dada una descripción de 2.001 caracteres, cuando se envía, entonces el proxy la
  rechaza con un mensaje que dice el límite y la implementación del modelo no recibe ninguna
  llamada.
- AC-26 (RNF-09): Dada una respuesta del modelo cuya forma no cumple el esquema de ítems, cuando
  se interpreta, entonces no se muestra ningún ítem de esa respuesta y se trata como la respuesta
  vacía de AC-20.
- AC-27 (RF-02, RNF-09): Dado "-5 cajas de 60x40x30", cuando se interpreta, entonces la cantidad
  no queda en 5 ni en -5: el valor queda fuera del rango del esquema, esa cantidad queda faltante
  con ese motivo y el sistema la pide, sin descartar los demás ítems de la respuesta y sin
  reintentar.
- AC-28 (RNF-10): Dado el repositorio recién clonado y sin `.env`, cuando se siguen los pasos del
  README, entonces la aplicación arranca, o dice exactamente qué variable de `.env.example` falta,
  sin que haya que leer el código para averiguar su nombre.
- AC-29 (RNF-11): Dadas 10 interpretaciones de la misma IP dentro de un minuto, cuando llega la
  número 11, entonces el proxy la rechaza con un mensaje que dice el límite y la implementación
  del modelo no recibe ninguna llamada.
- AC-30 (RF-09): Dado un bulto que no entra en ninguna orientación en el contenedor vacío, o uno
  cuyas marcas de RF-06 lo bloquean en toda posición, cuando se consolida, entonces queda afuera
  con el motivo "restricción" y no con "volumen".
- AC-31 (RNF-12): Dada una interpretación, cuando se registra lo que pasó, entonces la descripción
  del usuario no aparece en ningún registro.
- AC-32 (RNF-13): Dado un pedido con un origen distinto del de la aplicación, cuando llega al
  proxy, entonces se rechaza sin llamar al proveedor.
- AC-33 (RNF-14): Dada una carga de más de 5.000 bultos, cuando se pide consolidar, entonces el
  sistema pide confirmación, y al confirmar la interfaz sigue respondiendo mientras calcula.

## Stack
TypeScript en todo el proyecto sobre Node 22 LTS, React con Vite, Three.js con geometría
instanciada, Vitest. Acomodador y validador escritos a mano, sin librería de packing. Una función
serverless propia en Vercel como único punto que habla con el proveedor del modelo. DeepSeek como
proveedor inicial, detrás de la interfaz de RNF-08.

## Fuera de Alcance
- Armado de pallets: los bultos van directo al contenedor.
- Optimizar entre varios contenedores; se trabaja sobre uno a la vez.
- Geometrías no rectangulares: los cilindros se modelan y se dibujan por su caja envolvente.
- Cuentas de usuario, login y persistencia en servidor.
- Integración con ERP o WMS, y cotización de flete.
- Peso por eje, normativa de pesos y dimensiones, y orden de descarga por destino.
- Centro de gravedad y distribución de peso.
- Agregar o editar entradas del catálogo desde la interfaz; el catálogo se toca en el repositorio.
- Mejorar el aprovechamiento de volumen por encima de la línea base registrada.
- Accesibilidad para quien no distingue colores: el tipo de ítem se comunica solo por color en la
  vista 3D. La lista lo sigue identificando por nombre, así que la información existe. Es una
  decisión, no un olvido: la distancia perceptual que exige RF-10 modela visión tricromática.
- Navegadores distintos de Chrome de escritorio, y teléfonos. En otros probablemente ande, pero no
  se mide ni se garantiza.
- Representar en la vista 3D los bultos que quedaron afuera: no tienen posición, así que dibujarlos
  sería inventarles una. Se listan en el informe de RF-09 con su motivo.

## Deuda declarada
- El 80% de apoyo de RF-08 es un criterio propio sin fuente.
- El aprovechamiento de volumen no se compara contra ningún óptimo: RNF-05 detecta que cambió, no
  si es bueno.
- El límite por IP de RNF-11 cuenta en la memoria de cada instancia del proxy y se reinicia con
  cada arranque en frío: el tope efectivo es más laxo que el declarado y no frena a un tercero
  distribuido. El total se sigue acotando con el tope de gasto configurado en el proveedor.
- La secuencia de carga no se verifica como **ejecutable en el depósito**: el 80% de apoyo evita
  que los bultos floten, pero nada impide que uno quede tapado por otro puesto antes. Exigirlo
  cambiaría el acomodador y obligaría a volver a congelar la línea base.
- Que dos bultos del mismo tipo se distingan dentro de una pila (RF-10) se resuelve con aristas por
  bulto y **se verifica a ojo, sin criterio automatizado**. A diferencia de la distancia entre
  colores de la paleta, acá inventar una métrica sería inventar un número que no mide lo que
  importa.
- **El p95 de RNF-01 lo fija el proveedor, no el código.** Medido el 2026-10-28 con 150 llamadas:
  `deepseek-flash` da mediana 3,2 s y p95 16,5 s, con el 13% de las llamadas por encima de 10 s;
  `deepseek-v4-pro` es peor, mediana 9,2 s y p95 22,6 s con el 45% por encima. Los 10 s originales
  no eran alcanzables con ninguno de los dos, así que RNF-01 pasó a 20 s. **La mediana sigue siendo
  3,2 s**: lo que el número tolera es el peor 5%, no la espera habitual. Si algún día el proveedor
  mejora su cola, el requerimiento puede volver a bajar; si empeora, hay que volver a medir antes
  de culpar al código.
- Un decimal sin unidad se lee en metros por heurística, no por certeza. "1,2 x 0,8 x 1 metro" con
  la unidad dicha una sola vez al final puede hacer que el "1" entero se lea en centímetros. El
  caso común está cubierto; este no.

## Diferido
Existe solo si todo lo anterior está terminado. No tiene criterios de aceptación y nada depende de
esto.

- Estética del Tetris original: tipografía de píxeles, grilla sobre el piso del contenedor, caída
  animada al colocar cada bulto y un recuadro "NEXT" con el bulto siguiente.

## Riesgos y Dependencias
- El modelo asocia el ítem a la entrada equivocada → RF-03 muestra cuál usó, RF-04 la hace
  corregible y RNF-02 (c) lo mide.
- El modelo completa una medida que no existe en el catálogo → RNF-02 (b) lo verifica en binario.
- Un tercero usa el proxy público y agota el saldo → RNF-09 acota el costo de cada pedido,
  RNF-11 la cantidad de pedidos por IP, y el tope de gasto del proveedor, el total.
- El proveedor falla de manera intermitente y se confunde con un error de interpretación → RNF-08.
- El acomodo es NP-duro y puede comerse el proyecto → se congela contra la línea base de RNF-05
  apenas los escenarios estén cerrados; mejorarlo queda fuera de alcance.
- La vista 3D es lo más incierto y RNF-06 es el número que puede morder → geometría instanciada, un
  draw call por tipo y el tope alineado con el de la consolidación.
- Dependencias: proveedor de modelo de lenguaje detrás de la interfaz de RNF-08, y medidas internas
  y cargas máximas oficiales de contenedores.
