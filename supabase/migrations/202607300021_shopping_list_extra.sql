-- A personal shopping list independent from the weekly menu.
-- Recipes can contribute their ingredients without being part of a menu.

CREATE TABLE public.shopping_list_extra (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  ingrediente_id UUID REFERENCES public.ingredientes(id) ON DELETE CASCADE,
  nombre_personalizado TEXT,
  cantidad NUMERIC NOT NULL,
  unidad TEXT NOT NULL,
  comprado BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT shopping_list_extra_source_xor CHECK (
    num_nonnulls(ingrediente_id, nombre_personalizado) = 1
  ),
  CONSTRAINT shopping_list_extra_custom_name_valid CHECK (
    nombre_personalizado IS NULL
    OR (
      nombre_personalizado = btrim(nombre_personalizado)
      AND char_length(nombre_personalizado) BETWEEN 2 AND 100
    )
  ),
  CONSTRAINT shopping_list_extra_quantity_valid CHECK (
    cantidad > 0 AND cantidad <= 21000000
  ),
  CONSTRAINT shopping_list_extra_unit_valid CHECK (unidad IN (
    'g', 'kg', 'ml', 'l', 'unidad',
    'cucharadita', 'cucharada', 'taza', 'pizca'
  ))
);

CREATE UNIQUE INDEX shopping_list_extra_master_unique
  ON public.shopping_list_extra (usuario_id, ingrediente_id, unidad)
  WHERE ingrediente_id IS NOT NULL;

CREATE UNIQUE INDEX shopping_list_extra_custom_unique
  ON public.shopping_list_extra (
    usuario_id,
    lower(nombre_personalizado),
    unidad
  )
  WHERE nombre_personalizado IS NOT NULL;

ALTER TABLE public.shopping_list_extra ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shopping_list_extra_select_own"
ON public.shopping_list_extra FOR SELECT TO authenticated
USING (usuario_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

REVOKE ALL ON public.shopping_list_extra FROM anon, authenticated;
GRANT SELECT ON public.shopping_list_extra TO authenticated;

CREATE FUNCTION public.add_recipe_to_shopping_list(p_receta_id UUID)
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
    usuario_id,
    ingrediente_id,
    nombre_personalizado,
    cantidad,
    unidad,
    comprado
  )
  SELECT
    v_user_id,
    recipe_item.ingrediente_id,
    NULL,
    sum(recipe_item.cantidad),
    recipe_item.unidad,
    false
  FROM public.receta_ingredientes AS recipe_item
  WHERE recipe_item.receta_id = p_receta_id
    AND recipe_item.ingrediente_id IS NOT NULL
  GROUP BY recipe_item.ingrediente_id, recipe_item.unidad
  ON CONFLICT (usuario_id, ingrediente_id, unidad)
    WHERE ingrediente_id IS NOT NULL
  DO UPDATE SET cantidad = shopping_list_extra.cantidad + EXCLUDED.cantidad;

  INSERT INTO public.shopping_list_extra (
    usuario_id,
    ingrediente_id,
    nombre_personalizado,
    cantidad,
    unidad,
    comprado
  )
  SELECT
    v_user_id,
    NULL,
    min(btrim(recipe_item.nombre_personalizado)),
    sum(recipe_item.cantidad),
    recipe_item.unidad,
    false
  FROM public.receta_ingredientes AS recipe_item
  WHERE recipe_item.receta_id = p_receta_id
    AND recipe_item.ingrediente_id IS NULL
  GROUP BY lower(btrim(recipe_item.nombre_personalizado)), recipe_item.unidad
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

CREATE FUNCTION public.set_extra_item_purchased(
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

  UPDATE public.shopping_list_extra
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

CREATE FUNCTION public.remove_extra_item(p_item_id UUID)
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

  IF p_item_id IS NULL THEN
    RAISE EXCEPTION 'A valid shopping item is required' USING ERRCODE = '22023';
  END IF;

  DELETE FROM public.shopping_list_extra
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

REVOKE ALL ON FUNCTION public.add_recipe_to_shopping_list(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.add_recipe_to_shopping_list(UUID)
  TO authenticated;

REVOKE ALL ON FUNCTION public.set_extra_item_purchased(UUID, BOOLEAN)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_extra_item_purchased(UUID, BOOLEAN)
  TO authenticated;

REVOKE ALL ON FUNCTION public.remove_extra_item(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.remove_extra_item(UUID)
  TO authenticated;
