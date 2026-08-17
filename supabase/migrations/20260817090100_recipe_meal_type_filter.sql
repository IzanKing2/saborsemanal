-- Add an optional meal-type tag to recipes and let the public catalog be
-- filtered by it, reusing the same values already used by the planner.

ALTER TABLE public.recetas
  ADD COLUMN tipo_comida TEXT[] NOT NULL DEFAULT '{}';

ALTER TABLE public.recetas
  ADD CONSTRAINT recetas_tipo_comida_valid CHECK (
    tipo_comida <@ ARRAY['Desayuno', 'Almuerzo', 'Cena', 'Otro']::TEXT[]
    AND cardinality(tipo_comida) <= 4
  );

CREATE INDEX recetas_tipo_comida_gin_idx
  ON public.recetas USING GIN (tipo_comida);

CREATE OR REPLACE FUNCTION public.save_recipe(
  p_id UUID,
  p_titulo TEXT,
  p_instrucciones TEXT[],
  p_tiempo_preparacion INTEGER,
  p_porciones INTEGER,
  p_publica BOOLEAN,
  p_ingredientes JSONB,
  p_descripcion TEXT,
  p_imagen_url TEXT,
  p_video_url TEXT,
  p_tipo_comida TEXT[] DEFAULT '{}'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recipe_id UUID;
  v_tipo_comida TEXT[];
BEGIN
  SELECT coalesce(array_agg(DISTINCT value), '{}')
  INTO v_tipo_comida
  FROM unnest(coalesce(p_tipo_comida, '{}')) AS value;

  IF NOT (v_tipo_comida <@ ARRAY['Desayuno', 'Almuerzo', 'Cena', 'Otro']::TEXT[])
    OR cardinality(v_tipo_comida) > 4 THEN
    RAISE EXCEPTION 'Recipe meal type is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT public.save_recipe(
    p_id,
    p_titulo,
    p_instrucciones,
    p_tiempo_preparacion,
    p_porciones,
    p_publica,
    p_ingredientes,
    p_descripcion,
    p_imagen_url,
    p_video_url
  ) INTO v_recipe_id;

  UPDATE public.recetas
  SET tipo_comida = v_tipo_comida
  WHERE id = v_recipe_id;

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT[]
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT[]
) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT, TEXT, TEXT[]
) TO authenticated;

-- CREATE OR REPLACE cannot change a function's parameter list; since this
-- adds a new parameter, the old 5-arg overload must be dropped explicitly
-- or it would keep coexisting (and stay reachable) alongside the new one.
DROP FUNCTION IF EXISTS public.search_public_recipes(
  TEXT, INTEGER, UUID[], INTEGER, INTEGER
);

CREATE FUNCTION public.search_public_recipes(
  p_query TEXT DEFAULT NULL,
  p_max_time INTEGER DEFAULT NULL,
  p_allergen_ids UUID[] DEFAULT NULL,
  p_limit INTEGER DEFAULT 12,
  p_offset INTEGER DEFAULT 0,
  p_meal_types TEXT[] DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descripcion TEXT,
  imagen_url TEXT,
  tiempo_preparacion INTEGER,
  porciones INTEGER,
  tipo_comida TEXT[],
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
    recipe.tipo_comida,
    recipe.created_at,
    count(*) OVER () AS total_count
  FROM public.recetas AS recipe
  WHERE recipe.publica = true
    AND recipe.aprobada = true
    AND (
      nullif(btrim(p_query), '') IS NULL
      OR strpos(lower(recipe.titulo), lower(btrim(p_query))) > 0
      OR strpos(lower(coalesce(recipe.descripcion, '')), lower(btrim(p_query))) > 0
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
    AND (
      coalesce(cardinality(p_meal_types), 0) = 0
      OR recipe.tipo_comida && p_meal_types
    )
  ORDER BY recipe.created_at DESC, recipe.id
  LIMIT least(greatest(coalesce(p_limit, 12), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.search_public_recipes(
  TEXT, INTEGER, UUID[], INTEGER, INTEGER, TEXT[]
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_public_recipes(
  TEXT, INTEGER, UUID[], INTEGER, INTEGER, TEXT[]
) TO anon, authenticated;

DROP FUNCTION IF EXISTS public.count_public_recipes(TEXT, INTEGER, UUID[]);

CREATE FUNCTION public.count_public_recipes(
  p_query TEXT DEFAULT NULL,
  p_max_time INTEGER DEFAULT NULL,
  p_allergen_ids UUID[] DEFAULT NULL,
  p_meal_types TEXT[] DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT count(*)
  FROM public.recetas AS recipe
  WHERE recipe.publica = true
    AND recipe.aprobada = true
    AND (
      nullif(btrim(p_query), '') IS NULL
      OR strpos(lower(recipe.titulo), lower(btrim(p_query))) > 0
      OR strpos(lower(coalesce(recipe.descripcion, '')), lower(btrim(p_query))) > 0
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
    AND (
      coalesce(cardinality(p_meal_types), 0) = 0
      OR recipe.tipo_comida && p_meal_types
    );
$$;

REVOKE ALL ON FUNCTION public.count_public_recipes(TEXT, INTEGER, UUID[], TEXT[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_public_recipes(TEXT, INTEGER, UUID[], TEXT[])
  TO anon, authenticated;
