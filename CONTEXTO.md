# Contexto de Tetracarga

El porqué de las decisiones que más tientan a "mejorar" mientras se construye. El qué está en
`PRD.md` y no se repite acá; si algo de acá lo contradice, manda el PRD.

## Por qué

| Dónde | Por qué |
|---|---|
| El catálogo decide qué se completa (RF-03) | Si el que decide "esto lo reconozco" es el modelo, AC-03 nunca da falso: el modelo siempre reconoce y siempre contesta un número con cara de seguridad. No se arregla con prompt |
| El código verifica el id que propone el modelo (AC-17) | El matcheo de frase a entrada es difuso. Se acota mostrando qué entrada usó y midiendo el acierto sobre el dataset |
| Validador sin código compartido (RF-08) | Si compartieran código no podría detectar errores del acomodador: duplicar las cuentas es a propósito |
| Apoyo contra bultos cargados antes (RF-08) | El control deslizante de RF-10 muestra prefijos de la secuencia: sin esto, un prefijo puede mostrar bultos flotando |
| Color por tipo y distinción entre bultos en RF-10, no en Diferido | Sin ellos un contenedor lleno es un bloque indistinguible, que es lo que la vista 3D tiene que resolver |
| Color atado al ítem (RF-10) | Con RF-04 se eliminan ítems: si el color sale de la posición, se corren los de todos los demás |
| Peso máximo encima declarado siempre por el usuario (RF-06) | Depende del contenido, no del tipo de bulto: el catálogo no puede saberlo |
| Función serverless (Stack) | Una aplicación puramente de navegador no puede cumplir RNF-07 |
| Centro de gravedad fuera de alcance | Restringirlo obliga a reabrir el acomodador, que queda congelado contra la línea base de RNF-05 |
| La medición de RNF-01 declara su concurrencia | Medida con 5 llamadas en paralelo, el p95 queda por arriba del que ve una persona sola |
| Vocabulario: "consolidación" | En código y en pantalla. "Cubicaje" suena a cilindrada de motor; tampoco "packing" |

## Acomodador

Orden de colocación: los no apilables al final; después, volumen decreciente; a igual
volumen, primero el que aguanta más peso encima. Los escenarios de la línea base van
calibrados a ~115% de lo que entra (el volumen de la carga ronda 1,15 veces el que el
acomodador coloca), salvo los que miden la sobrecarga de peso, que traen ~115% de la carga
útil. Calibrados a 115% del volumen interno quedaban tipos enteros afuera: el acomodador
llena entre 50% y 80%.

Por qué, medido en una versión anterior. **No repetir esta investigación.**

- **Ninguna librería sirve.** Todas resuelven geometría pura; ninguna modela gravedad, apoyo
  debajo, apilabilidad, frágiles ni orientación obligatoria por ítem.
- **El orden de colocación pesa más que el algoritmo.** Colocar los no apilables al final
  en vez de por volumen llevó el promedio de carga mixta de 69,2% a 82,3%, y un escenario
  de tambores y cajas de 45,1% a 91,0%: los no apilables puestos primero tapizan el piso y
  nada puede apoyarse encima.
- **A igual volumen, primero el que aguanta más peso encima.** Un frágil abajo le pone techo
  a toda la pila. Llevó el escenario de frágiles de 33,5% a 70,9%.
- **Mandar los frágiles al final empeora.** Cuando son el grueso de la carga quedan afuera
  enteros: en un escenario de heladeras, de 51 colocadas a 3.
- **Los escenarios se calibran antes de congelar.** Muy sobrecargados solo miden qué tipo
  gana el orden de colocación: quedan tipos enteros con cero colocados.

## Catálogo

- **Las fuentes de contenedores no coinciden al milímetro.** Cada naviera publica medidas y
  cargas útiles algo distintas y avisa que varían por unidad: cada entrada nombra la ficha
  exacta de la que sale.
- **Los contenedores salen todos de Maersk, sin mezclar navieras.** Fichas "Container
  specifications" de su guía de contenedores secos, que cierran: carga útil + tara = peso bruto.
  Se descartó un PDF de Maersk Sudáfrica de 2014 con cifras distintas (2350 mm de ancho).
- **La puerta es más chica que el interior y no se modela.** 2340 mm de ancho; 2280 mm de alto
  en 20' y 40', 2585 mm en el high cube. Un bulto puede entrar en el interior y no pasar por la
  puerta. El PRD no lo pide; si hace falta, es un requerimiento nuevo.
- **Ningún objeto trae peso.** El de tambores, IBC y bidones depende del contenido. Se buscó
  ficha de fabricante para objetos de peso propio (bolsas de cemento de 50 kg, de harina o
  azúcar de 25 kg) y no hay: las medidas de bolsa solo aparecen en minoristas, que no cuentan
  como fuente. El peso se pregunta siempre.
- **Los pallets traen solo la base.** Como carga van cargados: el alto depende de lo que llevan
  y se pregunta. La base del ARLOG sale de fabricantes porque la IRAM 10016 no es pública.
- **Big bag afuera.** La única ficha da la medida nominal de la bolsa vacía, y llena se deforma.
- **Ninguna marca de RF-06 precargada.** Ninguna ficha dice "no apilable" ni "este lado arriba".

## Lo que se midió en v3

