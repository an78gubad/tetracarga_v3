# Phase 1 — Modelo de datos

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-28

Las entidades salen de la sección Key Entities del spec. Los tipos se escriben en TypeScript porque
es el lenguaje del proyecto, pero acá importan los campos y las reglas, no la sintaxis.

## Unidades

Dos unidades enteras en todo el sistema, nunca punto flotante en las cuentas de consolidación
(FR-009, FR-027). Se declaran como tipos marcados para que el compilador no deje sumar milímetros
con gramos.

```ts
type Milimetros = number & { readonly __u: 'mm' }          // entero
type Gramos = number & { readonly __u: 'g' }               // entero
type MilimetrosCuadrados = number & { readonly __u: 'mm2' } // entero
```

El usuario declara pesos en kilos (FR-002) y la interfaz los muestra en kilos; la representación
interna es en gramos. La conversión ocurre una sola vez, en el borde: al entrar desde la
interpretación y al salir hacia la pantalla.

## Descripción

El texto libre que escribe el usuario. Única entrada del sistema.

| Campo | Tipo | Reglas |
|---|---|---|
| `texto` | `string` | Hasta 2.000 caracteres. Por encima, el intermediario rechaza sin llamar al proveedor (FR-017) |

Los 2.000 caracteres se cuentan en **puntos de código Unicode** (`[...texto].length`), no en bytes
ni en unidades UTF-16: es la cuenta que coincide con lo que el usuario ve escrito.

## Ítem

Un tipo de bulto del pedido. Un ítem de cantidad 40 son 40 bultos.

```ts
type Item = {
  id: string                    // id interno, estable mientras el ítem viva en la lista
  nombre: string
  cantidad: Campo<number>       // entero ≥ 1, NUNCA se completa desde el catálogo (FR-004)
  largo: Campo<Milimetros>      // > 0
  ancho: Campo<Milimetros>      // > 0
  alto: Campo<Milimetros>       // > 0
  pesoUnitario: Campo<Gramos>   // > 0
  marcas: MarcasItem
  color: IndiceColor            // 0..11, atado al ítem, no a su posición (FR-013)
}
```

### Estado de cada campo

Todo campo lleva su estado. Es lo que hace visible qué declaró el usuario y qué completó el sistema
(FR-003, SC-011).

```ts
type Campo<T> =
  | { estado: 'declarado'; valor: T }
  | { estado: 'estimado'; valor: T; entradaCatalogo: string }  // qué entrada lo completó
  | { estado: 'faltante'; motivo: MotivoFaltante }            // sin valor: no hay valor que mostrar

type MotivoFaltante =
  | 'sin-entrada-en-catalogo'   // el ítem no está en el catálogo
  | 'entrada-sin-el-dato'       // la entrada existe pero no trae ese dato
  | 'valor-fuera-de-rango'      // vino un valor que no cumple el rango (FR-021)
```

Los tres motivos son los de FR-004. Que `faltante` no tenga `valor` es a propósito: un valor fuera
de rango no se guarda "por si acaso", ni se corrige por su signo ni por su valor absoluto.

### Transiciones de estado

```
faltante  --(el usuario escribe el valor, FR-006)-->  declarado
estimado  --(el usuario edita el valor, FR-006)----->  declarado   [dispara recálculo]
estimado  --(el usuario borra el valor)------------->  faltante
declarado --(el usuario borra el valor)------------->  faltante
```

No hay transición hacia `estimado`: el estado estimado solo lo produce la interpretación al
completar desde el catálogo. Una vez que el usuario toca un campo, es suyo.

**Invariante bloqueante**: si algún campo de algún ítem está en `faltante`, la consolidación está
bloqueada (FR-004). El bloqueo es de la lista entera, no del ítem: no se consolida una carga
incompleta dejando un ítem afuera.

### Marcas por ítem

```ts
type MarcasItem = {
  noApilable: Marca<boolean>              // puede venir del catálogo
  orientacionObligatoria: Marca<boolean>  // puede venir del catálogo
  pesoMaximoEncima: Campo<Gramos>         // SIEMPRE lo declara el usuario (FR-008)
}

type Marca<T> =
  | { estado: 'declarado'; valor: T }
  | { estado: 'del-catalogo'; valor: T }  // precargada, señalada como tal y editable
```

`pesoMaximoEncima` usa `Campo` y no `Marca` porque nunca viene del catálogo: depende del contenido,
no del tipo de bulto (CONTEXTO.md), así que o lo declara el usuario o está faltante.

## Entrada de catálogo de objeto

Único origen de los datos completados. Contrato completo en [contracts/catalogo.md](./contracts/catalogo.md).

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `string` | Único. Es lo que el modelo propone y el código verifica (FR-005) |
| `nombre` | `string` | Nombre canónico |
| `sinonimos` | `string[]` | Cómo lo llama la gente: "tacho", "bidón de 200" (research.md §14) |
| `largo`, `ancho`, `alto` | `Milimetros` | > 0 |
| `peso` | `Gramos \| null` | `null` cuando la ficha no lo declara: casi siempre (CONTEXTO.md) |
| `noApilable` | `boolean \| null` | `null` si la ficha no dice nada. Hoy ninguna lo dice |
| `orientacionObligatoria` | `boolean \| null` | Idem |
| `fuente` | `string` | **Obligatorio.** La ficha exacta de la que sale. Sin fuente no entra (Principio IV) |

