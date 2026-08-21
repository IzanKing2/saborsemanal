-- Fase 6 (Tarea 1): tabla de invitaciones a grupo. Sin acceso directo desde
-- anon/authenticated -- todo el acceso pasa por RPCs SECURITY DEFINER
-- (Tarea 2), igual que list_group_members() ya hace para grupo_miembros.
-- Esto evita tener que diseñar políticas RLS que distingan "invitaciones
-- que envié" de "invitaciones que recibí" a nivel de fila.

CREATE TABLE public.grupo_invitaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grupo_id UUID NOT NULL REFERENCES public.grupos(id) ON DELETE CASCADE,
  email TEXT NOT NULL CHECK (email = lower(btrim(email))),
  invited_by UUID NOT NULL REFERENCES public.profiles(id),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'declined', 'revoked')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT now() + INTERVAL '24 hours',
  responded_at TIMESTAMPTZ
);

-- Como mucho una invitación pending a la vez por grupo+email: crear una
-- nueva mientras hay una pendiente debe revocar la vieja primero (Tarea 2),
-- no coexistir con ella.
CREATE UNIQUE INDEX grupo_invitaciones_pending_unique
  ON public.grupo_invitaciones (grupo_id, email)
  WHERE status = 'pending';

CREATE INDEX grupo_invitaciones_email_idx ON public.grupo_invitaciones (email);

ALTER TABLE public.grupo_invitaciones ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.grupo_invitaciones FROM PUBLIC, anon, authenticated;
