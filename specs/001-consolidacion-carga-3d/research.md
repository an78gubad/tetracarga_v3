# Phase 0 — Investigación y decisiones

**Feature**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md) | **Fecha**: 2026-10-28

El stack ya lo fija el PRD, así que acá no se elige tecnología. Lo que se resuelve son las
decisiones de diseño que el spec dejó abiertas y que, sin cerrar, producirían dos implementaciones
que no pueden coincidir o un criterio que no se puede verificar.

> **Lo que no se investiga de nuevo.** `CONTEXTO.md` ya registra, medido en una versión anterior,
> que ninguna librería de packing sirve y que el orden de colocación pesa más que el algoritmo
> (no apilables al final: 69,2% → 82,3%; a igual volumen primero el que más aguanta: 33,5% → 70,9%).
> Esa investigación **no se repite**: se toma como dada.

---

## 1. Clasificación de las fallas del proveedor

**Decision**: transitorias —se reintentan dentro del presupuesto de 10 s— las respuestas HTTP
**429** (ritmo o concurrencia), **500** (falla del servidor) y **503** (sobrecarga), más la
**respuesta vacía**. Definitivas —no se reintentan, se informan— **400** (cuerpo mal formado),
**401** (clave equivocada), **402** (saldo agotado) y **422** (parámetros inválidos).

**Rationale**: es el mapeo directo de la tabla de códigos de error que publica DeepSeek sobre lo
que FR-016 ya pedía en abstracto. Los tres códigos reintentables son los que la propia
documentación resuelve con "retry after brief wait" o "pace requests appropriately"; 401 y 402 son
exactamente los dos casos que el spec nombra como no transitorios. El 400 y el 422 se suman del
lado definitivo porque indican un error nuestro al armar el pedido: reintentarlos quema el
presupuesto para volver a fallar igual.

La respuesta vacía entra como transitoria por una razón documentada, no por prudencia: la guía de
JSON de DeepSeek avisa que con `response_format` "the API may occasionally return empty content".
Es decir, AC-20 no describe una hipótesis sino un modo de falla conocido del proveedor elegido.

**Alternatives considered**: tratar 429 como definitivo y devolver el límite al usuario —descartado,
porque el límite del proveedor no es culpa del usuario y un solo reintento suele alcanzar.
Reintentar 500 indefinidamente —descartado por el presupuesto de 10 s de FR-016.

---

## 2. Formato de la respuesta del modelo y tope de longitud

**Decision**: se pide JSON con `response_format: { type: 'json_object' }`, la palabra "json" y un
ejemplo del formato en el prompt, y `max_tokens` como el tope de longitud que exige FR-017. El tope
concreto se fija al cerrar el prompt, calculado como *(tokens por ítem medidos sobre el dataset) ×
(tope de ítems por respuesta) + margen*, y queda escrito junto al prompt con la medición que lo
produjo.

**Rationale**: las tres condiciones no son opcionales. La documentación de DeepSeek es explícita en
que `response_format` solo no alcanza: hay que incluir la palabra "json" y un ejemplo del formato
deseado, y hay que configurar `max_tokens` para que la respuesta no se trunque. Una respuesta
truncada es JSON inválido, que por FR-017 se descarta entera y se reintenta: sin el tope bien
puesto, el presupuesto de 10 s se va en reintentos que vuelven a truncar.

El número exacto no se pone en este plan porque sería un dato sin fuente (Principio IV): sale de
medir el dataset, y va al informe con la fecha y el comando.

**Alternatives considered**: function calling / tool use para forzar el esquema —descartado por
ahora: ata el diseño a una capacidad del proveedor, y RNF-08 pide que cambiar de proveedor sea
escribir otra implementación de la interfaz. Texto libre con parseo propio —descartado: multiplica
los modos de falla que FR-017 tiene que distinguir.

---

## 3. Modelo de DeepSeek

**Decision**: `deepseek-flash` como modelo inicial, configurable por variable de entorno.

