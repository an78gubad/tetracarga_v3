# Último informe de evaluación

## Medición preliminar del acomodador

**Fecha**: 2026-10-28
**Comando**: test de medición temporal sobre `src/acomodador/acomodar.ts`, con `vitest run`
**Qué no es**: esta **no** es la medición oficial de SC-007, que se toma sobre los 10 escenarios
de referencia ya calibrados (T068 y T091b). Es una medición del algoritmo para saber si el
diseño aguanta antes de seguir construyendo sobre él.

### Tiempo de consolidación

Carga mixta de tres tamaños, de a una consolidación por vez.

| Contenedor | Bultos | Colocados | Afuera | Tiempo |
|---|---|---|---|---|
| chico (2×1×1 m) | 50 | 18 | 32 | 11 ms |
| chico | 100 | 18 | 82 | 8 ms |
| chico | 200 | 18 | 182 | 15 ms |
| 40' high cube | **200** | 200 | 0 | **139 ms** |
| 40' high cube | 400 | 400 | 0 | 783 ms |
| 40' high cube | 800 | 800 | 0 | 4.536 ms |

### Qué dicen estos números

**SC-007 se cumple con holgura en el rango garantizado.** El objetivo es menos de 5 s para hasta
200 bultos y la medición da 139 ms: 36 veces de margen.

**El caso caro no es el que parecía.** La sobrecarga —200 bultos en un contenedor donde entran
18— es *barata*: 15 ms. Cuando el contenedor se llena quedan pocas posiciones candidatas, así
que cada rechazo se resuelve rápido. El caso caro es el opuesto: **muchos bultos que sí entran**,
porque cada uno agrega tres candidatas nuevas que todos los siguientes tienen que recorrer.

**El crecimiento es de alrededor de n^2,5**: 139 → 783 → 4.536 ms al duplicar de 200 a 400 a 800.
Extrapolando, el límite de 5 s se cruzaría cerca de los 900 bultos. Eso es consistente con lo que
FR-024 ya decide: por encima de 200 no hay tope duro, pero la interfaz avisa que el tiempo de
consolidación puede caer, y la disposición se muestra igual.

**No se optimizó nada por ahora**, y es a propósito: mejorar el aprovechamiento o la velocidad
por encima de la línea base está fuera de alcance, y el margen en el rango garantizado es amplio.
Si alguna vez molesta, lo que hay que atacar es el recorrido de candidatas, no el reparto de peso.


## Paleta de 12 colores (SC-015, FR-013)

**Fecha**: 2026-10-28
**Comando**: optimización de la paleta en OKLCh y `npx vitest run src/vista3d/paleta`

| | Valor |
|---|---|
| Métrica | Distancia euclídea en **OKLab** |
| Umbral **exigido** | **0,15** |
| Distancia mínima **medida** | **0,1848** |
| Margen | 23% por encima del umbral |
| Pares por debajo del umbral | **0** |

### Cómo salió el número

El umbral **no se eligió y después se verificó**: se generaron 12 colores optimizando la
distancia mínima entre todos los 66 pares, variando tono, luminancia y croma por color en OKLCh.
Una primera búsqueda por patrones dio 0,1658; un ascenso de colina sobre los tres parámetros de
cada color lo llevó a **0,1848**.

Recién con ese número medido se declaró el umbral en 0,15: redondo, con 23% de margen, y
alrededor de **7 veces la diferencia apenas perceptible** en OKLab, que ronda 0,02. O sea que
los colores no están "apenas distinguibles": están claramente distintos.

### Por qué OKLab y no CIEDE2000

CIEDE2000 es más preciso pero su fórmula es larga y llena de casos especiales: implementarla a
mano para un test agrega más superficie de error que la que resuelve, y el proyecto no agrega
dependencias. ΔE76 en CIELAB se descartó por lo contrario: es el que más miente en azules y
saturados, justo donde una paleta de 12 aprieta.

### Lo que este número NO dice

**No dice que la paleta sea segura para quien no distingue colores.** La distancia en OKLab
modela visión tricromática normal. La accesibilidad por color sigue abierta en
`checklists/vista3d.md` CHK006, y no está en el PRD.

Tampoco dice nada del **contraste contra el fondo** ni contra las paredes del contenedor: el
umbral mide distancia entre pares de la paleta, nada más (CHK005).


## Calibración de los 10 escenarios (T091)

**Fecha**: 2026-10-28
**Comando**: test de medición temporal sobre `escenarios/escenarios.ts`, con `vitest run`
**Acomodador**: completo, con las tres marcas de RF-06 ya implementadas

