import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

export async function getProfileAvatarUrl(
  supabase: SupabaseClient<Database>,
  path: string | null,
) {
  if (!path) return null;
  const { data, error } = await supabase.storage
    .from("profile-avatars")
    .createSignedUrl(path, 3600);
  return error ? null : data.signedUrl;
}

export async function getProfileAvatarUrls(
  supabase: SupabaseClient<Database>,
  paths: (string | null)[],
) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  const entries = await Promise.all(
    uniquePaths.map(async (path) => [path, await getProfileAvatarUrl(supabase, path)] as const),
  );
  return new Map(entries);
}
