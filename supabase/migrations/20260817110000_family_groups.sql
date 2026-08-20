-- Family groups: single-tenant model where every user belongs to exactly
-- one group (their own personal group by default). Weekly menus and
-- shopping lists become shared per group; private recipes become visible
-- to group mates too.

CREATE TABLE public.grupos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL DEFAULT 'Mi grupo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.grupo_miembros (
  usuario_id UUID PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  rol TEXT NOT NULL DEFAULT 'admin' CHECK (rol IN ('admin', 'miembro')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX grupo_miembros_grupo_id_idx ON public.grupo_miembros (grupo_id);

-- SECURITY DEFINER: bypasses grupo_miembros RLS for a lookup hardcoded to
-- auth.uid(), so a user can only ever resolve their own group. Also used
-- inside RLS policies below, where a self-referential SELECT on
-- grupo_miembros would otherwise need its own (circular) policy.
CREATE FUNCTION public.my_grupo_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT grupo_id FROM public.grupo_miembros WHERE usuario_id = auth.uid();
$$;

-- Every new user gets their own personal group immediately, so grupo_id
-- is never null anywhere and no table needs a "no group yet" branch.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_display_name TEXT := btrim(NEW.raw_user_meta_data ->> 'display_name');
  v_grupo_id UUID;
BEGIN
  IF char_length(v_display_name) NOT BETWEEN 2 AND 60 THEN
    v_display_name := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, role, display_name)
  VALUES (NEW.id, NEW.email, 'usuario', v_display_name);

  INSERT INTO public.grupos (nombre) VALUES ('Mi grupo')
  RETURNING id INTO v_grupo_id;

  INSERT INTO public.grupo_miembros (usuario_id, grupo_id, rol)
  VALUES (NEW.id, v_grupo_id, 'admin');

  RETURN NEW;
END;
$$;

-- Backfill a personal group for every existing profile.
DO $$
DECLARE
  r RECORD;
  v_new_grupo UUID;
BEGIN
  FOR r IN
    SELECT p.id
    FROM public.profiles p
    LEFT JOIN public.grupo_miembros gm ON gm.usuario_id = p.id
    WHERE gm.usuario_id IS NULL
  LOOP
    INSERT INTO public.grupos (nombre) VALUES ('Mi grupo')
    RETURNING id INTO v_new_grupo;

    INSERT INTO public.grupo_miembros (usuario_id, grupo_id, rol)
    VALUES (r.id, v_new_grupo, 'admin');
  END LOOP;
END;
$$;

ALTER TABLE public.grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupo_miembros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "grupos_select_own"
ON public.grupos FOR SELECT TO authenticated
USING (id = public.my_grupo_id());

CREATE POLICY "grupos_update_admin"
ON public.grupos FOR UPDATE TO authenticated
USING (
  id = public.my_grupo_id()
  AND EXISTS (
    SELECT 1 FROM public.grupo_miembros
    WHERE usuario_id = auth.uid() AND rol = 'admin'
  )
)
WITH CHECK (id = public.my_grupo_id());

CREATE POLICY "grupo_miembros_select_own_group"
ON public.grupo_miembros FOR SELECT TO authenticated
USING (grupo_id = public.my_grupo_id());

REVOKE ALL ON public.grupos FROM anon, authenticated;
GRANT SELECT, UPDATE ON public.grupos TO authenticated;
REVOKE ALL ON public.grupo_miembros FROM anon, authenticated;
GRANT SELECT ON public.grupo_miembros TO authenticated;