`peso: null` no es un dato faltante por descuido: es el caso normal. El peso de un tambor, un IBC o
un bidón depende del contenido, así que se pregunta siempre.

## Entrada de catálogo de contenedor

| Campo | Tipo | Reglas |
|---|---|---|
| `id` | `string` | `20`, `40`, `40hc` |
| `nombre` | `string` | Como lo nombra la ficha |
| `largoInterior`, `anchoInterior`, `altoInterior` | `Milimetros` | > 0 |
| `cargaUtil` | `Gramos` | La carga útil (max payload), **no** el peso bruto (FR-007) |
| `tara` | `Gramos` | Se guarda porque la ficha la trae y porque cierra la cuenta con el peso bruto |
| `fuente` | `string` | Obligatorio. Los tres salen de Maersk, sin mezclar navieras (CONTEXTO.md) |

Las medidas de la puerta **no** se modelan: un bulto puede entrar en el interior y no pasar por la
puerta. Es un supuesto declarado del spec, no un olvido.

## Bulto y Colocación

Un bulto es una unidad física de un ítem. La disposición es la secuencia ordenada de colocaciones.

```ts
type Bulto = { itemId: string; indice: number }   // el bulto n-ésimo de ese ítem

type Orientacion = { ejeX: 'largo'|'ancho'|'alto'; ejeY: ...; ejeZ: ... }  // permutación de los 3

type Colocacion = {
  bulto: Bulto
  x: Milimetros; y: Milimetros; z: Milimetros   // esquina de menor coordenada
  orientacion: Orientacion
}

type Disposicion = {
  contenedorId: string
  secuencia: Colocacion[]     // el ÍNDICE es el orden de colocación: eso es lo que ve FR-014
  afuera: BultoAfuera[]
}

type BultoAfuera = { bulto: Bulto; motivo: 'peso' | 'volumen' }
```

El origen está en la esquina del fondo abajo a la izquierda; `x` es el largo hacia la puerta, `y` el
ancho, `z` el alto (FR-009). Las coordenadas son de la esquina de menor valor en cada eje, y los
intervalos que ocupa el bulto son semiabiertos: `[x, x + medidaEnX)`. Eso hace que dos bultos
pegados no se superpongan (research.md §5).

**La identidad del bulto es `(itemId, indice)`** y es lo que permite comparar contra la línea base
bulto por bulto: sin índice, dos bultos del mismo ítem son indistinguibles y la comparación de
FR-018 no tendría sujeto.

## Informe de consolidación

| Campo | Tipo | Regla |
|---|---|---|
| `aprovechamientoVolumen` | número | Σ volumen de bultos colocados ÷ volumen interior (research.md §8) |
| `aprovechamientoPeso` | número | Σ peso de bultos colocados ÷ carga útil |
| `colocados` | `number` | `secuencia.length` |
| `afuera` | `BultoAfuera[]` | Cada uno con su motivo. "peso" gana sobre "volumen" (AC-23) |

## Escenario de referencia

Una carga y un contenedor fijos, de los 10 congelados.

| Campo | Tipo | Regla |
|---|---|---|
| `id` | `string` | Estable: la línea base lo cita |
| `items` | `Item[]` | Todos los campos en `declarado`: un escenario no depende del catálogo ni del modelo |
| `contenedorId` | `string` | |

Los 10 están calibrados a ~115% de lo que entra, salvo los que miden sobrecarga de peso, que traen
~115% de la carga útil. Calibrarlos al 115% del volumen interno dejaba tipos enteros afuera
(CONTEXTO.md). **No se recalibran para que un número salga mejor.**

## Caso del dataset

Una descripción con sus etiquetas, para medir SC-003 a SC-005.

| Campo | Tipo | Regla |
|---|---|---|
| `descripcion` | `string` | El texto tal como lo escribiría una persona |
| `itemsEsperados` | `ItemEsperado[]` | Por ítem: cantidad, qué campos declara la descripción con su valor, y qué entrada de catálogo corresponde |

```ts
type ItemEsperado = {
  cantidad: number
  camposDeclarados: Partial<Record<'largo'|'ancho'|'alto'|'peso', number>>  // solo los que el texto declara
  camposAusentes: ('largo'|'ancho'|'alto'|'peso')[]                        // los que deben quedar estimados o preguntados
  entradaCatalogo: string | null                                           // null si no corresponde ninguna
}
```

La separación entre `camposDeclarados` y `camposAusentes` es la que permite calcular SC-003 y SC-004
por separado y no promediarlos: el primero mide extracción, el segundo mide que no se invente nada.

## Qué comparte cada carpeta

| Carpeta | Qué importa de `src/dominio/` |
|---|---|
| `src/acomodador/` | `Item`, `Bulto`, `Colocacion`, `Orientacion`, `Disposicion`, unidades — **solo tipos** |
| `src/validador/` | Los mismos tipos, con sus propias constantes y sus propias cuentas |
| `src/vista3d/` | `Disposicion`, `Item` |
| `src/interpretacion/` | `Item`, `Campo`, `MotivoFaltante` |

El acomodador y el validador no comparten ni el 80%, ni el orden de los ejes, ni la fórmula del
reparto: cada uno los escribe. Un test lo verifica (research.md §11).
