# FEAT-003 - Matriz de pruebas RLS

| Operación | anon | propietario | otro usuario | baneado |
| --- | --- | --- | --- | --- |
| Leer `menus_semanales` | Denegar | Solo propios | Solo propios | Solo propios existentes |
| Leer `menu_recetas` | Denegar | Solo de sus menús | Solo de sus menús | Solo de sus menús existentes |
| Escribir tablas directamente | Denegar | Denegar | Denegar | Denegar |
| Ejecutar `save_menu_slot` | Denegar | Permitir | Permitir en su menú | Denegar |
| Asignar receta propia | Denegar | Permitir | Permitir la suya | Denegar |
| Asignar receta pública aprobada | Denegar | Permitir | Permitir | Denegar |
| Asignar receta ajena privada | Denegar | Denegar | Denegar | Denegar |
| Modificar menú ajeno | Denegar | Denegar | Denegar | Denegar |

Verificaciones realizadas:

- `/planificador` responde para invitados.
- `/dashboard/planificador` sin sesión redirige a `/login`.
- La RPC es la única vía con privilegios de escritura para `authenticated`.
- Las policies `SELECT` filtran por `auth.uid()`.
- Las migraciones `013` y `014` coinciden en local y remoto.

Las pruebas multiusuario completas deben automatizarse en una suite de
integración con sesiones reales antes de ampliar las políticas del planificador.
