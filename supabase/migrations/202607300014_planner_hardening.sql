-- Make menu read isolation explicit and avoid creating empty menus on delete.

DROP POLICY IF EXISTS "menus_semanales_own" ON public.menus_semanales;
DROP POLICY IF EXISTS "menu_recetas_owner" ON public.menu_recetas;

CREATE POLICY "menus_semanales_select_own"
ON public.menus_semanales FOR SELECT TO authenticated
USING (usuario_id = (SELECT auth.uid()));

CREATE POLICY "menu_recetas_select_own"
ON public.menu_recetas FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1
  FROM public.menus_semanales AS menu
  WHERE menu.id = menu_recetas.menu_id
    AND menu.usuario_id = (SELECT auth.uid())
));

REVOKE ALL ON public.menus_semanales FROM anon;
REVOKE ALL ON public.menu_recetas FROM anon;
GRANT SELECT ON public.menus_semanales TO authenticated;
GRANT SELECT ON public.menu_recetas TO authenticated;

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
