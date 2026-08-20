import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getRecipeImageUrls } from "@/lib/recipe-images";
import { SiteHeader } from "@/components/navigation/site-header";
import { AddToMenuButton } from "@/components/recipes/add-to-menu-button";
import { AddToShoppingButton } from "@/components/recipes/add-to-shopping-button";
import { FavoriteButton } from "@/components/recipes/favorite-button";
import { RecipeFilters } from "@/components/recipes/recipe-filters";
import { getProfileAvatarUrls } from "@/lib/profile-avatars";
import { isMealType, isUuid, MEAL_TYPES, type MealType } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type RecipesPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SearchArgs =
  Database["public"]["Functions"]["search_public_recipes"]["Args"];
type CountArgs =
  Database["public"]["Functions"]["count_public_recipes"]["Args"];

type RecipeCardData = {
  id: string;
  titulo: string;
  descripcion: string | null;
  tiempo_preparacion: number;
  porciones: number;
  tipo_comida: string[];
  imageUrl: string | null;
  author: { display_name: string | null; avatar_path: string | null } | null;
};

const pageSize = 12;
const groupSize = 6;

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function pageUrl({
  query,
  maxTime,
  allergens,
  mealTypes,
  page,
  preferencesOff,
}: {
  query: string;
  maxTime: number | null;
  allergens: string[];
  mealTypes: string[];
  page: number;
  preferencesOff?: boolean;
}) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (maxTime) params.set("maxTime", String(maxTime));
  allergens.forEach((allergen) => params.append("allergen", allergen));
  mealTypes.forEach((mealType) => params.append("tipo", mealType));
  if (preferencesOff) params.set("preferences", "off");
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/recetas?${search}` : "/recetas";
}

function RecipeCard({
  recipe,
  avatarUrls,
  loggedIn,
  isFavorite,
}: {
  recipe: RecipeCardData;
  avatarUrls: Map<string, string | null>;
  loggedIn: boolean;
  isFavorite: boolean;
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
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
          <h3 className="text-xl font-bold text-stone-950">
            {recipe.titulo}
          </h3>
          <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-stone-600">
            {recipe.descripcion || "Sin descripción."}
          </p>
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
                (recipe.author?.display_name ?? "A").slice(0, 1).toUpperCase()
              )}
            </span>
            <span>{recipe.author?.display_name ?? "Autor anónimo"}</span>
          </div>
          <div className="mt-4 flex gap-4 text-xs font-bold text-emerald-800">
            <span>{recipe.tiempo_preparacion} min</span>
            <span>{recipe.porciones} porciones</span>
          </div>
          {recipe.tipo_comida.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {recipe.tipo_comida.map((tipo) => (
                <span
                  className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-900"
                  key={tipo}
                >
                  {tipo}
                </span>
              ))}
            </div>
          )}
        </div>
      </Link>
      <div className="flex flex-wrap items-center gap-3 px-5 pb-5">
        <AddToMenuButton
          guest={!loggedIn}
          recipeId={recipe.id}
          recipeTitle={recipe.titulo}
        />
        {loggedIn && (
          <FavoriteButton initial={isFavorite} recipeId={recipe.id} />
        )}
        <AddToShoppingButton guest={!loggedIn} recipeId={recipe.id} />
      </div>
    </article>
  );
}

export default async function RecipesPage({ searchParams }: RecipesPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 120);
  const parsedMaxTime = Number(firstValue(params.maxTime));
  const maxTime =
    Number.isInteger(parsedMaxTime) && parsedMaxTime >= 1 && parsedMaxTime <= 1440
      ? parsedMaxTime
      : null;
  const parsedPage = Number(firstValue(params.page));
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, 1_000_000)
      : 1;
  const requestedAllergens = Array.isArray(params.allergen)
    ? params.allergen
    : params.allergen
      ? [params.allergen]
      : [];
  const explicitAllergenIds = [...new Set(requestedAllergens.filter(isUuid))];
  const preferencesOff = firstValue(params.preferences) === "off";
  const hasExplicitAllergens = params.allergen !== undefined;
  const requestedMealTypes = Array.isArray(params.tipo)
    ? params.tipo
    : params.tipo
      ? [params.tipo]
      : [];
  const mealTypes: MealType[] = [
    ...new Set(requestedMealTypes.filter(isMealType)),
  ];

  const supabase = await createClient();
  const { data: allergens, error: allergensError } = await supabase
    .from("alergenos")
    .select("id, nombre")
    .order("nombre");
  if (allergensError) {
    throw new Error(
      `No se pudieron cargar los alérgenos: ${allergensError.message}`,
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: preferenceRows, error: preferencesError } =
    user && !hasExplicitAllergens && !preferencesOff
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

  const validAllergenIds = new Set((allergens ?? []).map((item) => item.id));
  const preferredAllergenIds = (preferenceRows ?? []).map(
    (item) => item.allergen_id,
  );
  const activeAllergenIds = hasExplicitAllergens
    ? explicitAllergenIds
    : preferencesOff
      ? []
      : preferredAllergenIds;
  const filteredAllergenIds = activeAllergenIds.filter((id) =>
    validAllergenIds.has(id),
  );
  const usingPreferences =
    !hasExplicitAllergens && !preferencesOff && filteredAllergenIds.length > 0;

  // With no text search and no explicit meal-type filter, browsing starts
  // grouped by meal type instead of one long flat, paginated list.
  const showGrouped =
    !query && mealTypes.length === 0 && requestedPage === 1;

  async function fetchAuthorsAndImages(rows: { id: string; imagen_url: string | null }[]) {
    const [{ data: authorRows, error: authorsError }, imageUrls] =
      await Promise.all([
        supabase.rpc("get_public_recipe_authors", {
          p_recipe_ids: rows.map((recipe) => recipe.id),
        }),
        getRecipeImageUrls(
          supabase,
          rows.map((recipe) => recipe.imagen_url),
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
    return { authorsByRecipe, imageUrls, avatarUrls };
  }

  async function loadFavoriteIds(recipeIds: string[]) {
    const favoriteIds = new Set<string>();
    if (!user || recipeIds.length === 0) return favoriteIds;
    const { data: favoriteRows, error: favoritesError } = await supabase
      .from("favoritos")
      .select("receta_id")
      .in("receta_id", recipeIds);
    if (favoritesError) {
      throw new Error(
        `No se pudieron cargar tus favoritas: ${favoritesError.message}`,
      );
    }
    (favoriteRows ?? []).forEach((row) => favoriteIds.add(row.receta_id));
    return favoriteIds;
  }

  if (showGrouped) {
    const groupArgsBase: SearchArgs = { p_limit: groupSize, p_offset: 0 };
    if (maxTime) groupArgsBase.p_max_time = maxTime;
    if (filteredAllergenIds.length > 0) {
      groupArgsBase.p_allergen_ids = filteredAllergenIds;
    }

    const groupResults = await Promise.all(
      MEAL_TYPES.map((mealType) =>
        supabase.rpc("search_public_recipes", {
          ...groupArgsBase,
          p_meal_types: [mealType],
        }),
      ),
    );
    const groupError = groupResults.find((result) => result.error)?.error;
    if (groupError) {
      throw new Error(`No se pudieron cargar las recetas: ${groupError.message}`);
    }

    const allRows = groupResults.flatMap((result) => result.data ?? []);
    const { authorsByRecipe, imageUrls, avatarUrls } =
      await fetchAuthorsAndImages(allRows);
    const favoriteIds = await loadFavoriteIds(allRows.map((row) => row.id));

    const groups = MEAL_TYPES.map((mealType, index) => ({
      mealType,
      recipes: (groupResults[index].data ?? []).map((recipe) => ({
        ...recipe,
        imageUrl: recipe.imagen_url ? imageUrls.get(recipe.imagen_url) ?? null : null,
        author: authorsByRecipe.get(recipe.id) ?? null,
      })),
      total: groupResults[index].data?.[0]?.total_count ?? 0,
    })).filter((group) => group.recipes.length > 0);

    return (
      <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
        <header className="bg-emerald-950 text-white">
          <SiteHeader />
          <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              Cocina con intención
            </p>
            <h1 className="mt-2 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
              Recetas para cada semana
            </h1>
            <p className="mt-4 max-w-2xl text-emerald-100">
              Busca platos aprobados y descarta de forma segura los alérgenos que
              necesites evitar.
            </p>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
          <RecipeFilters
            allergens={allergens ?? []}
            canRestorePreferences={Boolean(user)}
            filteredAllergenIds={filteredAllergenIds}
            maxTime={maxTime}
            mealTypes={mealTypes}
            preferencesOff={preferencesOff}
            query={query}
            usingPreferences={usingPreferences}
            viewAllHref={pageUrl({
              query,
              maxTime,
              allergens: [],
              mealTypes,
              page: 1,
              preferencesOff: true,
            })}
          />

          <div>
            {groups.length > 0 ? (
              <div className="space-y-10">
                {groups.map((group) => (
                  <section aria-labelledby={`group-${group.mealType}`} key={group.mealType}>
                    <div className="mb-4 flex items-end justify-between gap-4">
                      <h2
                        className="text-2xl font-bold text-stone-950"
                        id={`group-${group.mealType}`}
                      >
                        {group.mealType}
                      </h2>
                      {group.total > group.recipes.length && (
                        <Link
                          className="text-sm font-bold text-emerald-700 hover:underline"
                          href={pageUrl({
                            query,
                            maxTime,
                            allergens: usingPreferences ? [] : filteredAllergenIds,
                            mealTypes: [group.mealType],
                            page: 1,
                            preferencesOff,
                          })}
                        >
                          Ver todas ({group.total}) →
                        </Link>
                      )}
                    </div>
                    <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                      {group.recipes.map((recipe) => (
                        <RecipeCard
                          avatarUrls={avatarUrls}
                          isFavorite={favoriteIds.has(recipe.id)}
                          key={recipe.id}
                          loggedIn={Boolean(user)}
                          recipe={recipe}
                        />
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
                <h3 className="text-2xl font-bold text-stone-950">
                  No encontramos recetas
                </h3>
                <p className="mt-2 text-stone-600">
                  Prueba a ampliar el tiempo o quitar algún filtro.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const countArgs: CountArgs = {};
  if (query) countArgs.p_query = query;
  if (maxTime) countArgs.p_max_time = maxTime;
  if (filteredAllergenIds.length > 0) {
    countArgs.p_allergen_ids = filteredAllergenIds;
  }
  if (mealTypes.length > 0) countArgs.p_meal_types = mealTypes;

  const { data: count, error: countError } = await supabase.rpc(
    "count_public_recipes",
    countArgs,
  );
  if (countError) {
    throw new Error(`No se pudieron contar las recetas: ${countError.message}`);
  }

  const totalCount = Number(count ?? 0);
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount > 0 && requestedPage > totalPages) {
    redirect(
      pageUrl({
        query,
        maxTime,
        allergens: usingPreferences ? [] : filteredAllergenIds,
        mealTypes,
        page: totalPages,
        preferencesOff,
      }),
    );
  }
  const currentPage = requestedPage;
  const args: SearchArgs = {
    p_limit: pageSize,
    p_offset: (currentPage - 1) * pageSize,
  };
  if (query) args.p_query = query;
  if (maxTime) args.p_max_time = maxTime;
  if (filteredAllergenIds.length > 0) {
    args.p_allergen_ids = filteredAllergenIds;
  }
  if (mealTypes.length > 0) args.p_meal_types = mealTypes;

  const { data, error } = await supabase.rpc("search_public_recipes", args);
  if (error) throw new Error(`No se pudieron buscar recetas: ${error.message}`);

  const recipeRows = data ?? [];
  const { authorsByRecipe, imageUrls, avatarUrls } =
    await fetchAuthorsAndImages(recipeRows);
  const recipes = recipeRows.map((recipe) => ({
    ...recipe,
    imageUrl: recipe.imagen_url ? imageUrls.get(recipe.imagen_url) ?? null : null,
    author: authorsByRecipe.get(recipe.id) ?? null,
  }));
  const favoriteIds = await loadFavoriteIds(recipeRows.map((recipe) => recipe.id));

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="bg-emerald-950 text-white">
        <SiteHeader />
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Cocina con intención
          </p>
          <h1 className="mt-2 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">
            Recetas para cada semana
          </h1>
          <p className="mt-4 max-w-2xl text-emerald-100">
            Busca platos aprobados y descarta de forma segura los alérgenos que
            necesites evitar.
          </p>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
        <RecipeFilters
          allergens={allergens ?? []}
          canRestorePreferences={Boolean(user)}
          filteredAllergenIds={filteredAllergenIds}
          maxTime={maxTime}
          mealTypes={mealTypes}
          preferencesOff={preferencesOff}
          query={query}
          usingPreferences={usingPreferences}
          viewAllHref={pageUrl({
            query,
            maxTime,
            allergens: [],
            mealTypes,
            page: 1,
            preferencesOff: true,
          })}
        />

        <section aria-labelledby="results-heading">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
                Catálogo público
              </p>
              <h2 className="mt-1 text-2xl font-bold" id="results-heading">
                {totalCount} {totalCount === 1 ? "receta" : "recetas"}
              </h2>
            </div>
            {totalCount > 0 && (
              <p className="text-sm text-stone-500">
                Página {currentPage} de {totalPages}
              </p>
            )}
          </div>

          {recipes.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {recipes.map((recipe) => (
                <RecipeCard
                  avatarUrls={avatarUrls}
                  isFavorite={favoriteIds.has(recipe.id)}
                  key={recipe.id}
                  loggedIn={Boolean(user)}
                  recipe={recipe}
                />
              ))}
            </div>
          ) : (
            <div className="rounded-3xl border border-dashed border-stone-300 bg-white px-6 py-16 text-center">
              <h3 className="text-2xl font-bold text-stone-950">
                No encontramos recetas
              </h3>
              <p className="mt-2 text-stone-600">
                Prueba a ampliar el tiempo o quitar algún filtro.
              </p>
            </div>
          )}

          {totalPages > 1 && (
            <nav
              aria-label="Paginación de recetas"
              className="mt-8 flex items-center justify-center gap-3"
            >
              {currentPage > 1 && (
                <Link
                  className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold hover:bg-stone-50"
                  href={pageUrl({
                    query,
                    maxTime,
                    allergens: usingPreferences ? [] : filteredAllergenIds,
                    mealTypes,
                    page: currentPage - 1,
                    preferencesOff,
                  })}
                >
                  Anterior
                </Link>
              )}
              {currentPage < totalPages && (
                <Link
                  className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white hover:bg-emerald-800"
                  href={pageUrl({
                    query,
                    maxTime,
                    allergens: usingPreferences ? [] : filteredAllergenIds,
                    mealTypes,
                    page: currentPage + 1,
                    preferencesOff,
                  })}
                >
                  Siguiente
                </Link>
              )}
            </nav>
          )}
        </section>
      </div>
    </main>
  );
}
