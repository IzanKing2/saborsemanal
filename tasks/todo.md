## Fase 1: Integridad y Filtros

- [x] Tarea 1.1: Restricción de YouTube (Frontend)
  - Acceptance: El formulario de recetas rechaza URLs que no sean de YouTube usando Zod.
  - Verify: Intentar subir URL inválida, verificar mensaje de error en UI.
  - Files: Archivo de validación del formulario de recetas (Zod).
  - Nota: el proyecto no usa Zod en ningún sitio (verificado); se implementó con el mismo patrón de validación manual TS ya existente en `src/lib/recipes.ts` (`isValidVideoUrl` + `extractYouTubeVideoId`), acordado con el usuario.

- [x] Tarea 1.2: Restricción de YouTube (Backend)
  - Acceptance: Migración SQL que añade constraint `CHECK (url LIKE '%youtube.com%' OR url LIKE '%youtu.be%')`.
  - Verify: Intentar INSERT inválido desde Supabase Studio/pgTAP, verificar que falla.
  - Files: `supabase/migrations/20260817090000_youtube_video_constraint.sql`

- [x] Tarea 1.3: Filtros Avanzados
  - Acceptance: `tipo_comida` disponible como filtro en la UI y URL (`?tipo=...`). Server Components leen el parámetro y aplican filtro.
  - Verify: Navegar a `?tipo=Cena` y ver solo cenas.
  - Files: `supabase/migrations/20260817090100_recipe_meal_type_filter.sql`, `src/app/recetas/page.tsx`, `src/components/recipes/recipe-filters.tsx`, `src/components/recipes/recipe-form.tsx`.
  - Nota: `tipo_comida` no existía en `recetas` (solo en `menu_recetas`, el slot del planificador); se añadió como columna nueva `TEXT[]` para permitir varios tipos por receta.

## Fase 2: Motor Colaborativo (Grupos Familiares)

- [ ] Tarea 2.1: Esquema de Grupos
  - Acceptance: Migración SQL para tabla `grupos` y `grupo_miembros`. Un usuario = un grupo máximo (restricción en inserción/creación).
  - Verify: Tests pgTAP asegurando creación correcta.
  - Files: `supabase/migrations/[timestamp]_grupos_familiares.sql`

- [ ] Tarea 2.2: Refactorización RLS
  - Acceptance: Recetas, menús y lista de compra se filtran por `grupo_id`.
  - Verify: Un usuario no puede leer recetas del grupo de otro.
  - Files: Políticas RLS SQL.

- [ ] Tarea 2.3: UI de Gestión de Grupo
  - Acceptance: Vista para visualizar tu grupo y añadir miembros por email.
  - Verify: Funcionalidad completa end-to-end.
  - Files: Nuevo page/layout para ajustes de grupo.

## Fase 3: Automatización y Precios

- [ ] Tarea 3.1: Edge Function (Importador JSON-LD)
  - Acceptance: Función Deno extrae JSON-LD de una URL dada y devuelve JSON limpio.
  - Verify: Llamar a la edge function localmente con curl.
  - Files: `supabase/functions/import-recipe/index.ts`

- [ ] Tarea 3.2: Integración Frontend Importador
  - Acceptance: Botón "Importar URL" en la UI llama a la edge function y autocompleta el formulario.
  - Verify: Pegar URL de un blog y ver los inputs rellenarse solos.

- [ ] Tarea 3.3: Precios Comunitarios (Esquema)
  - Acceptance: Migración para tabla `precios_supermercados` (ingrediente_id, cadena, precio, usuario_id).
  - Verify: Migración aplicada con éxito.

- [ ] Tarea 3.4: UI de Registro de Precios
  - Acceptance: Al tachar un producto de la lista, modal o inline-prompt opcional para indicar cadena y precio.
  - Verify: Enviar precio y confirmar que se guarda en BD.

## Fase 4: UX y Estilos

- [ ] Tarea 4.1: Aplicar Style Guide V2
  - Acceptance: UI actualizada usando colores frescos y tarjetas limpias según el manual.
  - Verify: Revisión visual en navegador.
  - Files: `tailwind.config.ts`, `globals.css`, componentes base.

## Fase 5: Planificador Guiado

- [x] Tarea 5.1: Unificar "Añadir" del buscador del planificador con el flujo directo-a-hueco
  - Acceptance: En la sección "1 · Añade recetas" del planificador, el botón
    "Añadir" de cada resultado abre la rejilla día×comida (mismo patrón que
    `RecipeSlotModal`) y asigna la receta directamente, en vez de mandarla
    al pool por defecto. Se mantiene una acción secundaria más pequeña
    ("Guardar para más tarde") que sí usa el pool, para quien no sepa aún
    el día.
  - Verify: Buscar una receta, pulsar "Añadir", elegir día+comida, y
    comprobar que aparece ya en el hueco del calendario sin pasos
    intermedios. Comprobar que "Guardar para más tarde" sigue mandando al
    pool y que `SlotPickerModal` sigue funcionando desde ahí.
  - Files: `src/components/planner/weekly-planner.tsx`,
    `src/components/recipes/recipe-slot-modal.tsx` (generalizar si hace
    falta reutilizarlo con receta variable en vez de fija).
  - Dependencies: Ninguna.
  - Nota: al probarlo se encontró un bug preexistente en
    `RecipeSlotModal` — la rejilla usaba `grid-cols-4` con 5 columnas
    lógicas (etiqueta de día + 4 comidas), descuadrando los días. Corregido
    a `grid-cols-5`; afecta también a `AddToMenuButton` en el resto de la
    app (recetas, favoritos), no solo al planificador.

