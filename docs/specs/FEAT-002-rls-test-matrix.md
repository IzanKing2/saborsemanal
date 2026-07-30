# FEAT-002 - Matriz de pruebas RLS

Esta matriz verifica las políticas y RPC definidas en las migraciones
`202607300002` a `202607300012`.

## Actores

- `anon`: petición con la anon key y sin sesión.
- `usuario_a`: usuario activo propietario de la receta A.
- `usuario_b`: usuario activo que no es propietario.
- `baneado`: usuario con `profiles.banned = true`.
- `admin`: usuario activo con `profiles.role = 'admin'`.

## Casos

| Recurso y operación | anon | usuario_a | usuario_b | baneado | admin |
| --- | --- | --- | --- | --- | --- |
| Leer receta publicada y aprobada | Permitir | Permitir | Permitir | Permitir | Permitir |
| Leer receta pendiente de A | Denegar | Permitir | Denegar | Denegar salvo que sea propia | Permitir |
| Leer borrador de A | Denegar | Permitir | Denegar | Denegar salvo que sea propia | Permitir |
| Crear receta propia no aprobada | Denegar | Permitir | Permitir para sí | Denegar | Permitir para sí |
| Crear receta para otro usuario | Denegar | Denegar | Denegar | Denegar | Denegar |
| Establecer `aprobada = true` al crear | Denegar | Denegar | Denegar | Denegar | Solo mediante RPC de moderación |
| Editar receta A | Denegar | Permitir y desaprobar | Denegar | Denegar | Permitir |
| Cambiar ingredientes de receta A | Denegar | Solo mediante `save_recipe`, y desaprueba | Denegar | Denegar | Mediante flujos admin autorizados |
| Eliminar receta A | Denegar | Permitir | Denegar | Denegar | Permitir |
| Leer catálogos | Permitir | Permitir | Permitir | Permitir | Permitir |
| Modificar catálogos | Denegar | Denegar | Denegar | Denegar | Permitir |
| Leer emails de otros perfiles | Denegar | Denegar | Denegar | Denegar | Permitir |
| Cambiar el propio `role` o `banned` | Denegar | Denegar | Denegar | Denegar | Permitido sobre perfiles administrados |
| Subir imagen en carpeta propia | Denegar | Permitir | Permitir en la suya | Denegar | Permitir en la suya |
| Subir o borrar imagen en carpeta ajena | Denegar | Denegar | Denegar | Denegar | Denegar por policy de Storage |

## Verificaciones automatizadas ejecutadas

Después de desplegar la migración se comprobó mediante la API remota:

- `anon` puede consultar `recetas`: HTTP 200.
- `anon` puede consultar `receta_ingredientes`: HTTP 200.
- `anon` puede consultar `alergenos`: HTTP 200.
- El bucket es privado y solo entrega URLs firmadas a actores autorizados.
- `anon` no puede insertar una receta: HTTP 401.
- Los tipos generados incluyen `recetas.aprobada`, `recetas.updated_at`,
  `is_admin()` e `is_active_user()`.
- El historial local y remoto contiene las migraciones `001` a `012`.

Los recorridos autenticados principales fueron comprobados manualmente. La
automatización completa de esta matriz queda registrada como deuda técnica; al
implementarla debe usar clientes públicos con sesiones reales, nunca service
role, para que RLS sea quien autorice cada operación.
