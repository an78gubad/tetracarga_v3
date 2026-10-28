# Dataset de 50 descripciones etiquetadas

La vara con la que se mide la precisión de la interpretación (RNF-02, SC-003 a SC-005).

## Cómo está etiquetado

Cada caso trae la descripción tal como la escribiría una persona, y por ítem:

- **`cantidad`**: la que dice la descripción, o `null` si no la dice.
- **`declarados`**: los campos que **la descripción declara**, ya en milímetros y gramos
  enteros. SC-003 mide que se extraigan con coincidencia exacta, sin tolerancia.
- **`ausentes`**: los campos que la descripción **no** dice. SC-004 mide que queden estimados
  desde el catálogo o preguntados; completarlos con un valor que no salga del catálogo cuenta
  como error.
- **`entradaCatalogo`**: la entrada que corresponde, o `null` si ninguna. SC-005 lo mide.

La separación entre `declarados` y `ausentes` es la que permite calcular SC-003 y SC-004 por
separado y **no promediarlos**: el primero mide extracción, el segundo mide que no se invente
nada.

## Lo que este archivo NO es

**No se toca para que una métrica llegue.** Si el eval no alcanza el 90%, se mejora el prompt o
se cambia el modelo con `DEEPSEEK_MODELO`; no se corrigen etiquetas. Modificar el dataset lo
decide el usuario, explícitamente (AGENTS.md, Principio III).

Tampoco es un set de tests: la suite corre sin red. Esto se usa solo con `npm run eval`, que
llama al proveedor real.

## Cómo están distribuidos los 50

| Grupo | Casos | Qué mide |
|---|---|---|
| `simple` | 12 | Lo que tiene que salir bien siempre: medidas y peso explícitos |
| `catalogo` | 9 | Que resuelva la entrada y complete desde ahí, no desde el modelo |
| `unidades` | 8 | mm, cm, m, pulgadas, g, kg, toneladas |
| `rotulos` | 4 | "60 de alto": el rótulo manda sobre la posición |
| `peso-total` | 4 | "500 kg en total": se divide por la cantidad |
| `faltante` | 6 | Lo que falta se pregunta y no se completa |
| `fuera-de-rango` | 3 | "-5 cajas", "0 cajas", cantidad no entera |
| `desconocido` | 4 | Objetos que el catálogo no tiene: se pregunta todo |

Varios casos entran en más de un grupo; la cuenta es por la etiqueta principal.