- [x] Tarea 5.2: Botón "Añadir al menú" en las tarjetas de "Mis recetas"
  - Acceptance: Cada tarjeta de `/dashboard/recetas` incluye el mismo
    `AddToMenuButton` que ya se usa en `/recetas`, `/recetas/[id]` y
    favoritos, junto a "Editar"/"Eliminar".
  - Verify: Desde "Mis recetas", añadir una receta propia al menú sin salir
    de la página, y verla reflejada en el planificador.
  - Files: `src/app/(protected)/dashboard/recetas/page.tsx`.
  - Dependencies: Ninguna (usa componente ya existente sin cambios).

- [x] Tarea 5.3: Enlaces cruzados planificador ↔ Mis recetas
  - Acceptance: El estado vacío del buscador del planificador (sin
    resultados) incluye, además del enlace ya existente al catálogo
    público, un enlace a "Mis recetas".
  - Verify: Buscar un texto sin resultados en el planificador y comprobar
    que ambos enlaces aparecen y navegan correctamente.
  - Files: `src/components/planner/weekly-planner.tsx`.
  - Dependencies: Ninguna.

### Checkpoint: Fase 5
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios.
- [x] Flujo completo probado a mano en el navegador (usuario admin de
  prueba): creada una receta de borrador propia → "Añadir al menú" visible
  y funcional en su tarjeta de "Mis recetas" → en el planificador,
  "Añadir" asigna directo a un hueco del calendario (Arroz con leche →
  Martes/Almuerzo) sin pasar por el pool → "Guardar para más tarde" sigue
  mandando al pool (Ensalada de garbanzos) y `SlotPickerModal` sigue
  asignándolo desde ahí. Datos de prueba limpiados al terminar.
- [x] Sin selects nativos gigantes ni secciones nuevas de página completa.

### Fase 5b: Ajustes de seguimiento

- [x] Bug: popup de "Añadir al menú" quedaba atrapado dentro de la tarjeta
  de la receta (`position: fixed` contenido por un ancestro al no usar
  `createPortal`). Corregido en `RecipeSlotModal` y `SlotPickerModal`,
  mismo patrón que `ConfirmDialog`.
- [x] Mostrar en el popup los huecos ya ocupados de la semana (con el
  título de la receta asignada), en vez de solo "+". Nueva prop
  `occupied` en `RecipeSlotModal`; alimentada desde `slots` en el
  planificador y desde una consulta cliente (Supabase o localStorage en
  modo invitado) en `AddToMenuButton`.
- [x] Lista de "1 · Añade recetas" más compacta: `max-h-72 overflow-y-auto`
  + miniaturas y padding reducidos.
- [x] Permitir la misma receta en varios días/horarios. Requería migración
  de base de datos: `menu_recetas_recipe_unique` era un `UNIQUE (menu_id,
  receta_id)` que cubría tanto el pool como los huecos asignados, así que
  cualquier segundo hueco con la misma receta violaba la restricción
  aunque el `ON CONFLICT` del INSERT apuntara a otra. Nueva migración
  `20260820124640_allow_repeat_menu_recipes.sql`: la restricción pasa a
  ser un índice único parcial (`WHERE dia_semana IS NULL`, solo pool);
  `add_menu_recipe` y `remove_menu_recipe` actualizadas a juego (esta
  última no estaba acotada a `dia_semana IS NULL`, así que sin el ajuste
  habría borrado también asignaciones del calendario al quitar del pool).
  Frontend: se quitó el bloqueo de "ya en el menú" en el buscador del
  planificador (ahora solo informa "En el menú ×N"); "Guardar para más
  tarde" sigue evitando duplicados dentro del pool.
- [x] "Favoritas" siempre accesible: icono persistente en `SiteHeader`
  (solo con sesión) y `DashboardHeader`, igual que Recetas/Planificador;
  quitada del listado `dashboardLinks`/hamburguesa para no duplicar.
- Verify: `npx tsc --noEmit`, `npm run lint`, `npm run build` limpios;
  probado a mano en el navegador (login fresco tras `db reset` + reseed):
  añadir "Arroz con leche" a Lunes/Desayuno y Miércoles/Cena a la vez sin
  error, indicador "En el menú ×2" correcto, popup muestra los huecos ya
  ocupados en ámbar con su receta, lista de búsqueda con scroll interno,
  "Favoritas" navega bien desde ambas cabeceras.

### Fase 5c: Catálogo por tipo de comida + búsqueda por autor

