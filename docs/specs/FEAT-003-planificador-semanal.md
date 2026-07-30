# Feature Spec: FEAT-PLANNER-03 - Planificador semanal

## 1. Objetivo

Distribuir recetas de lunes a domingo en tres comidas diarias:

- Desayuno.
- Almuerzo.
- Cena.

Los invitados guardan el menú en `LocalStorage`. Los usuarios autenticados lo
sincronizan en Supabase y pueden combinar recetas propias con recetas públicas
aprobadas.

## 2. Modelo de datos

`menus_semanales` incorpora `semana_inicio DATE`, siempre lunes, y una
restricción única `(usuario_id, semana_inicio)`.

`menu_recetas` mantiene una única receta por
`(menu_id, dia_semana, tipo_comida)`. La RPC `save_menu_slot` crea o actualiza
el menú, asigna una receta o vacía un slot.

## 3. Autorización

- Invitado: no escribe en Supabase; usa `LocalStorage` por semana.
- Usuario activo: solo lee sus menús y escribe mediante `save_menu_slot`.
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
- Cuadrícula responsive de siete días por tres comidas.
- Guardado optimista independiente por slot.
- Rollback y aviso si una escritura falla.
- Los cambios locales se validan y limitan a los 21 slots conocidos.
- Una receta retirada del catálogo permanece identificada como no disponible
  hasta que el usuario la sustituya o vacíe el slot.

## 6. Migraciones

- `202607300013_weekly_planner.sql`: semana, slot único y RPC.
- `202607300014_planner_hardening.sql`: RLS explícita, límites temporales y
  eliminación sin crear menús vacíos.

## 7. Criterios de aceptación

1. Un invitado puede planificar y recuperar una semana en el mismo navegador.
2. Cambiar de semana no mezcla slots de semanas diferentes.
3. Un usuario autenticado sincroniza sus cambios con Supabase.
4. Un usuario no puede leer ni modificar el menú de otro.
5. Cada día/comida contiene como máximo una receta.
6. Solo pueden asignarse recetas propias o públicas aprobadas.
7. Fechas inválidas y semanas fuera del intervalo permitido son rechazadas.
8. La interfaz funciona en móvil y escritorio.
9. TypeScript, lint y build terminan sin errores.

## 8. Cierre - 2026-07-30

**Estado:** completado.

Se verificaron build de producción, acceso público al modo local, redirección de
la ruta protegida sin sesión, historial de migraciones sincronizado y recorrido
manual de la interfaz.
