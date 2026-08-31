-- Planificador: raciones por comida planificada, sobras que reutilizan una
-- preparación anterior, movimiento atómico entre huecos y copia de semana.
--
-- Las dos columnas son aditivas y anulables, así que el planificador anterior
-- (que no las envía) sigue comportándose igual: raciones NULL significa "las
-- porciones de la receta" y es_sobra false, "hay que cocinarlo".

ALTER TABLE public.menu_recetas
  ADD COLUMN IF NOT EXISTS raciones INTEGER,
  ADD COLUMN IF NOT EXISTS es_sobra BOOLEAN NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'menu_recetas_raciones_valid'
  ) THEN
    ALTER TABLE public.menu_recetas
      ADD CONSTRAINT menu_recetas_raciones_valid
      CHECK (raciones IS NULL OR (raciones >= 1 AND raciones <= 100));
  END IF;
END;
$$;

-- Una firma con parámetros nuevos no puede crearse con CREATE OR REPLACE, y
-- dejar conviviendo la de 4 argumentos haría ambigua cualquier llamada con
-- nombres (function ... is not unique). Se sustituye por una única función
-- cuyos parámetros nuevos tienen DEFAULT, así que las llamadas antiguas de 4
-- argumentos siguen siendo válidas durante un despliegue.
DROP FUNCTION IF EXISTS public.save_menu_slot(DATE, TEXT, TEXT, UUID);

CREATE OR REPLACE FUNCTION public.save_menu_slot(
  p_week DATE,
  p_day TEXT,
  p_meal TEXT,
  p_recipe_id UUID DEFAULT NULL,
  p_raciones INTEGER DEFAULT NULL,
  p_es_sobra BOOLEAN DEFAULT false
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
    RAISE EXCEPTION 'Week is outside the allowed range' USING ERRCODE = '22023';
  END IF;

  IF p_day NOT IN (
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ) OR p_meal NOT IN ('Desayuno', 'Almuerzo', 'Cena', 'Otro') THEN
    RAISE EXCEPTION 'Invalid menu slot' USING ERRCODE = '22023';
  END IF;

  IF p_raciones IS NOT NULL AND (p_raciones < 1 OR p_raciones > 100) THEN
    RAISE EXCEPTION 'Servings must be between 1 and 100' USING ERRCODE = '22023';
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
    RAISE EXCEPTION 'Recipe is not available to this user' USING ERRCODE = '42501';
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
    menu_id, receta_id, dia_semana, tipo_comida, raciones, es_sobra
  ) VALUES (
    v_menu_id, p_recipe_id, p_day, p_meal, p_raciones, coalesce(p_es_sobra, false)
  )
  ON CONFLICT (menu_id, dia_semana, tipo_comida)
  DO UPDATE SET
    receta_id = EXCLUDED.receta_id,
    raciones = EXCLUDED.raciones,
    es_sobra = EXCLUDED.es_sobra;

  RETURN v_menu_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID, INTEGER, BOOLEAN)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID, INTEGER, BOOLEAN)
  TO authenticated;

