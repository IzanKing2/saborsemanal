import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

const signedUrlLifetime = 60 * 60;

export async function getRecipeImageUrl(
  supabase: SupabaseClient<Database>,
  path: string | null,
) {
  if (!path) return null;

  const { data, error } = await supabase.storage
    .from("recipe-images")
    .createSignedUrl(path, signedUrlLifetime);
  return error ? null : data.signedUrl;
}

export async function getRecipeImageUrls(
  supabase: SupabaseClient<Database>,
  paths: Array<string | null>,
) {
  const uniquePaths = [...new Set(paths.filter((path): path is string => Boolean(path)))];
  if (uniquePaths.length === 0) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from("recipe-images")
    .createSignedUrls(uniquePaths, signedUrlLifetime);
  if (error) return new Map<string, string>();

  return new Map(
    (data ?? [])
      .filter((item) => item.signedUrl)
      .map((item) => [item.path, item.signedUrl]),
  );
}
