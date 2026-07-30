-- Hito 2: security hardening, recipe moderation, and recipe image storage.
-- This migration is incremental. Do not prepend the destructive v1 reset.

DO $$
BEGIN
  IF to_regclass('public.profiles') IS NULL
    OR to_regclass('public.recetas') IS NULL
    OR to_regclass('public.receta_ingredientes') IS NULL
    OR to_regclass('public.alergenos') IS NULL
    OR to_regclass('public.ingrediente_alergenos') IS NULL THEN
    RAISE EXCEPTION 'The required SaborSemanal v1 schema is not installed';
  END IF;
END;
$$;

-- Authorization helpers run as their owner so policies can inspect profiles
-- without recursive RLS evaluation.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND role = 'admin'
      AND banned = false
  );
$$;

CREATE OR REPLACE FUNCTION public.is_active_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = (SELECT auth.uid())
      AND banned = false
  );
$$;

REVOKE ALL ON FUNCTION public.is_admin() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_active_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_admin() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_active_user() TO authenticated;

-- A user must never be able to update role or banned on their own profile.
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;

CREATE POLICY "profiles_admin_update"
ON public.profiles FOR UPDATE
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

-- Recipe moderation and integrity.
ALTER TABLE public.recetas
  ADD COLUMN IF NOT EXISTS aprobada BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

UPDATE public.recetas
SET publica = COALESCE(publica, false),
    aprobada = COALESCE(aprobada, false),
    tiempo_preparacion = CASE
      WHEN tiempo_preparacion IS NULL OR tiempo_preparacion <= 0 THEN 1
      ELSE tiempo_preparacion
    END,
    porciones = CASE
      WHEN porciones IS NULL OR porciones <= 0 THEN 1
      ELSE porciones
    END,
    updated_at = COALESCE(updated_at, now());

ALTER TABLE public.recetas
  ALTER COLUMN aprobada SET NOT NULL,
  ALTER COLUMN aprobada SET DEFAULT false,
  ALTER COLUMN updated_at SET NOT NULL,
  ALTER COLUMN updated_at SET DEFAULT now(),
  ALTER COLUMN publica SET NOT NULL,
  ALTER COLUMN publica SET DEFAULT false,
  ALTER COLUMN tiempo_preparacion SET NOT NULL,
  ALTER COLUMN tiempo_preparacion SET DEFAULT 1,
  ALTER COLUMN porciones SET NOT NULL,
  ALTER COLUMN porciones SET DEFAULT 1;

ALTER TABLE public.receta_ingredientes
  ALTER COLUMN receta_id SET NOT NULL,
  ALTER COLUMN ingrediente_id SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.recetas
    WHERE length(btrim(titulo)) = 0
      OR cardinality(instrucciones) = 0
  ) THEN
    RAISE EXCEPTION 'Existing recipes have blank titles or no instructions';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.receta_ingredientes
    WHERE cantidad <= 0 OR length(btrim(unidad)) = 0
  ) THEN
    RAISE EXCEPTION 'Existing recipe ingredients have invalid amounts or units';
  END IF;
END;
$$;

ALTER TABLE public.recetas
  DROP CONSTRAINT IF EXISTS recetas_titulo_not_blank,
  DROP CONSTRAINT IF EXISTS recetas_instrucciones_not_empty,
  DROP CONSTRAINT IF EXISTS recetas_tiempo_preparacion_positive,
  DROP CONSTRAINT IF EXISTS recetas_porciones_positive,
  DROP CONSTRAINT IF EXISTS recetas_aprobada_requires_publica;

ALTER TABLE public.recetas
  ADD CONSTRAINT recetas_titulo_not_blank
    CHECK (length(btrim(titulo)) > 0),
  ADD CONSTRAINT recetas_instrucciones_not_empty
    CHECK (cardinality(instrucciones) > 0),
  ADD CONSTRAINT recetas_tiempo_preparacion_positive
    CHECK (tiempo_preparacion > 0),
  ADD CONSTRAINT recetas_porciones_positive
    CHECK (porciones > 0),
  ADD CONSTRAINT recetas_aprobada_requires_publica
    CHECK (aprobada = false OR publica = true);

ALTER TABLE public.receta_ingredientes
  DROP CONSTRAINT IF EXISTS receta_ingredientes_cantidad_positive,
  DROP CONSTRAINT IF EXISTS receta_ingredientes_unidad_not_blank;

ALTER TABLE public.receta_ingredientes
  ADD CONSTRAINT receta_ingredientes_cantidad_positive
    CHECK (cantidad > 0),
  ADD CONSTRAINT receta_ingredientes_unidad_not_blank
    CHECK (length(btrim(unidad)) > 0);

