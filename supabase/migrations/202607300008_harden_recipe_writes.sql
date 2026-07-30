-- Make the recipe RPC the only write path and prevent anonymous image listing.

DROP POLICY IF EXISTS "recipe_images_select_public" ON storage.objects;

CREATE POLICY "recipe_images_owner_select"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'recipe-images'
  AND owner_id = (SELECT auth.uid()::text)
);

ALTER FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT
) SECURITY DEFINER;

REVOKE INSERT, UPDATE ON public.recetas FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.receta_ingredientes FROM authenticated;

CREATE OR REPLACE FUNCTION public.valid_recipe_instructions(value TEXT[])
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT
    cardinality(value) BETWEEN 1 AND 30
    AND NOT EXISTS (
      SELECT 1
      FROM unnest(value) AS instruction
      WHERE instruction IS NULL
        OR length(btrim(instruction)) NOT BETWEEN 2 AND 1000
    );
$$;

ALTER TABLE public.recetas
  DROP CONSTRAINT recetas_titulo_not_blank,
  DROP CONSTRAINT recetas_titulo_max_length,
  DROP CONSTRAINT recetas_instrucciones_valid;

ALTER TABLE public.recetas
  ADD CONSTRAINT recetas_titulo_length
    CHECK (length(btrim(titulo)) BETWEEN 3 AND 120),
  ADD CONSTRAINT recetas_instrucciones_valid
    CHECK (public.valid_recipe_instructions(instrucciones));

DO $$
BEGIN
  IF EXISTS (
    SELECT receta_id
    FROM public.receta_ingredientes
    GROUP BY receta_id
    HAVING count(*) > 50
  ) THEN
    RAISE EXCEPTION 'Existing recipes exceed the 50 ingredient limit';
  END IF;
END;
$$;
