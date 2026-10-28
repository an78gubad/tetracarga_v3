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
