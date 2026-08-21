# Plan de Implementación: SaborSemanal V2

## Objetivo
Mejorar la usabilidad, añadir automatización a coste cero y evolucionar la arquitectura hacia un modelo colaborativo (grupos familiares), manteniendo el stack tecnológico actual (Next.js 15, Supabase, Tailwind CSS 4).

## Decisiones de Arquitectura
1. **Grupos Familiares:** Modelo Single-Tenant por usuario. Cada usuario pertenece a un (1) único grupo. Esto facilita enormemente las políticas RLS y simplifica la UI.
2. **Comparador de Precios:** Crowdsourcing asíncrono. Los precios se asocian a cadenas de supermercados genéricas (Mercadona, Carrefour), no a tiendas físicas, garantizando volumen de datos y evitando fragmentación.
3. **Importador Automático:** Uso de Supabase Edge Functions (Deno) para extraer el esquema estándar `Recipe JSON-LD` vía HTTP. Coste de API 0€.

## Fases de Implementación (Orden de Ejecución)

### Fase 1: Integridad y Filtros (Prioridad Alta)
Estabilización y mejoras rápidas de base de datos y UI.

### Fase 2: Motor Colaborativo (Prioridad Alta)
Arquitectura de grupos familiares. Requisito indispensable antes de acumular más datos.

### Fase 3: Automatización y Datos Comunitarios (Prioridad Media)
Añadir capacidades de auto-rellenado y recopilación de precios.

### Fase 4: Refinamiento Visual y UX (Prioridad Baja)
Nuevos componentes interactivos y aplicación estricta de la guía de estilos.

### Fase 5: Planificador Guiado (Prioridad Alta)
Unificar el flujo de "añadir receta al menú" en toda la app y conectar el
recetario propio con el planificador, para reducir clics y eliminar el doble
modelo mental actual. Ver detalle más abajo.

---

## Fase 5 — Detalle: Planificador Guiado

### Diagnóstico (estado actual)

El planificador (`WeeklyPlanner`) y el resto de la app usan **dos flujos
distintos** para "añadir una receta al menú", con fricción distinta:

1. **Desde una tarjeta/ficha de receta** (`/recetas`, `/recetas/[id]`,
   favoritos) → `AddToMenuButton` abre `RecipeSlotModal` (rejilla día×comida)
   → 1 clic para abrir + 1 clic para asignar = **2 clics**, y la receta ya
   queda en su hueco.
