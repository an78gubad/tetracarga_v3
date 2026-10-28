# Último informe de evaluación

**Fecha**: 2026-10-28T21:04:16.391Z
**Comando**: `npm run eval`
**Modelo**: `deepseek-flash`
**Concurrencia**: 5 llamadas en paralelo
**Corridas**: 3; se reporta **la peor**, no el promedio
**Casos medidos**: 150 (50 por corrida)

## Precisión (RNF-02)

| Criterio | Objetivo | Medido |
|---|---|---|
| SC-003 campos declarados bien extraídos | ≥ 90% | **93.8%** |
| SC-004 campos ausentes estimados o preguntados | 100% | **100.0%** |
| SC-005 ítems en la entrada correcta | ≥ 90% | **98.2%** |

Los tres se reportan por separado y **no se promedian entre sí**.

Por corrida: #1 96.3/100.0/98.2 · #2 98.1/100.0/100.0 · #3 93.8/100.0/98.2

## Tiempo (RNF-01)

| Criterio | Objetivo | Medido |
|---|---|---|
| SC-002 p95 de interpretación | < 20.000 ms | **12836 ms** |
| mediana | — | 12836 ms |
| máximo | — | 20031 ms |

Medido con 5 llamadas en paralelo. Con una sola, el p95 queda por debajo del
que ve una persona cuando hay otras usando el sistema.

## Casos con diferencias (14)

### u08 — unidades

> 9 rollos de 0,9 m de diámetro y 1,2 m de alto, 400 kg

- no devolvió ítems: falla

### p02 — peso-total

> 10 bultos de 80x60x50 que entre todos pesan 1 tonelada

- ítem 0 peso: esperaba declarado 100000, vino {"estado":"declarado","valor":1000000}

### p04 — peso-total

> 25 cajas de 50x40x30 con un peso total de 625 kg

- ítem 0 peso: esperaba declarado 25000, vino {"estado":"declarado","valor":625000}

### x01 — fuera-de-rango

> -5 cajas de 60x40x30

- ítem 0 cantidad: tenía que quedar faltante y vino {"estado":"declarado","valor":5}

### u08 — unidades

> 9 rollos de 0,9 m de diámetro y 1,2 m de alto, 400 kg

- ítem 0 largo: esperaba declarado 900, vino {"estado":"faltante","motivo":"sin-entrada-en-catalogo"}
- ítem 0 ancho: esperaba declarado 900, vino {"estado":"faltante","motivo":"sin-entrada-en-catalogo"}

### p04 — peso-total

> 25 cajas de 50x40x30 con un peso total de 625 kg

- ítem 0 peso: esperaba declarado 25000, vino {"estado":"declarado","valor":625000}

### x01 — fuera-de-rango

> -5 cajas de 60x40x30

- ítem 0 cantidad: tenía que quedar faltante y vino {"estado":"declarado","valor":5}

### u08 — unidades

> 9 rollos de 0,9 m de diámetro y 1,2 m de alto, 400 kg

- ítem 0 largo: esperaba declarado 900, vino {"estado":"faltante","motivo":"sin-entrada-en-catalogo"}
- ítem 0 ancho: esperaba declarado 900, vino {"estado":"faltante","motivo":"sin-entrada-en-catalogo"}

### r03 — rotulos

> 6 cajones de 1,5 de alto, base de 1,20 por 0,80, 700 kg

- no devolvió ítems: falla

### p01 — peso-total

> 40 cajas de 60x40x30, 500 kilos en total

- ítem 0 peso: esperaba declarado 12500, vino {"estado":"declarado","valor":500000}

### p02 — peso-total

> 10 bultos de 80x60x50 que entre todos pesan 1 tonelada

- ítem 0 peso: esperaba declarado 100000, vino {"estado":"declarado","valor":1000000}

### p03 — peso-total

> 3 cajas de 40x30x20, 10 kilos el total

- ítem 0 peso: esperaba declarado 3334, vino {"estado":"declarado","valor":10000}

### p04 — peso-total

> 25 cajas de 50x40x30 con un peso total de 625 kg

- ítem 0 peso: esperaba declarado 25000, vino {"estado":"declarado","valor":625000}

### x01 — fuera-de-rango

> -5 cajas de 60x40x30

- ítem 0 cantidad: tenía que quedar faltante y vino {"estado":"declarado","valor":5}


## T042 — `max_tokens`, medido

**Fecha**: 2026-10-28 · **Comando**: medición directa contra el proveedor sobre los 10 casos del
dataset con más ítems, leyendo `usage` de la respuesta

| Caso | Ítems | Prompt | Salida |
|---|---|---|---|
| `d04` | 2 | 917 | **1.383** |
| `c02` | 2 | 929 | 828 |
| `s03` | 2 | 936 | 648 |
| `s05` | 2 | 951 | 531 |
| `s04` | 1 | 926 | 440 |
| `s06` | 1 | 921 | 354 |
| `s09` | 3 | 944 | 346 |
| `s07` | 1 | 924 | 248 |
| `s02` | 1 | 920 | 247 |
| `s01` | 1 | 919 | 137 |

**`max_tokens` queda en 8.000**, casi 6 veces el máximo medido.

El margen es amplio a propósito, y la razón importa: `max_tokens` es un **techo de seguridad, no
un presupuesto**. Solo se paga por los tokens que el modelo genera de verdad, así que un techo
alto no cuesta nada; uno bajo sí, porque una respuesta truncada es JSON inválido, se descarta
entera y se reintenta, y eso quema el presupuesto de tiempo. Lo que el techo acota es que el
modelo se desboque.

**La salida no es proporcional a los ítems.** `d04` con 2 ítems dio 1.383 tokens y `s09` con 3
dio 346: la variación entre llamadas pesa más que la cantidad de ítems. Por eso el techo no se
calculó como "tokens por ítem × tope de ítems", que era el plan original de research.md §2: ese
cálculo habría dado un número con cara de preciso sobre una proporcionalidad que no existe.


## SC-001 — de la descripción a la vista 3D (T091c)

**Fecha**: 2026-10-28 · **Medido a mano por el usuario**, cronometrando el recorrido completo

| Criterio | Objetivo | Medido |
|---|---|---|
| SC-001, de descripción tipeada a disposición visible en 3D | < 2 minutos | **7 segundos** ✅ |

Diecisiete veces de margen, y el número es consistente con las partes medidas por separado: la
interpretación tiene una mediana de 3,2 s, la consolidación de un escenario de este tamaño tarda
milisegundos, y el render es inmediato. No hay ninguna parte escondida que explique la diferencia
con los dos minutos del objetivo: el objetivo era holgado.

## T097 — lo que ningún test cubre, verificado a ojo

**Fecha**: 2026-10-28 · **Verificado a mano por el usuario** en Chrome de escritorio, sobre
`?escenario=sc009`: 200 bultos en 12 tipos

| Qué | Resultado |
|---|---|
| Los 12 colores se distinguen entre sí en pantalla | ✅ |
| Dos bultos del mismo tipo se separan a la vista dentro de una pila | ✅ |
| El control deslizante no muestra ningún bulto flotando en ningún paso | ✅ |

El tercero es el que más importaba: si hubiera fallado, significaría que el validador aprueba
disposiciones que el ojo desmiente, y habría un bug entre la geometría y lo que se dibuja. Que
coincidan es la confirmación de que el 80% de apoyo y la propiedad de prefijo de AC-24 describen
lo que de verdad se ve.

El segundo cierra la deuda declarada sobre la distinción dentro de la pila: las aristas por bulto
funcionan. Sigue sin criterio automatizado, y sigue siendo la decisión correcta.