**Rationale**: la tarea es extracción estructurada de un texto de hasta 2.000 caracteres, no
razonamiento largo. `deepseek-flash` es el modelo barato del catálogo —del orden de 0,15 a 0,3 USD
por millón de tokens de entrada contra 0,66 a 1,32 de `deepseek-v4-pro`— y es el que la propia guía
de JSON usa en su ejemplo. El contexto de 1M es irrelevante acá: el pedido entra holgado en
cualquiera de los dos.

Que sea configurable importa porque si el eval de RNF-02 no llega al 90%, cambiar de modelo es una
palanca legítima; aflojar el umbral no lo es.

**Alternatives considered**: `deepseek-v4-pro` desde el arranque —descartado hasta tener el número
del eval: pagar 4× por tokens de entrada sin evidencia de que haga falta es optimizar a ciegas.

---

## 4. Orientaciones admitidas por bulto

**Decision**: las 6 permutaciones de ejes —cualquiera de las tres medidas sobre z, y las otras dos
en el plano—, salvo que el ítem traiga orientación obligatoria, en cuyo caso quedan solo las 2 que
dejan su alto declarado sobre z.

**Rationale**: FR-009 dice que la orientación "dice qué medida del bulto queda sobre cada eje" sin
acotar el conjunto, y AC-05 solo fija el eje vertical cuando hay orientación obligatoria: las 2 que
sobreviven son las dos rotaciones horizontales de esa cara. Admitir las 6 es lo que hace que
"no entra en ninguna orientación" (caso borde de RF-09) sea una afirmación verificable y no una
consecuencia de haber probado pocas.

**Alternatives considered**: solo giros en el plano horizontal (2 orientaciones) —descartado: deja
afuera colocaciones válidas de bultos altos y angostos, y el PRD no pide esa restricción.

---

## 5. Contacto contra superposición

**Decision**: dos bultos se superponen cuando sus cajas se intersecan en un volumen mayor que cero.
Compartir una cara, una arista o un vértice **no** es superposición. En milímetros enteros: hay
superposición si en los tres ejes los intervalos se solapan en más de 0 mm.

**Rationale**: FR-010 prohíbe las superposiciones y al mismo tiempo FR-010 exige que los bultos se
apoyen unos sobre otros, lo que es imposible sin contacto. Con intervalos semiabiertos
`[inicio, inicio + medida)` y aritmética entera, la cuenta no tiene casos de borde: dos bultos
pegados dan intersección exactamente 0.

**Alternatives considered**: exigir una separación mínima de 1 mm —descartado: inventa una holgura
que el PRD no pide y deteriora el aprovechamiento sin motivo.

---

## 6. Reparto del peso que baja por la pila

**Decision**, en aritmética entera, sin punto flotante en ningún paso (FR-027):

```
Para un bulto B con peso propio p_B (gramos) y carga recibida c_B (gramos):
  total_B      = p_B + c_B
  apoyos(B)    = los bultos sobre los que B se apoya
  area_i       = área de contacto con el apoyo i, en mm² enteros
  area_total   = Σ area_i
  aporte a i   = ceil(total_B × area_i / area_total)        ← división entera redondeada arriba
```

Se resuelve de arriba hacia abajo en el orden inverso al de colocación, de modo que cuando se
procesa B su `c_B` ya está completa. Un bulto apoyado en el piso no reparte nada.

**Rationale**: la clarificación del spec fijó "proporcional al área, entero, hacia arriba"; esto es
la fórmula concreta que el acomodador y el validador tienen que poder escribir por separado y
clavar igual. El redondeo hacia arriba garantiza que `Σ aportes ≥ total_B`: el reparto nunca
subestima lo que recibe un apoyo, así que un error de redondeo solo puede rechazar una pila
dudosa, nunca aceptar una imposible. `ceil(a×b/c)` con enteros se escribe `(a*b + c - 1) / c` y da
el mismo número en cualquier implementación, que es lo que "sin tolerancia" exige.