-- Mover con arrastre debe ser atómico: si se hiciera con dos llamadas y la
-- segunda fallara, la comida desaparecería del calendario.
CREATE OR REPLACE FUNCTION public.move_menu_slot(
  p_week DATE,
  p_from_day TEXT,
  p_from_meal TEXT,
  p_to_day TEXT,
  p_to_meal TEXT
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
  v_source public.menu_recetas;
  v_target public.menu_recetas;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_week IS NULL
    OR extract(isodow FROM p_week) <> 1
    OR p_week < current_date - INTERVAL '5 years'
    OR p_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range' USING ERRCODE = '22023';
  END IF;

  IF p_from_day NOT IN (
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ) OR p_to_day NOT IN (
    'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'
  ) OR p_from_meal NOT IN ('Desayuno', 'Almuerzo', 'Cena', 'Otro')
    OR p_to_meal NOT IN ('Desayuno', 'Almuerzo', 'Cena', 'Otro') THEN
    RAISE EXCEPTION 'Invalid menu slot' USING ERRCODE = '22023';
  END IF;

  SELECT id
  INTO v_menu_id
  FROM public.menus_semanales
  WHERE grupo_id = v_grupo_id AND semana_inicio = p_week
  FOR UPDATE;

  IF v_menu_id IS NULL THEN
    RAISE EXCEPTION 'There is no menu for this week' USING ERRCODE = '22023';
  END IF;

  IF p_from_day = p_to_day AND p_from_meal = p_to_meal THEN
    RETURN v_menu_id;
  END IF;

  SELECT * INTO v_source
  FROM public.menu_recetas
  WHERE menu_id = v_menu_id AND dia_semana = p_from_day AND tipo_comida = p_from_meal
  FOR UPDATE;

  IF v_source.id IS NULL THEN
    RAISE EXCEPTION 'The origin slot is empty' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_target
  FROM public.menu_recetas
  WHERE menu_id = v_menu_id AND dia_semana = p_to_day AND tipo_comida = p_to_meal
  FOR UPDATE;

  -- El hueco de origen se libera antes de escribir el destino para no chocar
  -- con el índice único mientras se intercambian las dos comidas.
  DELETE FROM public.menu_recetas WHERE id = v_source.id;

  IF v_target.id IS NOT NULL THEN
    UPDATE public.menu_recetas
    SET dia_semana = p_from_day, tipo_comida = p_from_meal
    WHERE id = v_target.id;
  END IF;

  INSERT INTO public.menu_recetas (
    menu_id, receta_id, dia_semana, tipo_comida, raciones, es_sobra
  ) VALUES (
    v_menu_id, v_source.receta_id, p_to_day, p_to_meal,
    v_source.raciones, v_source.es_sobra
  );

  RETURN v_menu_id;
END;
$$;

REVOKE ALL ON FUNCTION public.move_menu_slot(DATE, TEXT, TEXT, TEXT, TEXT)
  FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.move_menu_slot(DATE, TEXT, TEXT, TEXT, TEXT)
  TO authenticated;

-- Copiar una semana en una sola transacción: con `p_overwrite` false solo
-- rellena los huecos vacíos, así que repetir la acción nunca pisa lo ya hecho.
CREATE OR REPLACE FUNCTION public.copy_menu_week(
  p_from_week DATE,
  p_to_week DATE,
  p_overwrite BOOLEAN DEFAULT false
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_from_menu_id UUID;
  v_to_menu_id UUID;
  v_copied INTEGER := 0;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  v_grupo_id := public.my_grupo_id();

  IF p_from_week IS NULL OR p_to_week IS NULL
    OR extract(isodow FROM p_from_week) <> 1
    OR extract(isodow FROM p_to_week) <> 1
    OR p_to_week < current_date - INTERVAL '5 years'
    OR p_to_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range' USING ERRCODE = '22023';
  END IF;

  IF p_from_week = p_to_week THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_from_menu_id
  FROM public.menus_semanales
  WHERE grupo_id = v_grupo_id AND semana_inicio = p_from_week;

  IF v_from_menu_id IS NULL THEN
    RETURN 0;
  END IF;

  SELECT id INTO v_to_menu_id
  FROM public.menus_semanales
  WHERE grupo_id = v_grupo_id AND semana_inicio = p_to_week
  FOR UPDATE;

  IF v_to_menu_id IS NULL THEN
    INSERT INTO public.menus_semanales (usuario_id, grupo_id, semana_inicio)
    VALUES (v_user_id, v_grupo_id, p_to_week)
    ON CONFLICT (grupo_id, semana_inicio)
    DO UPDATE SET semana_inicio = EXCLUDED.semana_inicio
    RETURNING id INTO v_to_menu_id;
  END IF;

  IF p_overwrite THEN
    DELETE FROM public.menu_recetas
    WHERE menu_id = v_to_menu_id AND dia_semana IS NOT NULL;
  END IF;

  WITH copied AS (
    INSERT INTO public.menu_recetas (
      menu_id, receta_id, dia_semana, tipo_comida, raciones, es_sobra
    )
    SELECT
      v_to_menu_id, source.receta_id, source.dia_semana, source.tipo_comida,
      source.raciones, source.es_sobra
    FROM public.menu_recetas AS source
    WHERE source.menu_id = v_from_menu_id
      AND source.dia_semana IS NOT NULL
    ON CONFLICT (menu_id, dia_semana, tipo_comida) DO NOTHING
    RETURNING 1
  )
  SELECT count(*) INTO v_copied FROM copied;

  RETURN v_copied;
END;
$$;

REVOKE ALL ON FUNCTION public.copy_menu_week(DATE, DATE, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.copy_menu_week(DATE, DATE, BOOLEAN) TO authenticated;

-- La lista de la compra pasa a escalar por raciones y a ignorar las sobras:
-- una comida marcada como sobra reutiliza una preparación ya contabilizada, así
-- que volver a sumar sus ingredientes haría comprar el doble.
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
    RAISE EXCEPTION 'Week is outside the allowed range' USING ERRCODE = '22023';
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
        AND slot.es_sobra = false
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
    usuario_id, ingrediente_id, menu_id, cantidad, unidad, comprado,
    nombre_personalizado
  )
  SELECT
    v_user_id,
    recipe_item.ingrediente_id,
    v_menu_id,
    round(sum(
      recipe_item.cantidad
        * coalesce(slot.raciones, recipe.porciones)::NUMERIC
        / greatest(recipe.porciones, 1)
    ), 3),
    recipe_item.unidad,
    false,
    NULL
  FROM public.menu_recetas AS slot
  JOIN public.recetas AS recipe ON recipe.id = slot.receta_id
  JOIN public.receta_ingredientes AS recipe_item
    ON recipe_item.receta_id = slot.receta_id
  WHERE slot.menu_id = v_menu_id
    AND slot.es_sobra = false
    AND recipe_item.ingrediente_id IS NOT NULL
  GROUP BY recipe_item.ingrediente_id, recipe_item.unidad
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
    usuario_id, ingrediente_id, menu_id, cantidad, unidad, comprado,
    nombre_personalizado
  )
  SELECT
    v_user_id,
    NULL,
    v_menu_id,
    round(sum(
      recipe_item.cantidad
        * coalesce(slot.raciones, recipe.porciones)::NUMERIC
        / greatest(recipe.porciones, 1)
    ), 3),
    recipe_item.unidad,
    false,
    min(btrim(recipe_item.nombre_personalizado))
  FROM public.menu_recetas AS slot
  JOIN public.recetas AS recipe ON recipe.id = slot.receta_id
  JOIN public.receta_ingredientes AS recipe_item
    ON recipe_item.receta_id = slot.receta_id
  WHERE slot.menu_id = v_menu_id
    AND slot.es_sobra = false
    AND recipe_item.ingrediente_id IS NULL
  GROUP BY lower(btrim(recipe_item.nombre_personalizado)), recipe_item.unidad
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
