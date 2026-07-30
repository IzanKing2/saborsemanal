-- Enforce the catalog naming rules at the database boundary.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM (
      SELECT lower(btrim(nombre))
      FROM public.categorias_ingredientes
      GROUP BY lower(btrim(nombre))
      HAVING count(*) > 1
    ) AS duplicates
  ) OR EXISTS (
    SELECT 1
    FROM (
      SELECT lower(btrim(nombre))
      FROM public.alergenos
      GROUP BY lower(btrim(nombre))
      HAVING count(*) > 1
    ) AS duplicates
  ) OR EXISTS (
    SELECT 1
    FROM (
      SELECT lower(btrim(nombre))
      FROM public.ingredientes
      GROUP BY lower(btrim(nombre))
      HAVING count(*) > 1
    ) AS duplicates
  ) THEN
    RAISE EXCEPTION 'Catalog names contain case-insensitive duplicates';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.categorias_ingredientes
    WHERE length(btrim(nombre)) NOT BETWEEN 2 AND 100
  ) OR EXISTS (
    SELECT 1 FROM public.alergenos
    WHERE length(btrim(nombre)) NOT BETWEEN 2 AND 100
  ) OR EXISTS (
    SELECT 1 FROM public.ingredientes
    WHERE length(btrim(nombre)) NOT BETWEEN 2 AND 100
  ) THEN
    RAISE EXCEPTION 'Catalog names must contain between 2 and 100 characters';
  END IF;
END;
$$;

UPDATE public.categorias_ingredientes SET nombre = btrim(nombre);
UPDATE public.alergenos SET nombre = btrim(nombre);
UPDATE public.ingredientes SET nombre = btrim(nombre);

ALTER TABLE public.categorias_ingredientes
  ADD CONSTRAINT categorias_nombre_length
  CHECK (length(btrim(nombre)) BETWEEN 2 AND 100);

ALTER TABLE public.alergenos
  ADD CONSTRAINT alergenos_nombre_length
  CHECK (length(btrim(nombre)) BETWEEN 2 AND 100);

ALTER TABLE public.ingredientes
  ADD CONSTRAINT ingredientes_nombre_length
  CHECK (length(btrim(nombre)) BETWEEN 2 AND 100);

CREATE UNIQUE INDEX categorias_nombre_ci_uidx
  ON public.categorias_ingredientes (lower(btrim(nombre)));
CREATE UNIQUE INDEX alergenos_nombre_ci_uidx
  ON public.alergenos (lower(btrim(nombre)));
CREATE UNIQUE INDEX ingredientes_nombre_ci_uidx
  ON public.ingredientes (lower(btrim(nombre)));
