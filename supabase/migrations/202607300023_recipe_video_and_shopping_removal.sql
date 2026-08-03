-- Add an optional preparation guide and allow users to remove generated items
-- from their shopping list without altering the weekly menu.

ALTER TABLE public.recetas
  ADD COLUMN video_url TEXT;

ALTER TABLE public.recetas
  ADD CONSTRAINT recetas_video_url_valid CHECK (
    video_url IS NULL
    OR (
      video_url = btrim(video_url)
      AND char_length(video_url) BETWEEN 8 AND 500
      AND video_url ~* '^https://'
    )
  );

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
  p_video_url TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_recipe_id UUID;
BEGIN
  IF p_video_url IS NOT NULL AND (
    p_video_url <> btrim(p_video_url)
    OR char_length(p_video_url) NOT BETWEEN 8 AND 500
    OR p_video_url !~* '^https://'
  ) THEN
    RAISE EXCEPTION 'Recipe video URL is invalid' USING ERRCODE = '22023';
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
    p_imagen_url
  ) INTO v_recipe_id;

  UPDATE public.recetas
  SET video_url = nullif(btrim(p_video_url), '')
  WHERE id = v_recipe_id;

  RETURN v_recipe_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT, TEXT
) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT, TEXT
) FROM anon;
GRANT EXECUTE ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT, TEXT
) TO authenticated;

CREATE FUNCTION public.remove_shopping_item(p_item_id UUID)
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

  DELETE FROM public.shopping_list_items
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

REVOKE ALL ON FUNCTION public.remove_shopping_item(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.remove_shopping_item(UUID) FROM anon;
GRANT EXECUTE ON FUNCTION public.remove_shopping_item(UUID)
  TO authenticated;
