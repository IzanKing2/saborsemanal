# 🚀 Feature Spec: FEAT-AUTH-01 - Infraestructura, Base de Datos y Autenticación

Este documento describe la especificación técnica, el plan de acción y los criterios de aceptación para el **Hito 1** del proyecto SaborSemanal.

---

## 📋 1. Descripción de la Funcionalidad

Configurar la base para que el proyecto sea seguro, multiusuario y relacional. Implementaremos el esquema de base de datos en Supabase, el flujo de autenticación seguro (registro, login, recuperar contraseña) y el middleware de control de accesos para asegurar las páginas de la aplicación.

---

## 🛠️ 2. Especificación Técnica

### Base de Datos (Postgres & Supabase)

- **Triggers de Auth:** Cada vez que un usuario se registre mediante `auth.users` de Supabase, un trigger automático en la base de datos creará un registro correspondiente en la tabla pública `profiles`.
- **Políticas RLS:**
  - `profiles`: Lectura permitida para todos los autenticados. Escritura permitida solo para el propio usuario o un admin.
  - No se permiten lecturas anónimas a datos de perfiles de usuario.

### Next.js & Supabase Auth Client

- Utilizar `@supabase/ssr` para manejar sesiones tanto en componentes de servidor (Server Components) como en componentes de cliente (Client Components) y Middleware.
- **Rutas Protegidas:**
  - `/dashboard/*` y `/dashboard/planificador`: Requieren sesión activa de usuario.
  - `/admin/*`: Requiere sesión activa de usuario y que el campo `role` en `profiles` sea igual a `'admin'`.

---

## 🗄️ 2b. Decisiones de Arquitectura DB (Registradas en sesión — 2026-07-30)

Estas decisiones fueron tomadas en sesión de Modo Plan y **deben respetarse antes de ejecutar cualquier migración**. Si alguna decisión cambia, actualizar esta sección primero.

### Decisión A — Modelo de Alérgenos

**Elección:** Tabla `alergenos` + tabla relacional `ingrediente_alergenos`.

**Motivo:** Permite múltiples alérgenos por ingrediente (ej: la leche tiene lactosa y caseína) con integridad referencial completa. Soporta el filtro de alérgenos planificado en el Hito 2 sin necesidad de migración posterior.

**Tablas nuevas respecto a la constitución:**

- `alergenos (id, nombre, created_at)` — catálogo global de alérgenos.
- `ingrediente_alergenos (ingrediente_id, alergeno_id)` — relación M:N entre ingredientes y alérgenos.

**Orden en migraciones:** `alergenos` debe ejecutarse antes de `ingredientes`. `ingrediente_alergenos` después de ambos.

---

### Decisión B — PK de `receta_ingredientes`

**Elección:** Mantener la clave primaria original `PRIMARY KEY (receta_id, ingrediente_id)`.

**Motivo:** Cada ingrediente aparece una sola vez por receta. Si una receta requiere el mismo ingrediente en dos preparaciones distintas, las cantidades deben consolidarse en una sola fila antes de insertar. Esta restricción simplifica el algoritmo de consolidación de la lista de la compra (Hito 4).

**Consecuencia operativa:** Al insertar en `receta_ingredientes`, el frontend o la API deben validar que no se intente duplicar un `ingrediente_id` para la misma `receta_id`.

> **Superada en Hito 2:** la migración `202607300009` añadió una PK UUID para
> admitir ingredientes personalizados. La unicidad de ingredientes maestros se
> conserva mediante un índice parcial `(receta_id, ingrediente_id)`.

---

### Decisión C — `shopping_list_items` vinculada al menú

**Elección:** Añadir columna `menu_id UUID NULL REFERENCES menus_semanales(id) ON DELETE SET NULL`.

**Motivo:** Sin este vínculo, los ítems de compra flotan sin referencia al menú que los originó, imposibilitando regenerar o actualizar la lista si el usuario modifica su menú semanal.

**Nullable porque:** Los usuarios invitados generan su lista en LocalStorage. Al registrarse y sincronizar en la nube, puede que el `menus_semanales` aún no esté persistido. La columna acepta `NULL` para cubrir este caso de transición.

---

### Orden de Migraciones SQL (obligatorio)

Las migraciones deben ejecutarse en este orden exacto para respetar las FK:

