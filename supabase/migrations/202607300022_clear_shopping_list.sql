-- Empties the whole shopping list: hand-added extras plus the ingredients
-- derived from the selected weekly menu.

CREATE FUNCTION public.clear_shopping_list(p_week DATE)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_menu_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF p_week IS NULL
    OR extract(isodow FROM p_week) <> 1
    OR p_week < current_date - INTERVAL '5 years'
    OR p_week > current_date + INTERVAL '5 years' THEN
    RAISE EXCEPTION 'Week is outside the allowed range'
      USING ERRCODE = '22023';
  END IF;

  SELECT menu.id
  INTO v_menu_id
  FROM public.menus_semanales AS menu
  WHERE menu.usuario_id = v_user_id
    AND menu.semana_inicio = p_week;

  IF v_menu_id IS NOT NULL THEN
    DELETE FROM public.shopping_list_items AS item
    WHERE item.menu_id = v_menu_id;
  END IF;

  DELETE FROM public.shopping_list_extra AS item
  WHERE item.usuario_id = v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.clear_shopping_list(DATE) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.clear_shopping_list(DATE) FROM anon;
GRANT EXECUTE ON FUNCTION public.clear_shopping_list(DATE)
  TO authenticated;
