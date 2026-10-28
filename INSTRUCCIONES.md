# Cómo se trabaja

## Commits
- Cada paso que queda andando se commitea en el momento: tests y chequeo de tipos en verde, commit con el skill `conventional-commit` y push.
- Commits chicos y atómicos: un cambio con sentido propio por commit. Un paso del plan suele dar varios.
- El commit que solo tilda una línea de `PLAN.md` no existe: el tick viaja en el commit del paso que lo completa. En la entrega anterior, 25 de 79 commits eran eso y ensuciaban la historia.
- La historia no se reescribe: nada de `amend`, `reset` sobre lo pusheado, `rebase` ni `push --force`. Si algo sale mal, se deshace con un commit nuevo (`git revert`).

## Tests
- En `src/acomodador/` y `src/validador/`, el test va primero y en su propio commit: se commitea antes del código que lo hace pasar y el mensaje dice que falla hasta el commit siguiente (`test(acomodador): fija el 80% de apoyo (falla hasta el commit que lo implementa)`). Es la única excepción a commitear en verde y dura un commit: el que viene atrás lo pone en verde.
- La excepción no se tapa con `.skip`, `.only` ni `.todo`, y no autoriza dejar la suite en rojo más allá de ese commit.
- En el resto del proyecto el test entra en el commit de la feature.

## Proceso
- Plan primero, un paso por vez.
- Los identificadores RF/RNF/AC no se renumeran: los tests y comentarios los citan. Lo nuevo va al final.
- Los números medidos van a `eval/ultimo-informe.md`, nunca al PRD.
- La vista 3D se verifica en el navegador, no solo con tests.
- Las exclusiones locales van por `.git/info/exclude`, no por `.gitignore`.
