BEGIN;

SELECT plan(12);

INSERT INTO auth.users (id, email) VALUES
  ('10000000-0000-4000-8000-000000000001', 'shopping-owner@example.com'),
  ('10000000-0000-4000-8000-000000000002', 'shopping-other@example.com');

INSERT INTO public.categorias_ingredientes (id, nombre)
VALUES ('20000000-0000-4000-8000-000000000001', 'Despensa');

INSERT INTO public.ingredientes (id, nombre, categoria_id)
VALUES (
  '30000000-0000-4000-8000-000000000001',
  'Harina',
  '20000000-0000-4000-8000-000000000001'
);

INSERT INTO public.recetas (
  id,
  titulo,
  instrucciones,
  creador_id,
  tiempo_preparacion,
  porciones
) VALUES
  (
    '40000000-0000-4000-8000-000000000001',
    'Pan de prueba',
    ARRAY['Mezclar ingredientes'],
    '10000000-0000-4000-8000-000000000001',
    30,
    2
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    'Masa de prueba',
    ARRAY['Preparar la masa'],
    '10000000-0000-4000-8000-000000000001',
    20,
    2
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    'Harina a granel',
    ARRAY['Preparar el ingrediente'],
    '10000000-0000-4000-8000-000000000001',
    5,
    1
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    'Cantidad máxima',
    ARRAY['Usar el ingrediente'],
    '10000000-0000-4000-8000-000000000001',
    5,
    1
  );

INSERT INTO public.receta_ingredientes (
  receta_id,
  ingrediente_id,
  nombre_personalizado,
  cantidad,
  unidad
) VALUES
  (
    '40000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    NULL,
    100,
    'g'
  ),
  (
    '40000000-0000-4000-8000-000000000001',
    NULL,
    'Sal marina',
    5,
    'g'
  ),
  (
    '40000000-0000-4000-8000-000000000003',
    '30000000-0000-4000-8000-000000000001',
    NULL,
    20,
    'g'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    '30000000-0000-4000-8000-000000000001',
    NULL,
    1,
    'kg'
  ),
  (
    '40000000-0000-4000-8000-000000000002',
    NULL,
    'sal MARINA',
    2,
    'g'
  ),
  (
    '40000000-0000-4000-8000-000000000004',
    '30000000-0000-4000-8000-000000000001',
    NULL,
    1000000,
    'g'
  );

INSERT INTO public.menus_semanales (id, usuario_id, grupo_id, semana_inicio)
VALUES
  (
    '50000000-0000-4000-8000-000000000001',
    '10000000-0000-4000-8000-000000000001',
    (SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = '10000000-0000-4000-8000-000000000001'),
    '2026-07-27'
  ),
  (
    '50000000-0000-4000-8000-000000000002',
    '10000000-0000-4000-8000-000000000001',
    (SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = '10000000-0000-4000-8000-000000000001'),
    '2026-08-03'
  );

INSERT INTO public.menu_recetas (
  menu_id,
  receta_id,
  dia_semana,
  tipo_comida
) VALUES
  (
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000001',
    'Lunes',
    'Almuerzo'
  ),
  (
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000002',
    'Martes',
    'Almuerzo'
  ),
  (
    '50000000-0000-4000-8000-000000000001',
    '40000000-0000-4000-8000-000000000003',
    'Miércoles',
    'Cena'
  );

INSERT INTO public.menu_recetas (
  menu_id,
  receta_id,
  dia_semana,
  tipo_comida
) VALUES (
  '50000000-0000-4000-8000-000000000002',
  '40000000-0000-4000-8000-000000000004',
  'Lunes',
  'Almuerzo'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);

SELECT is(
  (SELECT count(*) FROM public.regenerate_shopping_list('2026-07-27')),
  3::BIGINT,
  'regeneration creates one row per source and unit'
);

SELECT is(
  (
    SELECT cantidad
    FROM public.regenerate_shopping_list('2026-08-03')
    WHERE ingrediente_id = '30000000-0000-4000-8000-000000000001'
      AND unidad = 'g'
  ),
  1000000::NUMERIC,
  'a recipe contributes its full ingredient quantity'
);

SELECT is(
  (
    SELECT cantidad
    FROM public.shopping_list_items
    WHERE menu_id = '50000000-0000-4000-8000-000000000001'
      AND ingrediente_id = '30000000-0000-4000-8000-000000000001'
      AND unidad = 'g'
  ),
  120::NUMERIC,
  'recipes sharing a master ingredient consolidate into one row'
);

SELECT is(
  (
    SELECT cantidad
    FROM public.shopping_list_items
    WHERE menu_id = '50000000-0000-4000-8000-000000000001'
      AND ingrediente_id = '30000000-0000-4000-8000-000000000001'
      AND unidad = 'kg'
  ),
  1::NUMERIC,
  'different units remain separate'
);

SELECT is(
  (
    SELECT cantidad
    FROM public.shopping_list_items
    WHERE menu_id = '50000000-0000-4000-8000-000000000001'
      AND lower(nombre_personalizado) = 'sal marina'
  ),
  7::NUMERIC,
  'custom names are normalized and consolidated'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.shopping_list_items
    WHERE menu_id = '50000000-0000-4000-8000-000000000001'
      AND nombre_personalizado IS NOT NULL
  ),
  1::BIGINT,
  'custom ingredients do not collapse through a null id'
);

SELECT ok(
  NOT EXISTS (
    SELECT 1 FROM public.shopping_list_items WHERE comprado = true
  ),
  'regeneration initializes every item as not purchased'
);

SELECT throws_ok(
  $$
    INSERT INTO public.shopping_list_items (
      usuario_id, ingrediente_id, menu_id, cantidad, unidad
    ) VALUES (
      '10000000-0000-4000-8000-000000000001',
      '30000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      1,
      'unidad'
    )
  $$,
  '42501',
  'permission denied for table shopping_list_items',
  'authenticated users cannot write shopping rows directly'
);

SELECT lives_ok(
  format(
    'SELECT public.set_shopping_item_purchased(%L, true)',
    (
      SELECT id
      FROM public.shopping_list_items
      WHERE menu_id = '50000000-0000-4000-8000-000000000001'
        AND ingrediente_id = '30000000-0000-4000-8000-000000000001'
        AND unidad = 'g'
    )
  ),
  'an owner can mark an item as purchased'
);

DO $$
BEGIN
  PERFORM public.regenerate_shopping_list('2026-07-27');
END;
$$;

SELECT ok(
  (
    SELECT comprado
    FROM public.shopping_list_items
    WHERE menu_id = '50000000-0000-4000-8000-000000000001'
      AND ingrediente_id = '30000000-0000-4000-8000-000000000001'
      AND unidad = 'g'
  ),
  'regeneration preserves a check when quantity is unchanged'
);

CREATE TEMP TABLE owned_shopping_item AS
SELECT id
FROM public.shopping_list_items
WHERE menu_id = '50000000-0000-4000-8000-000000000001'
  AND ingrediente_id = '30000000-0000-4000-8000-000000000001'
  AND unidad = 'g';

SELECT set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);

SELECT is(
  (SELECT count(*) FROM public.shopping_list_items),
  0::BIGINT,
  'RLS hides another user shopping list'
);

SELECT throws_ok(
  format(
    'SELECT public.set_shopping_item_purchased(%L, false)',
    (SELECT id FROM owned_shopping_item)
  ),
  '42501',
  'Shopping item is not part of your group',
  'another user cannot update an owned item'
);

SELECT * FROM finish();
ROLLBACK;
