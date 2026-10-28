# Tetracarga

Describís una carga en castellano —"40 cajas de 60x40x30 de 12 kilos y 15 tambores de 200
litros"— y la ves consolidada en un contenedor, en 3D, con el aprovechamiento de volumen y de
peso y qué quedó afuera.

## Requisitos

- **Node 22** (`node --version` tiene que decir `v22.x`)
- Una clave de API de [DeepSeek](https://platform.deepseek.com/)

## Correr la aplicación

```bash
npm install
cp .env.example .env     # y completar DEEPSEEK_API_KEY y DEEPSEEK_BASE_URL
npm run dev
```

`npm run dev` alcanza: Vite sirve la aplicación y también la función de `api/` como middleware,
así que no hay que levantar un segundo servidor.

Si falta una variable, la aplicación dice **exactamente cuál** y no hay que leer código para
averiguar su nombre.

### Variables de entorno

Están todas en [`.env.example`](./.env.example), sin valores.

| Variable | Para qué | Obligatoria |
|---|---|---|
| `DEEPSEEK_API_KEY` | Credencial del proveedor del modelo | Sí |
| `DEEPSEEK_BASE_URL` | URL base del proveedor | Sí |
| `DEEPSEEK_MODELO` | Modelo a usar; por defecto `deepseek-flash` | No |

Ninguna lleva prefijo `VITE_`, y es a propósito: Vite mete las que lo llevan en el bundle del
navegador, y ni la clave ni la URL del proveedor pueden llegar ahí. Viven solo del lado del
servidor.

## Correr los tests

```bash
npm test          # la suite completa
npm run typecheck # chequeo de tipos del navegador y del servidor
```

**La suite pasa sin red y sin credenciales.** Corre contra una implementación de prueba de la
interfaz del modelo, así que funciona en un repositorio recién clonado, sin `.env` y sin
conexión. Si un test necesita red, está mal escrito.

## Desplegar

Antes de poner esto en línea, **configurá el tope de gasto en el panel de DeepSeek**. No es
opcional: el intermediario es público, y el límite de pedidos por IP acota la velocidad pero no
el total. El tope de gasto es lo único que acota el daño en pesos si alguien abusa.

El despliegue no está completo sin eso.

```bash
npm run build     # chequea tipos y construye en dist/
```

Vercel toma `vercel.json`: sirve `dist/` y corre `api/` como función serverless.

## Correr la evaluación de precisión

```bash
npm run eval
```

Es el **único** comando que llama al proveedor real, y por lo tanto el único que gasta plata.
Está fuera de la suite a propósito.

Corre el dataset **3 veces** y reporta el peor de los tres: el proveedor no es determinístico, así
que una sola corrida puede dar suerte. Mide, sobre un dataset de 50 descripciones etiquetadas, qué
porcentaje de los campos declarados se extrae bien, que ningún campo ausente se complete con un
valor inventado, y qué porcentaje de ítems queda asociado a la entrada correcta del catálogo.

Los números van a `eval/ultimo-informe.md` con la fecha y el comando que los produjo.

## Cómo está organizado

| Carpeta | Qué hay |
|---|---|
| `src/` | Todo lo que llega al navegador. Nada de acá habla con el proveedor del modelo |
| `src/acomodador/` | Calcula la disposición. Escrito a mano, sin librería de packing |
| `src/validador/` | Verifica la disposición **rehaciendo las cuentas por separado**, a propósito |
| `src/catalogo/` | Único origen de los datos que el sistema completa. Cada entrada nombra su ficha |
| `server/` | La interfaz del modelo, sus implementaciones y el manejador del intermediario |
| `api/` | La función serverless, que solo envuelve al manejador |
| `escenarios/` | Los 10 escenarios de referencia y su disposición congelada |
| `specs/` | El spec, el plan y las tareas |

El porqué de las decisiones que más tientan a "mejorar" está en [`CONTEXTO.md`](./CONTEXTO.md);
los requerimientos, en [`PRD.md`](./PRD.md).

## Vocabulario

Se dice **consolidación**, no "cubicaje" ni "packing".
