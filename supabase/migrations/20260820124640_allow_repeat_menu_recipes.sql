-- Allow the same recipe to be placed in more than one day/meal slot in a
-- week (e.g. leftovers, a recurring breakfast). menu_recetas_recipe_unique
-- was a blanket UNIQUE (menu_id, receta_id) meant only to stop duplicate
-- pool entries, but it also blocked assigning the same recipe to a second
-- slot: save_menu_slot's INSERT always violated it even though its own
-- ON CONFLICT target is the (menu_id, dia_semana, tipo_comida) slot
-- constraint, because Postgres checks every applicable unique constraint on
-- insert, not just the one named in ON CONFLICT.
--
-- Fix: scope the uniqueness to pool rows only (dia_semana IS NULL), so
-- multiple slot rows can share a receta_id while the pool still dedupes.

ALTER TABLE public.menu_recetas DROP CONSTRAINT IF EXISTS menu_recetas_recipe_unique;
DROP INDEX IF EXISTS public.menu_recetas_recipe_unique;

CREATE UNIQUE INDEX menu_recetas_pool_recipe_unique
  ON public.menu_recetas (menu_id, receta_id)
  WHERE dia_semana IS NULL;

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
  ON CONFLICT (menu_id, receta_id) WHERE dia_semana IS NULL
  DO NOTHING;

  RETURN v_menu_id;
END;
$$;

-- Was unscoped: with several slot rows now able to share a receta_id,
-- deleting by (menu_id, receta_id) alone would also wipe out calendar
-- assignments when the same recipe was removed from the pool.
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
      AND receta_id = p_recipe_id
      AND dia_semana IS NULL;
  END IF;

  RETURN v_menu_id;
END;
$$;
