-- Custom ingredients are private-draft content until they are mapped to the
-- allergen-aware master catalog.

ALTER TABLE public.receta_ingredientes
  DROP CONSTRAINT receta_ingredientes_ingrediente_id_fkey,
  DROP CONSTRAINT receta_ingredientes_cantidad_positive;

ALTER TABLE public.receta_ingredientes
  ADD CONSTRAINT receta_ingredientes_ingrediente_id_fkey
    FOREIGN KEY (ingrediente_id)
    REFERENCES public.ingredientes(id)
    ON DELETE RESTRICT,
  ADD CONSTRAINT receta_ingredientes_cantidad_range
    CHECK (cantidad > 0 AND cantidad <= 1000000);

ALTER FUNCTION public.save_ingredient(TEXT, UUID[], UUID, UUID)
  SECURITY DEFINER;
ALTER FUNCTION public.delete_ingredient(UUID)
  SECURITY DEFINER;

REVOKE INSERT, UPDATE, DELETE ON public.ingredientes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.ingrediente_alergenos
  FROM authenticated;

CREATE FUNCTION public.validate_recipe_ingredient_source()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_master_name TEXT;
BEGIN
  IF NEW.nombre_personalizado IS NOT NULL THEN
    NEW.nombre_personalizado = btrim(NEW.nombre_personalizado);

    IF EXISTS (
      SELECT 1
      FROM public.receta_ingredientes AS recipe_ingredient
      JOIN public.ingredientes AS ingredient
        ON ingredient.id = recipe_ingredient.ingrediente_id
      WHERE recipe_ingredient.receta_id = NEW.receta_id
        AND lower(btrim(ingredient.nombre)) =
          lower(NEW.nombre_personalizado)
        AND recipe_ingredient.id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'Custom ingredient duplicates a master ingredient'
        USING ERRCODE = '23505';
    END IF;

    IF EXISTS (
      SELECT 1
      FROM public.recetas
      WHERE id = NEW.receta_id AND publica = true
    ) THEN
      RAISE EXCEPTION 'Recipes with custom ingredients cannot be published'
        USING ERRCODE = '23514';
    END IF;
  ELSE
    SELECT lower(btrim(nombre))
    INTO v_master_name
    FROM public.ingredientes
    WHERE id = NEW.ingrediente_id;

    IF EXISTS (
      SELECT 1
      FROM public.receta_ingredientes
      WHERE receta_id = NEW.receta_id
        AND nombre_personalizado IS NOT NULL
        AND lower(btrim(nombre_personalizado)) = v_master_name
        AND id <> NEW.id
    ) THEN
      RAISE EXCEPTION 'Master ingredient duplicates a custom ingredient'
        USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE FUNCTION public.prevent_custom_ingredient_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW.publica = true AND EXISTS (
    SELECT 1
    FROM public.receta_ingredientes
    WHERE receta_id = NEW.id AND nombre_personalizado IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Recipes with custom ingredients cannot be published'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_recipe_ingredient_source() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.prevent_custom_ingredient_publication()
  FROM PUBLIC;

CREATE TRIGGER receta_ingredientes_validate_source
BEFORE INSERT OR UPDATE ON public.receta_ingredientes
FOR EACH ROW
EXECUTE FUNCTION public.validate_recipe_ingredient_source();

CREATE TRIGGER recetas_prevent_custom_publication
BEFORE INSERT OR UPDATE OF publica ON public.recetas
FOR EACH ROW
EXECUTE FUNCTION public.prevent_custom_ingredient_publication();
