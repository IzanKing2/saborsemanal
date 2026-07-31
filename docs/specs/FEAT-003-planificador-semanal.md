# Feature Spec: FEAT-PLANNER-03 - Planificador semanal

## 1. Objetivo

Distribuir recetas de lunes a domingo en varias comidas diarias:

- Desayuno.
- Almuerzo.
- Cena.
- Otro (merienda, media mañana, etc.).

Los invitados guardan el menú en `LocalStorage`. Los usuarios autenticados lo
sincronizan en Supabase y pueden combinar recetas propias con recetas públicas
aprobadas.

## 2. Modelo de datos

`menus_semanales` incorpora `semana_inicio DATE`, siempre lunes, y una
restricción única `(usuario_id, semana_inicio)`.

`menu_recetas` usa una clave suplente `id` y mantiene:

- Una única receta por `(menu_id, dia_semana, tipo_comida)` en los slots.
- Una única fila por `(menu_id, receta_id)`: una receta solo puede estar una vez
  por semana, ya sea en el pool o en un slot.
- `dia_semana` y `tipo_comida` son opcionales: una fila con ambos `NULL` es una
  receta "sin asignar" que vive en el pool del menú.

La RPC `save_menu_slot` asigna una receta a un slot (y la saca del pool) o vacía
un slot. `add_menu_recipe` añade una receta al pool de la semana (idempotente) y
`remove_menu_recipe` la retira del menú entero (pool o slot).

## 3. Autorización

- Invitado: no escribe en Supabase; usa `LocalStorage` por semana.
- Usuario activo: solo lee sus menús y escribe mediante `save_menu_slot`,
  `add_menu_recipe` y `remove_menu_recipe`.
- Usuario baneado: no puede modificar menús.
- Una receta es elegible si pertenece al usuario o está pública y aprobada.
- `anon` no tiene privilegios sobre `menus_semanales` ni `menu_recetas`.

## 4. Rutas

- `/planificador`: modo invitado local.
- `/dashboard/planificador`: modo autenticado en la nube.

Un usuario autenticado que abre la ruta pública es redirigido al modo nube para
evitar dos menús divergentes.

## 5. Experiencia de usuario

- Navegación por semanas iniciadas en lunes.
- Flujo "añade primero, organiza después":
  1. Buscador por título con botón "Añadir" para llevar recetas al pool.
  2. Lista "Sin asignar" con selects de día y comida para colocar cada receta.
  3. Cuadrícula responsive de siete días por cuatro comidas, donde cada slot
     también permite asignar recetas del pool.
- Guardado optimista independiente por operación (pool o slot).
- Rollback y aviso si una escritura falla.
- Los cambios locales se validan y se limitan a las recetas conocidas.
- Una receta retirada del catálogo permanece identificada como no disponible
  hasta que el usuario la sustituya o la retire.
- Botón "Añadir al menú" en el catálogo `/recetas` y en la ficha
  `/recetas/[id]` para usuarios autenticados.
- Las recetas del pool también contribuyen ingredientes a la lista de la compra.

## 6. Migraciones

- `202607300013_weekly_planner.sql`: semana, slot único y RPC.
- `202607300014_planner_hardening.sql`: RLS explícita, límites temporales y
  eliminación sin crear menús vacíos.
- `202607300020_planner_pool_and_otro.sql`: tipo de comida "Otro", pool sin
  asignar (columnas opcionales + clave suplente), receta única por semana y RPCs
  `add_menu_recipe` / `remove_menu_recipe`.

## 7. Criterios de aceptación

1. Un invitado puede planificar y recuperar una semana en el mismo navegador.
2. Cambiar de semana no mezcla slots de semanas diferentes.
3. Un usuario autenticado sincroniza sus cambios con Supabase.
4. Un usuario no puede leer ni modificar el menú de otro.
5. Cada día/comida contiene como máximo una receta.
6. Solo pueden asignarse recetas propias o públicas aprobadas.
7. Una receta puede añadirse primero al pool y colocarse en día/comida después.
8. El tipo de comida "Otro" está disponible junto a Desayuno, Almuerzo y Cena.
9. Fechas inválidas y semanas fuera del intervalo permitido son rechazadas.
10. La interfaz funciona en móvil y escritorio.
11. TypeScript, lint y build terminan sin errores.

## 8. Cierre - 2026-07-30

**Estado:** completado.

Se verificaron build de producción, acceso público al modo local, redirección de
la ruta protegida sin sesión, historial de migraciones sincronizado y recorrido
manual de la interfaz.

## 9. Rediseño - 2026-07-31

**Estado:** completado.

Se sustituyó la cuadrícula de selects por el flujo de pool + asignación, se
añadió el tipo de comida "Otro", botones "Añadir al menú" en catálogo y ficha, y
se validó en remoto (migración `020`, pruebas `planner_pool.test.sql` y smoke
test de las RPC).