CREATE OR REPLACE FUNCTION public.prepare_recipe_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();

  IF NOT public.is_admin() THEN
    NEW.aprobada = false;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.invalidate_recipe_approval()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    IF TG_OP = 'DELETE' THEN
      UPDATE public.recetas
      SET aprobada = false
      WHERE id = OLD.receta_id;
    ELSE
      UPDATE public.recetas
      SET aprobada = false
      WHERE id = NEW.receta_id;

      IF TG_OP = 'UPDATE' AND NEW.receta_id <> OLD.receta_id THEN
        UPDATE public.recetas
        SET aprobada = false
        WHERE id = OLD.receta_id;
      END IF;
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.invalidate_recipe_approval() FROM PUBLIC;

DROP TRIGGER IF EXISTS recetas_set_updated_at ON public.recetas;
CREATE TRIGGER recetas_set_updated_at
BEFORE UPDATE ON public.recetas
FOR EACH ROW
EXECUTE FUNCTION public.prepare_recipe_update();

DROP TRIGGER IF EXISTS receta_ingredientes_invalidate_approval
  ON public.receta_ingredientes;
CREATE TRIGGER receta_ingredientes_invalidate_approval
AFTER INSERT OR UPDATE OR DELETE ON public.receta_ingredientes
FOR EACH ROW
EXECUTE FUNCTION public.invalidate_recipe_approval();

CREATE INDEX IF NOT EXISTS recetas_creador_id_idx
  ON public.recetas (creador_id);
CREATE INDEX IF NOT EXISTS recetas_publicacion_idx
  ON public.recetas (publica, aprobada, created_at DESC);
CREATE INDEX IF NOT EXISTS recetas_tiempo_preparacion_idx
  ON public.recetas (tiempo_preparacion);
CREATE INDEX IF NOT EXISTS receta_ingredientes_ingrediente_id_idx
  ON public.receta_ingredientes (ingrediente_id);
CREATE INDEX IF NOT EXISTS ingredientes_categoria_id_idx
  ON public.ingredientes (categoria_id);
CREATE INDEX IF NOT EXISTS ingrediente_alergenos_alergeno_id_idx
  ON public.ingrediente_alergenos (alergeno_id);

-- Catalog writes are admin-only. Public read policies from v1 remain intact.
DROP POLICY IF EXISTS "categorias_admin_insert" ON public.categorias_ingredientes;
DROP POLICY IF EXISTS "categorias_admin_update" ON public.categorias_ingredientes;
DROP POLICY IF EXISTS "categorias_admin_delete" ON public.categorias_ingredientes;

CREATE POLICY "categorias_admin_insert"
ON public.categorias_ingredientes FOR INSERT
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "categorias_admin_update"
ON public.categorias_ingredientes FOR UPDATE
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "categorias_admin_delete"
ON public.categorias_ingredientes FOR DELETE
USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "alergenos_admin_insert" ON public.alergenos;
DROP POLICY IF EXISTS "alergenos_admin_update" ON public.alergenos;
DROP POLICY IF EXISTS "alergenos_admin_delete" ON public.alergenos;

CREATE POLICY "alergenos_admin_insert"
ON public.alergenos FOR INSERT
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "alergenos_admin_update"
ON public.alergenos FOR UPDATE
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "alergenos_admin_delete"
ON public.alergenos FOR DELETE
USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "ingredientes_admin_insert" ON public.ingredientes;
DROP POLICY IF EXISTS "ingredientes_admin_update" ON public.ingredientes;
DROP POLICY IF EXISTS "ingredientes_admin_delete" ON public.ingredientes;

CREATE POLICY "ingredientes_admin_insert"
ON public.ingredientes FOR INSERT
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "ingredientes_admin_update"
ON public.ingredientes FOR UPDATE
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "ingredientes_admin_delete"
ON public.ingredientes FOR DELETE
USING ((SELECT public.is_admin()));

DROP POLICY IF EXISTS "ingrediente_alergenos_admin_insert" ON public.ingrediente_alergenos;
DROP POLICY IF EXISTS "ingrediente_alergenos_admin_update" ON public.ingrediente_alergenos;
DROP POLICY IF EXISTS "ingrediente_alergenos_admin_delete" ON public.ingrediente_alergenos;

CREATE POLICY "ingrediente_alergenos_admin_insert"
ON public.ingrediente_alergenos FOR INSERT
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "ingrediente_alergenos_admin_update"
ON public.ingrediente_alergenos FOR UPDATE
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "ingrediente_alergenos_admin_delete"
ON public.ingrediente_alergenos FOR DELETE
USING ((SELECT public.is_admin()));

-- Recipes: public and approved, owned, or admin-visible.
DROP POLICY IF EXISTS "recetas_select" ON public.recetas;
DROP POLICY IF EXISTS "recetas_insert" ON public.recetas;
DROP POLICY IF EXISTS "recetas_update" ON public.recetas;
DROP POLICY IF EXISTS "recetas_delete" ON public.recetas;
DROP POLICY IF EXISTS "recetas_owner_update" ON public.recetas;
DROP POLICY IF EXISTS "recetas_admin_update" ON public.recetas;
DROP POLICY IF EXISTS "recetas_owner_delete" ON public.recetas;
DROP POLICY IF EXISTS "recetas_admin_delete" ON public.recetas;

