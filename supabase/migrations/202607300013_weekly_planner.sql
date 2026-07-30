-- Weekly menus have one recipe per day/meal slot.

DO $$
BEGIN
  IF EXISTS (
    SELECT usuario_id
    FROM public.menus_semanales
    WHERE usuario_id IS NOT NULL
    GROUP BY usuario_id
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existing users have multiple undated weekly menus';
  END IF;

  IF EXISTS (
    SELECT menu_id, dia_semana, tipo_comida
    FROM public.menu_recetas
    GROUP BY menu_id, dia_semana, tipo_comida
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Existing weekly menus contain duplicate slots';
  END IF;
END;
$$;

ALTER TABLE public.menus_semanales
  ADD COLUMN semana_inicio DATE NOT NULL
    DEFAULT (date_trunc('week', current_date)::DATE),
  ALTER COLUMN usuario_id SET NOT NULL,
  ADD CONSTRAINT menus_semana_monday
    CHECK (extract(isodow FROM semana_inicio) = 1),
  ADD CONSTRAINT menus_usuario_semana_unique
    UNIQUE (usuario_id, semana_inicio);

ALTER TABLE public.menu_recetas
  ADD CONSTRAINT menu_recetas_slot_unique
    UNIQUE (menu_id, dia_semana, tipo_comida);

CREATE FUNCTION public.save_menu_slot(
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

  IF p_week IS NULL OR extract(isodow FROM p_week) <> 1 THEN
    RAISE EXCEPTION 'Week must start on Monday' USING ERRCODE = '22023';
  END IF;

  IF p_day NOT IN (
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ) OR p_meal NOT IN ('Desayuno', 'Almuerzo', 'Cena') THEN
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

  INSERT INTO public.menus_semanales (usuario_id, semana_inicio)
  VALUES (v_user_id, p_week)
  ON CONFLICT (usuario_id, semana_inicio)
  DO UPDATE SET semana_inicio = EXCLUDED.semana_inicio
  RETURNING id INTO v_menu_id;

  IF p_recipe_id IS NULL THEN
    DELETE FROM public.menu_recetas
    WHERE menu_id = v_menu_id
      AND dia_semana = p_day
      AND tipo_comida = p_meal;
  ELSE
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
  END IF;

  RETURN v_menu_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID)
  TO authenticated;

REVOKE INSERT, UPDATE, DELETE ON public.menus_semanales FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.menu_recetas FROM authenticated;

CREATE INDEX menus_semanales_semana_inicio_idx
  ON public.menus_semanales (semana_inicio);
