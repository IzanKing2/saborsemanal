-- Consolidated shopping lists are generated atomically from an owned weekly menu.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.shopping_list_items AS item
    LEFT JOIN public.menus_semanales AS menu ON menu.id = item.menu_id
    WHERE item.usuario_id IS NULL
      OR item.menu_id IS NULL
      OR item.ingrediente_id IS NULL
      OR menu.usuario_id IS DISTINCT FROM item.usuario_id
      OR item.cantidad <= 0
      OR item.cantidad > 21000000
      OR item.unidad NOT IN (
        'g', 'kg', 'ml', 'l', 'unidad',
        'cucharadita', 'cucharada', 'taza', 'pizca'
      )
  ) THEN
    RAISE EXCEPTION 'Existing shopping list items are incompatible with Hito 4';
  END IF;
END;
$$;

UPDATE public.shopping_list_items
SET
  comprado = coalesce(comprado, false),
  created_at = coalesce(created_at, now())
WHERE comprado IS NULL OR created_at IS NULL;

-- Lists are derived data. Keep one legacy row per source/unit before enforcing
-- uniqueness; the next regeneration recalculates its exact quantity.
DELETE FROM public.shopping_list_items AS duplicate
USING public.shopping_list_items AS keeper
WHERE duplicate.menu_id = keeper.menu_id
  AND duplicate.ingrediente_id = keeper.ingrediente_id
  AND duplicate.unidad = keeper.unidad
  AND duplicate.id > keeper.id;

ALTER TABLE public.shopping_list_items
  ADD COLUMN nombre_personalizado TEXT,
  ALTER COLUMN usuario_id SET NOT NULL,
  ALTER COLUMN menu_id SET NOT NULL,
  ALTER COLUMN comprado SET NOT NULL,
  ALTER COLUMN comprado SET DEFAULT false,
  ALTER COLUMN created_at SET NOT NULL,
  ALTER COLUMN created_at SET DEFAULT now(),
  DROP CONSTRAINT shopping_list_items_menu_id_fkey,
  ADD CONSTRAINT shopping_list_items_menu_id_fkey
    FOREIGN KEY (menu_id) REFERENCES public.menus_semanales(id) ON DELETE CASCADE,
  ADD CONSTRAINT shopping_list_items_source_xor CHECK (
    num_nonnulls(ingrediente_id, nombre_personalizado) = 1
  ),
  ADD CONSTRAINT shopping_list_items_custom_name_valid CHECK (
    nombre_personalizado IS NULL
    OR (
      nombre_personalizado = btrim(nombre_personalizado)
      AND char_length(nombre_personalizado) BETWEEN 2 AND 100
    )
  ),
  ADD CONSTRAINT shopping_list_items_quantity_valid CHECK (
    cantidad > 0 AND cantidad <= 21000000
  ),
  ADD CONSTRAINT shopping_list_items_unit_valid CHECK (unidad IN (
    'g', 'kg', 'ml', 'l', 'unidad',
    'cucharadita', 'cucharada', 'taza', 'pizca'
  ));

CREATE UNIQUE INDEX shopping_list_items_master_unique
  ON public.shopping_list_items (menu_id, ingrediente_id, unidad)
  WHERE ingrediente_id IS NOT NULL;

CREATE UNIQUE INDEX shopping_list_items_custom_unique
  ON public.shopping_list_items (
    menu_id,
    lower(nombre_personalizado),
    unidad
  )
  WHERE nombre_personalizado IS NOT NULL;

DROP POLICY IF EXISTS "shopping_list_items_own"
  ON public.shopping_list_items;

CREATE POLICY "shopping_list_items_select_own"
ON public.shopping_list_items FOR SELECT TO authenticated
USING (usuario_id = (SELECT auth.uid()));

REVOKE ALL ON public.shopping_list_items FROM anon, authenticated;
GRANT SELECT ON public.shopping_list_items TO authenticated;

CREATE FUNCTION public.regenerate_shopping_list(p_week DATE)
RETURNS SETOF public.shopping_list_items
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

  SELECT menu.id
  INTO v_menu_id
  FROM public.menus_semanales AS menu
  WHERE menu.usuario_id = v_user_id
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

CREATE FUNCTION public.set_shopping_item_purchased(
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
  v_item_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF p_item_id IS NULL OR p_purchased IS NULL THEN
    RAISE EXCEPTION 'A valid shopping item update is required'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.shopping_list_items
  SET comprado = p_purchased
  WHERE id = p_item_id
    AND usuario_id = v_user_id
  RETURNING id INTO v_item_id;

  IF v_item_id IS NULL THEN
    RAISE EXCEPTION 'Shopping item is not owned by this user'
      USING ERRCODE = '42501';
  END IF;

  RETURN v_item_id;
END;
$$;

REVOKE ALL ON FUNCTION public.regenerate_shopping_list(DATE) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.regenerate_shopping_list(DATE)
  TO authenticated;

REVOKE ALL ON FUNCTION public.set_shopping_item_purchased(UUID, BOOLEAN)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_shopping_item_purchased(UUID, BOOLEAN)
  TO authenticated;