```
01 — categorias_ingredientes
02 — alergenos
03 — ingredientes              (FK → categorias_ingredientes)
04 — ingrediente_alergenos    (FK → ingredientes, alergenos)
05 — profiles                 (FK → auth.users + trigger de sincronización)
06 — recetas                  (FK → profiles)
07 — receta_ingredientes      (FK → recetas, ingredientes)
08 — menus_semanales          (FK → profiles)
09 — menu_recetas             (FK → menus_semanales, recetas)
10 — shopping_list_items      (FK → profiles, ingredientes, menus_semanales)
```

---

## 🗓️ 3. Plan de Acción (Lista de Tareas)

- [x] **Tarea 1.1: Inicialización del repositorio y Next.js** ✅ 2026-07-30
  - Next.js 15 con TypeScript estricto, Tailwind CSS v4, ESLint y PNPM.
  - Dependencias Supabase instaladas: `@supabase/ssr` y `@supabase/supabase-js`.
  - Clientes Supabase separados: `client.ts`, `server.ts`, `middleware.ts`.
- [x] **Tarea 1.2: Definición de Esquema SQL en Supabase** ✅ 2026-07-30
  - 10 tablas migradas en orden de dependencias FK.
  - Tablas nuevas: `alergenos`, `ingrediente_alergenos`, `menu_id` nullable en `shopping_list_items`.
  - Trigger `handle_new_user()` con `SECURITY DEFINER` + `SET search_path = public`.
  - RLS activo en todas las tablas con políticas explícitas por comando.
  - Conexión via OpenCode + MCP de Supabase.
- [x] **Tarea 1.3: Componentes de Autenticación en Frontend** ✅ 2026-07-30
  - Formularios accesibles para Registro, Login y Recuperación de contraseña.
  - Validación cliente: 8 chars mínimo, mayúscula, número, confirmación.
  - Route handler `/auth/callback` para intercambio de código de sesión.
- [x] **Tarea 1.4: Middleware de Next.js y Seguridad** ✅ 2026-07-30
  - `getUser()` sobre `getSession()` para validación segura del token.
  - Protección `/admin/*` con verificación de role en `profiles`.
  - Protección `/dashboard/*` con verificación de sesión activa.
  - Matcher configurado para excluir assets estáticos.

---

## 🛡️ 4. Criterios de Aceptación (Verificación)

1.  **Criterio 1 (Sincronización):** Al registrarse un usuario con email y contraseña, debe crearse automáticamente una fila en `public.profiles` con su `id` y su `role` por defecto en `'usuario'`.
2.  **Criterio 2 (Acceso no logueado):** Si un invitado intenta entrar a `/dashboard/planificador`, el sistema debe redirigirlo inmediatamente a `/login`.
3.  **Criterio 3 (Permisos de Admin):** Si un usuario logueado con rol `'usuario'` intenta acceder a `/admin/usuarios`, el middleware debe redirigirlo a `/dashboard` con un mensaje de error "No autorizado".
4.  **Criterio 4 (Robustez de contraseña):** El formulario de registro debe validar que la contraseña tenga mínimo 8 caracteres, al menos una mayúscula y un número.

---

## 🏆 5. Cierre del Hito 1 — 2026-07-30

**Estado:** ✅ COMPLETADO Y VERIFICADO

### Criterios de Aceptación — Resultado

1. **Criterio 1 (Sincronización):** ✅ Trigger `on_auth_user_created` crea fila en `profiles` automáticamente al registrar usuario.
2. **Criterio 2 (Acceso no logueado):** ✅ `/dashboard/planificador` sin sesión redirige a `/login`.
3. **Criterio 3 (Permisos de Admin):** ✅ Usuario con `role = 'usuario'` en `/admin/*` redirige a `/dashboard`.
4. **Criterio 4 (Robustez de contraseña):** ✅ Formulario valida 8 chars, mayúscula y número antes de llamar a Supabase.

### Commit

`feat(auth): Hito 1 completo — DB, autenticación y middleware`

### Archivos entregados

- `src/app/(auth)/register/page.tsx`
- `src/app/(auth)/login/page.tsx`
- `src/app/(auth)/forgot-password/page.tsx`
- `src/app/auth/callback/route.ts`
- `src/middleware.ts`
- `src/lib/supabase/client.ts`
- `src/lib/supabase/server.ts`
- `src/lib/supabase/middleware.ts`
- `supabase/migrations/202607300001_base_schema.sql` (baseline no destructiva)
