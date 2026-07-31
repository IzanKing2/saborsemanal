-- Account deletion spans Storage and Postgres, so mark it before cleanup to
-- make retries explicit and idempotent.

ALTER TABLE public.profiles
  ADD COLUMN deletion_requested_at TIMESTAMPTZ;
