-- Restrict recipe video links to YouTube domains (defense in depth; the
-- application also validates that a recognizable video ID can be extracted).

ALTER TABLE public.recetas
  DROP CONSTRAINT recetas_video_url_valid;

ALTER TABLE public.recetas
  ADD CONSTRAINT recetas_video_url_valid CHECK (
    video_url IS NULL
    OR (
      video_url = btrim(video_url)
      AND char_length(video_url) BETWEEN 8 AND 500
      AND video_url ~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/'
    )
  );

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
    OR p_video_url !~* '^https://(www\.|m\.)?(youtube\.com|youtu\.be)/'
  ) THEN
    RAISE EXCEPTION 'Recipe video URL must be a YouTube link' USING ERRCODE = '22023';
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
