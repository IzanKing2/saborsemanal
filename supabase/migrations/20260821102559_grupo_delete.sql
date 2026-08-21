-- Fase 6 (extra): el admin puede disolver su grupo. Cada miembro (incluido
-- el propio admin) recibe un grupo personal nuevo, como ya hace
-- remove_group_member para un único miembro -- "todos vuelven a ser
-- independientes".
--
-- El grupo viejo NO se borra: se deja vacío (sin miembros). Borrarlo
-- arrastraría por CASCADE los menús semanales y listas de la compra
-- compartidas de todo el historial del grupo, y "independiente" no implica
-- "se destruyen los datos" -- mismo patrón de grupo huérfano que ya deja
-- remove_group_member.

CREATE FUNCTION public.delete_group()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_grupo_id UUID;
  v_member RECORD;
  v_new_grupo UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  SELECT grupo_id INTO v_grupo_id
  FROM public.grupo_miembros
  WHERE usuario_id = v_user_id AND rol = 'admin';

  IF v_grupo_id IS NULL THEN
    RAISE EXCEPTION 'Only a group admin can delete the group' USING ERRCODE = '42501';
  END IF;

  FOR v_member IN
    SELECT usuario_id FROM public.grupo_miembros WHERE grupo_id = v_grupo_id
  LOOP
    INSERT INTO public.grupos (nombre) VALUES ('Mi grupo')
    RETURNING id INTO v_new_grupo;

    UPDATE public.grupo_miembros
    SET grupo_id = v_new_grupo, rol = 'admin'
    WHERE usuario_id = v_member.usuario_id;
  END LOOP;

  UPDATE public.grupo_invitaciones
  SET status = 'revoked', responded_at = now()
  WHERE grupo_id = v_grupo_id AND status = 'pending';
END;
$$;

REVOKE ALL ON FUNCTION public.delete_group() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_group() TO authenticated;
