# Cómo se trabaja

## Commits
- Cada paso que queda andando se commitea en el momento: tests y chequeo de tipos en verde, commit con el skill `conventional-commit` y push.
- Commits chicos y atómicos: un cambio con sentido propio por commit. Un paso del plan suele dar varios.
- La historia no se reescribe: nada de `amend`, `reset` sobre lo pusheado, `rebase` ni `push --force`. Si algo sale mal, se deshace con un commit nuevo (`git revert`).

## Proceso
- Plan primero, un paso por vez.
- Los identificadores RF/RNF/AC no se renumeran: los tests y comentarios los citan. Lo nuevo va al final.
- Los números medidos van a `eval/ultimo-informe.md`, nunca al PRD.
- La vista 3D se verifica en el navegador, no solo con tests.
- Las exclusiones locales van por `.git/info/exclude`, no por `.gitignore`.
