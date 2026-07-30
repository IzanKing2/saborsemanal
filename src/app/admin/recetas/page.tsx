import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { getRecipeImageUrls } from "@/lib/recipe-images";
import { createClient } from "@/lib/supabase/server";

import { ModerationControls } from "./moderation-controls";

type RecipeModerationPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

const pageSize = 25;

export default async function RecipeModerationPage({
  searchParams,
}: RecipeModerationPageProps) {
  const params = await searchParams;
  const pageValue = Array.isArray(params.page) ? params.page[0] : params.page;
  const parsedPage = Number(pageValue);
  const currentPage =
    Number.isInteger(parsedPage) && parsedPage > 0 ? parsedPage : 1;
  const from = (currentPage - 1) * pageSize;
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/dashboard");

  const { data: recipes, error: recipesError, count } = await supabase
    .from("recetas")
    .select(
      "id, titulo, descripcion, instrucciones, imagen_url, tiempo_preparacion, porciones, created_at, profiles(email)",
      { count: "exact" },
    )
    .eq("publica", true)
    .eq("aprobada", false)
    .order("created_at")
    .range(from, from + pageSize - 1);

  if (recipesError) {
    throw new Error(`No se pudieron cargar las recetas: ${recipesError.message}`);
  }

  const recipeIds = (recipes ?? []).map((recipe) => recipe.id);
  const { data: ingredientRows, error: ingredientsError } = recipeIds.length
    ? await supabase
        .from("receta_ingredientes")
        .select(
          "receta_id, cantidad, unidad, nombre_personalizado, ingredientes(nombre)",
        )
        .in("receta_id", recipeIds)
    : { data: [], error: null };

  if (ingredientsError) {
    throw new Error(
      `No se pudieron cargar los ingredientes: ${ingredientsError.message}`,
    );
  }

  const ingredientsByRecipe = new Map<
    string,
    Array<{ name: string; amount: number; unit: string }>
  >();
  for (const row of ingredientRows ?? []) {
    const values = ingredientsByRecipe.get(row.receta_id) ?? [];
    values.push({
      name: row.ingredientes?.nombre ?? row.nombre_personalizado ?? "Ingrediente",
      amount: row.cantidad,
      unit: row.unidad,
    });
    ingredientsByRecipe.set(row.receta_id, values);
  }
  const imageUrls = await getRecipeImageUrls(
    supabase,
    (recipes ?? []).map((recipe) => recipe.imagen_url),
  );
  const totalPages = Math.max(1, Math.ceil((count ?? 0) / pageSize));

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
          <Link
            className="text-sm font-semibold text-emerald-200 hover:text-white"
            href="/admin"
          >
            ← Panel de administración
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Control editorial
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Recetas pendientes
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-100">
            Comprueba contenido, cantidades e instrucciones antes de hacerlo
            visible en el catálogo público.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {(recipes ?? []).length > 0 ? (
          <div className="space-y-5">
            {(recipes ?? []).map((recipe) => {
              const imageUrl = recipe.imagen_url
                ? imageUrls.get(recipe.imagen_url) ?? null
                : null;
              return (
                <article
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                  key={recipe.id}
                >
                  <div className="grid md:grid-cols-[260px_1fr]">
                    <div className="relative min-h-52 bg-stone-100">
                      {imageUrl ? (
                        <Image
                          alt=""
                          className="object-cover"
                          fill
                          sizes="260px"
                          src={imageUrl}
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-stone-400">
                          Sin imagen
                        </div>
                      )}
                    </div>
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wider text-amber-700">
                            {recipe.profiles?.email ?? "Autor desconocido"}
                          </p>
                          <h2 className="mt-1 text-2xl font-bold text-stone-950">
                            {recipe.titulo}
                          </h2>
                          <p className="mt-2 text-sm leading-6 text-stone-600">
                            {recipe.descripcion || "Sin descripción."}
                          </p>
                        </div>
                        <ModerationControls recipeId={recipe.id} />
                      </div>

                      <div className="mt-4 flex gap-4 text-xs font-semibold text-stone-500">
                        <span>{recipe.tiempo_preparacion} min</span>
                        <span>{recipe.porciones} porciones</span>
                      </div>

                      <details className="mt-5 rounded-xl bg-stone-50 p-4">
                        <summary className="cursor-pointer font-bold text-stone-800">
                          Revisar receta completa
                        </summary>
                        <div className="mt-4 grid gap-6 lg:grid-cols-2">
                          <div>
                            <h3 className="text-sm font-bold text-stone-900">
                              Ingredientes
                            </h3>
                            <ul className="mt-2 space-y-1 text-sm text-stone-600">
                              {(ingredientsByRecipe.get(recipe.id) ?? []).map(
                                (ingredient, index) => (
                                  <li key={`${ingredient.name}-${index}`}>
                                    {ingredient.amount} {ingredient.unit} ·{" "}
                                    {ingredient.name}
                                  </li>
                                ),
                              )}
                            </ul>
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-stone-900">
                              Instrucciones
                            </h3>
                            <ol className="mt-2 list-decimal space-y-2 pl-5 text-sm text-stone-600">
                              {recipe.instrucciones.map((instruction, index) => (
                                <li key={`${index}-${instruction}`}>
                                  {instruction}
                                </li>
                              ))}
                            </ol>
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                </article>
              );
            })}
            {totalPages > 1 && (
              <nav
                aria-label="Paginación de recetas pendientes"
                className="flex justify-center gap-3 pt-4"
              >
                {currentPage > 1 && (
                  <Link
                    className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-bold"
                    href={
                      currentPage === 2
                        ? "/admin/recetas"
                        : `/admin/recetas?page=${currentPage - 1}`
                    }
                  >
                    Anterior
                  </Link>
                )}
                {currentPage < totalPages && (
                  <Link
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                    href={`/admin/recetas?page=${currentPage + 1}`}
                  >
                    Siguiente
                  </Link>
                )}
              </nav>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-300 bg-white px-6 py-16 text-center">
            <h2 className="text-2xl font-bold text-stone-950">Todo al día</h2>
            <p className="mt-2 text-stone-600">
              No hay recetas pendientes de revisión.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
