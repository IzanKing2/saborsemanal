BEGIN;

SELECT plan(30);

INSERT INTO auth.users (id, email) VALUES
  ('80000000-0000-4000-8000-000000000001', 'save-owner@example.com'),
  ('80000000-0000-4000-8000-000000000002', 'save-other@example.com');

INSERT INTO public.categorias_ingredientes (id, nombre)
VALUES ('80000000-0000-4000-8000-000000000003', 'Despensa de test');

INSERT INTO public.ingredientes (id, nombre, categoria_id)
VALUES
  (
    '80000000-0000-4000-8000-000000000004',
    'Harina',
    '80000000-0000-4000-8000-000000000003'
  ),
  (
    '80000000-0000-4000-8000-000000000005',
    'Azúcar',
    '80000000-0000-4000-8000-000000000003'
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
) VALUES (
  '80000000-0000-4000-8000-000000000010',
  'Receta ajena',
  ARRAY['Preparar la receta ajena'],
  '80000000-0000-4000-8000-000000000002',
  false,
  false,
  10,
  2
);

INSERT INTO public.receta_ingredientes (
  receta_id,
  ingrediente_id,
  cantidad,
  unidad
) VALUES (
  '80000000-0000-4000-8000-000000000010',
  '80000000-0000-4000-8000-000000000004',
  100,
  'g'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '80000000-0000-4000-8000-000000000001',
  true
);

SELECT lives_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000011',
    '  Tortilla de prueba  ',
    ARRAY['Batir los huevos', 'Cuajar en la sartén'],
    15,
    2,
    true,
    '[
      {"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"},
      {"ingrediente_id": "80000000-0000-4000-8000-000000000005", "cantidad": 250, "unidad": "g"}
    ]'::JSONB,
    'Receta básica para pruebas',
    NULL
  )$$,
  'an owner can create a published recipe'
);

SELECT is(
  (SELECT titulo FROM public.recetas WHERE id = '80000000-0000-4000-8000-000000000011'),
  'Tortilla de prueba',
  'the title is trimmed on creation'
);

SELECT is(
  (SELECT aprobada FROM public.recetas WHERE id = '80000000-0000-4000-8000-000000000011'),
  true,
  'a published recipe is approved immediately'
);

SELECT is(
  (SELECT creador_id FROM public.recetas WHERE id = '80000000-0000-4000-8000-000000000011'),
  '80000000-0000-4000-8000-000000000001',
  'the recipe is owned by the current user'
);

SELECT is(
  (SELECT count(*) FROM public.receta_ingredientes WHERE receta_id = '80000000-0000-4000-8000-000000000011'),
  2::BIGINT,
  'all master ingredients are stored'
);

SELECT is(
  (
    SELECT nombre_personalizado IS NULL
    FROM public.receta_ingredientes
    WHERE receta_id = '80000000-0000-4000-8000-000000000011'
      AND ingrediente_id = '80000000-0000-4000-8000-000000000004'
  ),
  true,
  'master ingredients keep a null custom name'
);

SELECT lives_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000012',
    'Borrador en curso',
    ARRAY['Redactar los pasos'],
    20,
    4,
    false,
    '[
      {"ingrediente_id": "80000000-0000-4000-8000-000000000005", "cantidad": 50, "unidad": "g"},
      {"ingrediente_id": null, "nombre_personalizado": "  Azúcar morena  ", "cantidad": 10, "unidad": "G"}
    ]'::JSONB,
    NULL,
    NULL
  )$$,
  'an owner can create a private draft'
);

SELECT is(
  (SELECT aprobada FROM public.recetas WHERE id = '80000000-0000-4000-8000-000000000012'),
  false,
  'a draft remains unapproved'
);

SELECT is(
  (
    SELECT nombre_personalizado
    FROM public.receta_ingredientes
    WHERE receta_id = '80000000-0000-4000-8000-000000000012'
      AND ingrediente_id IS NULL
  ),
  'Azúcar morena',
  'custom ingredients keep their trimmed name'
);

