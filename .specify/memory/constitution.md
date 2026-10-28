# Constitución de Tetracarga

## Core Principles

### I. El modelo interpreta, el código decide

El modelo de lenguaje tiene un único trabajo: convertir texto libre en una lista de ítems. No
decide nada más.

- Todo dato que se completa —medidas, peso, marcas de RF-06— sale únicamente del catálogo
  versionado en el repositorio. NUNCA del modelo.
- Todo dato completado queda marcado como estimado e indica qué entrada del catálogo usó.
- Todo id de catálogo que propone el modelo lo verifica el código. Si no existe, la propuesta se
  descarta entera: NO se busca algo parecido, no se completa con lo más cercano.
- Lo que no se puede completar se le pregunta al usuario y bloquea la consolidación. Quedar
  bloqueado es el comportamiento correcto, no una falla.
- El acomodador NO usa el modelo.

Por qué: si el que decide "esto lo reconozco" es el modelo, siempre reconoce y siempre contesta un
número con cara de seguridad. No se arregla con prompt.

### II. Ninguna disposición imposible llega a la pantalla

Toda disposición pasa por un validador bloqueante antes de mostrarse. Lo que no pasa el validador
no se renderiza ni se guarda.

- El validador NO comparte código con el acomodador, ni siquiera constantes. Solo pueden compartir
  tipos.
- Cada uno trae sus propias cuentas, sus propios números y sus propios límites.

Por qué: si compartieran código, el validador no podría detectar los errores del acomodador.
Duplicar las cuentas es a propósito.

### III. La consolidación es determinística y queda congelada

La misma entrada da la misma disposición, bulto por bulto —posición, orientación y orden de
colocación—, sin tolerancia.

- Las disposiciones de los escenarios de referencia quedan congeladas en un archivo versionado.
  NO en snapshots que se reescriben solos con un flag de actualización.
- Si una disposición no coincide con la congelada, el error está en el código.
- La línea base, el dataset y el catálogo NO se modifican para que algo pase. Tocar cualquiera de
  los tres lo decide el usuario, explícitamente.

Por qué: el acomodo es NP-duro y puede comerse el proyecto. Congelarlo es lo que permite cerrarlo.

### IV. Ningún dato sin fuente

- Cada entrada del catálogo nombra la ficha exacta de la que sale. Si no hay fuente, se pregunta:
  no se inventa, no se estima, no se promedia entre fuentes.
- Ningún número de rendimiento ni de precisión se reporta si no sale de una corrida real, con la
  fecha y el comando que lo produjo.

Por qué: un dato inventado con cara de oficial es peor que un dato faltante.

### V. El proveedor del modelo queda aislado detrás del servidor

- Todo acceso al modelo pasa por una interfaz propia. Cambiar de proveedor es escribir otra
  implementación de esa interfaz, nada más.
- La credencial vive solo del lado del servidor y NUNCA llega al navegador: ni la clave, ni la URL
  del proveedor, ni ningún encabezado de autorización.
- El cliente alcanza al modelo a través de un proxy propio. No hay otro camino.

Por qué: una aplicación solo de navegador no puede proteger la clave, y el proveedor es la pieza
que más probablemente cambie.

### VI. Los tests no se debilitan

- La suite corre completa sin red y sin credenciales, contra una implementación de prueba de la
  interfaz del modelo.
- NO se saltean tests: nada de `.skip`, `.only` ni `.todo` commiteados.
- NO se aflojan umbrales ni se agregan tolerancias donde el criterio dice "sin tolerancia".

Por qué: un test aflojado para que pase deja de medir lo que el criterio pide.

## Restricciones de arquitectura

Estas restricciones son la forma en que los principios se hacen cumplir en el árbol de archivos.

- Nada de lo que llega al navegador habla con el proveedor del modelo. El proxy es el único punto
  de contacto.
- El acomodador y el validador viven en carpetas separadas y cada uno importa solo de la propia.
  Pueden compartir tipos, nunca valores (Principio II).
- La interfaz del modelo, sus implementaciones y el manejador del proxy no saben del framework de
  build ni de la plataforma de deploy.
- Ninguna variable de entorno con prefijo que la exponga al bundle del navegador lleva algo
  secreto.
- No se agregan dependencias sin acordarlo con el usuario. En particular, ninguna librería de
  packing: el acomodador y el validador se escriben a mano.
- El catálogo se toca en el repositorio, nunca desde la interfaz.

## Proceso de trabajo y barreras de calidad

- Plan primero, un paso por vez. Si no hay plan vigente, se arma y se acuerda antes de escribir
  código.
- Cada paso que queda andando se commitea en el momento, con tests y chequeo de tipos en verde.
  Commits chicos y atómicos. Única excepción: en el acomodador y el validador el test va en su
  propio commit, antes del código que lo hace pasar, y ese commit queda en rojo hasta el
  siguiente, que lo pone en verde. Existe para que la historia muestre el test primero; no
  autoriza dejar la suite en rojo más allá de ese commit ni saltear tests (Principio VI).
- La historia no se reescribe: nada de `amend`, `reset` sobre lo pusheado, `rebase` ni
  `push --force`. Lo que sale mal se deshace con un commit nuevo.
- Los identificadores RF/RNF/AC no se renumeran: los tests y los comentarios los citan. Lo nuevo va
  al final.
- Los números medidos van al informe de evaluación con fecha y comando, nunca al PRD (Principio
  IV).
- La vista 3D se verifica en el navegador, no solo con tests.
- Antes de cerrar un paso se verifica que no viole ninguno de los seis principios. Una violación
  es un bug, no una decisión de diseño pendiente.

## Governance

- El PRD manda sobre el qué: requerimientos, criterios de aceptación y alcance. Si esta
  constitución contradice al PRD, gana el PRD y se enmienda la constitución.
- Esta constitución manda sobre spec, plan y tasks. Un spec, un plan o una tarea que la contradiga
  se corrige antes de implementarse.
- Las enmiendas las aprueba el usuario, siempre. Toda enmienda deja registrada la versión nueva,
  qué cambió y por qué.
- Versionado semántico de la constitución: MAJOR si se saca o se redefine un principio de forma
  incompatible; MINOR si se agrega un principio o una sección, o se amplía la guía de forma
  sustantiva; PATCH para aclaraciones, redacción y correcciones que no cambian el significado.
- Tocar la línea base, el dataset o el catálogo lo decide el usuario (Principio III), igual que
  agregar dependencias.
- La guía operativa del día a día vive en `AGENTS.md`, `CONTEXTO.md` e `INSTRUCCIONES.md`. Esta
  constitución manda sobre esos tres; lo que no está acá, se resuelve ahí.

## Registro de enmiendas

- **1.1.0** (2026-10-28): se agrega la excepción de commit en rojo para el test primero en el
  acomodador y el validador, en "Proceso de trabajo y barreras de calidad", y esta sección. Por
  qué: en la entrega anterior los tests entraban siempre en el mismo commit que la feature, así
  que la historia no mostraba que el criterio se había fijado antes del código; el acomodador y
  el validador son los dos módulos donde eso más importa. Aprobada por el usuario.

**Version**: 1.1.0 | **Ratified**: 2026-10-28 | **Last Amended**: 2026-10-28
