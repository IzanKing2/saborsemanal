# SaborSemanal

SaborSemanal es una aplicación web para planificar menús semanales, descubrir recetas, gestionar alergias y generar listas de la compra a partir del menú. El proyecto está construido con Next.js, React, TypeScript y Supabase.

## Funcionalidades

- Catálogo público de recetas con búsqueda, filtros por tiempo y exclusión de alérgenos; en móvil los filtros se abren en un drawer.
- Planificador semanal con pool de recetas, asignación por día/comida y modo local para invitados.
- Lista de la compra generada desde el menú semanal, con elementos extra añadidos a mano y retirada individual de ingredientes.
- Carrito lateral con marcado de comprados, regeneración, retirada de ingredientes y vaciado con confirmación.
- Favoritos, creación/edición de recetas, subida de imágenes y enlaces de vídeo o YouTube como guía de preparación.
- Panel privado de usuario y panel de administración.
- Gestión admin de recetas, ingredientes, categorías y alérgenos.
- Autenticación, recuperación de contraseña, perfiles, roles, RLS y RPC seguras con Supabase.
- Popups de confirmación personalizados para acciones destructivas.

## Stack

- Next.js 15 con App Router.
- React 19 y TypeScript.
- Tailwind CSS 4.
- Supabase Auth, Postgres, RLS, RPC y Storage.
- pgTAP para pruebas de base de datos.
- ESLint con configuración de Next.js.

## Requisitos

- Node.js 20 o superior recomendado.
- npm.
- Docker Desktop para Supabase local.
- Supabase CLI, preferiblemente vía `npx --yes supabase@latest`.

## Configuración

1. Instala dependencias:

```bash
npm install
```

2. Crea `.env.local` con las variables necesarias:

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

3. Levanta Supabase local si vas a trabajar con migraciones o pruebas de BD:

```bash
npx --yes supabase@latest start
```

4. Aplica migraciones y datos locales:

```bash
npx --yes supabase@latest db reset
```

5. Arranca el entorno de desarrollo:

```bash
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Scripts

```bash
npm run dev
```

Arranca Next.js en desarrollo.

```bash
npm run build
```

Compila la aplicación para producción.

```bash
npm run start
```

Sirve la build de producción.

```bash
npm run lint
```

Ejecuta ESLint.

## Verificación

Antes de cerrar una tarea, ejecuta:

```bash
npx tsc --noEmit
npm run lint
npm run build
```

Si Next.js falla por caché obsoleta, limpia `.next` y repite el build:

```bash
rm -rf .next
npm run build
```

## Supabase

El esquema de base de datos vive en `supabase/migrations`. Las pruebas SQL viven en `supabase/tests`.

Comandos útiles:

```bash
npx --yes supabase@latest db reset
npx --yes supabase@latest migration new nombre_de_migracion
npx --yes supabase@latest db push
```

Las RPC principales se usan para encapsular escritura segura con `SECURITY DEFINER` y respetar RLS. No expongas operaciones destructivas con permisos directos de tabla si pueden implementarse como RPC validada.

RPC destacadas:

- `save_recipe`: guarda recetas, ingredientes, imagen y enlace opcional de vídeo.
- `add_menu_recipe` / `remove_menu_recipe`: gestionan el pool semanal del planificador.
- `save_menu_slot`: asigna recetas a huecos de la semana.
- `regenerate_shopping_list`: regenera la lista desde el menú semanal.
- `clear_shopping_list`: vacía la lista visible del usuario.
- `remove_shopping_item` / `remove_extra_item`: retiran ingredientes generados o añadidos manualmente.

### Recuperación De Contraseña

En Supabase Auth, añade estas Redirect URLs:

```text
http://localhost:3000/recuperar
https://TU_DOMINIO/recuperar
```

La plantilla de email de recuperación puede usar el flujo de token hash personalizado:

```html
<a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery">
  Restablecer contraseña
</a>
```

La aplicación también admite enlaces PKCE con `?code=...`, emitidos por la plantilla estándar de Supabase. El flujo interno usa una cookie temporal HTTP-only (`saborsemanal-recovery`) para permitir cambiar la contraseña sin dejar una sesión de recuperación abierta.

## Notas Funcionales

- Los filtros de recetas siempre envían `preferences=off` cuando el usuario aplica filtros manuales, evitando que se reactiven alérgenos guardados si no hay checkboxes seleccionados.
- En el carrito, los ingredientes derivados del menú pueden retirarse sin tocar el menú semanal. Si regeneras la lista, pueden volver a aparecer.
- En modo invitado, el planificador, el pool y la lista se guardan en `localStorage` por semana.
- Los enlaces de vídeo se guardan como URL HTTPS. YouTube se muestra embebido con `youtube-nocookie.com`; otros enlaces se abren como recurso externo.
- Los diálogos de confirmación usan `ConfirmDialog`, renderizado con portal al `document.body` para evitar problemas con headers con blur.

## Estructura

```text
src/app                       Rutas App Router y páginas server-side
src/components                Componentes de UI, navegación, recetas, planner y carrito
src/lib/actions               Server actions
src/lib/supabase              Clientes Supabase server/client/middleware/admin
src/lib                       Helpers de dominio
src/types/database.types.ts   Tipos generados/adaptados de Supabase
supabase/migrations           Migraciones SQL
supabase/tests                Tests pgTAP
docs/specs                    Especificaciones funcionales y matrices de seguridad
```

## Flujo De Desarrollo

1. Crea o actualiza migraciones en `supabase/migrations` para cambios de esquema/RPC.
2. Actualiza `src/types/database.types.ts` cuando cambien tablas o funciones usadas por TypeScript.
3. Implementa la UI con cambios mínimos y reutilizando componentes existentes.
4. Ejecuta verificación TypeScript, lint y build.
5. Si hay cambios de BD, valida con `npx --yes supabase@latest db reset` y los tests pgTAP.
6. Si una migración se aplica directamente al proyecto remoto, confirma permisos con `has_function_privilege` o asesores de Supabase cuando añadas RPC sensibles.

## Seguridad

- No publiques `.env.local` ni claves `service_role`.
- Usa `NEXT_PUBLIC_SUPABASE_ANON_KEY` solo para cliente público.
- Usa `SUPABASE_SERVICE_ROLE_KEY` únicamente en código server-side.
- Mantén RLS habilitado en tablas con datos de usuario.
- Prefiere RPC transaccionales para acciones sensibles o destructivas.

## Despliegue

1. Configura las variables de entorno en el proveedor de hosting.
2. Aplica migraciones de Supabase antes o durante el despliegue.
3. Ejecuta `npm run build` como validación previa.
4. Verifica autenticación, redirecciones y URLs permitidas en Supabase Auth.

## Licencia

Proyecto privado. Uso interno del repositorio.
