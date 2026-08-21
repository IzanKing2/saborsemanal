-- Fase 6 (extra): tarjeta de invitación pública (/invitacion/[id]) para
-- compartir por WhatsApp. Necesita leer datos de la invitación ANTES de
-- saber quién la visita (puede no haber sesión todavía) -- accesible por
-- anon, protegido solo por lo impredecible del UUID (igual de expuesto
-- que cualquier enlace mágico de invitación por email).

CREATE FUNCTION public.get_invitation_preview(p_invitation_id UUID)
RETURNS TABLE (
  id UUID,
  email TEXT,
  grupo_nombre TEXT,
  invited_by_nombre TEXT,
  status TEXT,
  expires_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    gi.id,
    gi.email,
    g.nombre,
    coalesce(inviter.display_name, inviter.email),
    gi.status,
    gi.expires_at
  FROM public.grupo_invitaciones gi
  JOIN public.grupos g ON g.id = gi.grupo_id
  JOIN public.profiles inviter ON inviter.id = gi.invited_by
  WHERE gi.id = p_invitation_id;
$$;

REVOKE ALL ON FUNCTION public.get_invitation_preview(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_invitation_preview(UUID) TO anon, authenticated;
