BEGIN;

SELECT plan(11);

INSERT INTO auth.users (id, email) VALUES
  ('90000000-0000-4000-8000-000000000001', 'group-admin@example.com'),
  ('90000000-0000-4000-8000-000000000002', 'group-invitee@example.com'),
  ('90000000-0000-4000-8000-000000000003', 'group-outsider@example.com');

SELECT is(
  (SELECT count(DISTINCT grupo_id) FROM public.grupo_miembros
   WHERE usuario_id IN (
     '90000000-0000-4000-8000-000000000001',
     '90000000-0000-4000-8000-000000000002',
     '90000000-0000-4000-8000-000000000003'
   )),
  3::BIGINT,
  'signup gives every new user their own personal group'
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true
);

SELECT lives_ok(
  $$SELECT public.add_group_member('group-invitee@example.com')$$,
  'a group admin can add an existing user by email'
);

SELECT is(
  (SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = '90000000-0000-4000-8000-000000000002'),
  (SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = '90000000-0000-4000-8000-000000000001'),
  'the invited user now shares the admin''s group'
);

SELECT is(
  (SELECT rol FROM public.grupo_miembros WHERE usuario_id = '90000000-0000-4000-8000-000000000002'),
  'miembro',
  'the invited user joins as a regular member'
);

SELECT throws_ok(
  $$SELECT public.add_group_member('group-invitee@example.com')$$,
  '22023',
  'That user already belongs to a group',
  'a user already sharing a group cannot be re-added'
);

-- Now user 2 is a plain member (not admin) of the shared group.
SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true
);

SELECT throws_ok(
  $$SELECT public.add_group_member('group-outsider@example.com')$$,
  '42501',
  'Only a group admin can add members',
  'a non-admin member cannot add group members'
);

-- The admin adds a recipe to the weekly menu; the invited member should
-- see the resulting shared menu.
SET LOCAL ROLE postgres;
INSERT INTO public.recetas (
  id, titulo, instrucciones, creador_id, publica, aprobada,
  tiempo_preparacion, porciones
) VALUES (
  '90000000-0000-4000-8000-000000000010',
  'Receta de grupo',
  ARRAY['Preparar'],
  '90000000-0000-4000-8000-000000000001',
  true, true, 10, 2
);

SET LOCAL ROLE authenticated;
SELECT set_config(
  'request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true
);

SELECT lives_ok(
  $$SELECT public.save_menu_slot(
    '2026-08-17'::DATE, 'Lunes', 'Cena', '90000000-0000-4000-8000-000000000010'
  )$$,
  'the admin can create a shared weekly menu'
);

SELECT set_config(
  'request.jwt.claim.sub', '90000000-0000-4000-8000-000000000002', true
);

SELECT is(
  (SELECT count(*) FROM public.menus_semanales WHERE semana_inicio = '2026-08-17'),
  1::BIGINT,
  'a group member can see the menu created by another member'
);

SELECT set_config(
  'request.jwt.claim.sub', '90000000-0000-4000-8000-000000000003', true
);

SELECT is(
  (SELECT count(*) FROM public.menus_semanales WHERE semana_inicio = '2026-08-17'),
  0::BIGINT,
  'an outsider cannot see another group''s menu'
);

SELECT set_config(
  'request.jwt.claim.sub', '90000000-0000-4000-8000-000000000001', true
);

SELECT lives_ok(
  $$SELECT public.remove_group_member('90000000-0000-4000-8000-000000000002')$$,
  'a group admin can remove a member'
);

SELECT isnt(
  (SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = '90000000-0000-4000-8000-000000000002'),
  (SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = '90000000-0000-4000-8000-000000000001'),
  'the removed member gets a fresh personal group'
);

SELECT * FROM finish();
ROLLBACK;
