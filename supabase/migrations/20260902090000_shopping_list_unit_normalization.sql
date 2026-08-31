-- Lista de la compra: sumar gramos con kilos y mililitros con litros.
--
-- Hasta ahora "300 g de lentejas" y "1 kg de lentejas" salían como dos líneas
-- porque la agrupación usaba la unidad tal cual venía de la receta. Se pasa a
-- agrupar por una unidad canónica: g para masa y ml para volumen.
--
-- Solo se convierte entre unidades con equivalencia exacta. `unidad`,
-- `cucharada`, `cucharadita`, `taza` y `pizca` siguen agrupándose por separado:
-- su peso depende del ingrediente (una cucharada de sal no pesa lo mismo que
-- una de harina) y estimarlo sería inventar cantidades de compra.
--
-- La tabla guarda siempre la unidad canónica; mostrar "1,3 kg" en vez de
-- "1300 g" es cosa de la capa de lectura. Si el RPC escribiese ya la unidad de
-- presentación, una regeneración que cruzase los 1000 g cambiaría la unidad de
-- la fila, y la unidad forma parte de los índices únicos.

-- Filas heredadas en kg/l. Se convierten y se fusionan en las dos tablas en
-- lugar de borrarlas: aunque las del menú se podrían reconstruir regenerando,
-- hasta que alguien pulsara el botón esa persona se encontraría la compra
-- incompleta y se iría al súper sin la leche.
-- El orden importa: convertir primero chocaría con el índice único cuando ya
-- existe la fila canónica del mismo ingrediente. Así que se suma en la fila
-- canónica, se borra la vieja, y solo entonces se convierten las que quedan
-- sin pareja.
UPDATE public.shopping_list_items AS canonica
SET cantidad = canonica.cantidad + convertidas.cantidad,
    -- La cantidad cambia respecto a lo que se marcó, así que vuelve a quedar
    -- pendiente de revisar, igual que hace el RPC al regenerar.
    comprado = false
FROM (
  SELECT
    menu_id,
    ingrediente_id,
    lower(btrim(nombre_personalizado)) AS nombre_norm,
    CASE unidad WHEN 'kg' THEN 'g' ELSE 'ml' END AS unidad_canonica,
    sum(cantidad * 1000) AS cantidad
  FROM public.shopping_list_items
  WHERE unidad IN ('kg', 'l')
  GROUP BY menu_id, ingrediente_id, 3, 4
) AS convertidas
WHERE canonica.menu_id = convertidas.menu_id
  AND canonica.unidad = convertidas.unidad_canonica
  AND (
    canonica.ingrediente_id = convertidas.ingrediente_id
    OR (
      canonica.ingrediente_id IS NULL
      AND convertidas.ingrediente_id IS NULL
      AND lower(btrim(canonica.nombre_personalizado)) = convertidas.nombre_norm
    )
  );

DELETE FROM public.shopping_list_items AS antigua
WHERE antigua.unidad IN ('kg', 'l')
  AND EXISTS (
    SELECT 1
    FROM public.shopping_list_items AS canonica
    WHERE canonica.menu_id = antigua.menu_id
      AND canonica.unidad =
        CASE antigua.unidad WHEN 'kg' THEN 'g' ELSE 'ml' END
      AND (
        canonica.ingrediente_id = antigua.ingrediente_id
        OR (
          canonica.ingrediente_id IS NULL
          AND antigua.ingrediente_id IS NULL
          AND lower(btrim(canonica.nombre_personalizado)) =
            lower(btrim(antigua.nombre_personalizado))
        )
      )
  );

UPDATE public.shopping_list_items
SET cantidad = cantidad * 1000,
    unidad = CASE unidad WHEN 'kg' THEN 'g' ELSE 'ml' END
WHERE unidad IN ('kg', 'l');

-- La lista manual sigue exactamente el mismo criterio, con el usuario como
-- clave en lugar del menú.
UPDATE public.shopping_list_extra AS canonica
SET cantidad = canonica.cantidad + convertidas.cantidad,
    comprado = false
FROM (
  SELECT
    usuario_id,
    ingrediente_id,
    lower(btrim(nombre_personalizado)) AS nombre_norm,
    CASE unidad WHEN 'kg' THEN 'g' ELSE 'ml' END AS unidad_canonica,
    sum(cantidad * 1000) AS cantidad
  FROM public.shopping_list_extra
  WHERE unidad IN ('kg', 'l')
  GROUP BY usuario_id, ingrediente_id, 3, 4
) AS convertidas
WHERE canonica.usuario_id = convertidas.usuario_id
  AND canonica.unidad = convertidas.unidad_canonica
  AND (
    canonica.ingrediente_id = convertidas.ingrediente_id
    OR (
      canonica.ingrediente_id IS NULL
      AND convertidas.ingrediente_id IS NULL
      AND lower(btrim(canonica.nombre_personalizado)) = convertidas.nombre_norm
    )
  );

DELETE FROM public.shopping_list_extra AS antigua
WHERE antigua.unidad IN ('kg', 'l')
  AND EXISTS (
    SELECT 1
    FROM public.shopping_list_extra AS canonica
    WHERE canonica.usuario_id = antigua.usuario_id
      AND canonica.unidad =
        CASE antigua.unidad WHEN 'kg' THEN 'g' ELSE 'ml' END
      AND (
        canonica.ingrediente_id = antigua.ingrediente_id
        OR (
          canonica.ingrediente_id IS NULL
          AND antigua.ingrediente_id IS NULL
          AND lower(btrim(canonica.nombre_personalizado)) =
            lower(btrim(antigua.nombre_personalizado))
        )
      )
  );

UPDATE public.shopping_list_extra
SET cantidad = cantidad * 1000,
    unidad = CASE unidad WHEN 'kg' THEN 'g' ELSE 'ml' END
