# AGENTS.md — SaborSemanal

Guía de trabajo para agentes de IA en este repositorio. Léela antes de
empezar cualquier tarea. Todas las instrucciones aquí son vinculantes.

---

## 1. Proyecto

SaborSemanal es una aplicación web para planificar menús semanales, descubrir
recetas, gestionar alergias y generar listas de la compra a partir del menú.

**Stack obligatorio:**
- Next.js 15 con App Router
- TypeScript estricto (`strict: true` en `tsconfig.json`)
- Tailwind CSS 4
- PNPM como gestor de paquetes
- ESLint con configuración de Next.js
- Supabase (Auth, Postgres, RLS, RPC, Storage)

**Idioma:** el proyecto trabaja en español. Código, commits, comentarios,
documentación y mensajes de usuario se escriben en español (los identificadores
técnicos y nombres de tablas conservan la nomenclatura ya existente).

**Fuentes de verdad:**
- `docs/SaborSemanal-constitution.md` — misión, stack, modelo de datos, roles y roadmap.
- `docs/specs/*.md` — especificaciones funcionales por feature (con plan de acción, criterios de aceptación y cierre).
- `supabase/migrations/` — esquema ejecutable real (las migraciones versionadas mandan sobre bloques SQL sueltos en la constitución).

---

## 2. Skills disponibles

Este proyecto incluye skills en `.agents/skills/`. Cárgalas con la herramienta
`skill` cuando la tarea encaje con su fase. La skill
`using-agent-skills` es el meta-skill de descubrimiento: úsala si dudas de qué
skill aplica.

Secuencia típica de una feature:
`spec-driven-development` → `planning-and-task-breakdown` → `incremental-implementation`
→ `frontend-ui-engineering` / `source-driven-development` → `test-driven-development`
→ `browser-testing-with-devtools` → `code-review-and-quality` / `code-simplification`
→ `security-and-hardening` → `git-workflow-and-versioning`

Mapa por fase:

| Fase | Skill |
|------|-------|
| Requisitos y especificación | `spec-driven-development` |
| Descomposición en tareas | `planning-and-task-breakdown` |
| Implementación por capas | `incremental-implementation` |
| UI de producción y accesible | `frontend-ui-engineering` |
| Verificación contra docs oficiales | `source-driven-development` |
| Pruebas antes del código | `test-driven-development` |
| Verificación en navegador | `browser-testing-with-devtools` |
| Depuración de fallos | `debugging-and-error-recovery` |
| Revisión de calidad | `code-review-and-quality` |
| Simplificación | `code-simplification` |
| Endurecimiento de seguridad | `security-and-hardening` |
| Commits y versionado | `git-workflow-and-versioning` |

---

## 3. Reglas de trabajo

1. **No tomes decisiones por tu cuenta.** Si algo no está especificado, pregunta antes de proceder.
2. **No instales librerías adicionales** que no estén en `package.json` o no las autorice el usuario explícitamente.
3. **Respeta el scope.** Cambia solo lo que se pide; no refactorices de propina.
4. **Diseño incremental.** Implementa en capas finas y verificables; no escribas todo el código de golpe.
5. **Verificación obligatoria.** Una tarea no termina hasta que pasan las comprobaciones de la sección 6.
6. **Sigue las convenciones existentes** de estilo, componentes y nomenclatura antes de crear algo nuevo.

---

## 4. Convenciones de Next.js / TypeScript

- Páginas y rutas en `src/app/`, componentes reutilizables en `src/components/`, lógica de dominio en `src/lib/`, tipos en `src/types/`.
- Clientes Supabase ya implementados en `src/lib/supabase/`:
  - `client.ts` → `createBrowserClient` (Client Components).
  - `server.ts` → `createServerClient` con `cookies()` (Server Components).
  - `middleware.ts` → `updateSession` para refrescar la sesión.
  - `admin.ts` → cliente con rol `service_role` (solo server-side).
- Rutas protegidas: `/dashboard/*` y `/admin/*` (admin además exige `role = 'admin'` en `profiles`). Se controla en `src/middleware.ts`.
- Tipos de Supabase viven en `src/types/database.types.ts`; se regeneran cuando cambian tablas o funciones usadas por TypeScript.
- No añadas comentarios de relleno ni docstrings innecesarios; sigue el estilo del código existente.

---

## 5. Convenciones de Supabase

- **Migraciones versionadas** en `supabase/migrations/` con prefijo timestamp, p. ej. `202607300001_base_schema.sql`. Usa `npx --yes supabase@latest migration new <nombre>` para crear una.
- **UUID por defecto:** `gen_random_uuid()`.
- **Timestamps:** `TIMESTAMPTZ DEFAULT now()`.
- **RLS:** activar en todas las tablas (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`) y definir políticas explícitas por comando (`FOR SELECT/INSERT/UPDATE/DELETE`). Prefiere políticas separadas por comando sobre `FOR ALL` salvo en tablas de propiedad exclusiva.
- **Referencias a usuario:** `auth.uid()` en políticas RLS.
- **Funciones sensibles:** `SECURITY DEFINER` con `SET search_path = public` explícito (evita vectores de ataque de search_path).
- **RPC:** encapsular escrituras complejas o destructivas en RPC transaccionales con validación, en lugar de conceder permisos directos de tabla cuando es posible.
- **Permisos:** tras crear tablas/funciones, revisa los `GRANT` a `anon`, `authenticated` y `service_role`. Nunca dejes `service_role` expuesto al cliente.
- **Pruebas de BD:** tests pgTAP en `supabase/tests/*.test.sql`; se ejecutan con `npx --yes supabase@latest test db` sobre la base local reconstruida.
- **Aplicar al remoto:** al aplicar migraciones al proyecto de Supabase (p. ej. vía MCP), hazlo en orden de dependencias FK y verifica con `list_tables` y asesores de seguridad tras el cambio.
- **No commitees secretos:** `.env.local` está en `.gitignore`; `SUPABASE_SERVICE_ROLE_KEY` nunca va al cliente ni a git.

---

## 6. Verificación

Antes de dar por cerrada cualquier tarea, ejecuta:

```bash
npx tsc --noEmit
pnpm lint
pnpm build
```

Si hay cambios de base de datos:

```bash
npx --yes supabase@latest db reset
npx --yes supabase@latest test db
```

Si el build falla por caché obsoleta de Next.js:

```bash
rm -rf .next
pnpm build
```

---

## 7. Git

- Mensajes de commit en español, en modo imperativo (p. ej. `Corrige clics del menú móvil`, `Añade tests pgTAP de save_recipe`). Puedes usar prefijos convencionales (`feat(auth): ...`) cuando el historial ya los use.
- Commits atómicos: un cambio lógico por commit, sin mezclar refactor con features.
- Revisa `git status`, `git diff` y `git log --oneline -10` antes de commitear.
- Solo commitea cuando el usuario lo pida explícitamente.

---

## 8. Flujo de desarrollo

1. Lee el contexto: constitución, spec de la feature y estado de `supabase/migrations/`.
2. Carga las skills correspondientes a la fase (sección 2).
3. Si la feature no tiene spec, comienza con `spec-driven-development` y registra la decisión en `docs/specs/`.
4. Descompón con `planning-and-task-breakdown` y avanza por capas con `incremental-implementation`.
5. Actualiza `src/types/database.types.ts` si cambian tablas o funciones usadas por TypeScript.
6. Verifica según la sección 6.
7. Al terminar, revisa con `code-review-and-quality` y simplifica con `code-simplification` si procede.
8. Pide confirmación antes de commitearte.