- [x] `/recetas` se organiza por Desayuno/Almuerzo/Cena/Otro cuando no hay
  texto de búsqueda ni filtro de tipo explícito ni página >1 (secciones de
  hasta 6 recetas con "Ver todas (N)" hacia el listado filtrado y
  paginado de siempre). Un solo tipo de comida o un texto de búsqueda
  siguen mostrando el listado plano habitual sin cambios.
  - Files: `src/app/recetas/page.tsx` (tarjeta extraída a `RecipeCard`
    reutilizable entre ambos modos).
- [x] "Otro" pasa a incluir también las recetas sin ningún tipo de comida
  asignado (`tipo_comida = '{}'`), tanto en el filtro de checkbox como en
  la vista agrupada — si no, las 20 recetas de ejemplo (sin categorizar)
  desaparecerían de toda vista agrupada por defecto.
- [x] Buscar por autor: el campo "Buscar" ahora también encuentra recetas
  por el nombre del creador, no solo título/descripción. Placeholder
  actualizado a "Título, descripción o autor".
  - Requería migración: `profiles` solo es legible por RLS para el propio
    usuario (o admin), así que un JOIN directo desde una función
    `SECURITY INVOKER` no encontraba autores ajenos. `search_public_recipes`
    y `count_public_recipes` pasan a `SECURITY DEFINER` (seguro: su WHERE
    ya fija `publica = true AND aprobada = true`, no exponen nada que el
    catálogo público no muestre ya) en
    `20260820125737_recipe_search_author_and_meal_grouping.sql`.
  - Verify: receta publicada con autor "Admin" y título sin relación
    ("Xyz especial sin relacion") encontrada al buscar "Admin"; `count_public_recipes`
    con `p_meal_types:["Otro"]` pasó de 20 a 21 tras crearla sin categoría.
- Nota: durante las pruebas la caché `.next` quedó corrupta (mezcla de un
  build de producción con recompilaciones de desarrollo) causando
  `ENOENT`/"Server Action no encontrada" repetidos; se resolvió borrando
  `.next` y reiniciando `npm run dev`. No relacionado con el código de
  esta tarea.

### Fase 5d: Planificador — asignación directa desde el calendario

