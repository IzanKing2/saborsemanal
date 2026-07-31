import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDeleteRecipeForm } from "@/components/recipes/admin-delete-recipe-form";
import { createClient } from "@/lib/supabase/server";

type RecipeAdminPageProps = {
  searchParams: Promise<{ page?: string | string[] }>;
};

const pageSize = 25;

export default async function RecipeAdminPage({
  searchParams,
}: RecipeAdminPageProps) {
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
      "id, titulo, descripcion, publica, tiempo_preparacion, porciones, created_at, autor:profiles!recetas_creador_id_fkey(email)",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (recipesError) {
    throw new Error(`No se pudieron cargar las recetas: ${recipesError.message}`);
  }

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
            Todas las recetas
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Recetario global
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-100">
            Consulta y elimina cualquier receta de la aplicación.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {(recipes ?? []).length > 0 ? (
          <div className="space-y-4">
            {(recipes ?? []).map((recipe) => (
              <article
                className="flex flex-col justify-between gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:flex-row sm:items-center"
                key={recipe.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={
                        recipe.publica
                          ? "inline-flex rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800"
                          : "inline-flex rounded-full bg-stone-200 px-2.5 py-1 text-xs font-bold text-stone-700"
                      }
                    >
                      {recipe.publica ? "Publicada" : "Borrador"}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      {recipe.autor?.email ?? "Autor desconocido"}
                    </span>
                  </div>
                  <h2 className="mt-2 truncate text-lg font-bold text-stone-950">
                    {recipe.titulo}
                  </h2>
                  <p className="mt-1 line-clamp-1 text-sm text-stone-600">
                    {recipe.descripcion || "Sin descripción."}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-4 text-xs font-medium text-stone-500">
                    <span>{recipe.tiempo_preparacion} min</span>
                    <span>{recipe.porciones} porciones</span>
                    <span>
                      {new Date(recipe.created_at ?? new Date()).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <AdminDeleteRecipeForm id={recipe.id} title={recipe.titulo} />
              </article>
            ))}
            {totalPages > 1 && (
              <nav
                aria-label="Paginación de recetas"
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
            <h2 className="text-2xl font-bold text-stone-950">
              Aún no hay recetas
            </h2>
            <p className="mt-2 text-stone-600">
              Cuando alguien cree una receta, aparecerá aquí.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
