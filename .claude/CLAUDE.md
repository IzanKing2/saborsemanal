# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Preferencias de Trabajo

- **Idioma**: Responde siempre en español
- **Indicadores de progreso**: Proporciona pequeños indicadores de lo que estás haciendo (ej: "Leyendo archivo...", "Analizando tipos...", "Creando componente...")
- **Optimización de tokens**: Evita pérdidas innecesarias; sé conciso sin sacrificar calidad
  - No repitas contexto que ya conoces
  - Evita explicaciones obvias
  - Usa listas en lugar de párrafos cuando sea posible
  - No incluyas resúmenes redundantes al final de respuestas cortas

## Quick Start Commands

```bash
# Development
npm run dev              # Start Next.js dev server (http://localhost:3000)
npm run build            # Build for production
npm run start            # Serve production build
npm run lint             # Run ESLint

# Verification before committing
npx tsc --noEmit        # Type check (required before any PR)
npm run lint
npm run build
```

## Project Overview

**SaborSemanal** is a Next.js 15 web app for weekly meal planning, recipe discovery, allergy management, and shopping list generation. It's built in Spanish (es) and is a PWA-ready application.

### Core Stack
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (Auth, Postgres, RLS, RPC, Storage)
- **Testing**: pgTAP for database tests
- **Linting**: ESLint with Next.js config
- **Language**: Spanish (es)

## Architecture

### High-Level Structure

```
src/
├── app/                    # Next.js App Router pages (server-side by default)
│   ├── (auth)/            # Public auth routes: login, register, password recovery
│   ├── (protected)/       # Private routes requiring authentication
│   ├── admin/             # Admin-only routes
│   ├── layout.tsx         # Root layout (PWA, custom cursor, theme)
│   └── globals.css        # Tailwind + app-wide styles
├── components/
│   ├── auth/              # Login, register, recovery forms
│   ├── navigation/        # Headers, sidebars, search
│   ├── recipes/           # Recipe cards, filters, forms, buttons
│   ├── planner/           # Weekly planner, slot picker
│   ├── shopping/          # Shopping cart, list
│   ├── account/           # User settings, profile
│   ├── pwa/               # PWA manifest, service worker, install UI
│   └── ui/                # Generic dialogs, buttons, loaders
├── lib/
│   ├── supabase/          # Supabase clients (client.ts, server.ts, middleware.ts, admin.ts)
│   ├── actions/           # Server actions (grouped by feature: recetas.ts, planificador.ts, etc.)
│   ├── recipes.ts         # Recipe domain helpers
│   ├── week.ts            # Weekly planning helpers
│   ├── shopping-list.ts   # Shopping list logic
│   └── ...other helpers   # Auth flows, images, avatars, tokens
└── types/
    └── database.types.ts  # Auto-generated Supabase types (keep in sync via studio or CLI)

supabase/
├── migrations/            # SQL migrations (numbered chronologically)
└── tests/                 # pgTAP test suites for RPC and schema
```

### Key Architectural Decisions

**Client/Server Split**
- Pages/layouts default to Server Components (Next.js 15)
- Use `"use client"` only for interactive state, modals, forms
- Supabase clients are separate: `client.ts` (browser), `server.ts` (server actions), `middleware.ts` (auth state)

**Supabase Patterns**
- **RPC (Transactional)**: Used for complex writes (save_recipe, add_menu_recipe, regenerate_shopping_list, save_menu_slot, etc.)
  - All destructive operations route through RPC with `SECURITY DEFINER` to enforce RLS
  - RPC enforces authorization (owner, admin, or public) before touching tables
- **RLS (Row-Level Security)**: Enabled on all user-scoped tables
  - `recipes`, `recipe_ingredients`, `menu_items`, `shopping_list_items`, etc. are protected by RLS policies
- **Middleware**: `src/middleware.ts` refreshes Supabase session using SSR pattern; redirects unauthenticated users from protected routes