- [x] Quitadas las secciones "1 · Añade recetas" y "2 · Recetas del menú"
  del planificador. Ahora solo queda el calendario ("Organiza tu
  semana"); pulsar "+ Añadir" (hueco vacío) o "Cambiar" (hueco ocupado)
  abre directamente `SlotPickerModal` con buscador sobre **todo** el
  catálogo de recetas (antes solo buscaba dentro del "pool"), y asigna al
  hueco al elegir.
  - `SlotPickerModal`: prop `pool` renombrada a `recipes` (ahora recibe
    la lista completa, no solo el pool), resultados acotados a 20 sin
    búsqueda, y añadido un indicador opcional "En el menú ×N" por receta
    (prop `usageCounts`) igual que en la iteración anterior.
  - Eliminado el estado/lógica de pool (`pool`, `addToPool`,
    `removeFromPool`, `RecipeSlotModal` de selección de receta) de
    `weekly-planner.tsx`; limpiado `initialPool` de ambas páginas
    (`/planificador` y `/dashboard/planificador`) y del tipo de props.
    Las RPC/acciones de pool (`add_menu_recipe`, `remove_menu_recipe`) se
    dejan intactas en el backend por si se necesitan más adelante, solo
    se dejó de invocarlas desde la UI.
- [x] Selector de semana: input `type="date"` junto al rango mostrado
  para saltar a cualquier semana (calcula el lunes correspondiente vía
  nuevo helper `mondayOf()` en `lib/week.ts`, reutilizado por
  `getCurrentMonday()`); badge "Semana actual" cuando coincide, y enlace
  "Ir a la semana actual" cuando no, para organizar varias semanas sin
  depender solo de las flechas ← →.
  - Files: `src/lib/week.ts`, `src/components/planner/weekly-planner.tsx`,
    `src/components/planner/slot-picker-modal.tsx`.
- Verify: `npx tsc --noEmit` y `npm run lint` limpios; probado a mano en
  el navegador — el modal de "+ Añadir" busca en todo el catálogo y
  asigna al hueco; el selector de fecha salta a la semana correcta
  (7 sept al elegir un jueves de esa semana) mostrando "Ir a la semana
  actual"; al volver muestra de nuevo el badge "Semana actual".
  (`npm run build` no se ejecutó esta vez a petición expresa de no
  reiniciar el servidor de desarrollo.)

### Fase 5e: Semana al añadir desde recetas + lista de la compra

- [x] `AddToMenuButton`/`RecipeSlotModal` ahora incluyen el mismo selector
  de semana (fecha + badge "Actual" + enlace "Semana actual") que el
  planificador, con estado propio (`week`) en vez de usar siempre la
  semana actual fija. El efecto que carga los huecos ya ocupados
  (`occupied`) ya dependía de `week`, así que se refresca solo al
  cambiar de semana. "Ver planificador" enlaza a la semana elegida.
  - Helper compartido `formatWeekDay()` extraído a `lib/week.ts` (antes
    duplicado en `weekly-planner.tsx`), reutilizado también aquí.
  - Files: `src/lib/week.ts`, `src/components/recipes/recipe-slot-modal.tsx`,
    `src/components/recipes/add-to-menu-button.tsx`.
- [x] Lista de la compra: resumen de progreso ("X de Y comprados" + barra),
  contador por categoría ("N/M"), y los ítems comprados bajan al final de
  su categoría en vez de quedar mezclados.
  - Files: `src/components/shopping/shopping-list.tsx`.
- [x] Exportación: nuevo botón "Exportar (.txt)" que descarga la lista
  como texto plano (categorías + `[x]`/`[ ]` + cantidades), sin
  dependencias externas (Blob + `<a download>`).
- [x] Compartir mejorado: antes compartía la URL de `/dashboard/lista-compra`
  (ruta protegida — inútil para quien la recibe, no puede abrirla sin
  iniciar sesión). Ahora comparte el **contenido** de la lista como texto
  (vía `navigator.share`, con el portapapeles como respaldo). Si ambos
  fallan (p. ej. documento sin foco), se muestra el texto en un
  `<textarea>` para copiarlo a mano en vez de solo un mensaje de error.
  - Nuevo helper `formatShoppingListAsText()` en `lib/shopping-list.ts`,
    compartido entre exportar y compartir.
  - El toolbar (antes solo dentro de `CloudShoppingList`) se movió a
    `lista-compra/page.tsx`, combinando la lista derivada del menú y los
    ingredientes añadidos a mano en un único texto/archivo exportado.
  - Files: `src/lib/shopping-list.ts`,
    `src/components/shopping/shopping-list-tools.tsx`,
    `src/components/shopping/shopping-list.tsx`,
    `src/app/(protected)/dashboard/lista-compra/page.tsx`.
- Verify: `npx tsc --noEmit` y `npm run lint` limpios; probado a mano en
  el navegador — selector de semana en "Añadir al menú" asigna
  correctamente a la semana elegida (31 ago–6 sept) y "Ver planificador"
  lleva ahí; progreso/orden/contadores de la lista de la compra
  correctos al marcar un ítem; exportar y compartir probados end-to-end,
  incluido el fallback de copia manual cuando falla el portapapeles
  (verificado forzando ese caso en el navegador).

### Fase 5f: Lista de la compra usable sin conexión

- [x] Detección de conexión: hook `useOnlineStatus()` (`lib/use-online-status.ts`)
  basado en `navigator.onLine` + eventos `online`/`offline`.
- [x] Cola de cambios pendientes en `localStorage`
  (`lib/offline-queue.ts`, clave `saborsemanal:shopping:offline-queue`):
  marcar/desmarcar y quitar un producto, tanto en la lista derivada del
  menú como en la lista añadida a mano. Un cambio nuevo sobre el mismo
  ítem reemplaza al anterior en vez de acumularse (solo importa la
  última intención).
- [x] `CloudShoppingList` y `ExtraShoppingList`: sin conexión, marcar o
  quitar actualiza la UI al instante y encola el cambio en vez de
  intentar la Server Action (que fallaría, ya que estas requieren red).
  Al recuperar conexión (evento `online`), se reproducen los cambios
  encolados contra el servidor en orden, se limpia la cola y se
  refrescan los datos. "Regenerar lista" se deshabilita sin conexión
  (no tiene sentido offline: recalcula desde el menú en el servidor).
- [x] Aviso visible: `OfflineBanner` (nuevo, en la página) muestra "Sin
  conexión..." mientras dure; los mensajes de acción también indican
  cuándo un cambio quedó solo guardado en el dispositivo.
- [x] Service worker (`public/sw.js`, bump a v2): añadida
  `/dashboard/lista-compra` como página cacheable en tiempo de
  ejecución (red primero, caché de respaldo si falla) — igual que las
  páginas públicas, pero SIN precachearla en `install` (eso solo
  cachearía una redirección a login, ya que requiere sesión). Solo se
  cachea tras una visita real estando online, así queda disponible la
  última versión vista al abrir sin cobertura.
- Alcance: cubre ver/marcar/quitar productos, que es lo necesario "en el
  súper". Quedan fuera (requieren red por diseño, no se tocaron):
  regenerar la lista, añadir una receta entera a la lista desde una
  ficha de receta, y el resto de páginas protegidas (planificador,
  recetario) — no se pidieron y ampliar el offline ahí es un cambio
  mayor (caché compartida por dispositivo con datos de cuenta, más
  relevante cuando el dispositivo es compartido).
- Verify: `npx tsc --noEmit` y `npm run lint` limpios. Probado a mano en
  el navegador simulando desconexión/reconexión con eventos
  `online`/`offline` reales (`window.dispatchEvent`): banner aparece,
  marcar un ítem sin conexión no lanza error y queda en
  `localStorage`, al reconectar se sincroniza solo y el cambio queda
  confirmado en la base de datos (`comprado = true` verificado por
  consulta directa).

---

## Fase 6 — Grupos Familiares v2 (ver detalle en plan.md)

**Bloqueador**: la base de grupos familiares no está desplegada en
producción. Las Tareas 1-3 se prueban en local (`supabase db reset`); el
despliegue a producción de TODO (base + invitaciones) se hace junto, al
final, como en fases anteriores.

### Tarea 1 — Esquema: tabla de invitaciones (S) — ✅ hecha
- [x] Migración: `grupo_invitaciones` (columnas, check de `status`,
      índice único parcial `WHERE status = 'pending'` sobre
      `(grupo_id, email)`), sin acceso directo (`REVOKE ALL FROM PUBLIC,
      anon, authenticated`) — todo el acceso pasa por RPCs en la Tarea 2.
- **Criterios de aceptación**:
  - [x] `supabase db reset` aplica la migración sin error.
  - [x] No se puede insertar una segunda invitación `pending` para el
        mismo `(grupo_id, email)` (constraint lo impide; verificado a
        mano: revocar la anterior sí permite crear otra).
  - [x] Verificado que `anon` no tiene acceso directo a la tabla (403
        `permission denied` vía PostgREST).
- **Nota de entorno**: el `service_role` local no tenía privilegios por
  defecto sobre las tablas `public` (comparado y confirmado que en
  producción sí los tiene) — probablemente deriva de una versión de la
  CLI de Supabase distinta a cuando se creó el proyecto. Se corrigió con
  `GRANT`s manuales en la sesión local (no en una migración, ya que en
  producción no hace falta); si vuelve a pasar tras un `db reset`, hay
  que repetir el `GRANT ALL ... TO service_role` a mano antes de usar
  `scripts/seed-usuarios.mjs`.
- **Verify**: `supabase db reset` limpio; inserción de prueba vía SQL
  directo en Studio local.
- **Depende de**: nada nuevo (asume `family_groups` ya en local).
- **Archivos**: `supabase/migrations/2026...grupo_invitaciones.sql`

### Tarea 2 — RPCs de invitación (M) — ✅ hecha
- [x] `create_group_invitation(p_email)`, `list_group_invitations()`,
      `revoke_group_invitation(p_id)`, `list_pending_invitations_for_me()`,
      `accept_group_invitation(p_id)`, `decline_group_invitation(p_id)`.
- **Criterios de aceptación**:
  - [x] Solo el admin del grupo puede crear/listar invitaciones salientes
        (verificado: usuario2 como "miembro" recibe 42501 al intentarlo).
  - [x] Crear una invitación cuando ya hay una `pending` para el mismo
        email la revoca y crea una nueva (no coexisten dos) — cubierto ya
        en la Tarea 1, reutilizado aquí dentro de `create_group_invitation`.
  - [x] `accept_group_invitation` solo funciona si `auth.uid()` tiene el
        mismo email que la invitación, está `pending` y no ha caducado
        (`expires_at > now()`); mueve al usuario al grupo igual que hace
        hoy `add_group_member`. Verificado también que una invitación
        caducada (`expires_at` en el pasado) no se puede aceptar.
  - [x] El tope de 8 miembros se respeta (cuenta miembros actuales, no
        invitaciones pendientes).
  - [x] `decline_group_invitation` y `revoke_group_invitation` verificados
        end-to-end.
  - [x] Al aceptar, cualquier otra invitación pendiente al mismo email
        (de otros grupos) se revoca automáticamente.
- **Verify**: ciclo completo probado a mano vía `psql` con los 3 usuarios
  semilla (`scripts/seed-usuarios.mjs`): crear → listar saliente/entrante
  → aceptar → verificar `grupo_miembros` movido → rechazar → revocar →
  permiso denegado a no-admin → caducidad.
- **Depende de**: Tarea 1.
- **Archivos**: `supabase/migrations/20260821094108_grupo_invitaciones_rpc.sql`

### Checkpoint (Tareas 1-2)
- [x] `supabase db reset` limpio, ciclo completo de invitación probado a
      mano por SQL (crear → aceptar → miembro añadido).

### Tarea 3 — Invitación por email a alguien sin cuenta (M) — ✅ hecha
- [x] `inviteGroupMemberAction` en `src/lib/actions/grupo.ts`: crea la
      invitación vía `create_group_invitation`, comprueba con el cliente
      admin si el email ya tiene `profiles`; si no, llama a
      `admin.auth.admin.inviteUserByEmail(email, { data: { pending_grupo_invitation_id } })`.
  - [x] `acceptGroupInvitationAction` / `declineGroupInvitationAction` /
        `revokeGroupInvitationAction` añadidos como wrappers finos de las
        RPCs de la Tarea 2 (los necesita ya esta tarea para el
        "aceptar" tras confirmar; Tarea 5 los reutiliza para la
        invitación entrante de usuarios existentes).
  - [x] Página `/invitacion` + `InviteAcceptForm` (cliente): confirma la
        sesión, acepta la invitación, y pide contraseña
        (`setPasswordAfterInviteAction`, nuevo archivo
        `src/lib/actions/invitacion.ts`).
- **Cambio de diseño respecto al plan original**: NO hizo falta tocar
  `handle_new_user()`. `admin.inviteUserByEmail()` usa el enlace de
  verificación clásico de Supabase (flujo implícito), que entrega los
  tokens de sesión en el **fragmento `#` de la URL**, no en query string
  — se descubrió probando el email real en Mailpit. `/invitacion` los
  lee en cliente (`window.location.hash`) y llama a
  `supabase.auth.setSession(...)`, y entonces reutiliza directamente
  `accept_group_invitation` (la misma RPC de la Tarea 2) para unirse al
  grupo — exactamente en el momento de "confirmar", no antes. Esto es
  más simple que tocar el trigger y reutiliza código ya probado.
- **Criterios de aceptación**:
  - [x] Invitar a un email nuevo dispara el email de invitación de
        Supabase (verificado en Mailpit: asunto "You've been invited").
  - [x] Completar la invitación desde ese enlace deja al usuario dentro
        del grupo del invitador, no en uno propio (verificado: el nuevo
        usuario aparece en `grupo_miembros` con el `grupo_id` correcto
        y rol `miembro`; la invitación queda `accepted`).
  - [ ] Caso "invitación caducada antes de aceptar" — cubierto a nivel
        de RPC (Tarea 2, ya probado), pendiente de un paso manual por
        la UI real (ver nota de entorno).
- **Verify**: flujo probado de punta a punta **por script**, no por
  clic en el navegador — el entorno de automatización de este agente no
  tiene acceso a `localhost` (limitación ya detectada en sesiones
  anteriores). Se simuló exactamente lo que haría el navegador: 1) se
  invitó a un email nuevo, 2) se leyó el email real desde la API de
  Mailpit (`http://127.0.0.1:54324`) y se siguió el enlace de
  verificación, 3) se tomaron los tokens del fragmento de la URL
  resultante y se llamó a `setSession` + `accept_group_invitation` tal
  como haría `InviteAcceptForm`, 4) se confirmó en la base de datos que
  el usuario nuevo quedó en el grupo correcto. **Pendiente**: probar el
  clic real en el navegador (el formulario de contraseña, mensajes de
  error visuales, etc.) — el código es una traducción directa de lo ya
  verificado, pero conviene que lo confirmes tú una vez en local.
