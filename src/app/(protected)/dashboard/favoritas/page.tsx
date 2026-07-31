import Image from "next/image";
import Link from "next/link";

import { getProfileAvatarUrls } from "@/lib/profile-avatars";
import { getRecipeImageUrls } from "@/lib/recipe-images";
import { AddToMenuButton } from "@/components/recipes/add-to-menu-button";
import { FavoriteButton } from "@/components/recipes/favorite-button";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Mis recetas favoritas",
};

export default async function FavoritesPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("favoritos")
    .select(
      `
        recetas (
          id,
          titulo,
          descripcion,
          imagen_url,
          tiempo_preparacion,
          porciones
        )
      `,
    )
    .order("created_at", { ascending: false });
  if (error)
    throw new Error(`No se pudieron cargar tus favoritas: ${error.message}`);

  const recipeRows = (data ?? [])
    .map((row) => row.recetas)
    .filter((recipe): recipe is NonNullable<typeof recipe> => recipe !== null);

  const [{ data: authorRows, error: authorsError }, imageUrls] =
    await Promise.all([
      supabase.rpc("get_public_recipe_authors", {
        p_recipe_ids: recipeRows.map((recipe) => recipe.id),
      }),
      getRecipeImageUrls(
        supabase,
        recipeRows.map((recipe) => recipe.imagen_url),
      ),
    ]);
  if (authorsError) {
    throw new Error(`No se pudieron cargar los autores: ${authorsError.message}`);
  }
  const avatarUrls = await getProfileAvatarUrls(
    supabase,
    (authorRows ?? []).map((author) => author.avatar_path),
  );
  const authorsByRecipe = new Map(
    (authorRows ?? []).map((author) => [author.recipe_id, author]),
  );
  const recipes = recipeRows.map((recipe) => ({
    ...recipe,
    imageUrl: recipe.imagen_url
      ? imageUrls.get(recipe.imagen_url) ?? null
      : null,
    author: authorsByRecipe.get(recipe.id) ?? null,
  }));

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          Guardadas por ti
        </p>
        <h1 className="mt-1 text-3xl font-black text-stone-950">
          Mis recetas favoritas
        </h1>
      </div>

      {recipes.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-stone-300 bg-white/70 p-10 text-center">
          <p className="text-lg font-bold text-stone-700">
            Aún no tienes favoritas
          </p>
          <p className="mt-2 text-sm text-stone-600">
            Pulsa el corazón en cualquier receta del catálogo para guardarla
            aquí.
          </p>
          <Link
            className="mt-6 inline-block rounded-full bg-emerald-800 px-6 py-3 text-sm font-bold text-white hover:bg-emerald-700"
            href="/recetas"
          >
            Explorar recetas
          </Link>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {recipes.map((recipe) => (
            <article
              className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
              key={recipe.id}
            >
              <Link href={`/recetas/${recipe.id}`}>
                <div className="relative aspect-[4/3] bg-stone-100">
                  {recipe.imageUrl ? (
                    <Image
                      alt=""
                      className="object-cover"
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                      src={recipe.imageUrl}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-stone-400">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="text-xl font-bold text-stone-950">
                    {recipe.titulo}
                  </h2>
                  <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-4 text-xs font-semibold text-stone-600">
                    <span className="relative flex size-7 items-center justify-center overflow-hidden rounded-full bg-emerald-950 text-[10px] font-black text-amber-300">
                      {recipe.author?.avatar_path &&
                      avatarUrls.get(recipe.author.avatar_path) ? (
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="28px"
                          src={avatarUrls.get(recipe.author.avatar_path)!}
                        />
                      ) : (
                        (recipe.author?.display_name ?? "A")
                          .slice(0, 1)
                          .toUpperCase()
                      )}
                    </span>
                    <span>
                      {recipe.author?.display_name ?? "Autor anónimo"}
                    </span>
                  </div>
                  <div className="mt-4 flex gap-4 text-xs font-bold text-emerald-800">
                    <span>{recipe.tiempo_preparacion} min</span>
                    <span>{recipe.porciones} porciones</span>
                  </div>
                </div>
              </Link>
              <div className="flex flex-wrap items-center gap-3 px-5 pb-5">
                <AddToMenuButton
                  recipeId={recipe.id}
                  recipeTitle={recipe.titulo}
                />
                <FavoriteButton initial recipeId={recipe.id} />
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