WHERE unidad IN ('kg', 'l');

-- Devuelve la unidad con la que se agrupa y se guarda.
CREATE OR REPLACE FUNCTION public.unidad_canonica(p_unidad TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE p_unidad WHEN 'kg' THEN 'g' WHEN 'l' THEN 'ml' ELSE p_unidad END;
$$;

-- Factor para llevar una cantidad a su unidad canónica.
CREATE OR REPLACE FUNCTION public.factor_canonico(p_unidad TEXT)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE WHEN p_unidad IN ('kg', 'l') THEN 1000 ELSE 1 END::NUMERIC;
$$;

GRANT EXECUTE ON FUNCTION public.unidad_canonica(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.factor_canonico(TEXT) TO anon, authenticated;

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

  -- La comparación de unidades también va en canónico: si no, una fila
  -- guardada en 'g' no encontraría su origen en 'kg' y se borraría cada vez.
  DELETE FROM public.shopping_list_items AS item
  WHERE item.menu_id = v_menu_id
    AND NOT EXISTS (
      SELECT 1
      FROM public.menu_recetas AS slot
      JOIN public.receta_ingredientes AS recipe_item
        ON recipe_item.receta_id = slot.receta_id
      WHERE slot.menu_id = v_menu_id
        AND slot.es_sobra = false
        AND public.unidad_canonica(recipe_item.unidad) = item.unidad
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
        * public.factor_canonico(recipe_item.unidad)
        * coalesce(slot.raciones, recipe.porciones)::NUMERIC
        / greatest(recipe.porciones, 1)
    ), 3),
    public.unidad_canonica(recipe_item.unidad),
    false,
    NULL
  FROM public.menu_recetas AS slot
  JOIN public.recetas AS recipe ON recipe.id = slot.receta_id
  JOIN public.receta_ingredientes AS recipe_item
    ON recipe_item.receta_id = slot.receta_id
  WHERE slot.menu_id = v_menu_id
    AND slot.es_sobra = false
    AND recipe_item.ingrediente_id IS NOT NULL
  GROUP BY
    recipe_item.ingrediente_id,
    public.unidad_canonica(recipe_item.unidad)
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
        * public.factor_canonico(recipe_item.unidad)
        * coalesce(slot.raciones, recipe.porciones)::NUMERIC
        / greatest(recipe.porciones, 1)
    ), 3),
    public.unidad_canonica(recipe_item.unidad),
    false,
    min(btrim(recipe_item.nombre_personalizado))
  FROM public.menu_recetas AS slot
  JOIN public.recetas AS recipe ON recipe.id = slot.receta_id
  JOIN public.receta_ingredientes AS recipe_item
    ON recipe_item.receta_id = slot.receta_id
  WHERE slot.menu_id = v_menu_id
    AND slot.es_sobra = false
    AND recipe_item.ingrediente_id IS NULL
  GROUP BY
    lower(btrim(recipe_item.nombre_personalizado)),
    public.unidad_canonica(recipe_item.unidad)
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

-- Añadir una receta suelta a "mi lista" comparte el mismo criterio.
CREATE OR REPLACE FUNCTION public.add_recipe_to_shopping_list(p_receta_id UUID)
RETURNS SETOF public.shopping_list_extra
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF p_receta_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.recetas AS recipe
    WHERE recipe.id = p_receta_id
      AND (
        (recipe.publica = true AND recipe.aprobada = true)
        OR recipe.creador_id = v_user_id
      )
  ) THEN
    RAISE EXCEPTION 'Recipe is not accessible' USING ERRCODE = '42501';
  END IF;

  INSERT INTO public.shopping_list_extra (
    usuario_id, ingrediente_id, nombre_personalizado, cantidad, unidad, comprado
  )
  SELECT
    v_user_id,
    recipe_item.ingrediente_id,
    NULL,
    round(sum(recipe_item.cantidad * public.factor_canonico(recipe_item.unidad)), 3),
    public.unidad_canonica(recipe_item.unidad),
    false
  FROM public.receta_ingredientes AS recipe_item
  WHERE recipe_item.receta_id = p_receta_id
    AND recipe_item.ingrediente_id IS NOT NULL
  GROUP BY
    recipe_item.ingrediente_id,
    public.unidad_canonica(recipe_item.unidad)
  ON CONFLICT (usuario_id, ingrediente_id, unidad)
    WHERE ingrediente_id IS NOT NULL
  DO UPDATE SET cantidad = shopping_list_extra.cantidad + EXCLUDED.cantidad;

  INSERT INTO public.shopping_list_extra (
    usuario_id, ingrediente_id, nombre_personalizado, cantidad, unidad, comprado
  )
  SELECT
    v_user_id,
    NULL,
    min(btrim(recipe_item.nombre_personalizado)),
    round(sum(recipe_item.cantidad * public.factor_canonico(recipe_item.unidad)), 3),
    public.unidad_canonica(recipe_item.unidad),
    false
  FROM public.receta_ingredientes AS recipe_item
  WHERE recipe_item.receta_id = p_receta_id
    AND recipe_item.ingrediente_id IS NULL
  GROUP BY
    lower(btrim(recipe_item.nombre_personalizado)),
    public.unidad_canonica(recipe_item.unidad)
  ON CONFLICT (usuario_id, lower(nombre_personalizado), unidad)
    WHERE nombre_personalizado IS NOT NULL
  DO UPDATE SET cantidad = shopping_list_extra.cantidad + EXCLUDED.cantidad;

  RETURN QUERY
  SELECT item.*
  FROM public.shopping_list_extra AS item
  WHERE item.usuario_id = v_user_id
  ORDER BY item.created_at, item.id;
END;
$$;