CREATE POLICY "recetas_select"
ON public.recetas FOR SELECT
USING (
  (publica = true AND aprobada = true)
  OR creador_id = (SELECT auth.uid())
  OR (SELECT public.is_admin())
);

CREATE POLICY "recetas_insert"
ON public.recetas FOR INSERT
WITH CHECK (
  creador_id = (SELECT auth.uid())
  AND aprobada = false
  AND (SELECT public.is_active_user())
);

CREATE POLICY "recetas_owner_update"
ON public.recetas FOR UPDATE
USING (
  creador_id = (SELECT auth.uid())
  AND (SELECT public.is_active_user())
)
WITH CHECK (
  creador_id = (SELECT auth.uid())
  AND aprobada = false
  AND (SELECT public.is_active_user())
);

CREATE POLICY "recetas_admin_update"
ON public.recetas FOR UPDATE
USING ((SELECT public.is_admin()))
WITH CHECK ((SELECT public.is_admin()));

CREATE POLICY "recetas_owner_delete"
ON public.recetas FOR DELETE
USING (
  creador_id = (SELECT auth.uid())
  AND (SELECT public.is_active_user())
);

CREATE POLICY "recetas_admin_delete"
ON public.recetas FOR DELETE
USING ((SELECT public.is_admin()));

-- Recipe ingredients inherit visibility and ownership from their recipe.
DROP POLICY IF EXISTS "receta_ingredientes_select" ON public.receta_ingredientes;
DROP POLICY IF EXISTS "receta_ingredientes_insert" ON public.receta_ingredientes;
DROP POLICY IF EXISTS "receta_ingredientes_update" ON public.receta_ingredientes;
DROP POLICY IF EXISTS "receta_ingredientes_delete" ON public.receta_ingredientes;

CREATE POLICY "receta_ingredientes_select"
ON public.receta_ingredientes FOR SELECT
USING (EXISTS (
  SELECT 1
  FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
));

CREATE POLICY "receta_ingredientes_insert"
ON public.receta_ingredientes FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND (
      (
        recetas.creador_id = (SELECT auth.uid())
        AND (SELECT public.is_active_user())
      )
      OR (SELECT public.is_admin())
    )
));

CREATE POLICY "receta_ingredientes_update"
ON public.receta_ingredientes FOR UPDATE
USING (EXISTS (
  SELECT 1
  FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND (
      (
        recetas.creador_id = (SELECT auth.uid())
        AND (SELECT public.is_active_user())
      )
      OR (SELECT public.is_admin())
    )
))
WITH CHECK (EXISTS (
  SELECT 1
  FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND (
      (
        recetas.creador_id = (SELECT auth.uid())
        AND (SELECT public.is_active_user())
      )
      OR (SELECT public.is_admin())
    )
));

CREATE POLICY "receta_ingredientes_delete"
ON public.receta_ingredientes FOR DELETE
USING (EXISTS (
  SELECT 1
  FROM public.recetas
  WHERE recetas.id = receta_ingredientes.receta_id
    AND (
      (
        recetas.creador_id = (SELECT auth.uid())
        AND (SELECT public.is_active_user())
      )
      OR (SELECT public.is_admin())
    )
));

-- Make the API privileges explicit; RLS remains the authorization boundary.
GRANT SELECT ON public.categorias_ingredientes TO anon, authenticated;
GRANT SELECT ON public.alergenos TO anon, authenticated;
GRANT SELECT ON public.ingredientes TO anon, authenticated;
GRANT SELECT ON public.ingrediente_alergenos TO anon, authenticated;
GRANT SELECT ON public.recetas TO anon, authenticated;
GRANT SELECT ON public.receta_ingredientes TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.categorias_ingredientes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.alergenos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ingredientes TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.ingrediente_alergenos TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.recetas TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.receta_ingredientes TO authenticated;

-- Public recipe image bucket. Mutations are restricted to the user's folder.
INSERT INTO storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
VALUES (
  'recipe-images',
  'recipe-images',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "recipe_images_select_public" ON storage.objects;
DROP POLICY IF EXISTS "recipe_images_owner_insert" ON storage.objects;
DROP POLICY IF EXISTS "recipe_images_owner_update" ON storage.objects;
DROP POLICY IF EXISTS "recipe_images_owner_delete" ON storage.objects;

CREATE POLICY "recipe_images_select_public"
ON storage.objects FOR SELECT
USING (bucket_id = 'recipe-images');

CREATE POLICY "recipe_images_owner_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'recipe-images'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND (SELECT public.is_active_user())
);

CREATE POLICY "recipe_images_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND (SELECT public.is_active_user())
)
WITH CHECK (
  bucket_id = 'recipe-images'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND (SELECT public.is_active_user())
);

CREATE POLICY "recipe_images_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND owner_id = (SELECT auth.uid()::text)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
  AND (SELECT public.is_active_user())
);
