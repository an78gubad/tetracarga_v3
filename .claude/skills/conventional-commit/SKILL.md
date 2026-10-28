---
name: conventional-commit
description: Genera mensajes de commit siguiendo Conventional Commits a partir de los cambios en stage. Se usa al crear un commit o cuando el usuario pide un mensaje de commit.
---

# Conventional commit

Escribís el mensaje a partir de lo que realmente cambió, no de lo que se habló en la
conversación.

Si no hay nada en stage, no stageás a ciegas. Los archivos que cambiaste vos en el paso
que acabás de terminar los agrupás en commits, uno por cambio con sentido propio, y
commiteás sin esperar: `INSTRUCCIONES.md` ya lo autoriza. Si hay pendientes que no
tocaste vos, no los incluís: los mencionás y esperás el ok. El `git add` va siempre
por nombre de archivo.
Nunca stageás `.env` ni `.env.*` (salvo `.env.example`).

## Pasos

1. Mirá el cambio: `git diff --cached --stat` y `git diff --cached`. Si hace falta
   contexto, `git log --oneline -10`.
2. Si el stage mezcla cambios sin relación (por ejemplo, un fix del validador y una
   edición del PRD), proponé partirlo en varios commits antes de escribir el mensaje.
3. Elegí tipo y scope, escribí el mensaje con el formato de abajo.
4. Si el usuario pidió solo el mensaje, mostralo y terminá. Si pidió el commit,
   commiteá con ese mensaje (con un heredoc o `-F` para respetar los saltos de línea).

## Formato

```
<tipo>(<scope>): <descripción>

<cuerpo opcional>

<footer opcional>
```

### Tipo

| Tipo       | Cuándo                                                        |
|------------|---------------------------------------------------------------|
| `feat`     | Comportamiento nuevo visible para el usuario                  |
| `fix`      | Corrige un comportamiento incorrecto                          |
| `refactor` | Cambia estructura sin cambiar comportamiento                  |
| `perf`     | Mejora rendimiento sin cambiar comportamiento                 |
| `test`     | Agrega o corrige tests, sin tocar código de producción        |
| `docs`     | PRD, AGENTS.md, CONTEXTO.md, INSTRUCCIONES.md, README, comentarios |
| `build`    | Dependencias, Vite, tsconfig, package.json                    |
| `ci`       | Pipelines de integración continua                             |
| `style`    | Formato, sin cambio de lógica                                 |
| `chore`    | Mantenimiento que no entra en ninguno de los anteriores (skills, configuración de `.claude/`) |

Si el cambio toca código de producción y tests, el tipo lo define el código de
producción: los tests acompañan.

### Scope

Opcional, en minúsculas, una sola palabra: el módulo o área afectada. Usá el nombre
de la carpeta bajo `src/` cuando aplique (`dominio`, …) o el área del proyecto
(`acomodador`, `validador`, `interprete`, `catalogo`, `vista3d`, `api`, `prd`).
Si el cambio cruza varias áreas, omitilo antes que inventar uno genérico.

### Descripción

- En castellano, en tercera persona del presente, como el historial del repo:
  "agrega", "corrige", "convierte" — no "agregar" ni "agregué".
- Minúscula inicial, sin punto final, hasta ~72 caracteres en toda la primera línea.
- Dice qué cambia, no cómo se implementó.

### Cuerpo

Solo si aporta. Explica el **por qué** y lo que no se deduce del diff, cortando
líneas a 72 caracteres. Si el cambio atiende un requerimiento del PRD, citalo con su
código tal cual (`RF-07`, `RNF-03`, `AC-16`); nunca renumeres ni inventes códigos.

### Footer

Cambio incompatible: `!` después del tipo/scope (`feat(api)!: …`) y un footer
`BREAKING CHANGE: <qué se rompe y cómo migrar>`.

## Ejemplos

```
feat(acomodador): apila bultos respetando el peso máximo sobre cada cara

Un tambor de 200 litros quedaba encima de cajas de cartón porque solo se
miraba el volumen libre. Ahora cada apoyo declara cuánto peso soporta y
el acomodador descarta las posiciones que lo superan (RF-06).
```

```
fix(validador): rechaza bultos que sobresalen del contenedor por redondeo
```

```
docs(prd): agrega RNF-08 sobre el punto único de acceso al proveedor
```

```
chore: agrega el skill conventional-commit
```
