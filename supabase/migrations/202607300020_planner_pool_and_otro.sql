-- Redesign the weekly planner: recipes are added to a menu pool first, then
-- assigned to a day/meal slot, and "Otro" joins the meal options.

ALTER TABLE public.menu_recetas
  DROP CONSTRAINT menu_recetas_tipo_comida_check,
  ADD CONSTRAINT menu_recetas_tipo_comida_check
    CHECK (tipo_comida IN ('Desayuno', 'Almuerzo', 'Cena', 'Otro'));

ALTER TABLE public.menu_recetas
  DROP CONSTRAINT menu_recetas_pkey;

ALTER TABLE public.menu_recetas
  ALTER COLUMN dia_semana DROP NOT NULL,
  ALTER COLUMN tipo_comida DROP NOT NULL;

ALTER TABLE public.menu_recetas
  ADD COLUMN id UUID DEFAULT gen_random_uuid();

UPDATE public.menu_recetas
SET id = gen_random_uuid()
WHERE id IS NULL;

ALTER TABLE public.menu_recetas
  ALTER COLUMN id SET NOT NULL,
  ADD CONSTRAINT menu_recetas_pkey PRIMARY KEY (id);

DELETE FROM public.menu_recetas AS duplicate
USING public.menu_recetas AS keeper
WHERE duplicate.menu_id = keeper.menu_id
  AND duplicate.receta_id = keeper.receta_id
  AND duplicate.id > keeper.id;

CREATE UNIQUE INDEX menu_recetas_recipe_unique
  ON public.menu_recetas (menu_id, receta_id);

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
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

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
        OR (publica = true AND aprobada = true)
      )
  ) THEN
    RAISE EXCEPTION 'Recipe is not available to this user'
      USING ERRCODE = '42501';
  END IF;

  SELECT id
  INTO v_menu_id
  FROM public.menus_semanales
  WHERE usuario_id = v_user_id AND semana_inicio = p_week
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
    INSERT INTO public.menus_semanales (usuario_id, semana_inicio)
    VALUES (v_user_id, p_week)
    ON CONFLICT (usuario_id, semana_inicio)
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

CREATE FUNCTION public.add_menu_recipe(
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
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

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
        OR (publica = true AND aprobada = true)
      )
  ) THEN
    RAISE EXCEPTION 'Recipe is not available to this user'
      USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.menus_semanales (usuario_id, semana_inicio)
  VALUES (v_user_id, p_week)
  ON CONFLICT (usuario_id, semana_inicio)
  DO UPDATE SET semana_inicio = EXCLUDED.semana_inicio
  RETURNING id INTO v_menu_id;

  INSERT INTO public.menu_recetas (menu_id, receta_id)
  VALUES (v_menu_id, p_recipe_id)
  ON CONFLICT (menu_id, receta_id)
  DO NOTHING;

  RETURN v_menu_id;
END;
$$;

CREATE FUNCTION public.remove_menu_recipe(
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
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

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
  WHERE usuario_id = v_user_id AND semana_inicio = p_week;

  IF v_menu_id IS NOT NULL THEN
    DELETE FROM public.menu_recetas
    WHERE menu_id = v_menu_id
      AND receta_id = p_recipe_id;
  END IF;

  RETURN v_menu_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID)
  TO authenticated;

REVOKE ALL ON FUNCTION public.add_menu_recipe(DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_menu_recipe(DATE, UUID)
  TO authenticated;

REVOKE ALL ON FUNCTION public.remove_menu_recipe(DATE, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_menu_recipe(DATE, UUID)
  TO authenticated;
