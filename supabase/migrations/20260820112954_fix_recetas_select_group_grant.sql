-- 20260817110000_family_groups.sql broke public recipe browsing two ways:
--
-- 1) It granted SELECT on grupo_miembros to authenticated only, but the
--    recetas/receta_ingredientes SELECT policies embed a direct subquery
--    against grupo_miembros. Postgres needs table-level SELECT privilege to
--    plan that subquery for whichever role runs the query, even when the
--    policy's `auth.uid() IS NOT NULL` check would short-circuit it at
--    runtime for anon. Net effect: every SELECT on recetas (anon included,
--    e.g. search_public_recipes/count_public_recipes, both SECURITY
--    INVOKER) failed with "permission denied for table grupo_miembros".
--
-- 2) It added `auth.uid() IS NOT NULL` as a blanket requirement, which
--    blocks guest/anonymous access to public recipes entirely — but guest
--    browsing of public+aprobada recipes is an existing, intentional
--    feature (see the anon fallback query in recetas/[id]/page.tsx and the
--    anon-facing search/count RPCs).
--
-- Fix: keep public recipes visible to everyone, and route the group-mate
-- check through a SECURITY DEFINER function, same pattern as
-- my_grupo_id(), so callers never need direct table privileges.

CREATE FUNCTION public.is_group_mate(p_creador_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.grupo_miembros
    WHERE usuario_id = p_creador_id AND grupo_id = public.my_grupo_id()
  );
$$;

REVOKE ALL ON FUNCTION public.is_group_mate(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_group_mate(UUID) TO anon, authenticated;

DROP POLICY IF EXISTS "recetas_select" ON public.recetas;
CREATE POLICY "recetas_select"
ON public.recetas FOR SELECT
USING (
  publica = true
  OR (
    auth.uid() IS NOT NULL
    AND (
      creador_id = auth.uid()
      OR public.is_group_mate(creador_id)
    )
  )
);

DROP POLICY IF EXISTS "receta_ingredientes_select" ON public.receta_ingredientes;
CREATE POLICY "receta_ingredientes_select"
ON public.receta_ingredientes FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND (
      recetas.publica = true
      OR (
        auth.uid() IS NOT NULL
        AND (
          recetas.creador_id = auth.uid()
          OR public.is_group_mate(recetas.creador_id)
        )
      )
    )
));