2. **Desde el propio buscador del planificador** (sección "1 · Añade
   recetas") → el botón "Añadir" mete la receta en un "pool" sin día
   asignado (sección "2 · Recetas del menú") → el usuario debe bajar a la
   sección "3 · Organiza tu semana", pulsar un hueco vacío, y ahí sí elegir
   la receta en `SlotPickerModal` = **3 interacciones repartidas en 2
   componentes distintos**.

Además:
- **`/dashboard/recetas` ("Mis recetas") no tiene ninguna acción de
  "Añadir al menú"** en sus tarjetas — solo "Editar" y "Eliminar". Para
  meter una receta propia en el menú hay que salir a su ficha pública o
  buscarla de nuevo en el planificador. Es el hueco de "interconectividad
  con la sección propia" que se nos pidió resolver.
- No hay enlace en ningún sentido entre el planificador y "Mis recetas".

### Idea / dirección de solución

Un único modelo mental, reutilizado en todos los puntos de entrada:
**"elegir receta → soltarla directamente en un día y comida"**, usando la
rejilla día×comida que ya existe y funciona bien (`RecipeSlotModal`), en
vez de dos flujos distintos según de dónde vengas.

- **Reutilizar el flujo directo-a-hueco (`AddToMenuButton` /
  `RecipeSlotModal`) en el buscador del propio planificador**, en vez de
  mandar por defecto al pool. El botón "Añadir" de la sección 1 pasa a
  abrir directamente la rejilla día×comida (2 clics, igual que en el resto
  de la app).
- **El pool se mantiene, pero como acción secundaria** ("Guardar para más
  tarde", enlace de texto pequeño junto al botón principal) para el caso
  "aún no sé cuándo la voy a cocinar". No se elimina funcionalidad, solo
  deja de ser el camino por defecto.
- **Añadir el botón "Añadir al menú" (reutilizando `AddToMenuButton` tal
  cual) a las tarjetas de `/dashboard/recetas`.** Es el fix directo del
  hueco de interconectividad, con código ya existente.
- **Enlaces cruzados**: en el estado vacío del buscador del planificador
  (cuando no hay resultados) añadir un enlace a "Mis recetas" junto al que
  ya existe hacia el catálogo público.
- Sección "2 · Recetas del menú" (el pool) pasa a ser secundaria/discreta
  ya que su uso baja de "camino principal" a "caso excepcional" — sin
  rediseñarla, ya está condicionalmente oculta cuando está vacía.

### Por qué cumple las restricciones

- **Sin selects gigantes**: se reutiliza la rejilla de botones día×comida
  ya existente (`RecipeSlotModal`), no un `<select>` con decenas de
  recetas.
- **Sin secciones enormes**: no se añade ninguna sección nueva de página
  completa; si acaso se reduce la relevancia visual de una ya existente
  (el pool). El cambio principal es de comportamiento (a qué componente
  llama el botón "Añadir"), no de layout.
- **Menos clics**: el camino más común (añadir sabiendo cuándo se va a
  cocinar) baja de 3 interacciones repartidas en 2 componentes a 2 clics
  en un único flujo, igual en cualquier parte de la app.

### Alcance y riesgos

- Cambios 100% frontend; no requiere migraciones ni tocar RPC
  (`saveMenuSlotAction` / `addMenuRecipeAction` ya cubren ambos casos).
- Riesgo principal: `RecipeSlotModal` fue diseñado para un único
  `recipeId` conocido de antemano (viene como prop). Al reutilizarlo desde
  la lista de resultados del buscador del planificador (que itera varias
  recetas), hay que parametrizarlo por receta seleccionada en vez de un
  solo estado fijo — cambio de estado local, no de arquitectura.
- Fuera de alcance: no se toca el modelo de datos del pool
  (`menu_recetas` con `dia_semana IS NULL`), no se añade importación
  automática ni nada de Fase 3.

---

## Fase 6 — Grupos Familiares v2: Invitaciones y Diferenciación

### Bloqueador previo (importante)

La migración base de grupos familiares (`20260817110000_family_groups.sql`)
**nunca llegó a producción** — se detectó y quedó documentado en un incidente
anterior de esta misma release (ver commit `c02cdde`/incidente del
21/08/2026). `/dashboard/grupo` está caído en producción ahora mismo porque
`list_group_members()` y las tablas `grupos`/`grupo_miembros` no existen ahí,
aunque en local sí (por eso "funciona bien" al probarlo). Este trabajo debe
incluir desplegar esa base junto con todo lo nuevo de esta fase, en un único
push coordinado — no tiene sentido lanzar invitaciones sobre una base que no
existe en producción.

### Estado actual (lo que ya hay)

- Modelo single-tenant: cada usuario pertenece a un único grupo (el suyo
  propio por defecto).
- `add_group_member(p_email)`: añade **al instante**, sin invitación ni
  confirmación — solo funciona si el email ya tiene cuenta y esa cuenta no
  pertenece ya a un grupo con más gente.
- `GroupMembersPanel` (`src/components/account/group-members-panel.tsx`):
  lista de miembros + formulario "Añadir miembro" que llama directo a
  `add_group_member`.
- No existe ningún concepto de invitación, caducidad, ni email de
  confirmación.
- El filtrado de alérgenos (`recetas/page.tsx`) solo usa
  `profile_allergens` del usuario individual — no se combina con la del
  grupo.

### Decisiones de arquitectura

1. **Invitación a alguien SIN cuenta todavía**: email automático vía
   `supabase.auth.admin.inviteUserByEmail()` (API admin de Supabase Auth),
   reutilizando la infraestructura de email que ya usa el registro y la
   recuperación de contraseña — sin servicios externos nuevos. **Decisión
   confirmada con el usuario.** El email de invitación de Supabase incluye
   un enlace que crea la cuenta; en el `handle_new_user()` (trigger ya
   existente) se comprueba si hay una invitación de grupo pendiente
   asociada a ese email y, si la hay, el usuario se une directamente a ese
   grupo en vez de crear uno personal nuevo.
2. **Invitación a alguien que YA tiene cuenta**: no se reenvía ningún email
   (su email ya está verificado a nivel de cuenta). Se le muestra la
   invitación pendiente dentro de la app (banner en `/dashboard` + en
   `/dashboard/grupo`) con botones Aceptar/Rechazar. Aceptar en la propia
   app cuenta como la "confirmación" que pidió el usuario — no hace falta
   un segundo email.
3. **Caducidad de 24h**: comprobación perezosa (`expires_at > now()` en
   cada lectura), sin `pg_cron` ni jobs programados — mantiene el stack
   simple. Solo puede haber una invitación `pending` a la vez por
   (grupo, email); crear una nueva mientras hay una pendiente la
   reemplaza (revoca la vieja, crea otra), tal como pidió el usuario
   ("si no la acepta se deberá crear otra").
4. **Alérgenos del grupo**: nueva función `list_group_allergen_ids()`
   (SECURITY DEFINER, mismo patrón que `is_group_mate`) que devuelve la
   unión de alérgenos de todos los miembros del grupo del que llama.
   `recetas/page.tsx` la usa en vez de `profile_allergens` individual
   cuando se aplican las preferencias por defecto (`preferences != off`).
5. **Diferenciación visual**: cuando el grupo tiene más de 1 miembro, se
   añade un indicador ("Compartido con tu grupo (N)") en la cabecera de la
   lista de la compra y de "Mis recetas". Cuando el grupo tiene solo 1
   miembro (el propio usuario), aparece el aviso "Aún no tienes grupo"
   con CTA a `/dashboard/grupo`.

### Modelo de datos nuevo

```sql
CREATE TABLE grupo_invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES grupos(id) ON DELETE CASCADE,
  email TEXT NOT NULL,              -- lower(btrim(...))
  invited_by UUID NOT NULL REFERENCES profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  responded_at TIMESTAMPTZ
);
-- Índice único parcial: como mucho una invitación pending por grupo+email.
```

RPCs nuevas (`SECURITY DEFINER`, mismo patrón que las de grupos ya
existentes):
- `create_group_invitation(p_email TEXT)` — solo admin; revoca cualquier
  pending anterior para ese email antes de crear la nueva.
- `list_group_invitations()` — invitaciones salientes del grupo del admin.
- `list_pending_invitations_for_me()` — invitaciones entrantes para el
  email del usuario autenticado.
- `accept_group_invitation(p_invitation_id UUID)` / `decline_group_invitation(p_invitation_id UUID)`.
- `list_group_allergen_ids()`.

### Riesgos

| Riesgo | Impacto | Mitigación |
|---|---|---|
| Producción no tiene la base de grupos desplegada | Alto | Desplegar `family_groups` + esta migración juntas, verificado con las mismas queries de diagnóstico usadas en el incidente anterior |
| Entrega de emails de invitación depende de la config SMTP de Supabase en producción | Medio | Verificar la plantilla de email "Invite user" en el dashboard de Supabase antes de probar en producción; en local se prueba con Inbucket |
| Tope de 8 miembros por grupo ya existente en `add_group_member` | Bajo | Se mantiene igual; se aplica también al crear invitaciones (miembros actuales, no cuenta invitaciones pendientes) |
| Confusión entre "email de invitación de Supabase" (cuenta nueva) y "aceptar en la app" (cuenta existente) | Medio | Mensajes distintos en la UI para cada caso, cubierto en Tarea 4 |

### Fuera de alcance de esta fase

- No se construye ningún sistema de roles más allá de admin/miembro ya
  existente.
- No se permite pertenecer a más de un grupo.
- No se añade reenvío manual de email (revocar + crear de nuevo cubre el
  caso "no le llegó").