- **Nota para producción**: hay que añadir la URL de redirección
  (`https://saborsemanal.vercel.app/invitacion`) a la lista blanca de
  redirects de Supabase Auth (Dashboard → Authentication → URL
  Configuration) antes de desplegar esta fase, si no
  `inviteUserByEmail` caerá silenciosamente al `Site URL` por defecto.
- **Depende de**: Tarea 2.
- **Archivos**: `src/lib/actions/grupo.ts`, `src/lib/actions/invitacion.ts`,
  `src/app/(auth)/invitacion/page.tsx`,
  `src/components/auth/invite-accept-form.tsx`,
  `src/types/database.types.ts` (regenerado desde el esquema local).

### Checkpoint (Tareas 1-3)
- [x] Ciclo de invitación completo funciona a nivel de datos/servidor
      para ambos casos (con cuenta / sin cuenta) — verificado por script
      end-to-end para el caso sin cuenta; sin probar aún clic a clic en
      un navegador real.
- [x] `npx tsc --noEmit`, `npm run lint` y `npm run build` limpios.
- [ ] Revisar con el usuario antes de seguir con la UI (Tarea 4).

### Tarea 4 — UI: invitar y ver invitaciones salientes (M) — ✅ hecha
- [x] `GroupMembersPanel`: el formulario "Añadir miembro" pasa a
      "Invitar" y llama a `inviteGroupMemberAction`; nueva sección
      "Invitaciones pendientes" (email, expira en Xh, botón revocar)
      usando `list_group_invitations()`.