**Database Migrations**
- Migrations live in `supabase/migrations/` with numeric prefixes (e.g., `202607300001_base_schema.sql`)
- Apply with `npx --yes supabase@latest db reset` (local) or `npx --yes supabase@latest db push` (remote)
- Always include table creation, RLS policies, and RPC definitions in one migration per feature

**Authentication & Recovery**
- Supabase Auth handles sessions via HTTP-only cookies (SSR pattern)
- Password recovery uses a custom flow: email sends a token hash link, app reads it into a temporary `saborsemanal-recovery` cookie, and the user can reset password without activating a full auth session
- Redirect URLs for recovery must be configured in Supabase Auth settings

**Server Actions**
- Grouped by feature in `src/lib/actions/` (recetas.ts, planificador.ts, lista-compra.ts, cuenta.ts, etc.)
- Each action calls Supabase RPC or direct queries with the server client, enforcing auth via middleware
- Actions never expose raw Postgres errors to client; they return typed success/error responses

**PWA**
- Manifest at `public/manifest.webmanifest`
- Service Worker at `public/sw.js` (pre-caches public routes and planner)
- Install UI in `src/components/pwa/`

## Development Workflow

### For Database Changes (Migrations & RPC)

1. Create a new migration:
   ```bash
   npx --yes supabase@latest migration new your_feature_name
   ```

2. Write SQL (schema, RLS, RPC):
   ```bash
   # Edit supabase/migrations/202607300XXX_your_feature_name.sql
   ```

3. Reset local Supabase and test:
   ```bash
   npx --yes supabase@latest db reset
   ```

4. If adding a public RPC or changing existing functions, update `src/types/database.types.ts`:
   - Generate types via Supabase Studio (SQL Editor > "Generate TypeScript Types")
   - Or use Supabase CLI: `npx --yes supabase gen types typescript --linked > src/types/database.types.ts`

5. Test with pgTAP (if applicable):
   ```bash
   # Write tests in supabase/tests/
   # Run via db reset or see Supabase docs for running pgTAP directly
   ```

6. For production: Push migrations with `npx --yes supabase@latest db push` (requires auth to Supabase project)

### For UI/Components

1. Create or modify a component in `src/components/`
2. If it needs server data, fetch it in a Server Component (no `"use client"`)
3. If it needs client interactivity, mark it `"use client"` and pass data as props
4. Use Tailwind classes for styling (check existing components for patterns)
5. For modals/dialogs, use `ConfirmDialog` component (renders to document.body to avoid z-index issues with blurred headers)

### For Pages/Routes

1. Add a `.tsx` file in `src/app/` under the appropriate segment:
   - `/app/` — public routes
   - `/app/(auth)/` — auth routes (login, register, recovery)
   - `/app/(protected)/dashboard/` — private user dashboard
   - `/app/admin/` — admin-only pages
2. Server Components by default; export metadata and layout as needed
3. Error boundaries: each route can have an `error.tsx` or `loading.tsx`

### For Server Actions

1. Create or edit a file in `src/lib/actions/` named after the feature (e.g., `recetas.ts`)
2. Import the server Supabase client: `import { createClient } from "@/lib/supabase/server"`
3. Mark functions with `"use server"` directive
4. Call RPC via `client.rpc(...)` or query tables directly with `.from(...).select(...)`
5. Return a typed response object (no throwing errors to client)
6. Example:
   ```typescript
   "use server";
   import { createClient } from "@/lib/supabase/server";
   
   export async function saveRecipe(data: RecipeInput) {
     const client = await createClient();
     try {
       const { data: result, error } = await client.rpc("save_recipe", { /* ... */ });
       if (error) return { success: false, message: error.message };
       return { success: true, recipe: result };
     } catch (err) {
       return { success: false, message: "Server error" };
     }
   }
   ```

## Key RPC Functions

These are the main database functions that handle critical operations. Always route writes through these instead of direct table access:

- **`save_recipe`**: Creates or updates a recipe, ingredients, and media; enforces owner/admin authorization
- **`add_menu_recipe` / `remove_menu_recipe`**: Manages weekly planner pool
- **`save_menu_slot`**: Assigns a recipe to a day/meal slot
- **`regenerate_shopping_list`**: Rebuilds shopping list from current menu
- **`clear_shopping_list`**: Empties shopping list with confirmation
- **`remove_shopping_item` / `remove_extra_item`**: Removes ingredients from the list

