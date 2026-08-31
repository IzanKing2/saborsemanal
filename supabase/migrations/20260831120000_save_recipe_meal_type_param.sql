-- save_recipe never got updated when tipo_comida was added to recetas
-- (migration recipe_meal_type_and_author_search only touched the search
-- RPCs), so the app's save_recipe(..., p_tipo_comida) call could not resolve
-- to any function overload and both draft and publish saves failed.
--
-- p_tipo_comida intentionally has no DEFAULT: a default would let this
-- overload be called with exactly 10 positional args, which Postgres cannot
-- distinguish from the existing 10-arg save_recipe (ERROR: function ... is
-- not unique). The application always sends all 11 arguments.
CREATE FUNCTION public.save_recipe(
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
  p_tipo_comida TEXT[]
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