Medido entre el 2026-10-28 y el cierre de las cuatro historias, contra el proveedor real y el
navegador. Los números completos, con su fecha y su comando, están en `eval/ultimo-informe.md`.
**No repetir estas mediciones para confirmarlas**: si una contradice la realidad, volver a medir
y reemplazarla, no promediarla con la vieja.

- **El p95 de la interpretación lo fija el proveedor, no el código.** `deepseek-flash`: mediana
  3,2 s, p95 16,5 s, 13% de las llamadas por encima de 10 s. `deepseek-v4-pro` es **peor**:
  mediana 9,2 s, p95 22,6 s, 45% por encima. Por eso RNF-01 pasó de 10 s a 20 s. Cambiar de
  modelo para acelerar ya se probó y no sirve.
- **El acomodador llena entre 36% y 90%** según el escenario, medido sobre los 10 congelados. El
  rango de 50% a 80% que decía la versión anterior era más angosto. Los frágiles quedan abajo
  porque los topes de peso le ponen techo a las pilas, que es lo que ese escenario mide.
- **El caso caro del acomodador no es la sobrecarga.** 200 bultos en un contenedor donde entran
  18 tardan 15 ms, porque con el contenedor lleno quedan pocas candidatas. El caso caro es
  **muchos bultos que sí entran**: 200 en un 40' high cube tardan 139 ms, 400 tardan 783 y 800
  tardan 4.536. El crecimiento ronda n^2,5 y los 5 s se cruzan cerca de los 900 bultos.
- **El acomodo no es monótono.** En `carga-mixta`, subir la carga de 465 a 510 bultos **baja** los
  colocados de 459 a 445, y a 495 los baja a 372: las cajas grandes tapizan el piso y desplazan a
  las chicas. Las cantidades de los escenarios salieron de probar y medir, no de una fórmula.
- **La distancia mínima de la paleta de 12 es 0,1848 en OKLab**, con el umbral declarado en 0,15.
  Salió de optimizar tono, luminancia y croma por color: una búsqueda por patrones daba 0,1658.
  Si hace falta cambiar un color, hay que volver a optimizar los 12, no mover el umbral.
- **La vista 3D sostiene 59,9 fps con 200 bultos en 12 tipos**, en una placa integrada. El número
  tocó el techo de sincronización vertical, así que el margen real sobre los 30 fps es mayor que
  2x y esa medición no dice cuánto.
- **La salida del modelo no es proporcional a la cantidad de ítems.** Un caso de 2 ítems dio 1.383
  tokens y uno de 3 dio 346. Calcular `max_tokens` como "tokens por ítem × tope de ítems" da un
  número con cara de preciso sobre una proporcionalidad que no existe.

## Errores que ya se cometieron

Todos salieron de un test o de una medición, no de leer código. Quedan acá para que no se
repitan, porque cada uno fue invisible hasta que algo lo tocó.

- **Implementar más estricto que el spec.** La validación de forma rechazaba una medida sin
  unidad, aunque RF-02 dice que una medida sin unidad está en centímetros: era un caso previsto.
  Y como la forma se valida por respuesta entera, una medida sin unidad mataba todos los ítems de
  esa descripción. Fueron 32 de 56 fallas del primer eval, y bajaron SC-003 a 68,3%. **Antes de
  culpar al modelo, verificar que el código no sea más exigente que el requerimiento.**
- **Verificar dos de tres marcas.** RF-08 pide respetar las tres marcas de RF-06 y el validador
  solo miraba no apilable y el tope de peso. Era invisible porque el acomodador sí respetaba la
  orientación, así que ninguna disposición real la violaba.
- **Medir el artefacto equivocado.** El test de bundle construía con `NODE_ENV=test`, que es lo
  que pone vitest, y Vite deriva `isProduction` de ahí antes que de `mode`. Así que las
  verificaciones de la credencial, la URL y el encabezado miraban un bundle de desarrollo.
- **Confiar en que el `.env` llega solo.** Vite y vitest lo cargan pero **no tocan `process.env`**:
  solo exponen al bundle las que llevan prefijo `VITE_`, que es justo lo que acá no se quiere. Con
  el archivo lleno, el intermediario respondía "proveedor-no-configurado".
- **Un presupuesto de tiempo sin tope por intento.** Los 10 s se verificaban al decidir si
  arrancar otro intento, pero una llamada lenta se pasaba igual: el máximo medido fue 23,9 s.
- **Un escenario que medía otra cosa que su nombre.** `sobrecarga-peso` se quedaba en el 84% de la
  carga útil porque el volumen se agotaba primero: medía volumen con otro nombre.
- **Un test guardián que nunca vio una violación.** Los tres —arquitectura, bundle y paleta— se
  probaron al revés, rompiéndolos a propósito. El de arquitectura y el de bundle **no detectaban
  nada** hasta que se los arregló. Un guardián sin esa prueba no prueba nada.
- **Creer que la línea base cubre todas las reglas.** Reordenar las orientaciones rompe los 10
  escenarios, pero **aflojar el apoyo de 80% a 70% no cambia ninguna disposición**: las candidatas
  salen de esquinas de bultos ya puestos, así que el apoyo tiende a ser total o nulo. La línea base
  guarda la disposición en conjunto; las reglas individuales las guardan los tests unitarios.
