import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminDeleteRecipeForm } from "@/components/recipes/admin-delete-recipe-form";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

type RecipeAdminPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type SearchAdminArgs =
  Database["public"]["Functions"]["search_admin_recetas"]["Args"];

const pageSize = 10;

type PaginationItem = number | "…";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

function paginationItems(
  currentPage: number,
  totalPages: number,
): PaginationItem[] {
  const items: PaginationItem[] = [];
  const push = (value: PaginationItem) => {
    if (items[items.length - 1] !== value) items.push(value);
  };

  if (totalPages <= 7) {
    for (let page = 1; page <= totalPages; page += 1) push(page);
    return items;
  }

  push(1);
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  if (start > 2) push("…");
  for (let page = start; page <= end; page += 1) push(page);
  if (end < totalPages - 1) push("…");
  push(totalPages);
  return items;
}

function recetasUrl({
  q,
  estado,
  aprobacion,
  page,
}: {
  q: string;
  estado: string;
  aprobacion: string;
  page: number;
}) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (estado) params.set("estado", estado);
  if (aprobacion) params.set("aprobacion", aprobacion);
  if (page > 1) params.set("page", String(page));
  const search = params.toString();
  return search ? `/admin/recetas?${search}` : "/admin/recetas";
}

const selectClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";

export default async function RecipeAdminPage({
  searchParams,
}: RecipeAdminPageProps) {
  const params = await searchParams;
  const query = firstValue(params.q).trim().slice(0, 120);
  const rawEstado = firstValue(params.estado);
  const estado =
    rawEstado === "publicadas" || rawEstado === "borradores"
      ? rawEstado
      : "";
  const rawAprobacion = firstValue(params.aprobacion);
  const aprobacion =
    rawAprobacion === "aprobadas" || rawAprobacion === "pendientes"
      ? rawAprobacion
      : "";
  const parsedPage = Number(firstValue(params.page));
  const requestedPage =
    Number.isInteger(parsedPage) && parsedPage > 0
      ? Math.min(parsedPage, 1_000_000)
      : 1;

  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/dashboard");

  const args: SearchAdminArgs = {
    p_limit: pageSize,
    p_offset: (requestedPage - 1) * pageSize,
  };
  if (query) args.p_query = query;
  if (estado === "publicadas") args.p_publica = true;
  else if (estado === "borradores") args.p_publica = false;
  if (aprobacion === "aprobadas") args.p_aprobada = true;
  else if (aprobacion === "pendientes") args.p_aprobada = false;

  const { data, error } = await supabase.rpc("search_admin_recetas", args);
  if (error) {
    throw new Error(`No se pudieron cargar las recetas: ${error.message}`);
  }

  const rows = data ?? [];
  const totalCount = rows.length > 0 ? Number(rows[0].total_count ?? 0) : 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount > 0 && requestedPage > totalPages) {
    redirect(
      recetasUrl({ q: query, estado, aprobacion, page: totalPages }),
    );
  }
  const currentPage = requestedPage;
  const hasFilters = Boolean(query || estado || aprobacion);

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
            Busca, filtra, edita y elimina cualquier receta de la aplicación.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <form
          className="mb-6 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          role="search"
        >
          <div className="grid items-end gap-4 lg:grid-cols-[1fr_auto_auto_auto]">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-stone-700"
                htmlFor="admin-recipe-query"
              >
                Buscar
              </label>
              <input
                className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                defaultValue={query}
                id="admin-recipe-query"
                maxLength={120}
                name="q"
                placeholder="Título o descripción"
                type="search"
              />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-stone-700"
                htmlFor="admin-recipe-estado"
              >
                Estado
              </label>
              <select
                className={selectClass}
                defaultValue={estado}
                id="admin-recipe-estado"
                name="estado"
              >
                <option value="">Todas</option>
                <option value="publicadas">Publicadas</option>
                <option value="borradores">Borradores</option>
              </select>
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-stone-700"
                htmlFor="admin-recipe-aprobacion"
              >
                Aprobación
              </label>
              <select
                className={selectClass}
                defaultValue={aprobacion}
                id="admin-recipe-aprobacion"
                name="aprobacion"
              >
                <option value="">Todas</option>
                <option value="aprobadas">Aprobadas</option>
                <option value="pendientes">Pendientes</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white transition hover:bg-emerald-800"
                type="submit"
              >
                Filtrar
              </button>
              <Link
                className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-bold text-stone-700 transition hover:bg-stone-100"
                href="/admin/recetas"
              >
                Limpiar
              </Link>
            </div>
          </div>
        </form>

        <div className="mb-4 flex items-end justify-between gap-3">
          <p className="text-sm text-stone-600">
            {totalCount} {totalCount === 1 ? "receta" : "recetas"} encontradas
          </p>
          {totalPages > 1 && (
            <p className="text-sm text-stone-500">
              Página {currentPage} de {totalPages}
            </p>
          )}
        </div>

        {rows.length > 0 ? (
          <div className="space-y-4">
            {rows.map((recipe) => (
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
                    <span
                      className={
                        recipe.aprobada
                          ? "inline-flex rounded-full bg-sky-100 px-2.5 py-1 text-xs font-bold text-sky-800"
                          : "inline-flex rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800"
                      }
                    >
                      {recipe.aprobada ? "Aprobada" : "Pendiente"}
                    </span>
                    <span className="text-xs font-semibold text-stone-500">
                      {recipe.autor_email ?? "Autor desconocido"}
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
                      {new Date(
                        recipe.created_at ?? new Date(),
                      ).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <Link
                    className="rounded-lg border border-emerald-700 px-3 py-2 text-xs font-bold text-emerald-800 hover:bg-emerald-50"
                    href={`/admin/recetas/${recipe.id}/editar`}
                  >
                    Editar
                  </Link>
                  <AdminDeleteRecipeForm id={recipe.id} title={recipe.titulo} />
                </div>
              </article>
            ))}
            {totalPages > 1 && (
              <nav
                aria-label="Paginación de recetas"
                className="flex flex-wrap items-center justify-center gap-2 pt-4"
              >
                {currentPage > 1 && (
                  <Link
                    className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold hover:bg-stone-50"
                    href={recetasUrl({
                      q: query,
                      estado,
                      aprobacion,
                      page: currentPage - 1,
                    })}
                  >
                    Anterior
                  </Link>
                )}
                {paginationItems(currentPage, totalPages).map((item, index) =>
                  item === "…" ? (
                    <span
                      className="px-2 py-2 text-sm text-stone-400"
                      key={`ellipsis-${index}`}
                    >
                      …
                    </span>
                  ) : (
                    <Link
                      aria-current={item === currentPage ? "page" : undefined}
                      className={
                        item === currentPage
                          ? "rounded-lg bg-emerald-700 px-3 py-2 text-sm font-bold text-white"
                          : "rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm font-bold hover:bg-stone-50"
                      }
                      href={recetasUrl({
                        q: query,
                        estado,
                        aprobacion,
                        page: item,
                      })}
                      key={item}
                    >
                      {item}
                    </Link>
                  ),
                )}
                {currentPage < totalPages && (
                  <Link
                    className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-bold text-white"
                    href={recetasUrl({
                      q: query,
                      estado,
                      aprobacion,
                      page: currentPage + 1,
                    })}
                  >
                    Siguiente
                  </Link>
                )}
              </nav>
            )}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-300 bg-white px-6 py-16 text-center">
            {hasFilters ? (
              <>
                <h2 className="text-2xl font-bold text-stone-950">
                  Sin resultados
                </h2>
                <p className="mt-2 text-stone-600">
                  Ninguna receta coincide con la búsqueda o los filtros.
                </p>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-stone-950">
                  Aún no hay recetas
                </h2>
                <p className="mt-2 text-stone-600">
                  Cuando alguien cree una receta, aparecerá aquí.
                </p>
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
