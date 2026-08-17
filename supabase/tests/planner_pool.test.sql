BEGIN;

SELECT plan(23);

INSERT INTO auth.users (id, email) VALUES
  ('70000000-0000-4000-8000-000000000001', 'plan-pool-owner@example.com'),
  ('70000000-0000-4000-8000-000000000002', 'plan-pool-other@example.com');

INSERT INTO public.categorias_ingredientes (id, nombre)
VALUES ('70000000-0000-4000-8000-000000000003', 'Pool test');

INSERT INTO public.ingredientes (id, nombre, categoria_id)
VALUES (
  '70000000-0000-4000-8000-000000000004',
  'Ingrediente del pool',
  '70000000-0000-4000-8000-000000000003'
);

INSERT INTO public.recetas (
  id,
  titulo,
  instrucciones,
  creador_id,
  publica,
  aprobada,
  tiempo_preparacion,
  porciones
) VALUES
  (
    '71000000-0000-4000-8000-000000000001',
    'Propia publicada',
    ARRAY['Preparar la receta'],
    '70000000-0000-4000-8000-000000000001',
    true,
    true,
    15,
    2
  ),
  (
    '71000000-0000-4000-8000-000000000002',
    'Propio borrador',
    ARRAY['Preparar el borrador'],
    '70000000-0000-4000-8000-000000000001',
    false,
    false,
    10,
    1
  ),
  (
    '71000000-0000-4000-8000-000000000003',
    'Catálogo ajeno',
    ARRAY['Preparar la receta'],
    '70000000-0000-4000-8000-000000000002',
    true,
    true,
    20,
    2
  ),
  (
    '71000000-0000-4000-8000-000000000004',
    'Borrador ajeno',
    ARRAY['Preparar el borrador'],
    '70000000-0000-4000-8000-000000000002',
    false,
    false,
    5,
    1
  );

INSERT INTO public.menus_semanales (id, usuario_id, grupo_id, semana_inicio)
VALUES (
  '72000000-0000-4000-8000-000000000001',
  '70000000-0000-4000-8000-000000000001',
  (SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = '70000000-0000-4000-8000-000000000001'),
  '2026-07-27'
);

INSERT INTO public.menu_recetas (menu_id, receta_id, dia_semana, tipo_comida)
VALUES (
  '72000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000001',
  'Lunes',
  'Almuerzo'
);

SELECT throws_ok(
  $$
    INSERT INTO public.menu_recetas (menu_id, receta_id, dia_semana, tipo_comida)
    VALUES (
      '72000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000002',
      'Lunes',
      'Almuerzo'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "menu_recetas_slot_unique"',
  'two different recipes cannot share a slot'
);

SELECT throws_ok(
  $$
    INSERT INTO public.menu_recetas (menu_id, receta_id, dia_semana, tipo_comida)
    VALUES (
      '72000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001',
      'Martes',
      'Cena'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "menu_recetas_recipe_unique"',
  'a recipe appears only once per weekly menu'
);

SELECT throws_ok(
  $$
    INSERT INTO public.menu_recetas (menu_id, receta_id)
    VALUES (
      '72000000-0000-4000-8000-000000000001',
      '71000000-0000-4000-8000-000000000001'
    )
  $$,
  '23505',
  'duplicate key value violates unique constraint "menu_recetas_recipe_unique"',
  'an assigned recipe cannot join the pool again'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '70000000-0000-4000-8000-000000000001',
  true
);

SELECT lives_ok(
  'SELECT public.add_menu_recipe(''2026-07-27'', ''71000000-0000-4000-8000-000000000002'')',
  'an owner can add their own draft to the menu pool'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND receta_id = '71000000-0000-4000-8000-000000000002'
      AND dia_semana IS NULL
      AND tipo_comida IS NULL
  ),
  1::BIGINT,
  'a newly added recipe stays unassigned in the pool'
);

SELECT lives_ok(
  'SELECT public.add_menu_recipe(''2026-07-27'', ''71000000-0000-4000-8000-000000000002'')',
  'adding the same recipe again is a no-op'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND receta_id = '71000000-0000-4000-8000-000000000002'
  ),
  1::BIGINT,
  'the pool keeps one row per recipe'
);