El orden inverso al de colocación sirve como orden de resolución porque el apoyo siempre se carga
antes que lo que se apoya sobre él: es la misma propiedad de prefijo que pide AC-24.

**Alternatives considered**: reparto en punto flotante proporcional al área —descartado: dos
implementaciones independientes divergen en el último bit y "sin tolerancia" deja de ser
verificable. Cargar el 100% a cada apoyo —descartado por el usuario: rechaza pilas sanas y baja el
aprovechamiento.

---

## 7. Área de apoyo y el 80%

**Decision**: el área de apoyo de un bulto es la suma de las áreas de intersección, en el plano xy,
entre su cara inferior y las caras superiores que están exactamente a su misma altura z, sean del
piso o de bultos cargados antes en la secuencia. Pasa si `area_apoyada × 100 ≥ 80 × area_base`, con
multiplicación entera en vez de división para no redondear.

**Rationale**: "al menos el 80%" es inclusivo, así que el caso de exactamente 80% pasa; escribir la
comparación multiplicando evita inventar una regla de redondeo. Exigir misma altura z exacta es lo
que vuelve la cuenta determinística: un apoyo "casi tocando" no existe en milímetros enteros.

Esta misma área de intersección es la que alimenta el reparto de peso de la decisión 6, así que el
acomodador y el validador la calculan una vez cada uno y la usan para las dos cosas.

**Alternatives considered**: apoyo por envolvente convexa de los puntos de contacto —descartado:
más caro y más difícil de reproducir, sin ganancia para cajas rectangulares.

---

## 8. Fórmula del aprovechamiento

**Decision**:

- **Volumen** = Σ (largo × ancho × alto de cada bulto **colocado**) ÷ (largo × ancho × alto
  **internos** del contenedor), en mm³ enteros, presentado como porcentaje con un decimal.
- **Peso** = Σ (peso de cada bulto colocado) ÷ **carga útil** del contenedor, en gramos enteros,
  igual presentación.

Los bultos que quedaron afuera no entran en ninguno de los dos numeradores.

**Rationale**: FR-012 manda informar los dos porcentajes sin definirlos, y un porcentaje sin
numerador declarado no es verificable. Volumen por caja envolvente es consistente con el supuesto
del spec de que los cilindros se modelan por su envolvente: un tambor ocupa su caja, no su cilindro.
La carga útil como denominador del peso es la misma magnitud que FR-007 fija como límite, así que
100% de aprovechamiento de peso significa exactamente "llegó al tope".

**Alternatives considered**: volumen contra el volumen de la puerta o contra el volumen útil
descontando holguras —descartado: la puerta no se modela (supuesto del spec) y las holguras no
existen como concepto en el PRD.

---

## 9. Paleta de 12 colores y umbral de distinción

**Decision**: la distancia perceptual se mide en **OKLab**, como distancia euclídea entre los
colores convertidos desde sRGB. El umbral queda declarado como una constante en `src/vista3d/paleta.ts`,
al lado de la paleta, y `paleta.test.ts` falla si algún par de los 12 queda por debajo.

El valor del umbral **no se fija en este plan**: se elige generando la paleta y midiendo, y el
número que quede va al informe con el comando que lo produjo.

**Rationale**: OKLab fue diseñado para que la distancia euclídea se corresponda con la diferencia
percibida, y se implementa en unas pocas decenas de líneas sin agregar ninguna dependencia —que es
una restricción dura del proyecto. CIEDE2000 es más preciso pero su fórmula es larga y llena de
casos especiales: implementarla a mano para un test es más superficie de error que la que resuelve.

Por qué el umbral no se inventa acá: el PRD fija 12 colores y `AGENTS.md` prohíbe aflojar umbrales
para que algo pase. Si se declara un umbral alto y los 12 colores no lo alcanzan, la salida honesta
es decirlo y que el usuario decida entre bajar el umbral o revisar los 12 —no ajustar el número en
silencio hasta que el test pase. Por eso el orden es: generar, medir, declarar.

