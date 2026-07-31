-- Admin recipe search with filters and pagination.

CREATE FUNCTION public.search_admin_recetas(
  p_query TEXT DEFAULT NULL,
  p_publica BOOLEAN DEFAULT NULL,
  p_aprobada BOOLEAN DEFAULT NULL,
  p_limit INTEGER DEFAULT 10,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  id UUID,
  titulo TEXT,
  descripcion TEXT,
  publica BOOLEAN,
  aprobada BOOLEAN,
  tiempo_preparacion INTEGER,
  porciones INTEGER,
  created_at TIMESTAMPTZ,
  autor_email TEXT,
  total_count BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    recipe.id,
    recipe.titulo,
    recipe.descripcion,
    recipe.publica,
    recipe.aprobada,
    recipe.tiempo_preparacion,
    recipe.porciones,
    recipe.created_at,
    profile.email AS autor_email,
    count(*) OVER () AS total_count
  FROM public.recetas AS recipe
  LEFT JOIN public.profiles AS profile ON profile.id = recipe.creador_id
  WHERE (p_publica IS NULL OR recipe.publica = p_publica)
    AND (p_aprobada IS NULL OR recipe.aprobada = p_aprobada)
    AND (
      nullif(btrim(p_query), '') IS NULL
      OR recipe.titulo ILIKE '%' || btrim(p_query) || '%'
      OR coalesce(recipe.descripcion, '') ILIKE '%' || btrim(p_query) || '%'
    )
  ORDER BY recipe.created_at DESC, recipe.id
  LIMIT least(greatest(coalesce(p_limit, 10), 1), 50)
  OFFSET greatest(coalesce(p_offset, 0), 0);
END;
$$;

REVOKE ALL ON FUNCTION public.search_admin_recetas(TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.search_admin_recetas(TEXT, BOOLEAN, BOOLEAN, INTEGER, INTEGER) TO authenticated;