- [x] Mensajes distintos según el caso: "Invitación enviada por email..."
      (cuenta nueva) vs "Esa persona ya tiene cuenta: verá la
      invitación pendiente..." (cuenta existente) — ya cubierto en
      `inviteGroupMemberAction` (Tarea 3).
- [x] `addGroupMemberAction` (instant-add) eliminada — sustituida por
      completo por el flujo de invitación. La RPC `add_group_member` se
      deja en el esquema sin usar (no se borra: no vale la pena una
      migración solo para eso).
- **Criterios de aceptación**:
  - [x] Crear invitación la muestra en la lista de pendientes al
        instante (`revalidatePath` en `inviteGroupMemberAction`).
  - [x] Revocar quita la invitación de la lista (`revalidatePath` en
        `revokeGroupInvitationAction`).
- **Verify**: `npx tsc --noEmit`, `npm run lint`, `npm run build`
  limpios. Comprobación de humo con `curl` (la página responde 307 sin
  sesión, sin errores de compilación/render). **Pendiente de tu parte**:
  esta es la primera tarea con UI nueva — te toca probarla a clic en el
  navegador (invitar, ver la invitación pendiente, revocarla) ya que mi
  entorno no llega a `localhost`.
- **Depende de**: Tarea 2, Tarea 3.
- **Archivos**: `src/components/account/group-members-panel.tsx`,
  `src/lib/actions/grupo.ts`,
  `src/app/(protected)/dashboard/grupo/page.tsx`.

