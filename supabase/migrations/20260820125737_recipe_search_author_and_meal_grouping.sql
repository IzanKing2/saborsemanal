-- Two changes to the public recipe search:
--
-- 1) Let p_query also match the recipe author's display name, not just
--    title/description. profiles RLS only lets a user read their own row
--    (or admin), so a plain join from a SECURITY INVOKER function would
--    silently miss every other author. Both functions become SECURITY
--    DEFINER (safe: their WHERE clause already hardcodes
--    publica = true AND aprobada = true, so elevating privileges doesn't
--    expose anything beyond what the public catalog already shows).
--
-- 2) Treat "Otro" as also matching recipes with no tipo_comida tag at all,
--    so grouping the catalog by meal type doesn't hide every recipe that
--    was never tagged (tipo_comida defaults to '{}').

CREATE OR REPLACE FUNCTION public.search_public_recipes(
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
SECURITY DEFINER
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS author
        WHERE author.id = recipe.creador_id
          AND strpos(lower(coalesce(author.display_name, '')), lower(btrim(p_query))) > 0
      )
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
      OR ('Otro' = ANY(p_meal_types) AND cardinality(recipe.tipo_comida) = 0)
    )
  ORDER BY recipe.created_at DESC, recipe.id
  LIMIT least(greatest(coalesce(p_limit, 12), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE OR REPLACE FUNCTION public.count_public_recipes(
  p_query TEXT DEFAULT NULL,
  p_max_time INTEGER DEFAULT NULL,
  p_allergen_ids UUID[] DEFAULT NULL,
  p_meal_types TEXT[] DEFAULT NULL
)
RETURNS BIGINT
LANGUAGE sql
STABLE
SECURITY DEFINER
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
      OR EXISTS (
        SELECT 1
        FROM public.profiles AS author
        WHERE author.id = recipe.creador_id
          AND strpos(lower(coalesce(author.display_name, '')), lower(btrim(p_query))) > 0
      )
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
      OR ('Otro' = ANY(p_meal_types) AND cardinality(recipe.tipo_comida) = 0)
    );
$$;
