-- family_groups.sql created my_grupo_id() without an explicit REVOKE/GRANT,
-- so Postgres left it executable by PUBLIC (including anon) by default --
-- flagged by Supabase's security linter. Not an actual data leak (it just
-- returns NULL for anon, who never has a grupo_miembros row), but easy to
-- close: only authenticated needs it, same as every other group RPC.

REVOKE ALL ON FUNCTION public.my_grupo_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_grupo_id() TO authenticated;
