# FEAT-004 - Matriz de pruebas RLS

| Operación | anon | propietario | otro usuario | baneado |
| --- | --- | --- | --- | --- |
| Leer `shopping_list_items` | Denegar | Solo propios | Solo propios | Solo propios existentes |
| Escribir tabla directamente | Denegar | Denegar | Denegar | Denegar |
| Ejecutar `regenerate_shopping_list` | Denegar | Permitir en su menú | Permitir en su menú | Denegar |
| Regenerar menú ajeno | Denegar | Denegar | Denegar | Denegar |
| Ejecutar `set_shopping_item_purchased` propio | Denegar | Permitir | Denegar | Denegar |
| Modificar elemento ajeno | Denegar | Denegar | Denegar | Denegar |

Verificaciones automatizadas en `supabase/tests/shopping_list.test.sql`:

- Cada aparición de receta aporta sus cantidades.
- Fuente y unidad iguales se suman; unidades distintas permanecen separadas.
- Los personalizados se consolidan por nombre normalizado y no por ID nulo.
- La regeneración inicializa los elementos como no comprados.
- `authenticated` no tiene privilegios directos de escritura.
- RLS oculta listas ajenas y la RPC rechaza su modificación.

La prueba se ejecuta con `npx supabase test db` sobre la base local reconstruida
con las migraciones `001` a `015`.
