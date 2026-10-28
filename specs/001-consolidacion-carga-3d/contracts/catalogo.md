# Contrato — El catálogo versionado (FR-003, FR-019, Principio IV)

Único origen de todo dato que el sistema completa. Se toca en el repositorio, nunca desde la
interfaz, y **solo por decisión explícita del usuario**.

Dos archivos: `src/catalogo/objetos.json` y `src/catalogo/contenedores.json`.

## Objeto

```json
{
  "id": "tambor-200l",
  "nombre": "Tambor de 200 litros",
  "sinonimos": ["tambor", "tacho", "bidón de 200"],
  "largo": 0, "ancho": 0, "alto": 0,
  "peso": null,
  "noApilable": null,
  "orientacionObligatoria": null,
  "fuente": "<ficha exacta: fabricante, documento, fecha>"
}
```

Las medidas de este ejemplo están en `0` **a propósito**: este contrato define la forma, no los
datos. Cada entrada real sale de una ficha y la nombra; una entrada sin fuente no entra al archivo.

| Campo | Obligatorio | Regla |
|---|---|---|
| `id` | sí | Único. Es lo que el modelo propone y el código verifica (FR-005) |
| `nombre` | sí | Canónico |
| `sinonimos` | sí | Puede estar vacío. Van acá y no en el prompt: son dato de dominio, versionado |
| `largo`, `ancho`, `alto` | sí | Enteros en mm, > 0 |
| `peso` | sí (puede ser `null`) | Gramos enteros o `null`. `null` es el caso normal |
| `noApilable` | sí (puede ser `null`) | `null` si la ficha no lo dice. Hoy ninguna lo dice |
| `orientacionObligatoria` | sí (puede ser `null`) | Idem |
| `fuente` | sí | **No admite `null` ni cadena vacía** |

## Contenedor

```json
{
  "id": "40hc",
  "nombre": "40' High Cube Dry Container",
  "largoInterior": 0, "anchoInterior": 0, "altoInterior": 0,
  "cargaUtil": 0, "tara": 0,
  "fuente": "Maersk — Container specifications, <ficha exacta>"
}
```

`cargaUtil` es la carga útil (max payload), **no** el peso bruto (FR-007). Los tres contenedores
salen de Maersk, sin mezclar navieras, de fichas donde `cargaUtil + tara = peso bruto`
(CONTEXTO.md). Se descartó un PDF de Maersk Sudáfrica de 2014 con cifras distintas.

## Lo que el esquema hace cumplir

`src/catalogo/esquema.ts` valida al cargar y `catalogo.test.ts` falla si:

- falta `fuente`, o está vacía;
- un `id` está repetido;
- una medida es ≤ 0 o no entera;
- un `peso` es ≤ 0 (si no es `null`);
- un sinónimo aparece en dos entradas distintas: haría ambiguo el matcheo.

## Lo que el catálogo no tiene

- **Ningún peso inventado.** El de tambores, IBC y bidones depende del contenido. Se buscó ficha de
  fabricante para objetos de peso propio —bolsas de cemento de 50 kg, de harina o azúcar de 25 kg—
  y no hay: las medidas de bolsa solo aparecen en minoristas, que no cuentan como fuente.
- **Pallets: solo la base.** Como carga van cargados, así que el alto depende de lo que llevan y se
  pregunta. La base del ARLOG sale de fabricantes porque la IRAM 10016 no es pública.
- **Big bag: afuera.** La única ficha da la medida nominal de la bolsa vacía, y llena se deforma.
- **Ninguna marca de FR-006 precargada**: ninguna ficha dice "no apilable" ni "este lado arriba".
- **Medidas de puerta**: no se modelan (supuesto declarado del spec).