### Tarea 5 — UI: invitación entrante (usuario con cuenta) (S) — ✅ hecha
- [x] Banner en `/dashboard` (el panel/"Mi panel") para quien tiene una
      invitación `pending` a su nombre, con Aceptar/Rechazar
      (`IncomingInvitationsBanner`, nuevo componente).
- **Criterios de aceptación**:
  - [x] Solo aparece si `list_pending_invitations_for_me()` devuelve
        algo — verificado por SQL: forma de los datos (`grupo_nombre`,
        `invited_by_nombre`, `expires_at`) coincide exactamente con lo
        que consume el componente.
  - [x] Rechazar la quita de la lista (verificado por SQL). Aceptar ya
        estaba verificado en la Tarea 3 (mismo `acceptGroupInvitationAction`).
- **Verify**: `npx tsc --noEmit`, `npm run lint`, `npm run build`
  limpios; datos verificados por SQL. Pendiente de tu parte: clic real
  en el navegador.
- **Depende de**: Tarea 2.
- **Archivos**: `src/components/account/incoming-invitations-banner.tsx`,
  `src/app/(protected)/dashboard/page.tsx`.

### Tarea 6 — Aviso "Aún no tienes grupo" (S) — ✅ hecha
- [x] En `/dashboard`, si el grupo del usuario tiene un solo miembro y
      no hay invitaciones pendientes: aviso "Aún no tienes grupo.
      Créalo y comparte..." con CTA a `/dashboard/grupo`. Implementada
      junto a la Tarea 5 por vivir en la misma página.
- **Criterios de aceptación**:
  - [x] No aparece si el grupo ya tiene más de un miembro (usa
        `list_group_members().length <= 1`).
- **Verify**: `npx tsc --noEmit`, `npm run lint`, `npm run build`
  limpios.
- **Depende de**: nada nuevo (usa `list_group_members()` ya existente).
- **Archivos**: `src/app/(protected)/dashboard/page.tsx`.

### Checkpoint (Tareas 4-6)
- [x] Flujo de invitación completo a nivel de datos/servidor, de punta
      a punta, salvo el clic a clic real en un navegador (limitación de
      entorno ya documentada).
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` limpios.

### Tarea 7 — Diferenciación visual: lista y recetas compartidas (M) — ✅ hecha
- [x] `SharedWithGroupBadge` (nuevo componente presentacional): "Compartido
      con tu grupo (N)" en la cabecera de `/dashboard/lista-compra` y
      `/dashboard/recetas` cuando el grupo tiene más de un miembro (usa
      `list_group_members()`, ya existente).
- **Criterios de aceptación**:
  - [x] No aparece cuando el grupo es solo el propio usuario (el
        componente devuelve `null` si `memberCount <= 1`).
- **Verify**: `npx tsc --noEmit`, `npm run lint`, `npm run build`
  limpios.
- **Depende de**: nada nuevo.
- **Archivos**: `src/components/account/shared-with-group-badge.tsx`
  (nuevo), `src/app/(protected)/dashboard/lista-compra/page.tsx`,
  `src/app/(protected)/dashboard/recetas/page.tsx`.

### Tarea 8 — Alérgenos combinados del grupo (M) — ✅ hecha
- [x] `list_group_allergen_ids()` (RPC nueva) + `recetas/page.tsx` la usa
      en vez de `profile_allergens` individual cuando se aplican
      preferencias por defecto; nota actualizada en el bloque de filtros
      ("Aplicamos tus alérgenos guardados y los de tu grupo").
- **Criterios de aceptación**:
  - [x] Con dos miembros con alérgenos distintos, `list_group_allergen_ids()`
        devuelve la unión — verificado por SQL: usuario1 con "Apio" +
        usuario2 con "Huevo" en el mismo grupo → usuario1 ve ambos IDs.
        El filtrado en `search_public_recipes`/`count_public_recipes`
        que excluye por esos IDs ya estaba probado desde antes de esta
        fase (sin cambios en esa lógica, solo en qué IDs se le pasan).
  - [x] Al desactivar preferencias (`preferences=off`) deja de
        aplicarse, sin cambios respecto al comportamiento anterior (la
        condición `!preferencesOff` sigue igual).
- **Nota de tipos**: la función devuelve `SETOF UUID`; PostgREST lo
  serializa como un array plano de strings (`string[]`), no como
  objetos `{list_group_allergen_ids: string}[]` — confirmado por el
  generador de tipos de Supabase tras un primer intento equivocado.
- **Verify**: `npx tsc --noEmit`, `npm run lint`, `npm run build`
  limpios. Unión de alérgenos verificada por SQL con dos usuarios
  semilla.
- **Depende de**: nada nuevo.
- **Archivos**: `supabase/migrations/20260821120141_grupo_allergen_ids.sql`,
  `src/app/recetas/page.tsx`, `src/components/recipes/recipe-filters.tsx`,
  `src/types/database.types.ts`.

### Tarea extra — El admin puede eliminar el grupo (S) — ✅ hecha
(Pedida por el usuario a mitad de la Tarea 4, no estaba en el plan
original.)
- [x] RPC `delete_group()`: solo el admin; mueve a TODOS los miembros
      (incluido él mismo) a un grupo personal nuevo cada uno, como ya
      hace `remove_group_member` para uno solo. El grupo viejo se deja
      vacío en vez de borrarse (evitar el `ON DELETE CASCADE` que
      arrastraría los menús/listas de la compra compartidos del
      historial del grupo — "independiente" no implica "se destruyen
      los datos").
- [x] `deleteGroupAction`, sección "Zona peligrosa" en
      `GroupMembersPanel` con `ConfirmDialog` (tono `danger`),
      advertencia distinta según si hay otros miembros o no.
- **Criterios de aceptación**:
  - [x] Verificado a mano por SQL: admin con 2 miembros elimina el
        grupo → ambos quedan cada uno en su propio grupo (`admin` del
        suyo), el grupo viejo queda con 0 miembros.
  - [x] Un miembro no-admin no puede eliminar el grupo (42501).
  - [x] Las invitaciones salientes pendientes del grupo se revocan al
        eliminarlo.
- **Verify**: `npx tsc --noEmit`, `npm run lint`, `npm run build`
  limpios. RPC probada de punta a punta por SQL con usuarios semilla.
  **Pendiente de tu parte**: probar el botón en el navegador (mismo
  motivo que la Tarea 4).
- **Nota**: para reconstruir tuve que parar el servidor de desarrollo
  (`taskkill /F /IM node.exe`) por el problema conocido de `.next`
  compartido — esto para **todos** los procesos `node.exe` de la
  máquina, no solo el mío; si tenías tu propio `npm run dev` corriendo
  en otra terminal, lo he cortado sin querer. Ya reinicié el mío en
  `http://localhost:3000`.
