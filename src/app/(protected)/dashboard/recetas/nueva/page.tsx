import Link from "next/link";
import { redirect } from "next/navigation";

import {
  RecipeForm,
  type IngredientOption,
  type RecipeFormValue,
} from "@/components/recipes/recipe-form";
import { createClient } from "@/lib/supabase/server";

export default async function NewRecipePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("ingredientes")
    .select("id, nombre, categorias_ingredientes(nombre)")
    .order("nombre");

  if (error) {
    throw new Error(`No se pudo cargar la lista de ingredientes: ${error.message}`);
  }

  const ingredientOptions: IngredientOption[] = (data ?? []).map(
    (ingredient) => ({
      id: ingredient.id,
      nombre: ingredient.nombre,
      categoriaNombre: ingredient.categorias_ingredientes?.nombre ?? null,
    }),
  );
  const initialRecipe: RecipeFormValue = {
    id: crypto.randomUUID(),
    titulo: "",
    descripcion: "",
    instrucciones: [""],
    imagenPath: null,
    imagenUrl: null,
    videoUrl: null,
    tiempoPreparacion: 30,
    porciones: 2,
    ingredientes: [
      {
        ingredienteId: ingredientOptions.length > 0 ? "" : null,
        nombrePersonalizado: "",
        cantidad: 1,
        unidad: "unidad",
      },
    ],
  };

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="border-b border-emerald-900/10 bg-emerald-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          <Link
            className="text-sm font-semibold text-emerald-200 hover:text-white"
            href="/dashboard/recetas"
          >
            ← Mis recetas
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Nueva creación
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            Construye tu receta
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-100">
            Puedes guardarla como borrador o enviarla a revisión cuando esté
            lista.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <RecipeForm
          ingredientOptions={ingredientOptions}
          initialRecipe={initialRecipe}
        />
      </div>
    </main>
  );
}