-- Adds an existing user (by email) to the caller's group. Only allowed
-- while the target still belongs solely to their own personal group, to
-- avoid silently detaching someone from a family group they already
-- share with someone else.
CREATE FUNCTION public.add_group_member(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_my_grupo UUID;
  v_target_id UUID;
  v_target_grupo UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  SELECT grupo_id INTO v_my_grupo
  FROM public.grupo_miembros
  WHERE usuario_id = v_user_id AND rol = 'admin';

  IF v_my_grupo IS NULL THEN
    RAISE EXCEPTION 'Only a group admin can add members' USING ERRCODE = '42501';
  END IF;

  IF (SELECT count(*) FROM public.grupo_miembros WHERE grupo_id = v_my_grupo) >= 8 THEN
    RAISE EXCEPTION 'Group member limit reached' USING ERRCODE = '22023';
  END IF;

  SELECT id INTO v_target_id
  FROM public.profiles
  WHERE email = lower(btrim(p_email));

  IF v_target_id IS NULL THEN
    RAISE EXCEPTION 'No user with that email exists' USING ERRCODE = 'P0002';
  END IF;

  IF v_target_id = v_user_id THEN
    RAISE EXCEPTION 'You are already a member of this group' USING ERRCODE = '22023';
  END IF;

  SELECT grupo_id INTO v_target_grupo
  FROM public.grupo_miembros
  WHERE usuario_id = v_target_id;

  IF (SELECT count(*) FROM public.grupo_miembros WHERE grupo_id = v_target_grupo) > 1 THEN
    RAISE EXCEPTION 'That user already belongs to a group' USING ERRCODE = '22023';
  END IF;

  UPDATE public.grupo_miembros
  SET grupo_id = v_my_grupo, rol = 'miembro'
  WHERE usuario_id = v_target_id;

  RETURN v_target_id;
END;
$$;

-- Removes a member from the caller's group, giving them back a fresh
-- personal group so grupo_id stays non-null everywhere. An admin can
-- remove anyone else; anyone can remove themselves (leave the group).
CREATE FUNCTION public.remove_group_member(p_target_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_my_grupo UUID;
  v_target_grupo UUID;
  v_new_grupo UUID;
  v_is_admin BOOLEAN;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF p_target_id IS NULL THEN
    RAISE EXCEPTION 'A target user is required' USING ERRCODE = '22023';
  END IF;

  SELECT grupo_id INTO v_my_grupo FROM public.grupo_miembros WHERE usuario_id = v_user_id;
  SELECT grupo_id INTO v_target_grupo FROM public.grupo_miembros WHERE usuario_id = p_target_id;

  IF v_target_grupo IS NULL OR v_target_grupo <> v_my_grupo THEN
    RAISE EXCEPTION 'That user is not in your group' USING ERRCODE = '22023';
  END IF;

  v_is_admin := EXISTS (
    SELECT 1 FROM public.grupo_miembros WHERE usuario_id = v_user_id AND rol = 'admin'
  );

  IF p_target_id <> v_user_id AND NOT v_is_admin THEN
    RAISE EXCEPTION 'Only a group admin can remove other members' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.grupos (nombre) VALUES ('Mi grupo')
  RETURNING id INTO v_new_grupo;

  UPDATE public.grupo_miembros
  SET grupo_id = v_new_grupo, rol = 'admin'
  WHERE usuario_id = p_target_id;

  RETURN p_target_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_group_member(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_group_member(TEXT) TO authenticated;
REVOKE ALL ON FUNCTION public.remove_group_member(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.remove_group_member(UUID) TO authenticated;

-- profiles RLS only lets a user read their own row, so listing group mates
-- needs a definer function to surface just the display fields.
CREATE FUNCTION public.list_group_members()
RETURNS TABLE (
  usuario_id UUID,
  email TEXT,
  display_name TEXT,
  avatar_path TEXT,
  rol TEXT,
  es_yo BOOLEAN
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    p.id,
    p.email,
    p.display_name,
    p.avatar_path,
    gm.rol,
    p.id = auth.uid()
  FROM public.grupo_miembros AS gm
  JOIN public.profiles AS p ON p.id = gm.usuario_id
  WHERE gm.grupo_id = public.my_grupo_id()
  ORDER BY gm.joined_at;
$$;

REVOKE ALL ON FUNCTION public.list_group_members() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_group_members() TO authenticated;

-- Private recipes become visible to group mates too.
DROP POLICY IF EXISTS "recetas_select" ON public.recetas;
CREATE POLICY "recetas_select"
ON public.recetas FOR SELECT
USING (
  auth.uid() IS NOT NULL AND (
    publica = true
    OR creador_id = auth.uid()
    OR creador_id IN (
      SELECT usuario_id FROM public.grupo_miembros
      WHERE grupo_id = public.my_grupo_id()
    )
  )
);

DROP POLICY IF EXISTS "receta_ingredientes_select" ON public.receta_ingredientes;
CREATE POLICY "receta_ingredientes_select"
ON public.receta_ingredientes FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND auth.uid() IS NOT NULL
    AND (
      recetas.publica = true
      OR recetas.creador_id = auth.uid()
      OR recetas.creador_id IN (
        SELECT usuario_id FROM public.grupo_miembros
        WHERE grupo_id = public.my_grupo_id()
      )
    )
));

-- Weekly menus become shared per group instead of per user.
ALTER TABLE public.menus_semanales
  ADD COLUMN grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE;

UPDATE public.menus_semanales m
SET grupo_id = gm.grupo_id
FROM public.grupo_miembros gm
WHERE gm.usuario_id = m.usuario_id;

ALTER TABLE public.menus_semanales
  ALTER COLUMN grupo_id SET NOT NULL;

ALTER TABLE public.menus_semanales
  DROP CONSTRAINT menus_usuario_semana_unique,
  ADD CONSTRAINT menus_grupo_semana_unique UNIQUE (grupo_id, semana_inicio);

DROP POLICY IF EXISTS "menus_semanales_own" ON public.menus_semanales;
CREATE POLICY "menus_semanales_group"
ON public.menus_semanales FOR ALL TO authenticated
USING (grupo_id = public.my_grupo_id())
WITH CHECK (grupo_id = public.my_grupo_id());

DROP POLICY IF EXISTS "menu_recetas_owner" ON public.menu_recetas;
CREATE POLICY "menu_recetas_group"
ON public.menu_recetas FOR ALL TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.menus_semanales ms
  WHERE ms.id = menu_recetas.menu_id AND ms.grupo_id = public.my_grupo_id()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.menus_semanales ms
  WHERE ms.id = menu_recetas.menu_id AND ms.grupo_id = public.my_grupo_id()
));

DROP POLICY IF EXISTS "shopping_list_items_select_own" ON public.shopping_list_items;
CREATE POLICY "shopping_list_items_select_group"
ON public.shopping_list_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.menus_semanales ms
  WHERE ms.id = shopping_list_items.menu_id AND ms.grupo_id = public.my_grupo_id()
));

