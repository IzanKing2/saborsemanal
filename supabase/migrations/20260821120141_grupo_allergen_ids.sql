-- Fase 6 (Tarea 8): unión de alérgenos de todo el grupo del caller, para
-- aplicarla como filtro por defecto del catálogo en vez de solo la
-- individual -- evita que un plato con un alérgeno de otro miembro de la
-- familia se cuele en las sugerencias por defecto de cualquiera del grupo.
--
-- SECURITY DEFINER: profile_allergens solo es legible por su propio dueño
-- vía RLS, igual que profiles -- una función SECURITY INVOKER no vería más
-- que los alérgenos del propio caller.

CREATE FUNCTION public.list_group_allergen_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT DISTINCT pa.allergen_id
  FROM public.profile_allergens pa
  JOIN public.grupo_miembros gm ON gm.usuario_id = pa.user_id
  WHERE gm.grupo_id = public.my_grupo_id();
$$;

REVOKE ALL ON FUNCTION public.list_group_allergen_ids() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_group_allergen_ids() TO authenticated;