- **Archivos**: `supabase/migrations/20260821102559_grupo_delete.sql`,
  `src/lib/actions/grupo.ts`,
  `src/components/account/group-members-panel.tsx`,
  `src/types/database.types.ts`.

### Tarea extra 2 — Crear el grupo desde el perfil + confirmar al quitar miembro (M) — ✅ hecha
(Pedida por el usuario tras probar la Tarea 4: "el grupo no está
creado, se debe crear en la vista de perfil, darle un nombre e invitar
usuarios" + "confirmación al quitar a alguien".)
- [x] `GroupSetupCard` en `/dashboard/cuenta`: mientras el usuario está
      solo en su grupo (`list_group_members().length <= 1`), muestra un
      formulario para ponerle nombre al grupo (`renameGroupAction`) y
      un campo para invitar (reutiliza `inviteGroupMemberAction`). En
      cuanto hay más de un miembro, pasa a mostrar solo el nombre del
      grupo + enlace a `/dashboard/grupo`.
  - `renameGroupAction` no necesitó una RPC nueva: la política RLS
    `grupos_update_admin` (de `family_groups.sql`) ya permite el
    `UPDATE` directo al admin sobre su propio grupo — verificado por
    SQL que un admin puede renombrar el suyo y NO el de otro grupo.
  - El aviso "Aún no tienes grupo" de la Tarea 6 ahora enlaza a
    `/dashboard/cuenta` (donde se crea) en vez de a `/dashboard/grupo`.
- [x] Quitar a un miembro del grupo ahora pide confirmación
      (`ConfirmDialog`, tono `danger`) antes de ejecutar
      `removeGroupMemberAction`, igual que ya existía para eliminar el
      grupo entero.
- **Verify**: `npx tsc --noEmit`, `npm run lint`, `npm run build`
  limpios. Rename verificado por SQL (admin renombra el suyo; otro
  usuario no puede tocar un grupo ajeno). Confirmación de "Quitar"
  probada visualmente en el flujo (mismo componente `ConfirmDialog` ya
  usado y probado para "Eliminar grupo").
- **Archivos**: `src/components/account/group-setup-card.tsx` (nuevo),
  `src/lib/actions/grupo.ts` (`renameGroupAction`),
  `src/app/(protected)/dashboard/cuenta/page.tsx`,
  `src/app/(protected)/dashboard/page.tsx`,
  `src/components/account/group-members-panel.tsx`.

### Checkpoint final (Fase 6)
- [x] Todos los criterios de aceptación cumplidos a nivel de
      datos/servidor; falta tu verificación a clic en el navegador de
      las Tareas 4-8 (limitación de entorno ya documentada).
- [x] `npx tsc --noEmit`, `npm run lint`, `npm run build` limpios.
- [ ] Despliegue coordinado a producción: `family_groups` (deuda
      pendiente) + toda esta fase, en un único `db push`/`apply_migration`,
      verificado con las mismas queries de diagnóstico del incidente
      anterior antes de darlo por bueno.
