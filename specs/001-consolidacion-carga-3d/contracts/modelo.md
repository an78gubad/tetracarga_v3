# Contrato — Interfaz del modelo (RNF-08, FR-016)

La única frontera con el proveedor. Cambiar de proveedor es escribir otra implementación de esto y
nada más: si algún tipo de acá nombra a DeepSeek, el contrato está mal.

Vive en `server/modelo/interfaz.ts`. Dos implementaciones: `deepseek.ts` (habla con la red) y
`prueba.ts` (no habla con nada, y es contra la que corre la suite — FR-020, AC-16).

## El contrato

```ts
export type EntradaPrompt = {
  id: string            // el id que el modelo puede proponer
  nombre: string
  sinonimos: string[]
}

export type PedidoInterpretacion = {
  descripcion: string          // ya validada de largo por el intermediario
  catalogo: EntradaPrompt[]    // los ids que el modelo puede proponer, sin medidas
}

export type ItemPropuesto = {
  nombre: string
  cantidad?: number
  largo?: { valor: number; unidad: string }
  ancho?: { valor: number; unidad: string }
  alto?: { valor: number; unidad: string }
  peso?: { valor: number; unidad: string; esDelItemCompleto?: boolean }
  capacidad?: { valor: number; unidad: 'l' }   // "tambor de 200 litros": clave, no medida
  idCatalogo?: string                          // propuesto; el CÓDIGO lo verifica (FR-005)
}

export type ResultadoInterpretacion =
  | { tipo: 'items'; items: ItemPropuesto[] }
  | { tipo: 'vacia' }                                    // transitorio: se reintenta
  | { tipo: 'falla'; transitoria: boolean; codigo: string }

export interface Modelo {
  interpretar(pedido: PedidoInterpretacion): Promise<ResultadoInterpretacion>
}
```

El modelo devuelve **número y unidad tal como aparecen en el texto**, sin convertir. La conversión a
milímetros y gramos la hace el código (research.md §13): una conversión es una cuenta, y las cuentas
no se le piden al modelo.

`idCatalogo` es una **propuesta**. Quien decide es `src/catalogo/catalogo.ts`: si el id no existe,
la propuesta de ese ítem se descarta entera y el ítem se trata como si no tuviera entrada. No se
busca el id más parecido (FR-005, AC-17).

## Clasificación de fallas

La implementación traduce lo que devuelve el proveedor a `transitoria: boolean`. Para DeepSeek:

| Código | `transitoria` | Por qué |
|---|---|---|
| 429 | sí | Ritmo o concurrencia |
| 500 | sí | Falla del servidor del proveedor |
| 503 | sí | Sobrecarga |
| respuesta vacía | sí | Modo de falla documentado del JSON mode |
| respuesta fuera de esquema por forma | sí | Se trata como vacía (FR-017) |
| 400 | no | Cuerpo mal formado: es un error nuestro, reintentar vuelve a fallar |
| 401 | no | Clave equivocada |
| 402 | no | Saldo agotado |
| 422 | no | Parámetros inválidos |

## Reintentos y presupuesto

`server/modelo/reintentos.ts` envuelve a la implementación y es el dueño del presupuesto:

- Hasta **3 intentos** en total (2 reintentos), solo sobre `transitoria: true`.
- Espera **500 ms antes del segundo intento y 1.500 ms antes del tercero**. Un 429 reintentado al
  instante vuelve a fallar igual; una espera larga se come el presupuesto.
- Si lo que queda del presupuesto no alcanza para la espera **más** un intento, corta sin esperar:
  dormir 1,5 s para descubrir después que no hay tiempo de llamar no tiene sentido.
- **10 s** de presupuesto total, medido punta a punta desde que entra el pedido al intermediario.
- Si el presupuesto se agota en medio de un intento, se corta: no se arranca uno nuevo.
- Agotado el presupuesto o los intentos, devuelve `falla` y **no** se reintenta más (FR-016).
- Una falla no transitoria corta en el primer intento.

Lo que el usuario ve al agotarse: la descripción intacta, el aviso de que la falla es del proveedor
—no un error de interpretación— y la opción de reintentar, sin que la lista cargada se toque
(FR-026).

## Lo que esta interfaz tiene prohibido

- Exponer tipos, códigos de error crudos, URLs o encabezados del proveedor hacia afuera.
- Leer la credencial fuera de la implementación que la usa.
- Que alguien de `src/` la importe: `src/` llega al navegador (AGENTS.md).