See `supabase/migrations/` for RPC signatures and authorization logic.

## Type Safety & Database Sync

- TypeScript is strict (`strict: true` in tsconfig.json)
- Always run `npx tsc --noEmit` before committing
- Supabase-generated types live in `src/types/database.types.ts`
  - Regenerate and commit after schema changes
  - Use them in server actions and client components for type-safe queries

## Testing & Verification

Before opening a PR or merging, always run:

```bash
npx tsc --noEmit    # Type check entire project
npm run lint        # Lint with ESLint
npm run build       # Full build to catch issues
```

If build fails due to stale Next.js cache:
```bash
rm -rf .next
npm run build
```

Database tests: Run pgTAP suites via `npx --yes supabase@latest db reset` or manually in Supabase Studio.

## Common Patterns

### Conditional Rendering Based on Auth

```typescript
const { data: { user } } = await createClient().auth.getUser();
if (!user) redirect("/login");
```

### Form Submission with Server Action

```typescript
"use client";
const [loading, setLoading] = useState(false);

async function handleSubmit(formData: FormData) {
  setLoading(true);
  const result = await serverAction(formData);
  setLoading(false);
  if (result.success) { /* update UI */ }
  else { /* show error */ }
}
```

### Fetch Data in Server Component

```typescript
import { createClient } from "@/lib/supabase/server";

export default async function Page() {
  const client = await createClient();
  const { data: recipes } = await client.from("recipes").select("*");
  return <RecipeList recipes={recipes} />;
}
```

## Environment Variables

Required in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=<your-supabase-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
```

The `NEXT_PUBLIC_*` variables are exposed to the browser; the service role key is server-only.

## Notes

- All recipe and menu data is filtered by RLS in the database; never trust client-side filtering
- The planner supports "guest mode" where data is stored in `localStorage` (for invitees without accounts)
- Recipe detail pages allow portion scaling (1–100) on-the-fly without modifying the recipe or menu
- Admin can edit/delete any recipe while preserving the original author's attribution
- Confirmation dialogs (`ConfirmDialog`) are rendered to `document.body` to avoid z-index issues
- Publishing a recipe requires explicit confirmation; drafts remain private
- Video links are stored as HTTPS URLs; YouTube embeds use `youtube-nocookie.com`
- Search and filtering always send `preferences=off` when manual filters are applied, preventing stale allergy prefs from reactivating

## Useful Supabase CLI Commands

```bash
# Start local Supabase stack
npx --yes supabase@latest start

# Reset local database to latest migrations + seed data
npx --yes supabase@latest db reset

# Create a new migration
npx --yes supabase@latest migration new migration_name

# Push pending migrations to remote
npx --yes supabase@latest db push

# Pull schema changes from remote (rarely needed if you control migrations)
npx --yes supabase@latest db pull

# Generate or regenerate TypeScript types from schema
npx --yes supabase gen types typescript --linked > src/types/database.types.ts
```

## File Naming & Organization

- **React Components**: PascalCase (e.g., `RecipeCard.tsx`, `WeeklyPlanner.tsx`)
- **Server Actions**: camelCase with `.ts` (e.g., `recetas.ts`, `planificador.ts`)
- **Types**: Supabase types in `database.types.ts`; local types colocated with components or in `lib/`
- **Styles**: Tailwind classes inline; no separate CSS files except `globals.css`
- **Migrations**: Numeric prefix + snake_case (e.g., `202607300001_base_schema.sql`)

## Debugging Tips

- Use `console.log()` on the server side (check terminal output)
- For client-side issues, check browser DevTools Console
- Supabase errors often include schema validation or RLS policy failures; check SQL logs in Supabase Studio
- If a server action silently fails, ensure it's not catching errors before returning to client
- Check RLS policies if queries return empty results unexpectedly
