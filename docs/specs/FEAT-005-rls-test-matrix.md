# FEAT-005 - Matriz de pruebas RLS y cuenta

| Operación | anon | propietario | otro usuario | admin activo | baneado |
| --- | --- | --- | --- | --- | --- |
| Leer `profiles` | Denegar | Solo propio | Solo propio | Todos | Solo propio |
| Escribir `profiles` directamente | Denegar | Denegar | Denegar | Denegar | Denegar |
| Ejecutar `update_my_profile` | Denegar | Permitir | Solo el suyo | Solo el suyo | Denegar |
| Leer preferencias | Denegar | Solo propias | Solo propias | Todas | Solo propias |
| Escribir preferencias directamente | Denegar | Denegar | Denegar | Denegar | Denegar |
| Subir avatar | Denegar | Carpeta propia | Carpeta propia | Carpeta propia | Denegar |
| Leer avatar privado | Denegar | Propio | Denegar | Permitir | Propio |
| Leer avatar de autor público | Permitir | Permitir | Permitir | Permitir | Permitir |
| Administrar rol/baneo | Denegar | Denegar | Denegar | RPC limitada | Denegar |
| Ejecutar RPC destructiva | Denegar | Denegar | Denegar | Denegar | Denegar |
| Eliminar cuenta desde servidor | Denegar | Tras reautenticar | Solo la suya | Solo la suya | Tras reautenticar |

`supabase/tests/profile_account.test.sql` verifica creación desde metadata,
aislamiento de lectura, revocación de escritura directa, actualización por RPC,
preferencias, validación de avatar, autor sanitizado y eliminación selectiva.

La regresión principal exige que este ataque falle:

```sql
UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid();
```
