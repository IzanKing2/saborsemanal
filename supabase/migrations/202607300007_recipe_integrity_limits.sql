-- Mirror application limits at the database boundary.

CREATE FUNCTION public.valid_recipe_instructions(value TEXT[])
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
      WHERE length(btrim(instruction)) NOT BETWEEN 2 AND 1000
    );
$$;

ALTER TABLE public.recetas
  ADD CONSTRAINT recetas_titulo_max_length
    CHECK (length(btrim(titulo)) <= 120),
  ADD CONSTRAINT recetas_descripcion_max_length
    CHECK (descripcion IS NULL OR length(btrim(descripcion)) <= 1000),
  ADD CONSTRAINT recetas_instrucciones_valid
    CHECK (public.valid_recipe_instructions(instrucciones)),
  ADD CONSTRAINT recetas_tiempo_preparacion_max
    CHECK (tiempo_preparacion <= 1440),
  ADD CONSTRAINT recetas_porciones_max
    CHECK (porciones <= 100);

CREATE FUNCTION public.enforce_recipe_ingredient_limit()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF (
    SELECT count(*)
    FROM public.receta_ingredientes
    WHERE receta_id = NEW.receta_id
  ) > 50 THEN
    RAISE EXCEPTION 'A recipe cannot contain more than 50 ingredients'
      USING ERRCODE = '23514';
  END IF;

  RETURN NULL;
END;
$$;

CREATE TRIGGER receta_ingredientes_limit
AFTER INSERT OR UPDATE ON public.receta_ingredientes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_recipe_ingredient_limit();
