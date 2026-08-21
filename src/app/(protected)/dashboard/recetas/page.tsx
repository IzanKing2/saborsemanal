import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AddToMenuButton } from "@/components/recipes/add-to-menu-button";
import { DeleteRecipeForm } from "@/components/recipes/delete-recipe-form";
import { SharedWithGroupBadge } from "@/components/account/shared-with-group-badge";
import { getRecipeImageUrls } from "@/lib/recipe-images";
import { createClient } from "@/lib/supabase/server";

function recipeStatus(publica: boolean) {
  if (!publica) return { label: "Borrador", className: "bg-stone-200 text-stone-700" };
  return { label: "Publicada", className: "bg-emerald-100 text-emerald-800" };
}

export default async function RecipesDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: miembros } = await supabase.rpc("list_group_members");

  const { data, error } = await supabase
    .from("recetas")
    .select(
      "id, titulo, descripcion, imagen_url, publica, tiempo_preparacion, porciones, updated_at",
    )
    .eq("creador_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) throw new Error(`No se pudieron cargar tus recetas: ${error.message}`);

  const recipeRows = data ?? [];
  const imageUrls = await getRecipeImageUrls(
    supabase,
    recipeRows.map((recipe) => recipe.imagen_url),
  );
  const recipes = recipeRows.map((recipe) => ({
    ...recipe,
    imageUrl: recipe.imagen_url ? imageUrls.get(recipe.imagen_url) ?? null : null,
  }));

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="border-b border-emerald-900/10 bg-emerald-950 text-white">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 py-9 sm:px-6 md:flex-row md:items-end lg:px-8">
          <div>
            <Link
              className="text-sm font-semibold text-emerald-200 hover:text-white"
              href="/dashboard"
            >
              ← Dashboard
            </Link>
            <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
              Tu recetario
            </p>
            <h1 className="mt-2 text-4xl font-black tracking-tight">
              Mis recetas
            </h1>
            <div>
              <SharedWithGroupBadge memberCount={(miembros ?? []).length} />
            </div>
          </div>
          <Link
            className="rounded-xl bg-amber-300 px-5 py-3 text-center text-sm font-bold text-emerald-950 transition hover:bg-amber-200"
            href="/dashboard/recetas/nueva"
          >
            Crear receta
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {recipes.length > 0 ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {recipes.map((recipe) => {
              const status = recipeStatus(recipe.publica);
              return (
                <article
                  className="overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm"
                  key={recipe.id}
                >
                  <div className="relative aspect-[16/10] bg-stone-100">
                    {recipe.imageUrl ? (
                      <Image
                        alt=""
                        className="object-cover"
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        src={recipe.imageUrl}
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-stone-400">
                        Sin imagen
                      </div>
                    )}
                  </div>
                  <div className="p-5">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                    <h2 className="mt-3 text-xl font-bold text-stone-950">
                      {recipe.titulo}
                    </h2>
                    <p className="mt-2 line-clamp-2 min-h-10 text-sm leading-5 text-stone-600">
                      {recipe.descripcion || "Sin descripción."}
                    </p>
                    <div className="mt-4 flex gap-4 text-xs font-medium text-stone-500">
                      <span>{recipe.tiempo_preparacion} min</span>
                      <span>{recipe.porciones} porciones</span>
                    </div>
                    <div className="mt-4">
                      <AddToMenuButton
                        recipeId={recipe.id}
                        recipeTitle={recipe.titulo}
                      />
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <Link
                        className="text-sm font-bold text-emerald-700 hover:underline"
                        href={`/dashboard/recetas/${recipe.id}/editar`}
                      >
                        Editar receta
                      </Link>
                      <DeleteRecipeForm id={recipe.id} title={recipe.titulo} />
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="rounded-3xl border border-dashed border-emerald-300 bg-white px-6 py-16 text-center">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              Tu recetario está vacío
            </p>
            <h2 className="mt-3 text-2xl font-bold text-stone-950">
              Empieza por tu plato favorito
            </h2>
            <p className="mx-auto mt-2 max-w-md text-stone-600">
              Añade los pasos y selecciona ingredientes de la lista maestra.
            </p>
            <Link
              className="mt-6 inline-block rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800"
              href="/dashboard/recetas/nueva"
            >
              Crear mi primera receta
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
