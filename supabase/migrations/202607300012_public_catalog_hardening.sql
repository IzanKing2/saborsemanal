-- Harden public author data, publication transitions, search, and image access.

DROP POLICY IF EXISTS "profiles_select" ON public.profiles;

CREATE POLICY "profiles_select_own_or_admin"
ON public.profiles FOR SELECT
USING (id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

CREATE OR REPLACE FUNCTION public.prevent_custom_ingredient_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- A draft may transition to pending before save_recipe replaces its old
  -- ingredient rows. New custom rows are still rejected by their own trigger.
  IF NEW.publica = true
    AND EXISTS (
      SELECT 1
      FROM public.receta_ingredientes
      WHERE receta_id = NEW.id AND nombre_personalizado IS NOT NULL
    )
    AND (OLD.publica = true OR NEW.aprobada = true) THEN
    RAISE EXCEPTION 'Recipes with custom ingredients cannot be published'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.search_public_recipes(
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
  ORDER BY recipe.created_at DESC, recipe.id
  LIMIT least(greatest(coalesce(p_limit, 12), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
$$;

CREATE FUNCTION public.count_public_recipes(
  p_query TEXT DEFAULT NULL,
  p_max_time INTEGER DEFAULT NULL,
  p_allergen_ids UUID[] DEFAULT NULL
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
    );
$$;

REVOKE ALL ON FUNCTION public.count_public_recipes(TEXT, INTEGER, UUID[])
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.count_public_recipes(TEXT, INTEGER, UUID[])
  TO anon, authenticated;

UPDATE storage.buckets SET public = false WHERE id = 'recipe-images';

CREATE FUNCTION public.storage_recipe_is_public(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recipe_id_text TEXT := (storage.foldername(object_name))[2];
BEGIN
  IF v_recipe_id_text IS NULL OR v_recipe_id_text !~*
    '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.recetas
    WHERE id = v_recipe_id_text::UUID
      AND publica = true
      AND aprobada = true
      AND imagen_url = object_name
  );
END;
$$;

REVOKE ALL ON FUNCTION public.storage_recipe_is_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_recipe_is_public(TEXT)
  TO anon, authenticated;

DROP POLICY IF EXISTS "recipe_images_owner_select" ON storage.objects;

CREATE POLICY "recipe_images_select_authorized"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'recipe-images'
  AND (
    owner_id = (SELECT auth.uid()::text)
    OR (SELECT public.is_admin())
    OR (SELECT public.storage_recipe_is_public(name))
  )
);
