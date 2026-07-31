BEGIN;

SELECT plan(11);

SELECT ok(
  NOT EXISTS (
    SELECT 1
    FROM pg_proc
    WHERE proname = 'moderate_recipe'
      AND pronamespace = 'public'::regnamespace
  ),
  'the moderation RPC no longer exists'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (
    '64000000-0000-4000-8000-000000000001',
    'autor-autoaprobacion@example.com',
    '{"display_name":"Autora Rápida"}'::JSONB
  );

INSERT INTO public.categorias_ingredientes (id, nombre)
VALUES ('64000000-0000-4000-8000-000000000002', 'Test autoaprobación');

INSERT INTO public.ingredientes (id, nombre, categoria_id)
VALUES (
  '64000000-0000-4000-8000-000000000003',
  'Ingrediente de prueba',
  '64000000-0000-4000-8000-000000000002'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '64000000-0000-4000-8000-000000000001',
  true
);

SELECT lives_ok(
  $$SELECT public.save_recipe(
    '65000000-0000-4000-8000-000000000001',
    'Receta publicada al instante',
    ARRAY['Preparar la receta'],
    15,
    2,
    true,
    '[{"ingrediente_id": "64000000-0000-4000-8000-000000000003", "cantidad": 100, "unidad": "g"}]'::JSONB,
    'Descripción de prueba',
    NULL
  )$$,
  'a user can publish a recipe directly'
);

SELECT is(
  (
    SELECT aprobada
    FROM public.recetas
    WHERE id = '65000000-0000-4000-8000-000000000001'
  ),
  true,
  'a published recipe is approved immediately'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.search_public_recipes()
  ),
  1::BIGINT,
  'the public catalog returns the freshly published recipe'
);

SELECT lives_ok(
  $$SELECT public.save_recipe(
    '65000000-0000-4000-8000-000000000001',
    'Receta publicada al instante',
    ARRAY['Preparar la receta y emplatar'],
    15,
    2,
    true,
    '[{"ingrediente_id": "64000000-0000-4000-8000-000000000003", "cantidad": 100, "unidad": "g"}]'::JSONB,
    'Descripción de prueba',
    NULL
  )$$,
  'the owner can keep editing a published recipe'
);

SELECT is(
  (
    SELECT aprobada
    FROM public.recetas
    WHERE id = '65000000-0000-4000-8000-000000000001'
  ),
  true,
  'editing a published recipe does not unapprove it'
);

SELECT lives_ok(
  $$SELECT public.save_recipe(
    '65000000-0000-4000-8000-000000000002',
    'Borrador en preparación',
    ARRAY['Preparar el borrador'],
    20,
    4,
    false,
    '[{"ingrediente_id": "64000000-0000-4000-8000-000000000003", "cantidad": 50, "unidad": "g"}]'::JSONB,
    NULL,
    NULL
  )$$,
  'a user can save a private draft'
);

SELECT is(
  (
    SELECT aprobada
    FROM public.recetas
    WHERE id = '65000000-0000-4000-8000-000000000002'
  ),
  false,
  'a draft remains unapproved'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.search_public_recipes()
  ),
  1::BIGINT,
  'the public catalog does not include drafts'
);

RESET ROLE;

SELECT throws_ok(
  $$INSERT INTO public.recetas (
    id, titulo, instrucciones, creador_id, publica, aprobada,
    tiempo_preparacion, porciones
  ) VALUES (
    '65000000-0000-4000-8000-000000000003',
    'Receta inconsistente',
    ARRAY['Preparar'],
    '64000000-0000-4000-8000-000000000001',
    true,
    false,
    10,
    1
  )$$,
  '23514',
  'new row for relation "recetas" violates check constraint "recetas_publica_requires_aprobada"',
  'the database rejects published recipes that are not approved'
);

SELECT ok(
  EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'recetas_publica_requires_aprobada'
  ),
  'the publication consistency constraint exists'
);

SELECT * FROM finish();
ROLLBACK;
