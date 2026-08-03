-- Administrators may edit any recipe while preserving its original author.

CREATE OR REPLACE FUNCTION public.save_recipe(
  p_id UUID,
  p_titulo TEXT,
  p_instrucciones TEXT[],
  p_tiempo_preparacion INTEGER,
  p_porciones INTEGER,
  p_publica BOOLEAN,
  p_ingredientes JSONB,
  p_descripcion TEXT DEFAULT NULL,
  p_imagen_url TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_current_image TEXT;
  v_instrucciones TEXT[];
  v_is_admin BOOLEAN := public.is_admin();
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF p_id IS NULL OR p_publica IS NULL THEN
    RAISE EXCEPTION 'Recipe identifier and publication state are required'
      USING ERRCODE = '22023';
  END IF;

  IF p_titulo IS NULL
    OR length(btrim(p_titulo)) < 3
    OR length(btrim(p_titulo)) > 120 THEN
    RAISE EXCEPTION 'Recipe title must contain between 3 and 120 characters'
      USING ERRCODE = '22023';
  END IF;

  SELECT array_agg(btrim(step) ORDER BY position)
  INTO v_instrucciones
  FROM unnest(p_instrucciones) WITH ORDINALITY AS steps(step, position);

  IF v_instrucciones IS NULL OR cardinality(v_instrucciones) = 0 OR EXISTS (
    SELECT 1
    FROM unnest(v_instrucciones) AS step
    WHERE step IS NULL OR length(step) NOT BETWEEN 2 AND 1000
  ) THEN
    RAISE EXCEPTION 'Recipe instructions are invalid' USING ERRCODE = '22023';
  END IF;

  IF p_tiempo_preparacion IS NULL
    OR p_tiempo_preparacion <= 0
    OR p_tiempo_preparacion > 1440 THEN
    RAISE EXCEPTION 'Preparation time must be between 1 and 1440 minutes'
      USING ERRCODE = '22023';
  END IF;

  IF p_porciones IS NULL OR p_porciones <= 0 OR p_porciones > 100 THEN
    RAISE EXCEPTION 'Servings must be between 1 and 100'
      USING ERRCODE = '22023';
  END IF;

  IF p_ingredientes IS NULL
    OR jsonb_typeof(p_ingredientes) <> 'array'
    OR jsonb_array_length(p_ingredientes) NOT BETWEEN 1 AND 50 THEN
    RAISE EXCEPTION 'A recipe must contain between 1 and 50 ingredients'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_ingredientes) AS item(
      ingrediente_id UUID,
      nombre_personalizado TEXT,
      cantidad NUMERIC,
      unidad TEXT
    )
    WHERE (ingrediente_id IS NULL) =
        (nullif(btrim(nombre_personalizado), '') IS NULL)
      OR (
        nombre_personalizado IS NOT NULL
        AND length(btrim(nombre_personalizado)) NOT BETWEEN 2 AND 100
      )
      OR cantidad IS NULL
      OR cantidad <= 0
      OR unidad IS NULL
      OR lower(btrim(unidad)) NOT IN (
        'g', 'kg', 'ml', 'l', 'unidad', 'cucharadita', 'cucharada', 'taza', 'pizca'
      )
  ) THEN
    RAISE EXCEPTION 'Recipe ingredients contain invalid values'
      USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(ingrediente_id) <> count(DISTINCT ingrediente_id)
    FROM jsonb_to_recordset(p_ingredientes) AS item(
      ingrediente_id UUID,
      nombre_personalizado TEXT,
      cantidad NUMERIC,
      unidad TEXT
    )
  ) OR (
    SELECT count(nombre_personalizado) <>
      count(DISTINCT lower(btrim(nombre_personalizado)))
    FROM jsonb_to_recordset(p_ingredientes) AS item(
      ingrediente_id UUID,
      nombre_personalizado TEXT,
      cantidad NUMERIC,
      unidad TEXT
    )
  ) THEN
    RAISE EXCEPTION 'Recipe ingredients must be unique'
      USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(*)
    FROM public.ingredientes
    WHERE id IN (
      SELECT ingrediente_id
      FROM jsonb_to_recordset(p_ingredientes) AS item(
        ingrediente_id UUID,
        nombre_personalizado TEXT,
        cantidad NUMERIC,
        unidad TEXT
      )
      WHERE ingrediente_id IS NOT NULL
    )
  ) <> (
    SELECT count(ingrediente_id)
    FROM jsonb_to_recordset(p_ingredientes) AS item(
      ingrediente_id UUID,
      nombre_personalizado TEXT,
      cantidad NUMERIC,
      unidad TEXT
    )
  ) THEN
    RAISE EXCEPTION 'One or more master ingredients do not exist'
      USING ERRCODE = '23503';
  END IF;

  SELECT creador_id, imagen_url
  INTO v_owner_id, v_current_image
  FROM public.recetas
  WHERE id = p_id
  FOR UPDATE;

  IF p_imagen_url IS NOT NULL AND (
    (
      split_part(p_imagen_url, '/', 1) <> v_user_id::TEXT
      OR split_part(p_imagen_url, '/', 2) <> p_id::TEXT
      OR split_part(p_imagen_url, '/', 3) = ''
    )
    AND NOT (v_is_admin AND p_imagen_url = v_current_image)
  ) THEN
    RAISE EXCEPTION 'Recipe image path is invalid' USING ERRCODE = '22023';
  END IF;

  IF FOUND THEN
    IF v_owner_id IS DISTINCT FROM v_user_id AND NOT v_is_admin THEN
      RAISE EXCEPTION 'Recipe does not belong to the current user'
        USING ERRCODE = '42501';
    END IF;

    UPDATE public.recetas
    SET titulo = btrim(p_titulo),
        descripcion = nullif(btrim(p_descripcion), ''),
        instrucciones = v_instrucciones,
        imagen_url = p_imagen_url,
        publica = p_publica,
        aprobada = p_publica,
        tiempo_preparacion = p_tiempo_preparacion,
        porciones = p_porciones
    WHERE id = p_id;
  ELSE
    INSERT INTO public.recetas (
      id, titulo, descripcion, instrucciones, imagen_url, creador_id,
      publica, aprobada, tiempo_preparacion, porciones
    ) VALUES (
      p_id, btrim(p_titulo), nullif(btrim(p_descripcion), ''), v_instrucciones,
      p_imagen_url, v_user_id, p_publica, p_publica,
      p_tiempo_preparacion, p_porciones
    );
  END IF;

  DELETE FROM public.receta_ingredientes WHERE receta_id = p_id;

  INSERT INTO public.receta_ingredientes (
    receta_id, ingrediente_id, nombre_personalizado, cantidad, unidad
  )
  SELECT
    p_id,
    ingrediente_id,
    CASE WHEN ingrediente_id IS NULL THEN btrim(nombre_personalizado) ELSE NULL END,
    cantidad,
    lower(btrim(unidad))
  FROM jsonb_to_recordset(p_ingredientes) AS item(
    ingrediente_id UUID,
    nombre_personalizado TEXT,
    cantidad NUMERIC,
    unidad TEXT
  );

  RETURN p_id;
END;
$$;

DROP POLICY IF EXISTS "recipe_images_owner_delete" ON storage.objects;

CREATE POLICY "recipe_images_owner_or_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND (
    (
      owner_id = (SELECT auth.uid()::text)
      AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
    )
    OR (SELECT public.is_admin())
  )
  AND (SELECT public.is_active_user())
);

REVOKE ALL ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT
) TO authenticated;
