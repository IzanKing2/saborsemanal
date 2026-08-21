-- Fase 6 (Tarea 2): RPCs para el ciclo de vida de una invitación a grupo.
-- Mismo patrón que add_group_member/remove_group_member ya existentes:
-- SECURITY DEFINER, validan auth.uid() a mano, no dependen de RLS.

CREATE FUNCTION public.create_group_invitation(p_email TEXT)
RETURNS public.grupo_invitaciones
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_my_grupo UUID;
  v_email TEXT := lower(btrim(p_email));
  v_invitation public.grupo_invitaciones;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  IF v_email = '' OR v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' THEN
    RAISE EXCEPTION 'A valid email is required' USING ERRCODE = '22023';
  END IF;

  SELECT grupo_id INTO v_my_grupo
  FROM public.grupo_miembros
  WHERE usuario_id = v_user_id AND rol = 'admin';

  IF v_my_grupo IS NULL THEN
    RAISE EXCEPTION 'Only a group admin can invite members' USING ERRCODE = '42501';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.profiles p
    JOIN public.grupo_miembros gm ON gm.usuario_id = p.id
    WHERE p.email = v_email AND gm.grupo_id = v_my_grupo
  ) THEN
    RAISE EXCEPTION 'That person is already in your group' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM public.grupo_miembros WHERE grupo_id = v_my_grupo) >= 8 THEN
    RAISE EXCEPTION 'Group member limit reached' USING ERRCODE = '22023';
  END IF;

  -- At most one pending invitation per group+email: revoke any earlier
  -- one first instead of letting the unique index reject the insert.
  UPDATE public.grupo_invitaciones
  SET status = 'revoked', responded_at = now()
  WHERE grupo_id = v_my_grupo AND email = v_email AND status = 'pending';

  INSERT INTO public.grupo_invitaciones (grupo_id, email, invited_by)
  VALUES (v_my_grupo, v_email, v_user_id)
  RETURNING * INTO v_invitation;

  RETURN v_invitation;
END;
$$;

REVOKE ALL ON FUNCTION public.create_group_invitation(TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_group_invitation(TEXT) TO authenticated;

-- Outgoing pending invitations for the caller's group (admin only).
CREATE FUNCTION public.list_group_invitations()
RETURNS SETOF public.grupo_invitaciones
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT gi.*
  FROM public.grupo_invitaciones gi
  WHERE gi.status = 'pending'
    AND gi.grupo_id = (
      SELECT grupo_id FROM public.grupo_miembros
      WHERE usuario_id = auth.uid() AND rol = 'admin'
    )
  ORDER BY gi.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_group_invitations() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_group_invitations() TO authenticated;

CREATE FUNCTION public.revoke_group_invitation(p_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  UPDATE public.grupo_invitaciones gi
  SET status = 'revoked', responded_at = now()
  WHERE gi.id = p_invitation_id
    AND gi.status = 'pending'
    AND gi.grupo_id = (
      SELECT grupo_id FROM public.grupo_miembros
      WHERE usuario_id = v_user_id AND rol = 'admin'
    )
  RETURNING gi.id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '22023';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_group_invitation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.revoke_group_invitation(UUID) TO authenticated;

-- Incoming pending invitations for the caller's own email.
CREATE FUNCTION public.list_pending_invitations_for_me()
RETURNS TABLE (
  id UUID,
  grupo_id UUID,
  grupo_nombre TEXT,
  invited_by_nombre TEXT,
  created_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    gi.id,
    gi.grupo_id,
    g.nombre,
    coalesce(inviter.display_name, inviter.email),
    gi.created_at,
    gi.expires_at
  FROM public.grupo_invitaciones gi
  JOIN public.grupos g ON g.id = gi.grupo_id
  JOIN public.profiles inviter ON inviter.id = gi.invited_by
  WHERE gi.status = 'pending'
    AND gi.expires_at > now()
    AND gi.email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  ORDER BY gi.created_at DESC;
$$;

REVOKE ALL ON FUNCTION public.list_pending_invitations_for_me() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_pending_invitations_for_me() TO authenticated;

CREATE FUNCTION public.accept_group_invitation(p_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_grupo_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;

  SELECT gi.grupo_id INTO v_grupo_id
  FROM public.grupo_invitaciones gi
  WHERE gi.id = p_invitation_id
    AND gi.status = 'pending'
    AND gi.expires_at > now()
    AND gi.email = v_email
  FOR UPDATE;

  IF v_grupo_id IS NULL THEN
    RAISE EXCEPTION 'Invitation is not valid or has expired' USING ERRCODE = '22023';
  END IF;

  IF (SELECT count(*) FROM public.grupo_miembros WHERE grupo_id = v_grupo_id) >= 8 THEN
    RAISE EXCEPTION 'Group member limit reached' USING ERRCODE = '22023';
  END IF;

  UPDATE public.grupo_miembros
  SET grupo_id = v_grupo_id, rol = 'miembro'
  WHERE usuario_id = v_user_id;

  UPDATE public.grupo_invitaciones
  SET status = 'accepted', responded_at = now()
  WHERE id = p_invitation_id;

  -- Any other still-pending invitations to this same email (from other
  -- groups) become moot now that this person belongs elsewhere.
  UPDATE public.grupo_invitaciones
  SET status = 'revoked', responded_at = now()
  WHERE email = v_email AND status = 'pending' AND id <> p_invitation_id;

  RETURN v_grupo_id;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_group_invitation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_group_invitation(UUID) TO authenticated;

CREATE FUNCTION public.decline_group_invitation(p_invitation_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_user_id UUID := auth.uid();
  v_email TEXT;
  v_id UUID;
BEGIN
  IF v_user_id IS NULL OR NOT public.is_active_user() THEN
    RAISE EXCEPTION 'An active user is required' USING ERRCODE = '42501';
  END IF;

  SELECT email INTO v_email FROM public.profiles WHERE id = v_user_id;

  UPDATE public.grupo_invitaciones
  SET status = 'declined', responded_at = now()
  WHERE id = p_invitation_id AND status = 'pending' AND email = v_email
  RETURNING id INTO v_id;

  IF v_id IS NULL THEN
    RAISE EXCEPTION 'Invitation not found' USING ERRCODE = '22023';
  END IF;

  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.decline_group_invitation(UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decline_group_invitation(UUID) TO authenticated;
