-- Expose nullable ingredient fields as optional RPC arguments in generated types.

DROP FUNCTION public.save_ingredient(UUID, TEXT, UUID, UUID[]);

CREATE FUNCTION public.save_ingredient(
  p_nombre TEXT,
  p_alergeno_ids UUID[],
  p_id UUID DEFAULT NULL,
  p_categoria_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  v_id UUID;
  v_nombre TEXT := btrim(p_nombre);
  v_alergeno_ids UUID[] := COALESCE(p_alergeno_ids, ARRAY[]::UUID[]);
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  IF length(v_nombre) < 2 OR length(v_nombre) > 100 THEN
    RAISE EXCEPTION 'Ingredient name must contain between 2 and 100 characters'
      USING ERRCODE = '22023';
  END IF;

  IF p_categoria_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.categorias_ingredientes WHERE id = p_categoria_id
  ) THEN
    RAISE EXCEPTION 'Category does not exist' USING ERRCODE = '23503';
  END IF;

  IF cardinality(v_alergeno_ids) <> (
    SELECT count(DISTINCT alergeno_id)
    FROM unnest(v_alergeno_ids) AS alergeno_id
  ) THEN
    RAISE EXCEPTION 'Allergen identifiers must be unique'
      USING ERRCODE = '22023';
  END IF;

  IF cardinality(v_alergeno_ids) <> (
    SELECT count(*)
    FROM public.alergenos
    WHERE id = ANY(v_alergeno_ids)
  ) THEN
    RAISE EXCEPTION 'One or more allergens do not exist'
      USING ERRCODE = '23503';
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.ingredientes (nombre, categoria_id)
    VALUES (v_nombre, p_categoria_id)
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.ingredientes
    SET nombre = v_nombre,
        categoria_id = p_categoria_id
    WHERE id = p_id
    RETURNING id INTO v_id;

    IF v_id IS NULL THEN
      RAISE EXCEPTION 'Ingredient does not exist' USING ERRCODE = 'P0002';
    END IF;
  END IF;

  DELETE FROM public.ingrediente_alergenos
  WHERE ingrediente_id = v_id;

  INSERT INTO public.ingrediente_alergenos (ingrediente_id, alergeno_id)
  SELECT v_id, alergeno_id
  FROM unnest(v_alergeno_ids) AS alergeno_id;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_ingredient(TEXT, UUID[], UUID, UUID)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.save_ingredient(TEXT, UUID[], UUID, UUID)
  TO authenticated;
