# Contrato — El intermediario `POST /api/interpretar` (FR-015, FR-017, FR-023, FR-026)

El único punto que habla con el proveedor. El navegador llama acá y a ningún otro lado.

`api/interpretar.ts` solo envuelve a `server/proxy/manejador.ts`: la función de Vercel no tiene
lógica propia, así que el manejador se puede probar sin levantar nada.

## Pedido

```http
POST /api/interpretar
Content-Type: application/json

{ "descripcion": "40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200 litros" }
```

## Orden de los controles

El orden importa: cada paso que rechaza lo hace **sin llamar al proveedor**, que es lo que vuelve
medibles a SC-014 y AC-25.

1. Cuerpo bien formado y `descripcion` presente → si no, `400 cuerpo-invalido`.
2. Largo ≤ 2.000 puntos de código → si no, `413 descripcion-demasiado-larga` (FR-017).
3. Límite por IP: 10/minuto y 60/hora → si no, `429 limite-de-pedidos` (FR-023).
4. Llamada al modelo con el presupuesto de 10 s y hasta 3 intentos (FR-016).
5. Validación de la respuesta: **forma** por respuesta entera, **rango** por ítem (FR-017, FR-021).

## Respuestas

| HTTP | `codigo` | Cuándo | Qué hace la interfaz |
|---|---|---|---|
| 200 | — | Hay ítems | Los agrega al final de la lista (FR-025) |
| 200 | `sin-items` | El modelo no reconoció ninguna carga | Lo informa, sin tocar la lista |
| 400 | `cuerpo-invalido` | Pedido mal armado | No debería pasar: es un bug del cliente |
| 413 | `descripcion-demasiado-larga` | > 2.000 caracteres | Dice el límite (AC-25) |
| 429 | `limite-de-pedidos` | Tope por IP | Dice el límite (AC-29) |
| 502 | `falla-del-proveedor` | 3 intentos fallidos o presupuesto agotado | Falla del proveedor, con reintentar (FR-026) |
| 502 | `proveedor-no-configurado` | Falta la credencial | Distinto de credencial inválida |

Respuesta exitosa:

```json
{
  "items": [
    { "nombre": "cajas", "cantidad": 40,
      "largo": {"valor": 60, "unidad": "cm"}, "ancho": {"valor": 40, "unidad": "cm"},
      "alto": {"valor": 30, "unidad": "cm"}, "peso": {"valor": 12, "unidad": "kg"} },
    { "nombre": "tambores", "cantidad": 15,
      "capacidad": {"valor": 200, "unidad": "l"}, "idCatalogo": "tambor-200l" }
  ],
  "descartados": [
    { "nombre": "cajas chicas", "campo": "cantidad", "motivo": "valor-fuera-de-rango" }
  ]
}
```

`descartados` es lo que permite que FR-021 funcione: el campo fuera de rango viaja con su motivo
para que la interfaz lo muestre como faltante y lo pregunte, en vez de perderse en silencio.

## Lo que nunca sale de acá

Ni la clave, ni la URL del proveedor, ni ningún encabezado de autorización, **ni dentro de un
mensaje de error** (FR-015). Un error del proveedor se traduce a `falla-del-proveedor` y su texto
crudo no se reenvía: es el camino por el que una URL se filtra sin que nadie lo note.

`tests/seguridad/bundle.test.ts` arma su propio bundle y busca la clave, la URL y el encabezado
reales. No busca patrones genéricos como `sk-`: dan falsos positivos con el código de React
(AGENTS.md). No depende de un `dist/` que puede estar viejo.

## Límite por IP

- IP: primer valor de `x-forwarded-for`; `remoteAddress` como respaldo.
- Ventanas deslizantes de 1 minuto y 1 hora, en memoria del proceso.
- **Deuda declarada**: el contador se reinicia con cada arranque en frío y no se comparte entre
  instancias, así que el tope efectivo es más laxo que el declarado. El PRD ya lo acepta; el total
  se acota con el tope de gasto configurado en el proveedor.
