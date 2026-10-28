# Contrato — La línea base congelada (FR-018, RNF-05, AC-14)

Lo que permite cerrar el acomodador: el acomodo es NP-duro y puede comerse el proyecto, así que se
congela y se deja de tocar.

`escenarios/linea-base.json`, al lado de `escenarios/escenarios.ts`.

## Formato

```json
{
  "registradaEl": "<fecha>",
  "escenarios": {
    "<id del escenario>": {
      "contenedorId": "40hc",
      "secuencia": [
        { "itemId": "cajas", "indice": 0,
          "x": 0, "y": 0, "z": 0,
          "orientacion": { "ejeX": "largo", "ejeY": "ancho", "ejeZ": "alto" } }
      ],
      "afuera": [ { "itemId": "tambores", "indice": 14, "motivo": "volumen" } ]
    }
  }
}
```

Todo entero, en milímetros. La orientación se escribe con los nombres de los ejes y no con un
número de 0 a 5: un índice no dice nada cuando el test falla, y el nombre sí.

## Reglas de comparación

- El **orden del array `secuencia` es parte del dato**: es el orden de colocación (FR-009). Dos
  disposiciones con las mismas colocaciones en otro orden **no** coinciden.
- Se compara **bulto por bulto**: identidad `(itemId, indice)`, posición y orientación. **Sin
  tolerancia** (AC-14, SC-008).
- Cualquier diferencia **rompe el build**.
- `escenarios/linea-base.test.ts` recalcula desde `escenarios.ts` y compara contra el archivo.

## Lo que está prohibido

- **Snapshots de Vitest.** `vitest -u` reescribiría la línea base sin que nadie lo decida, que es
  exactamente lo que este contrato existe para evitar (AGENTS.md, Principio III).
- **Tocar el archivo para que un test pase.** Si una disposición no coincide con la congelada, el
  error está en el código. Modificarlo lo decide el usuario, explícitamente.
- **Registrarlo antes de que los escenarios estén cerrados.** Se escribe una sola vez: congelar
  escenarios que todavía se están calibrando es congelar ruido.

## Cuándo se registra

Cuando los 10 escenarios estén cerrados: calibrados a ~115% de lo que entra —salvo los que miden
sobrecarga de peso, que traen ~115% de la carga útil— y verificados de que ningún tipo de ítem por
separado alcance para llenar el contenedor. Calibrados a 115% del volumen interno quedaban tipos
enteros afuera (CONTEXTO.md).

Hasta ese momento el archivo no existe, y **su test tampoco**: `linea-base.test.ts` entra en el
mismo commit que registra el archivo. No se escribe un test que pase porque el archivo falta: eso
es un `.skip` disfrazado, y el Principio VI lo prohíbe igual.
