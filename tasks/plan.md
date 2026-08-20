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