-- Extra (non-menu) shopping items are shared per group; the dedup key
-- moves from usuario_id to grupo_id.
ALTER TABLE public.shopping_list_extra
  ADD COLUMN grupo_id UUID REFERENCES public.grupos(id) ON DELETE CASCADE;

UPDATE public.shopping_list_extra e
SET grupo_id = gm.grupo_id
FROM public.grupo_miembros gm
WHERE gm.usuario_id = e.usuario_id;

ALTER TABLE public.shopping_list_extra
  ALTER COLUMN grupo_id SET NOT NULL;

DROP INDEX public.shopping_list_extra_master_unique;
DROP INDEX public.shopping_list_extra_custom_unique;

CREATE UNIQUE INDEX shopping_list_extra_master_unique
  ON public.shopping_list_extra (grupo_id, ingrediente_id, unidad)
  WHERE ingrediente_id IS NOT NULL;

CREATE UNIQUE INDEX shopping_list_extra_custom_unique
  ON public.shopping_list_extra (grupo_id, lower(nombre_personalizado), unidad)
  WHERE nombre_personalizado IS NOT NULL;

DROP POLICY IF EXISTS "shopping_list_extra_select_own" ON public.shopping_list_extra;
CREATE POLICY "shopping_list_extra_select_group"
ON public.shopping_list_extra FOR SELECT TO authenticated
USING (grupo_id = public.my_grupo_id() OR (SELECT public.is_admin()));

-- Rewritten RPCs: resolve v_grupo_id once and scope every lookup/write to
-- it instead of v_user_id. External signatures are unchanged.

