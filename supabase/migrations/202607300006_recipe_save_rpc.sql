-- Atomic create/update operation for recipes and their ingredient rows.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.receta_ingredientes
    WHERE lower(btrim(unidad)) NOT IN (
      'g', 'kg', 'ml', 'l', 'unidad', 'cucharadita', 'cucharada', 'taza', 'pizca'
    )
  ) THEN
    RAISE EXCEPTION 'Existing recipe ingredients contain unsupported units';
  END IF;
END;
$$;

UPDATE public.receta_ingredientes SET unidad = lower(btrim(unidad));

ALTER TABLE public.receta_ingredientes
  ADD CONSTRAINT receta_ingredientes_unidad_supported
  CHECK (unidad IN (
    'g', 'kg', 'ml', 'l', 'unidad', 'cucharadita', 'cucharada', 'taza', 'pizca'
  ));

CREATE FUNCTION public.save_recipe(
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
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_owner_id UUID;
  v_instrucciones TEXT[];
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
    SELECT 1 FROM unnest(v_instrucciones) AS step WHERE length(step) = 0
  ) THEN
    RAISE EXCEPTION 'Recipe instructions cannot be empty'
      USING ERRCODE = '22023';
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
    OR jsonb_array_length(p_ingredientes) = 0 THEN
    RAISE EXCEPTION 'At least one ingredient is required'
      USING ERRCODE = '22023';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM jsonb_to_recordset(p_ingredientes)
      AS item(ingrediente_id UUID, cantidad NUMERIC, unidad TEXT)
    WHERE ingrediente_id IS NULL
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
    SELECT count(*) <> count(DISTINCT ingrediente_id)
    FROM jsonb_to_recordset(p_ingredientes)
      AS item(ingrediente_id UUID, cantidad NUMERIC, unidad TEXT)
  ) THEN
    RAISE EXCEPTION 'Recipe ingredients must be unique'
      USING ERRCODE = '22023';
  END IF;

  IF (
    SELECT count(*)
    FROM public.ingredientes
    WHERE id IN (
      SELECT ingrediente_id
      FROM jsonb_to_recordset(p_ingredientes)
        AS item(ingrediente_id UUID, cantidad NUMERIC, unidad TEXT)
    )
  ) <> jsonb_array_length(p_ingredientes) THEN
    RAISE EXCEPTION 'One or more ingredients do not exist'
      USING ERRCODE = '23503';
  END IF;

  IF p_imagen_url IS NOT NULL AND (
    split_part(p_imagen_url, '/', 1) <> v_user_id::TEXT
    OR split_part(p_imagen_url, '/', 2) <> p_id::TEXT
    OR split_part(p_imagen_url, '/', 3) = ''
  ) THEN
    RAISE EXCEPTION 'Recipe image path is invalid' USING ERRCODE = '22023';
  END IF;

  SELECT creador_id
  INTO v_owner_id
  FROM public.recetas
  WHERE id = p_id
  FOR UPDATE;

  IF FOUND THEN
    IF v_owner_id IS DISTINCT FROM v_user_id THEN
      RAISE EXCEPTION 'Recipe does not belong to the current user'
        USING ERRCODE = '42501';
    END IF;

    UPDATE public.recetas
    SET titulo = btrim(p_titulo),
        descripcion = nullif(btrim(p_descripcion), ''),
        instrucciones = v_instrucciones,
        imagen_url = p_imagen_url,
        publica = p_publica,
        aprobada = false,
        tiempo_preparacion = p_tiempo_preparacion,
        porciones = p_porciones
    WHERE id = p_id;
  ELSE
    INSERT INTO public.recetas (
      id,
      titulo,
      descripcion,
      instrucciones,
      imagen_url,
      creador_id,
      publica,
      aprobada,
      tiempo_preparacion,
      porciones
    ) VALUES (
      p_id,
      btrim(p_titulo),
      nullif(btrim(p_descripcion), ''),
      v_instrucciones,
      p_imagen_url,
      v_user_id,
      p_publica,
      false,
      p_tiempo_preparacion,
      p_porciones
    );
  END IF;

  DELETE FROM public.receta_ingredientes WHERE receta_id = p_id;

  INSERT INTO public.receta_ingredientes (
    receta_id,
    ingrediente_id,
    cantidad,
    unidad
  )
  SELECT
    p_id,
    ingrediente_id,
    cantidad,
    lower(btrim(unidad))
  FROM jsonb_to_recordset(p_ingredientes)
    AS item(ingrediente_id UUID, cantidad NUMERIC, unidad TEXT);

  RETURN p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT
) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT
) TO authenticated;
