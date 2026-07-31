BEGIN;

SELECT plan(20);

SELECT ok(
  NOT has_function_privilege('anon', 'public.delete_user_account(uuid)', 'EXECUTE'),
  'anon cannot execute account deletion'
);

SELECT ok(
  NOT has_function_privilege(
    'authenticated',
    'public.delete_user_account(uuid)',
    'EXECUTE'
  ),
  'authenticated cannot execute account deletion directly'
);

SELECT ok(
  has_function_privilege(
    'service_role',
    'public.delete_user_account(uuid)',
    'EXECUTE'
  ),
  'service role can execute account deletion'
);

SELECT ok(
  NOT has_function_privilege(
    'anon',
    'public.update_my_profile(text,text,uuid[])',
    'EXECUTE'
  ),
  'anon cannot execute profile updates'
);

SELECT ok(
  has_function_privilege(
    'authenticated',
    'public.update_my_profile(text,text,uuid[])',
    'EXECUTE'
  ),
  'authenticated can execute the constrained profile RPC'
);

INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES
  (
    '61000000-0000-4000-8000-000000000001',
    'owner-profile@example.com',
    '{"display_name":"Cocina Propia"}'::JSONB
  ),
  (
    '61000000-0000-4000-8000-000000000002',
    'other-profile@example.com',
    '{"display_name":"Otra Cocina"}'::JSONB
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    'admin-profile@example.com',
    '{"display_name":"Administración"}'::JSONB
  );

UPDATE public.profiles
SET role = 'admin'
WHERE id = '61000000-0000-4000-8000-000000000003';

UPDATE public.profiles
SET avatar_path = '61000000-0000-4000-8000-000000000001/public.jpg'
WHERE id = '61000000-0000-4000-8000-000000000001';

INSERT INTO public.alergenos (id, nombre)
VALUES ('62000000-0000-4000-8000-000000000001', 'Prueba perfil');

INSERT INTO public.recetas (
  id, titulo, instrucciones, creador_id, publica, aprobada,
  tiempo_preparacion, porciones
) VALUES
  (
    '63000000-0000-4000-8000-000000000001',
    'Receta pública del perfil',
    ARRAY['Preparar la receta'],
    '61000000-0000-4000-8000-000000000001',
    true,
    true,
    10,
    1
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    'Borrador del perfil',
    ARRAY['Preparar el borrador'],
    '61000000-0000-4000-8000-000000000001',
    false,
    false,
    10,
    1
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    'Receta pública conservada',
    ARRAY['Preparar la receta'],
    '61000000-0000-4000-8000-000000000002',
    true,
    true,
    10,
    1
  ),
  (
    '63000000-0000-4000-8000-000000000004',
    'Receta privada eliminada',
    ARRAY['Preparar la receta'],
    '61000000-0000-4000-8000-000000000002',
    false,
    false,
    10,
    1
  );

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000001',
  true
);

SELECT is(
  (SELECT display_name FROM public.profiles),
  'Cocina Propia',
  'signup metadata initializes the display name'
);

SELECT is(
  (SELECT count(*) FROM public.profiles),
  1::BIGINT,
  'a user reads only their own profile'
);

SELECT ok(
  public.storage_avatar_is_public(
    '61000000-0000-4000-8000-000000000001/public.jpg'
  ),
  'an approved recipe makes only its linked author avatar public'
);

SELECT throws_ok(
  $$UPDATE public.profiles SET role = 'admin' WHERE id = auth.uid()$$,
  '42501',
  'permission denied for table profiles',
  'direct profile updates cannot escalate role'
);

SELECT lives_ok(
  $$SELECT public.update_my_profile(
    'Nombre Actualizado',
    NULL,
    ARRAY['62000000-0000-4000-8000-000000000001']::UUID[]
  )$$,
  'the owner can update allowlisted profile fields'
);

SELECT is(
  (SELECT display_name FROM public.profiles),
  'Nombre Actualizado',
  'the profile RPC updates the display name'
);

SELECT is(
  (SELECT count(*) FROM public.profile_allergens),
  1::BIGINT,
  'the profile RPC replaces allergen preferences'
);

SELECT throws_ok(
  $$SELECT public.update_my_profile('Nombre Válido', 'otro/avatar.jpg', ARRAY[]::UUID[])$$,
  '22023',
  'Avatar path is invalid',
  'an avatar outside the user folder is rejected'
);

SELECT is(
  (
    SELECT display_name
    FROM public.get_public_recipe_authors(
      ARRAY['63000000-0000-4000-8000-000000000001']::UUID[]
    )
  ),
  'Nombre Actualizado',
  'approved recipes expose a sanitized author'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.get_public_recipe_authors(
      ARRAY['63000000-0000-4000-8000-000000000002']::UUID[]
    )
  ),
  0::BIGINT,
  'private recipes do not expose their author'
);

SELECT set_config(
  'request.jwt.claim.sub',
  '61000000-0000-4000-8000-000000000002',
  true
);

SELECT throws_ok(
  $$SELECT public.delete_user_account('61000000-0000-4000-8000-000000000002')$$,
  '42501',
  'permission denied for function delete_user_account',
  'authenticated clients cannot call the destructive account function'
);

RESET ROLE;
SET LOCAL ROLE service_role;
SELECT set_config('request.jwt.claim.role', 'service_role', true);

SELECT lives_ok(
  $$SELECT public.delete_user_account('61000000-0000-4000-8000-000000000002')$$,
  'the service role can delete a reauthenticated account when storage is empty'
);

RESET ROLE;

SELECT is(
  (
    SELECT count(*)
    FROM auth.users
    WHERE id = '61000000-0000-4000-8000-000000000002'
  ),
  0::BIGINT,
  'account deletion removes the Auth user'
);

SELECT is(
  (
    SELECT count(*)
    FROM public.recetas
    WHERE id IN (
      '63000000-0000-4000-8000-000000000003',
      '63000000-0000-4000-8000-000000000004'
    )
  ),
  1::BIGINT,
  'account deletion removes private recipes and preserves approved ones'
);

SELECT is(
  (
    SELECT creador_id
    FROM public.recetas
    WHERE id = '63000000-0000-4000-8000-000000000003'
  ),
  NULL::UUID,
  'a preserved public recipe becomes anonymous'
);

SELECT * FROM finish();
ROLLBACK;
