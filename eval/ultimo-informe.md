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
