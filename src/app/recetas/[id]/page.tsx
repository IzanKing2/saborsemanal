import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getRecipeImageUrl } from "@/lib/recipe-images";
import { SiteHeader } from "@/components/navigation/site-header";
import { AddToMenuButton } from "@/components/recipes/add-to-menu-button";
import { CopyRecipeButton } from "@/components/recipes/copy-recipe-button";
import { getProfileAvatarUrl } from "@/lib/profile-avatars";
import { isUuid } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

type RecipeDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function RecipeDetailPage({
  params,
}: RecipeDetailPageProps) {
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const query = supabase
    .from("recetas")
    .select(
      "id, titulo, descripcion, instrucciones, imagen_url, tiempo_preparacion, porciones",
    )
    .eq("id", id);
  const filteredQuery = user
    ? query.or(
        `and(publica.eq.true,aprobada.eq.true),and(creador_id.eq."${user.id}")`,
      )
    : query.eq("publica", true).eq("aprobada", true);
  const { data: recipe, error } = await filteredQuery.maybeSingle();

  if (error) throw new Error(`No se pudo cargar la receta: ${error.message}`);
  if (!recipe) notFound();

  const { data: ingredientRows, error: ingredientsError } = await supabase
    .from("receta_ingredientes")
    .select("ingrediente_id, nombre_personalizado, cantidad, unidad, ingredientes(nombre)")
    .eq("receta_id", recipe.id);
  if (ingredientsError) {
    throw new Error(
      `No se pudieron cargar los ingredientes: ${ingredientsError.message}`,
    );
  }

  const masterIngredientIds = (ingredientRows ?? [])
    .map((row) => row.ingrediente_id)
    .filter((ingredientId): ingredientId is string => ingredientId !== null);
  const { data: allergenLinks, error: allergensError } =
    masterIngredientIds.length > 0
      ? await supabase
          .from("ingrediente_alergenos")
          .select("alergenos(id, nombre)")
          .in("ingrediente_id", masterIngredientIds)
      : { data: [], error: null };
  if (allergensError) {
    throw new Error(`No se pudieron cargar los alérgenos: ${allergensError.message}`);
  }

  const allergens = [
    ...new Map(
      (allergenLinks ?? [])
        .filter((link) => link.alergenos)
        .map((link) => [link.alergenos!.id, link.alergenos!]),
    ).values(),
  ].sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
  const [imageUrl, authorResult] = await Promise.all([
    getRecipeImageUrl(supabase, recipe.imagen_url),
    supabase.rpc("get_public_recipe_authors", { p_recipe_ids: [recipe.id] }),
  ]);
  if (authorResult.error) {
    throw new Error(
      `No se pudo cargar el autor: ${authorResult.error.message}`,
    );
  }
  const author = authorResult.data?.[0] ?? null;
  const authorAvatarUrl = await getProfileAvatarUrl(
    supabase,
    author?.avatar_path ?? null,
  );
  const { data: preferenceRows, error: preferencesError } = user
    ? await supabase
        .from("profile_allergens")
        .select("allergen_id")
        .eq("user_id", user.id)
    : { data: [], error: null };
  if (preferencesError) {
    throw new Error(
      `No se pudieron cargar las preferencias: ${preferencesError.message}`,
    );
  }
  const preferredAllergens = new Set(
    (preferenceRows ?? []).map((item) => item.allergen_id),
  );
  const preferenceConflicts = allergens.filter((allergen) =>
    preferredAllergens.has(allergen.id),
  );

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <SiteHeader tone="light" />
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-6 sm:px-6 lg:px-8">
        <Link
          className="text-sm font-bold text-emerald-800 hover:underline"
          href="/recetas"
        >
          ← Volver a recetas
        </Link>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <AddToMenuButton guest={!user} recipeId={recipe.id} />
          {user && <CopyRecipeButton id={recipe.id} />}
        </div>
      </div>

      <article className="mx-auto max-w-6xl overflow-hidden border-y border-stone-200 bg-white shadow-sm sm:rounded-3xl sm:border">
        <div className="grid lg:grid-cols-[1.05fr_0.95fr]">
          <div className="relative min-h-80 bg-stone-100 lg:min-h-[520px]">
            {imageUrl ? (
              <Image
                alt={`Presentación de ${recipe.titulo}`}
                className="object-cover"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 55vw"
                src={imageUrl}
              />
            ) : (
              <div className="flex h-full items-center justify-center text-stone-400">
                Sin imagen
              </div>
            )}
          </div>
          <div className="p-6 sm:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700">
              Receta pública
            </p>
            <h1 className="mt-3 text-4xl font-black tracking-tight text-stone-950">
              {recipe.titulo}
            </h1>
            <div className="mt-5 flex items-center gap-3 text-sm font-bold text-stone-700">
              <span className="relative flex size-10 items-center justify-center overflow-hidden rounded-full bg-emerald-950 text-amber-300">
                {authorAvatarUrl ? (
                  <Image
                    alt=""
                    className="object-cover"
                    fill
                    sizes="40px"
                    src={authorAvatarUrl}
                  />
                ) : (
                  (author?.display_name ?? "A").slice(0, 1).toUpperCase()
                )}
              </span>
              <span>{author?.display_name ?? "Autor anónimo"}</span>
            </div>
            <p className="mt-4 leading-7 text-stone-600">
              {recipe.descripcion || "Sin descripción."}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl bg-emerald-50 p-4">
                <strong className="block text-2xl text-emerald-950">
                  {recipe.tiempo_preparacion}
                </strong>
                <span className="text-xs font-semibold text-emerald-800">
                  minutos
                </span>
              </div>
              <div className="rounded-xl bg-amber-50 p-4">
                <strong className="block text-2xl text-amber-950">
                  {recipe.porciones}
                </strong>
                <span className="text-xs font-semibold text-amber-800">
                  porciones
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-10 border-t border-stone-200 p-6 sm:p-10 lg:grid-cols-[0.8fr_1.2fr]">
          <section aria-labelledby="ingredients-heading">
            <h2 className="text-2xl font-bold text-stone-950" id="ingredients-heading">
              Ingredientes
            </h2>
            <ul className="mt-5 divide-y divide-stone-100">
              {(ingredientRows ?? []).map((ingredient, index) => (
                <li
                  className="flex items-baseline justify-between gap-4 py-3 text-sm"
                  key={`${ingredient.ingrediente_id ?? ingredient.nombre_personalizado}-${index}`}
                >
                  <span className="font-medium text-stone-800">
                    {ingredient.ingredientes?.nombre ??
                      ingredient.nombre_personalizado}
                  </span>
                  <span className="shrink-0 text-stone-500">
                    {ingredient.cantidad} {ingredient.unidad}
                  </span>
                </li>
              ))}
            </ul>

            {allergens.length > 0 && (
              <div className="mt-7 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <h3 className="text-sm font-bold text-amber-950">
                  Alérgenos presentes
                </h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {allergens.map((allergen) => (
                    <span
                      className="rounded-full bg-white px-2.5 py-1 text-xs font-semibold text-amber-800"
                      key={allergen.id}
                    >
                      {allergen.nombre}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {preferenceConflicts.length > 0 && (
              <div
                className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
                role="alert"
              >
                Esta receta contiene preferencias que evitas: {" "}
                <strong>
                  {preferenceConflicts.map((item) => item.nombre).join(", ")}
                </strong>
                .
              </div>
            )}
          </section>

          <section aria-labelledby="instructions-heading">
            <h2 className="text-2xl font-bold text-stone-950" id="instructions-heading">
              Elaboración
            </h2>
            <ol className="mt-5 space-y-5">
              {recipe.instrucciones.map((instruction, index) => (
                <li className="grid grid-cols-[2.5rem_1fr] gap-4" key={`${index}-${instruction}`}>
                  <span className="flex size-10 items-center justify-center rounded-full bg-emerald-950 font-bold text-white">
                    {index + 1}
                  </span>
                  <p className="pt-2 leading-7 text-stone-700">{instruction}</p>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </article>
      <div className="h-12" />
    </main>
  );
}