| Escenario | Calibrado por | Carga | Colocados | Exceso | Volumen | Peso | Tiempo |
|---|---|---|---|---|---|---|---|
| `carga-mixta` | volumen | 510 | 445 | 1.15x | 90.3% | 43.8% | 352 ms |
| `tambores-y-cajas` | volumen | 490 | 452 | 1.08x | 73.7% | 55.3% | 288 ms |
| `fragiles` | volumen | 275 | 209 | 1.32x | 36.3% | 16.2% | 1466 ms |
| `heladeras` | volumen | 695 | 623 | 1.12x | 70.2% | 23.9% | 4996 ms |
| `no-apilables` | volumen | 320 | 314 | 1.02x | 66.8% | 22.1% | 90 ms |
| `sobrecarga-peso` | peso | 250 | 217 | 1.15x | 62.8% | **99.7%** | 38 ms |
| `sobrecarga-peso-mixta` | peso | 490 | 248 | 1.98x | 73.4% | **100.0%** | 51 ms |
| `un-solo-tipo` | volumen | 690 | 600 | 1.15x | 75.4% | 37.6% | 642 ms |
| `pallets` | volumen | 52 | 40 | 1.30x | 76.4% | 64.5% | 1 ms |
| `con-bulto-gigante` | volumen | 243 | 240 | 1.01x | 69.4% | 17.0% | 49 ms |

### Lo que la calibración enseñó

**El acomodo no es monótono.** En `carga-mixta`, pasar la carga de 465 a 510 bultos **baja** los
colocados de 459 a 445, y a 495 los baja a 372: las cajas grandes tapizan el piso y desplazan a
las chicas. Por eso las cantidades salieron de probar y medir, no de una fórmula.

**`sobrecarga-peso` no estaba midiendo sobrecarga de peso.** Con 330 bolsones de 98 kg llegaba al
84,1% de la carga útil: el volumen se agotaba antes que el peso, así que el escenario medía
volumen con otro nombre. Con 250 bolsones de 130 kg llega al 99,7% y el peso es el que ata.

**El aprovechamiento va de 36,3% a 90,3%.** `CONTEXTO.md` registraba un rango de 50% a 80% medido
en una versión anterior; esta medición lo ensancha por los dos lados. `fragiles` queda bajo porque
los topes de peso le ponen techo a las pilas, que es exactamente lo que el escenario mide.

**Tres escenarios no llegan al 1,15x, y la razón es del problema y no de la calibración**:
`no-apilables` (1,02x) y `tambores-y-cajas` (1,08x) porque los no apilables van al final y cuanto
más desborda el escenario menos piso les queda —con 340 cajas las bobinas quedan en cero—, y
`con-bulto-gigante` (1,01x) porque el exceso lo aportan los 3 bultos que no entran en ninguna
orientación, que es justo lo que mide.

## SC-007 — tiempo de consolidación, sobre los escenarios calibrados (T091b)

**Fecha**: 2026-10-28 · **Comando**: `npm test` (`escenarios/tiempo.test.ts`)
**Concurrencia**: de a una consolidación por vez, 10 corridas por escenario

| Criterio | Objetivo | Medido |
|---|---|---|
| SC-007, escenarios de hasta 200 bultos | < 5.000 ms (p95) | **menos de 1 ms** ✅ |

El único escenario dentro del rango garantizado por RNF-04 es `pallets`, de 52 bultos: los otros
nueve traen más de 200 a propósito, y medirlos no verificaría SC-007 porque ahí el PRD no
garantiza nada.

Por encima del rango garantizado, los tiempos de la tabla de arriba: el peor es `heladeras` con
695 bultos de carga en **4.996 ms**. Consistente con lo que ya se había medido: el límite de 5 s
se cruza cerca de los 900 bultos, y FR-024 lo cubre avisando sin recortar la carga.

## Línea base congelada (T092, T093)

**Registrada**: 2026-10-28, una única vez
**Archivo**: `escenarios/linea-base.json` · **3.388 colocaciones** en 10 escenarios

Ninguna disposición se congeló sin que el validador la aprobara primero.

### Qué detecta y qué no

Probé la línea base metiendo cambios a propósito en el acomodador:

| Cambio | ¿Lo detecta? |
|---|---|
| Reordenar las 6 orientaciones | **Sí**, rompe los 10 escenarios |
| Invertir el desempate por id | No — ese desempate nunca se ejecuta: ningún escenario tiene dos tipos con el mismo volumen **y** el mismo tope |
| Aflojar el apoyo de 80% a 70% | **No** |

El tercero es el que importa y vale dejarlo escrito: **en este algoritmo la regla del 80% casi
nunca es la que decide.** Las posiciones candidatas salen de las esquinas de los bultos ya
puestos, así que el apoyo tiende a ser total o nulo, y el umbral rara vez queda en el medio. La
línea base guarda la disposición en conjunto; **la regla del 80% la guardan los tests unitarios**
de `src/acomodador/apoyo.test.ts` y `src/validador/apoyo.test.ts`, que la prueban en 479, 480 y
600 mm. Las dos cosas hacen falta y ahora está claro cuál cubre qué.
