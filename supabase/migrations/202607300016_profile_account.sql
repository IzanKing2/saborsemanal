-- User-owned profile settings, dietary preferences and private avatars.

UPDATE public.profiles SET role = 'usuario' WHERE role IS NULL;
UPDATE public.profiles SET banned = false WHERE banned IS NULL;
UPDATE public.profiles SET created_at = now() WHERE created_at IS NULL;

ALTER TABLE public.profiles
  ADD COLUMN display_name TEXT,
  ADD COLUMN avatar_path TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ALTER COLUMN role SET NOT NULL,
  ALTER COLUMN banned SET NOT NULL,
  ALTER COLUMN created_at SET NOT NULL,
  ADD CONSTRAINT profiles_display_name_valid CHECK (
    display_name IS NULL
    OR (
      display_name = btrim(display_name)
      AND char_length(display_name) BETWEEN 2 AND 60
    )
  ),
  ADD CONSTRAINT profiles_avatar_path_valid CHECK (
    avatar_path IS NULL
    OR (
      char_length(avatar_path) <= 300
      AND avatar_path LIKE id::TEXT || '/%'
      AND avatar_path !~ '(^|/)\.\.?(/|$)'
    )
  );

CREATE TABLE public.profile_allergens (
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  allergen_id UUID NOT NULL REFERENCES public.alergenos(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, allergen_id)
);

ALTER TABLE public.profile_allergens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profile_allergens_select_own"
ON public.profile_allergens FOR SELECT TO authenticated
USING (user_id = (SELECT auth.uid()) OR (SELECT public.is_admin()));

REVOKE ALL ON public.profile_allergens FROM anon, authenticated;
GRANT SELECT ON public.profile_allergens TO authenticated;

DROP POLICY IF EXISTS "profiles_admin_update" ON public.profiles;
REVOKE INSERT, UPDATE, DELETE ON public.profiles FROM authenticated;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_display_name TEXT := btrim(NEW.raw_user_meta_data ->> 'display_name');
BEGIN
  IF char_length(v_display_name) NOT BETWEEN 2 AND 60 THEN
    v_display_name := NULL;
  END IF;

  INSERT INTO public.profiles (id, email, role, display_name)
  VALUES (NEW.id, NEW.email, 'usuario', v_display_name);
  RETURN NEW;
END;
$$;

CREATE FUNCTION public.sync_profile_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET email = NEW.email, updated_at = now()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_updated
AFTER UPDATE OF email ON auth.users
FOR EACH ROW
WHEN (OLD.email IS DISTINCT FROM NEW.email)
EXECUTE FUNCTION public.sync_profile_email();

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE FUNCTION public.storage_avatar_is_public(object_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles AS profile
    JOIN public.recetas AS recipe ON recipe.creador_id = profile.id
    WHERE profile.avatar_path = object_name
      AND recipe.publica = true
      AND recipe.aprobada = true
  );
$$;

REVOKE ALL ON FUNCTION public.storage_avatar_is_public(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.storage_avatar_is_public(TEXT)
  TO anon, authenticated;

CREATE POLICY "profile_avatars_select"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'profile-avatars'
  AND (
    owner_id = (SELECT auth.uid()::TEXT)
    OR (SELECT public.is_admin())
    OR (SELECT public.storage_avatar_is_public(name))
  )
);

CREATE POLICY "profile_avatars_insert_own"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::TEXT)
  AND (SELECT public.is_active_user())
);

CREATE POLICY "profile_avatars_update_own"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND owner_id = (SELECT auth.uid()::TEXT)
  AND (SELECT public.is_active_user())
)
WITH CHECK (
  bucket_id = 'profile-avatars'
  AND owner_id = (SELECT auth.uid()::TEXT)
  AND (storage.foldername(name))[1] = (SELECT auth.uid()::TEXT)
  AND (SELECT public.is_active_user())
);

CREATE POLICY "profile_avatars_delete_own"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-avatars'
  AND owner_id = (SELECT auth.uid()::TEXT)
  AND (SELECT public.is_active_user())
);

