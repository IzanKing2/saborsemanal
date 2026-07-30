-- Admin moderation and paginated public recipe search.

CREATE FUNCTION public.moderate_recipe(p_id UUID, p_decision TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recipe_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF p_decision = 'approve' THEN
    UPDATE public.recetas
    SET aprobada = true
    WHERE id = p_id AND publica = true AND aprobada = false
    RETURNING id INTO v_recipe_id;
  ELSIF p_decision = 'reject' THEN
    UPDATE public.recetas
    SET publica = false,
        aprobada = false
    WHERE id = p_id AND publica = true AND aprobada = false
    RETURNING id INTO v_recipe_id;
  ELSE
    RAISE EXCEPTION 'Invalid moderation decision' USING ERRCODE = '22023';
  END IF;

  IF v_recipe_id IS NULL THEN
    RAISE EXCEPTION 'Pending recipe does not exist' USING ERRCODE = 'P0002';
  END IF;

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_recipe(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.moderate_recipe(UUID, TEXT) TO authenticated;

CREATE FUNCTION public.search_public_recipes(
  p_query TEXT DEFAULT NULL,
  p_max_time INTEGER DEFAULT NULL,
  p_allergen_ids UUID[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descripcion TEXT,
  imagen_url TEXT,
  tiempo_preparacion INTEGER,
  porciones INTEGER,
  created_at TIMESTAMPTZ,
  total_count BIGINT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT
    recipe.id,
    recipe.titulo,
    recipe.descripcion,
    recipe.imagen_url,
    recipe.tiempo_preparacion,
    recipe.porciones,
    recipe.created_at,
    count(*) OVER () AS total_count
  FROM public.recetas AS recipe
  WHERE recipe.publica = true
    AND recipe.aprobada = true
    AND (
      nullif(btrim(p_query), '') IS NULL
      OR recipe.titulo ILIKE '%' || btrim(p_query) || '%'
      OR coalesce(recipe.descripcion, '') ILIKE '%' || btrim(p_query) || '%'
    )
    AND (p_max_time IS NULL OR recipe.tiempo_preparacion <= p_max_time)
    AND (
      coalesce(cardinality(p_allergen_ids), 0) = 0
      OR NOT EXISTS (
        SELECT 1
        FROM public.receta_ingredientes AS recipe_ingredient
        JOIN public.ingrediente_alergenos AS ingredient_allergen
          ON ingredient_allergen.ingrediente_id =
            recipe_ingredient.ingrediente_id
        WHERE recipe_ingredient.receta_id = recipe.id
          AND ingredient_allergen.alergeno_id = ANY(p_allergen_ids)
      )
    )
  ORDER BY recipe.created_at DESC, recipe.id
  LIMIT least(greatest(coalesce(p_limit, 12), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_public_recipes(
  TEXT, INTEGER, UUID[], INTEGER, INTEGER
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_recipes(
  TEXT, INTEGER, UUID[], INTEGER, INTEGER
) TO anon, authenticated;