**Alternatives considered**: CIEDE2000 —rechazado por complejidad sin dependencia. ΔE76 en CIELAB
—rechazado: es el que se sabe que miente más en azules y saturados, justo donde una paleta de 12
va a apretar.

---

## 10. Distinguir bultos del mismo tipo dentro de una pila

**Decision**: el color sale del tipo de ítem y la separación entre bultos vecinos se dibuja con
aristas: cada instancia lleva su contorno. El color no se modula por bulto.

**Rationale**: FR-013 pide las dos cosas a la vez —dos tipos distinguibles entre sí y dos bultos del
mismo tipo distinguibles entre ellos— y hacerlas con el mismo canal se pelea consigo mismo: variar
el tono por bulto reduce la distancia entre tipos, que es justo lo que mide SC-015. Separar los
canales deja la paleta intacta y hace que la distinción dentro de la pila no dependa del color.

**Alternatives considered**: variar el brillo por bulto —descartado por lo anterior: rompe la
garantía de SC-015 para ganar lo que una arista ya da.

---

## 11. Hacer cumplir que el validador no comparta valores

**Decision**: `tests/arquitectura/imports.test.ts` recorre los archivos de `src/acomodador/` y
`src/validador/` con la API de compilador de TypeScript —que ya es dependencia— y falla si
encuentra: un import de una carpeta hacia la otra, o un import de `src/dominio/` que no sea
`import type`.

**Rationale**: el Principio II es la clase de regla que se incumple sin querer, con un import
automático del editor, y que no se nota hasta que el validador deja de detectar un error del
acomodador. Un test lo convierte en algo que rompe el build en el momento. Usar la API de compilador
en vez de una expresión regular evita los falsos positivos de un `import type` escrito en varias
líneas o de la palabra "type" dentro de un comentario.

**Alternatives considered**: una regla de ESLint —descartada por ahora: agregaría una dependencia y
`AGENTS.md` pide acordarlas. Revisión manual en cada commit —descartada: es exactamente lo que el
principio dice que no hay que confiarle a la atención.

---

## 12. Límite por IP en una función serverless

**Decision**: contador en memoria del proceso, con ventanas deslizantes de 1 minuto y 1 hora. La IP
se toma del primer valor de `x-forwarded-for`, con el `remoteAddress` como respaldo. El límite se
evalúa **antes** de cualquier llamada al proveedor.

**Rationale**: es lo que el PRD ya declara como deuda —"cuenta en la memoria de cada instancia y se
reinicia con cada arranque en frío"— y el spec lo deja fuera de alcance de forma explícita: alcanza
con contar por instancia. Detrás de la red de Vercel, `x-forwarded-for` es el único lugar donde está
la IP del cliente; `remoteAddress` sería la del borde.

Que el límite se evalúe antes de llamar es lo que hace medible a SC-014: "cero llamadas al proveedor
por pedidos rechazados" solo se puede afirmar si el rechazo ocurre antes, en el mismo archivo.

**Alternatives considered**: un almacén compartido (Redis / KV) —descartado: agrega dependencia e
infraestructura para cerrar una deuda que el PRD ya aceptó. Confiar solo en el tope de gasto del
proveedor —descartado: no frena una ráfaga, solo acota su costo total.

---

## 13. Unidades que se aceptan al interpretar

**Decision**: longitudes en mm, cm, m y pulgadas; pesos en g, kg y toneladas; capacidad en litros,
que **no** es una medida sino una clave para buscar en el catálogo ("tambor de 200 litros"). Sin
unidad, una longitud está en centímetros (FR-002) y un peso en kilos. La conversión la hace el
código, no el modelo: el modelo devuelve número y unidad tal como aparecen en el texto.

