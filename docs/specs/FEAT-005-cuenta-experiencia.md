# Feature Spec: FEAT-ACCOUNT-05 - Cuenta y experiencia unificada

## 1. Objetivo

Completar el ciclo de cuenta y unificar la navegación y el lenguaje visual de
SaborSemanal sin exponer datos privados ni recuperar permisos directos sobre
`profiles`.

## 2. Perfil

- Nombre visible de 2 a 60 caracteres.
- Avatar privado JPG, PNG o WebP de hasta 2 MiB.
- El avatar y nombre pueden mostrarse junto a recetas públicas aprobadas.
- Email, rol y estado de bloqueo no forman parte de la identidad pública.
- El usuario edita su perfil exclusivamente mediante `update_my_profile`.

## 3. Preferencias alimentarias

`profile_allergens` relaciona al usuario con los alérgenos que desea evitar.
El catálogo los aplica cuando no recibe filtros explícitos y permite
desactivarlos temporalmente con `preferences=off`. El detalle de receta muestra
una advertencia si existe conflicto.

## 4. Seguridad de cuenta

- Login conserva el destino protegido solicitado.
- Registro inicializa el nombre visible desde metadata validada.
- Recuperación intercambia el código PKCE antes de establecer contraseña.
- Cambios de email y contraseña requieren reautenticación.
- Logout elimina la sesión y vuelve a portada.
- Usuarios bloqueados no acceden al dashboard.

Las escrituras directas sobre `profiles` y `profile_allergens` están revocadas.
La administración de `role` y `banned` queda limitada a
`admin_set_profile_access`.

## 5. Eliminación

Tras reautenticar con contraseña, una acción de servidor con `service_role`
marca `deletion_requested_at`, retira los objetos Storage y ejecuta
`delete_user_account`, que no está
disponible para clientes autenticados. La operación:

- elimina borradores, recetas privadas y pendientes;
- conserva recetas públicas aprobadas como anónimas y sin imagen;
- elimina el usuario Auth y deja actuar las cascadas de perfil, preferencias,
  menús y listas.

La operación exige contraseña y confirmación textual en la interfaz.

## 6. Interfaz

- Cabecera pública compartida.
- Navegación persistente en dashboard con avatar, cuenta y logout.
- Navegación administrativa conectada al panel personal.
- Auth con identidad visual crema, esmeralda y ámbar.
- Estados globales 404 y error.
- Diseño responsive y foco visible en controles interactivos.

## 7. Migración

- `202607300016_profile_account.sql`: perfil, preferencias, bucket, políticas y
  RPC.
- `202607300017_function_privileges.sql`: allowlist explícita de funciones para
  los roles API.
- `202607300018_account_deletion_state.sql`: estado reanudable de eliminación.

## 8. Criterios de aceptación

1. Un usuario actualiza solo nombre, avatar y alérgenos propios.
2. No puede modificar directamente `role`, `banned`, email ni otro perfil.
3. El catálogo aplica y permite desactivar preferencias guardadas.
4. Solo recetas públicas aprobadas exponen nombre y avatar sanitizados.
5. Login, logout y recuperación de contraseña completan su recorrido.
6. Un usuario bloqueado no accede al panel.
7. El borrado conserva solo recetas públicas aprobadas como anónimas.
8. Las vistas públicas, privadas, auth y admin comparten navegación coherente.
9. Migraciones, pruebas SQL, TypeScript, lint y build terminan correctamente.