CREATE FUNCTION public.update_my_profile(
  p_display_name TEXT,
  p_avatar_path TEXT,
  p_allergen_ids UUID[] DEFAULT ARRAY[]::UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_display_name TEXT := nullif(btrim(p_display_name), '');
  v_avatar_path TEXT := nullif(btrim(p_avatar_path), '');
  v_allergen_ids UUID[] := coalesce(p_allergen_ids, ARRAY[]::UUID[]);
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF v_display_name IS NULL OR char_length(v_display_name) NOT BETWEEN 2 AND 60 THEN
    RAISE EXCEPTION 'Display name must contain between 2 and 60 characters'
      USING ERRCODE = '22023';
  END IF;

  IF cardinality(v_allergen_ids) > 20
    OR cardinality(v_allergen_ids) <> (
      SELECT count(DISTINCT requested.allergen_id)
      FROM unnest(v_allergen_ids) AS requested(allergen_id)
    )
    OR EXISTS (
      SELECT 1
      FROM unnest(v_allergen_ids) AS requested(allergen_id)
      WHERE NOT EXISTS (
        SELECT 1 FROM public.alergenos
        WHERE id = requested.allergen_id
      )
    ) THEN
    RAISE EXCEPTION 'Allergen preferences are invalid' USING ERRCODE = '22023';
  END IF;

  IF v_avatar_path IS NOT NULL AND (
    char_length(v_avatar_path) > 300
    OR v_avatar_path NOT LIKE v_user_id::TEXT || '/%'
    OR v_avatar_path ~ '(^|/)\.\.?(/|$)'
    OR NOT EXISTS (
      SELECT 1
      FROM storage.objects
      WHERE bucket_id = 'profile-avatars'
        AND name = v_avatar_path
        AND owner_id = v_user_id::TEXT
    )
  ) THEN
    RAISE EXCEPTION 'Avatar path is invalid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.profiles
  SET
    display_name = v_display_name,
    avatar_path = v_avatar_path,
    updated_at = now()
  WHERE id = v_user_id;

  DELETE FROM public.profile_allergens WHERE user_id = v_user_id;
  INSERT INTO public.profile_allergens (user_id, allergen_id)
  SELECT v_user_id, requested.allergen_id
  FROM unnest(v_allergen_ids) AS requested(allergen_id);

  RETURN v_user_id;
END;
$$;

CREATE FUNCTION public.admin_set_profile_access(
  p_user_id UUID,
  p_role TEXT,
  p_banned BOOLEAN
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_updated_id UUID;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access is required' USING ERRCODE = '42501';
  END IF;
  IF p_role NOT IN ('usuario', 'admin') OR p_banned IS NULL THEN
    RAISE EXCEPTION 'Invalid account access values' USING ERRCODE = '22023';
  END IF;
  IF p_user_id = auth.uid() AND (p_role <> 'admin' OR p_banned) THEN
    RAISE EXCEPTION 'Administrators cannot disable their own account'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.profiles
  SET role = p_role, banned = p_banned, updated_at = now()
  WHERE id = p_user_id
  RETURNING id INTO v_updated_id;

  IF v_updated_id IS NULL THEN
    RAISE EXCEPTION 'Profile was not found' USING ERRCODE = 'P0002';
  END IF;
  RETURN v_updated_id;
END;
$$;

CREATE FUNCTION public.get_public_recipe_authors(p_recipe_ids UUID[])
RETURNS TABLE (
  recipe_id UUID,
  display_name TEXT,
  avatar_path TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF p_recipe_ids IS NULL OR cardinality(p_recipe_ids) > 100 THEN
    RAISE EXCEPTION 'Recipe list is invalid' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT recipe.id, profile.display_name, profile.avatar_path
  FROM public.recetas AS recipe
  JOIN public.profiles AS profile ON profile.id = recipe.creador_id
  WHERE recipe.id = ANY(p_recipe_ids)
    AND recipe.publica = true
    AND recipe.aprobada = true;
END;
$$;

CREATE FUNCTION public.delete_user_account(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.role() <> 'service_role' THEN
    RAISE EXCEPTION 'Service role is required' USING ERRCODE = '42501';
  END IF;
  IF p_user_id IS NULL OR NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = p_user_id
  ) THEN
    RAISE EXCEPTION 'User was not found' USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM storage.objects WHERE owner_id = p_user_id::TEXT
  ) THEN
    RAISE EXCEPTION 'Owned storage objects must be removed first'
      USING ERRCODE = '55000';
  END IF;

  DELETE FROM public.recetas
  WHERE creador_id = p_user_id
    AND NOT (publica = true AND aprobada = true);

  UPDATE public.recetas
  SET creador_id = NULL, imagen_url = NULL, updated_at = now()
  WHERE creador_id = p_user_id
    AND publica = true
    AND aprobada = true;

  DELETE FROM auth.users WHERE id = p_user_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.update_my_profile(TEXT, TEXT, UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, UUID[])
  TO authenticated;

REVOKE ALL ON FUNCTION public.admin_set_profile_access(UUID, TEXT, BOOLEAN)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_access(UUID, TEXT, BOOLEAN)
  TO authenticated;

REVOKE ALL ON FUNCTION public.get_public_recipe_authors(UUID[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_recipe_authors(UUID[])
  TO anon, authenticated;

REVOKE ALL ON FUNCTION public.delete_user_account(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;