SELECT lives_ok(
  'SELECT public.add_menu_recipe(''2026-07-27'', ''71000000-0000-4000-8000-000000000003'')',
  'a catalog recipe published by another user can be added'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND receta_id = '71000000-0000-4000-8000-000000000003'
      AND dia_semana IS NULL
  ),
  1::BIGINT,
  'the catalog recipe joins the pool'
);

SELECT throws_ok(
  'SELECT public.add_menu_recipe(''2026-07-27'', ''71000000-0000-4000-8000-000000000004'')',
  '42501',
  'Recipe is not available to this user',
  'a recipe owned by someone else and unpublished cannot be added'
);

SELECT lives_ok(
  'SELECT public.save_menu_slot(''2026-07-27'', ''Lunes'', ''Otro'', ''71000000-0000-4000-8000-000000000002'')',
  'the new "Otro" meal type is accepted'
);

SELECT is(
  (
    SELECT receta_id
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND dia_semana = 'Lunes'
      AND tipo_comida = 'Otro'
  ),
  '71000000-0000-4000-8000-000000000002',
  'assigning a pool recipe fills the target slot'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND receta_id = '71000000-0000-4000-8000-000000000002'
      AND dia_semana IS NULL
  ),
  0::BIGINT,
  'assigning a recipe removes it from the pool'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND receta_id = '71000000-0000-4000-8000-000000000002'
  ),
  1::BIGINT,
  'an assigned recipe stays in a single slot'
);

SELECT throws_ok(
  'SELECT public.save_menu_slot(''2026-07-27'', ''Lunes'', ''Merienda'', ''71000000-0000-4000-8000-000000000003'')',
  '22023',
  'Invalid menu slot',
  'unknown meal types are rejected'
);

SELECT lives_ok(
  'SELECT public.remove_menu_recipe(''2026-07-27'', ''71000000-0000-4000-8000-000000000003'')',
  'an owner can remove a pooled recipe'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND receta_id = '71000000-0000-4000-8000-000000000003'
  ),
  0::BIGINT,
  'removing a recipe clears its pool row'
);

SELECT lives_ok(
  'SELECT public.remove_menu_recipe(''2026-07-27'', ''71000000-0000-4000-8000-000000000002'')',
  'an owner can remove an assigned recipe'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas
    WHERE menu_id = '72000000-0000-4000-8000-000000000001'
      AND receta_id = '71000000-0000-4000-8000-000000000002'
  ),
  0::BIGINT,
  'removing a recipe clears its slot row'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '70000000-0000-4000-8000-000000000002',
  true
);

SELECT lives_ok(
  'SELECT public.add_menu_recipe(''2026-08-03'', ''71000000-0000-4000-8000-000000000004'')',
  'another user adds a recipe to their own menu'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menus_semanales
    WHERE usuario_id = '70000000-0000-4000-8000-000000000002'
  ),
  1::BIGINT,
  'the other user owns their own weekly menu'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menu_recetas AS slot
    JOIN public.menus_semanales AS menu ON menu.id = slot.menu_id
    WHERE menu.usuario_id = '70000000-0000-4000-8000-000000000002'
      AND slot.receta_id = '71000000-0000-4000-8000-000000000004'
      AND slot.dia_semana IS NULL
  ),
  1::BIGINT,
  'the other user pools a recipe unassigned'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.menus_semanales
    WHERE usuario_id = '70000000-0000-4000-8000-000000000001'
  ),
  0::BIGINT,
  'a user cannot see another user weekly menu'
);

SELECT * FROM finish();
ROLLBACK;
