import Link from "next/link";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { CatalogManager } from "./catalog-manager";

export default async function IngredientsAdminPage() {
  const supabase = await createClient();
  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) redirect("/dashboard");

  const [categoriesResult, allergensResult, ingredientsResult] =
    await Promise.all([
      supabase
        .from("categorias_ingredientes")
        .select("id, nombre")
        .order("nombre"),
      supabase.from("alergenos").select("id, nombre").order("nombre"),
      supabase
        .from("ingredientes")
        .select(
          "id, nombre, categoria_id, ingrediente_alergenos(alergeno_id)",
        )
        .order("nombre"),
    ]);

  const queryError =
    categoriesResult.error ??
    allergensResult.error ??
    ingredientsResult.error;

  if (queryError) {
    throw new Error(`No se pudo cargar el catálogo: ${queryError.message}`);
  }

  const categories = categoriesResult.data ?? [];
  const allergens = allergensResult.data ?? [];
  const ingredientRows = ingredientsResult.data ?? [];

  const categoryUsage = new Map<string, number>();
  const allergenUsage = new Map<string, number>();
  for (const ingredient of ingredientRows) {
    if (ingredient.categoria_id) {
      categoryUsage.set(
        ingredient.categoria_id,
        (categoryUsage.get(ingredient.categoria_id) ?? 0) + 1,
      );
    }
    for (const link of ingredient.ingrediente_alergenos) {
      allergenUsage.set(
        link.alergeno_id,
        (allergenUsage.get(link.alergeno_id) ?? 0) + 1,
      );
    }
  }

  const categoriesWithUsage = categories.map((category) => ({
    ...category,
    usageCount: categoryUsage.get(category.id) ?? 0,
  }));
  const allergensWithUsage = allergens.map((allergen) => ({
    ...allergen,
    usageCount: allergenUsage.get(allergen.id) ?? 0,
  }));

  const ingredients = ingredientRows.map((ingredient) => ({
    id: ingredient.id,
    nombre: ingredient.nombre,
    categoriaId: ingredient.categoria_id,
    alergenoIds: ingredient.ingrediente_alergenos.map(
      (link) => link.alergeno_id,
    ),
  }));

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="border-b border-emerald-900/10 bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            className="text-sm font-semibold text-emerald-200 hover:text-white"
            href="/admin"
          >
            ← Panel de administración
          </Link>
          <div className="mt-5 flex flex-col justify-between gap-4 md:flex-row md:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
                Catálogo global
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
                Ingredientes y alérgenos
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-emerald-100 sm:text-base">
                Mantén una lista consistente para las recetas, los filtros y la
                futura lista de la compra.
              </p>
            </div>
            <div className="flex gap-3 text-center">
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <strong className="block text-2xl">
                  {ingredients.length}
                </strong>
                <span className="text-xs text-emerald-100">ingredientes</span>
              </div>
              <div className="rounded-xl bg-white/10 px-4 py-3">
                <strong className="block text-2xl">
                  {allergens.length}
                </strong>
                <span className="text-xs text-emerald-100">alérgenos</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <CatalogManager
          allergens={allergensWithUsage}
          categories={categoriesWithUsage}
          ingredients={ingredients}
        />
      </div>
    </main>
  );
}
