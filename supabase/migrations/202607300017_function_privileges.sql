-- Supabase default privileges grant new functions to API roles explicitly.
-- Revoke every non-public entry point from each role before allowlisting it.

REVOKE EXECUTE ON FUNCTION public.handle_new_user()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.sync_profile_email()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.invalidate_recipe_approval()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_custom_ingredient_publication()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_recipe_ingredient_source()
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_user_account(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_user_account(UUID) TO service_role;

REVOKE EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, UUID[])
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_my_profile(TEXT, TEXT, UUID[])
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_profile_access(UUID, TEXT, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_profile_access(UUID, TEXT, BOOLEAN)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_ingredient(UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.delete_ingredient(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.moderate_recipe(UUID, TEXT)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_recipe(UUID, TEXT) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.regenerate_shopping_list(DATE)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_shopping_list(DATE)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.save_ingredient(TEXT, UUID[], UUID, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_ingredient(TEXT, UUID[], UUID, UUID)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_menu_slot(DATE, TEXT, TEXT, UUID)
  TO authenticated;

REVOKE EXECUTE ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT
) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_recipe(
  UUID, TEXT, TEXT[], INTEGER, INTEGER, BOOLEAN, JSONB, TEXT, TEXT
) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.set_shopping_item_purchased(UUID, BOOLEAN)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.set_shopping_item_purchased(UUID, BOOLEAN)
  TO authenticated;

CREATE INDEX profile_allergens_allergen_id_idx
  ON public.profile_allergens (allergen_id);