SELECT is(
  (
    SELECT unidad
    FROM public.receta_ingredientes
    WHERE receta_id = '80000000-0000-4000-8000-000000000012'
      AND ingrediente_id IS NULL
  ),
  'g',
  'units are normalized to lowercase'
);

SELECT lives_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000011',
    'Tortilla actualizada',
    ARRAY['Batir los huevos', 'Añadir la sal', 'Cuajar en la sartén'],
    20,
    3,
    true,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 200, "unidad": "g"}]'::JSONB,
    'Descripción actualizada',
    NULL
  )$$,
  'an owner can update their own recipe'
);

SELECT is(
  (SELECT count(*) FROM public.receta_ingredientes WHERE receta_id = '80000000-0000-4000-8000-000000000011'),
  1::BIGINT,
  'updating replaces the ingredient rows'
);

SELECT is(
  (SELECT titulo FROM public.recetas WHERE id = '80000000-0000-4000-8000-000000000011'),
  'Tortilla actualizada',
  'the updated title is persisted'
);

SELECT is(
  (SELECT aprobada FROM public.recetas WHERE id = '80000000-0000-4000-8000-000000000011'),
  true,
  'updating a published recipe keeps it approved'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000010',
    'Intento ajeno',
    ARRAY['Preparar la receta'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '42501',
  'Recipe does not belong to the current user',
  'a user cannot update a recipe they do not own'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'ab',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Recipe title must contain between 3 and 120 characters',
  'a too short title is rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY[''],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Recipe instructions are invalid',
  'empty instruction steps are rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['X'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Recipe instructions are invalid',
  'too short instruction steps are rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    0,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Preparation time must be between 1 and 1440 minutes',
  'zero preparation time is rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    0,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Servings must be between 1 and 100',
  'zero servings are rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'A recipe must contain between 1 and 50 ingredients',
  'an empty ingredient list is rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100}]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Recipe ingredients contain invalid values',
  'an ingredient without a unit is rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[
      {"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"},
      {"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 50, "unidad": "g"}
    ]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Recipe ingredients must be unique',
  'duplicate master ingredients are rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000099", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '23503',
  'One or more master ingredients do not exist',
  'a non-existent master ingredient is rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    'otro-usuario/80000000-0000-4000-8000-000000000013/foto.jpg'
  )$$,
  '22023',
  'Recipe image path is invalid',
  'an image outside the owner folder is rejected'
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    NULL,
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '22023',
  'Recipe identifier and publication state are required',
  'a missing recipe identifier is rejected'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '99999999-9999-4999-8999-999999999999',
  true
);

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '42501',
  'An active user is required',
  'a session without a profile cannot save recipes'
);

SET LOCAL ROLE postgres;
UPDATE public.profiles
SET role = 'admin'
WHERE id = '80000000-0000-4000-8000-000000000001';

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '80000000-0000-4000-8000-000000000001',
  true
);

SELECT lives_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000010',
    'Receta ajena editada por admin',
    ARRAY['Preparar la receta editada'],
    20,
    4,
    true,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 250, "unidad": "g"}]'::JSONB,
    'Editada por administración',
    NULL
  )$$,
  'an admin can edit another user recipe'
);

SELECT is(
  (SELECT creador_id FROM public.recetas WHERE id = '80000000-0000-4000-8000-000000000010'),
  '80000000-0000-4000-8000-000000000002',
  'admin editing preserves the original author'
);

SET LOCAL ROLE anon;

SELECT throws_ok(
  $$SELECT public.save_recipe(
    '80000000-0000-4000-8000-000000000013',
    'Título válido',
    ARRAY['Preparar'],
    10,
    2,
    false,
    '[{"ingrediente_id": "80000000-0000-4000-8000-000000000004", "cantidad": 100, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  '42501',
  'permission denied for function save_recipe',
  'anonymous users cannot execute save_recipe'
);

SELECT * FROM finish();
ROLLBACK;