CREATE OR REPLACE FUNCTION public.save_menu_slot(
  p_week DATE,
  p_day TEXT,
  p_meal TEXT,
  p_recipe_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_week IS NULL
    OR extract(isodow FROM p_week) <> 1
    OR p_week < current_date - INTERVAL '5 years'
    OR p_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range'
      USING ERRCODE = '22023';
  END IF;

  IF p_day NOT IN (
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ) OR p_meal NOT IN ('Desayuno', 'Almuerzo', 'Cena', 'Otro') THEN
    RAISE EXCEPTION 'Invalid menu slot' USING ERRCODE = '22023';
  END IF;

  IF p_recipe_id IS NOT NULL AND NOT EXISTS (
    SELECT 1
    FROM public.recetas
    WHERE id = p_recipe_id
      AND (
        creador_id = v_user_id
        OR creador_id IN (
          SELECT usuario_id FROM public.grupo_miembros WHERE grupo_id = v_grupo_id
        )
        OR (publica = true AND aprobada = true)
      )
  ) THEN
    RAISE EXCEPTION 'Recipe is not available to this user'
      USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO v_menu_id
  FROM public.menus_semanales
  WHERE grupo_id = v_grupo_id AND semana_inicio = p_week
  FOR UPDATE;

  IF p_recipe_id IS NULL THEN
    IF v_menu_id IS NULL THEN
      RETURN NULL;
    END IF;

    DELETE FROM public.menu_recetas
    WHERE menu_id = v_menu_id
      AND dia_semana = p_day
      AND tipo_comida = p_meal;
    RETURN v_menu_id;
  END IF;

  IF v_menu_id IS NULL THEN
    INSERT INTO public.menus_semanales (usuario_id, grupo_id, semana_inicio)
    VALUES (v_user_id, v_grupo_id, p_week)
    ON CONFLICT (grupo_id, semana_inicio)
    DO UPDATE SET semana_inicio = EXCLUDED.semana_inicio
    RETURNING id INTO v_menu_id;
  END IF;

  DELETE FROM public.menu_recetas
  WHERE menu_id = v_menu_id
    AND receta_id = p_recipe_id
    AND dia_semana IS NULL;

  INSERT INTO public.menu_recetas (
    menu_id,
    receta_id,
    dia_semana,
    tipo_comida
  ) VALUES (
    v_menu_id,
    p_recipe_id,
    p_day,
    p_meal
  )
  ON CONFLICT (menu_id, dia_semana, tipo_comida)
  DO UPDATE SET receta_id = EXCLUDED.receta_id;

  RETURN v_menu_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_menu_recipe(
  p_week DATE,
  p_recipe_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_week IS NULL
    OR extract(isodow FROM p_week) <> 1
    OR p_week < current_date - INTERVAL '5 years'
    OR p_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range'
      USING ERRCODE = '22023';
  END IF;

  IF p_recipe_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.recetas
    WHERE id = p_recipe_id
      AND (
        creador_id = v_user_id
        OR creador_id IN (
          SELECT usuario_id FROM public.grupo_miembros WHERE grupo_id = v_grupo_id
        )
        OR (publica = true AND aprobada = true)
      )
  ) THEN
    RAISE EXCEPTION 'Recipe is not available to this user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.menus_semanales (usuario_id, grupo_id, semana_inicio)
  VALUES (v_user_id, v_grupo_id, p_week)
  ON CONFLICT (grupo_id, semana_inicio)
  DO UPDATE SET semana_inicio = EXCLUDED.semana_inicio
  RETURNING id INTO v_menu_id;

  INSERT INTO public.menu_recetas (menu_id, receta_id)
  VALUES (v_menu_id, p_recipe_id)
  ON CONFLICT (menu_id, receta_id)
  DO NOTHING;

  RETURN v_menu_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_menu_recipe(
  p_week DATE,
  p_recipe_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_week IS NULL
    OR extract(isodow FROM p_week) <> 1
    OR p_week < current_date - INTERVAL '5 years'
    OR p_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range'
      USING ERRCODE = '22023';
  END IF;

  IF p_recipe_id IS NULL THEN
    RAISE EXCEPTION 'Recipe identifier is required' USING ERRCODE = '22023';
  END IF;

  SELECT id
  INTO v_menu_id
  FROM public.menus_semanales
  WHERE grupo_id = v_grupo_id AND semana_inicio = p_week;

  IF v_menu_id IS NOT NULL THEN
    DELETE FROM public.menu_recetas
    WHERE menu_id = v_menu_id
      AND receta_id = p_recipe_id;
  END IF;

  RETURN v_menu_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.regenerate_shopping_list(p_week DATE)
RETURNS SETOF public.shopping_list_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_week IS NULL
    OR extract(isodow FROM p_week) <> 1
    OR p_week < current_date - INTERVAL '5 years'
    OR p_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range'
      USING ERRCODE = '22023';
  END IF;

  SELECT menu.id
  INTO v_menu_id
  FROM public.menus_semanales AS menu
  WHERE menu.grupo_id = v_grupo_id
    AND menu.semana_inicio = p_week
  FOR UPDATE;

  IF v_menu_id IS NULL THEN
    RETURN;
  END IF;

  DELETE FROM public.shopping_list_items AS item
  WHERE item.menu_id = v_menu_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.menu_recetas AS slot
      JOIN public.receta_ingredientes AS recipe_item
        ON recipe_item.receta_id = slot.receta_id
      WHERE slot.menu_id = v_menu_id
        AND recipe_item.unidad = item.unidad
        AND (
          recipe_item.ingrediente_id = item.ingrediente_id
          OR (
            recipe_item.ingrediente_id IS NULL
            AND item.ingrediente_id IS NULL
            AND lower(btrim(recipe_item.nombre_personalizado)) =
              lower(item.nombre_personalizado)
          )
        )
    );

  INSERT INTO public.shopping_list_items (
    usuario_id,
    ingrediente_id,
    menu_id,
    cantidad,
    unidad,
    comprado,
    nombre_personalizado
  )
  SELECT
    v_user_id,
    recipe_item.ingrediente_id,
    v_menu_id,
    sum(recipe_item.cantidad),
    recipe_item.unidad,
    false,
    NULL
  FROM public.menu_recetas AS slot
  JOIN public.receta_ingredientes AS recipe_item
    ON recipe_item.receta_id = slot.receta_id
  WHERE slot.menu_id = v_menu_id
    AND recipe_item.ingrediente_id IS NOT NULL
  GROUP BY
    recipe_item.ingrediente_id,
    recipe_item.unidad
  ON CONFLICT (menu_id, ingrediente_id, unidad)
    WHERE ingrediente_id IS NOT NULL
  DO UPDATE SET
    usuario_id = EXCLUDED.usuario_id,
    cantidad = EXCLUDED.cantidad,
    comprado = CASE
      WHEN shopping_list_items.cantidad = EXCLUDED.cantidad
        THEN shopping_list_items.comprado
      ELSE false
    END;

  INSERT INTO public.shopping_list_items (
    usuario_id,
    ingrediente_id,
    menu_id,
    cantidad,
    unidad,
    comprado,
    nombre_personalizado
  )
  SELECT
    v_user_id,
    NULL,
    v_menu_id,
    sum(recipe_item.cantidad),
    recipe_item.unidad,
    false,
    min(btrim(recipe_item.nombre_personalizado))
  FROM public.menu_recetas AS slot
  JOIN public.receta_ingredientes AS recipe_item
    ON recipe_item.receta_id = slot.receta_id
  WHERE slot.menu_id = v_menu_id
    AND recipe_item.ingrediente_id IS NULL
  GROUP BY
    lower(btrim(recipe_item.nombre_personalizado)),
    recipe_item.unidad
  ON CONFLICT (menu_id, lower(nombre_personalizado), unidad)
    WHERE nombre_personalizado IS NOT NULL
  DO UPDATE SET
    usuario_id = EXCLUDED.usuario_id,
    nombre_personalizado = EXCLUDED.nombre_personalizado,
    cantidad = EXCLUDED.cantidad,
    comprado = CASE
      WHEN shopping_list_items.cantidad = EXCLUDED.cantidad
        THEN shopping_list_items.comprado
      ELSE false
    END;

  RETURN QUERY
  SELECT item.*
  FROM public.shopping_list_items AS item
  WHERE item.menu_id = v_menu_id
  ORDER BY item.created_at, item.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_shopping_item_purchased(
  p_item_id UUID,
  p_purchased BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_item_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_item_id IS NULL OR p_purchased IS NULL THEN
    RAISE EXCEPTION 'A valid shopping item update is required'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.shopping_list_items AS item
  SET comprado = p_purchased
  WHERE item.id = p_item_id
    AND EXISTS (
      SELECT 1 FROM public.menus_semanales ms
      WHERE ms.id = item.menu_id AND ms.grupo_id = v_grupo_id
    )
  RETURNING item.id INTO v_item_id;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Shopping item is not part of your group'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_shopping_item(p_item_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_item_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'A valid shopping item is required' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.shopping_list_items AS item
  WHERE item.id = p_item_id
    AND EXISTS (
      SELECT 1 FROM public.menus_semanales ms
      WHERE ms.id = item.menu_id AND ms.grupo_id = v_grupo_id
    )
  RETURNING item.id INTO v_item_id;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Shopping item is not part of your group'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.clear_shopping_list(p_week DATE)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_week IS NULL
    OR extract(isodow FROM p_week) <> 1
    OR p_week < current_date - INTERVAL '5 years'
    OR p_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range'
      USING ERRCODE = '22023';
  END IF;

  SELECT menu.id
  INTO v_menu_id
  FROM public.menus_semanales AS menu
  WHERE menu.grupo_id = v_grupo_id
    AND menu.semana_inicio = p_week;

  IF v_menu_id IS NOT NULL THEN
    DELETE FROM public.shopping_list_items AS item
    WHERE item.menu_id = v_menu_id;
  END IF;

  DELETE FROM public.shopping_list_extra AS item
  WHERE item.grupo_id = v_grupo_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.add_recipe_to_shopping_list(p_receta_id UUID)
RETURNS SETOF public.shopping_list_extra
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_receta_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.recetas AS recipe
    WHERE recipe.id = p_receta_id
      AND (
        (recipe.publica = true AND recipe.aprobada = true)
        OR recipe.creador_id = v_user_id
        OR recipe.creador_id IN (
          SELECT usuario_id FROM public.grupo_miembros WHERE grupo_id = v_grupo_id
        )
      )
  ) THEN
    RAISE EXCEPTION 'Recipe is not accessible' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.shopping_list_extra (
    usuario_id,
    grupo_id,
    ingrediente_id,
    nombre_personalizado,
    cantidad,
    unidad,
    comprado
  )
  SELECT
    v_user_id,
    v_grupo_id,
    recipe_item.ingrediente_id,
    NULL,
    sum(recipe_item.cantidad),
    recipe_item.unidad,
    false
  FROM public.receta_ingredientes AS recipe_item
  WHERE recipe_item.receta_id = p_receta_id
    AND recipe_item.ingrediente_id IS NOT NULL
  GROUP BY recipe_item.ingrediente_id, recipe_item.unidad
  ON CONFLICT (grupo_id, ingrediente_id, unidad)
    WHERE ingrediente_id IS NOT NULL
  DO UPDATE SET cantidad = shopping_list_extra.cantidad + EXCLUDED.cantidad;

  INSERT INTO public.shopping_list_extra (
    usuario_id,
    grupo_id,
    ingrediente_id,
    nombre_personalizado,
    cantidad,
    unidad,
    comprado
  )
  SELECT
    v_user_id,
    v_grupo_id,
    NULL,
    min(btrim(recipe_item.nombre_personalizado)),
    sum(recipe_item.cantidad),
    recipe_item.unidad,
    false
  FROM public.receta_ingredientes AS recipe_item
  WHERE recipe_item.receta_id = p_receta_id
    AND recipe_item.ingrediente_id IS NULL
  GROUP BY lower(btrim(recipe_item.nombre_personalizado)), recipe_item.unidad
  ON CONFLICT (grupo_id, lower(nombre_personalizado), unidad)
    WHERE nombre_personalizado IS NOT NULL
  DO UPDATE SET cantidad = shopping_list_extra.cantidad + EXCLUDED.cantidad;

  RETURN QUERY
  SELECT item.*
  FROM public.shopping_list_extra AS item
  WHERE item.grupo_id = v_grupo_id
  ORDER BY item.created_at, item.id;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_extra_item_purchased(
  p_item_id UUID,
  p_purchased BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_item_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_item_id IS NULL OR p_purchased IS NULL THEN
    RAISE EXCEPTION 'A valid shopping item update is required'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.shopping_list_extra
  SET comprado = p_purchased
  WHERE id = p_item_id
    AND grupo_id = v_grupo_id
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Shopping item is not part of your group'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_item_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.remove_extra_item(p_item_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_item_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'A valid shopping item is required' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.shopping_list_extra
  WHERE id = p_item_id
    AND grupo_id = v_grupo_id
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Shopping item is not part of your group'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_item_id;
END;
$$;
