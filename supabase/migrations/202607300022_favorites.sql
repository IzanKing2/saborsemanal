-- Favorite recipes, saved per user.

CREATE TABLE public.favoritos (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receta_id UUID NOT NULL REFERENCES public.recetas(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, receta_id)
);

CREATE INDEX favoritos_receta_id_idx
  ON public.favoritos (receta_id);

ALTER TABLE public.favoritos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "favoritos_select_own"
ON public.favoritos FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

REVOKE ALL ON public.favoritos FROM anon, authenticated;
GRANT SELECT ON public.favoritos TO authenticated;

CREATE FUNCTION public.toggle_favorite(p_receta_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_favorited BOOLEAN;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF p_receta_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.recetas AS recipe
    WHERE recipe.id = p_receta_id
      AND (
        (recipe.publica = true AND recipe.aprobada = true)
        OR recipe.creador_id = v_user_id
      )
  ) THEN
    RAISE EXCEPTION 'Recipe is not accessible' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.favoritos AS favorite
    WHERE favorite.user_id = v_user_id
      AND favorite.receta_id = p_receta_id
  ) THEN
    DELETE FROM public.favoritos AS favorite
    WHERE favorite.user_id = v_user_id
      AND favorite.receta_id = p_receta_id;
    v_favorited := false;
  ELSE
    INSERT INTO public.favoritos (user_id, receta_id)
    VALUES (v_user_id, p_receta_id);
    v_favorited := true;
  END IF;

  RETURN v_favorited;
END;
$$;

REVOKE ALL ON FUNCTION public.toggle_favorite(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.toggle_favorite(UUID)
  TO authenticated;