**Rationale**: FR-002 fija el default pero no el conjunto aceptado, y sin ese conjunto el dataset no
se puede etiquetar: no habría forma de decir si "2 metros" se extrajo bien. Que convierta el código
y no el modelo es el Principio I otra vez: una conversión es una cuenta, y las cuentas no se le
piden al modelo.

Los litros merecen nota aparte porque son la trampa: "200 litros" no da ninguna medida: da una
entrada de catálogo, que es la que trae las medidas, marcadas como estimadas.

**Alternatives considered**: aceptar cualquier unidad y que el modelo normalice a milímetros
—descartado: mete al modelo a decidir, y un error de conversión suyo llega como dato declarado, sin
marca de estimado.

---

## 14. Cómo el modelo propone entradas del catálogo

**Decision**: el prompt lleva la lista de ids del catálogo con sus nombres y sinónimos, y el modelo
solo puede devolver un id de esa lista o ninguno. El código verifica el id contra el catálogo y, si
no existe, descarta la propuesta de ese ítem entera y lo trata como ítem sin entrada (FR-005). El
catálogo gana un campo `sinonimos` para que "tambor", "tacho" y "bidón de 200" lleguen a la misma
entrada.

**Rationale**: FR-005 habla de "el id de catálogo que propone el modelo", lo que presupone que el
modelo los conoce, pero el spec nunca dice cómo. Mandarlos en el prompt es lo que hace que la
verificación del código sea una red de seguridad y no el mecanismo principal. Los sinónimos van en
el catálogo y no en el prompt porque son un dato del dominio: versionados, revisables y con fuente.

**Alternatives considered**: no mandar ids y matchear por nombre en el código, con distancia de
edición —descartado: el matcheo difuso es justo lo que `CONTEXTO.md` dice que se acota mostrando qué
entrada se usó, no ampliando. Mandar el catálogo entero con medidas —descartado: infla el pedido y
tienta al modelo a copiar medidas en vez de proponer el id, que es lo que el Principio I prohíbe.

---

## 15. Máquina de referencia de SC-009

**Decision**: la medición de los 30 fps declara CPU, GPU, resolución de la ventana y versión de
Chrome, y se toma con la cámara en órbita continua durante 10 segundos, reportando el **mínimo**
sostenido y no el promedio. Todo eso va a `eval/ultimo-informe.md` junto al número.

**Rationale**: un número de fps sin máquina no es reproducible, y SC-009 es el criterio que el
propio spec marca como el que puede morder. La órbita continua es el caso peor realista —una vista
fija deja al navegador sin trabajo— y el mínimo sostenido es lo que una persona percibe como tirón;
un promedio de 30 fps puede esconder caídas a 10.

**Alternatives considered**: promedio con la cámara quieta —descartado: mide el caso más favorable y
haría pasar SC-009 sin que la vista sea fluida.

---

## Lo que queda abierto a propósito

| Tema | Por qué no se cierra acá |
|---|---|
| Valor del umbral de la paleta | Sale de generar y medir, no de elegir un número (decisión 9) |
| Valor de `max_tokens` | Sale de medir el dataset (decisión 2) |
| Registros y privacidad de las descripciones | El PRD no lo pide; es un requerimiento nuevo, no una decisión de plan |
| Navegación 3D y accesibilidad por color | Huecos de requerimiento anotados en los checklists; no bloquean el diseño |
| Contenido exacto del catálogo | Es el primer entregable (FR-019) y cada entrada necesita su ficha: se arma con fuentes, no se planifica |

## Sources

- [DeepSeek — Error Codes](https://api-docs.deepseek.com/quick_start/error_codes/)
- [DeepSeek — JSON Output](https://api-docs.deepseek.com/guides/json_mode)
- [DeepSeek — Models & Pricing](https://api-docs.deepseek.com/quick_start/pricing/)
- [DeepSeek — Rate Limit & Isolation](https://api-docs.deepseek.com/quick_start/rate_limit/)
