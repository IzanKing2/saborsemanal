import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  RecipeForm,
  type IngredientOption,
  type RecipeFormValue,
} from "@/components/recipes/recipe-form";
import { getRecipeImageUrl } from "@/lib/recipe-images";
import { RECIPE_UNITS, type RecipeUnit } from "@/lib/recipes";
import { createClient } from "@/lib/supabase/server";

type EditRecipePageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditRecipePage({ params }: EditRecipePageProps) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [recipeResult, recipeIngredientsResult, optionsResult] =
    await Promise.all([
      supabase
        .from("recetas")
        .select(
          "id, titulo, descripcion, instrucciones, imagen_url, video_url, tipo_comida, tiempo_preparacion, porciones",
        )
        .eq("id", id)
        .eq("creador_id", user.id)
        .maybeSingle(),
      supabase
        .from("receta_ingredientes")
        .select("ingrediente_id, nombre_personalizado, cantidad, unidad")
        .eq("receta_id", id),
      supabase
        .from("ingredientes")
        .select("id, nombre, categorias_ingredientes(nombre)")
        .order("nombre"),
    ]);

  const queryError =
    recipeResult.error ?? recipeIngredientsResult.error ?? optionsResult.error;
  if (queryError) {
    throw new Error(`No se pudo cargar la receta: ${queryError.message}`);
  }
  if (!recipeResult.data) notFound();

  const recipe = recipeResult.data;
  const ingredientOptions: IngredientOption[] = (optionsResult.data ?? []).map(
    (ingredient) => ({
      id: ingredient.id,
      nombre: ingredient.nombre,
      categoriaNombre: ingredient.categorias_ingredientes?.nombre ?? null,
    }),
  );
  const imageUrl = await getRecipeImageUrl(supabase, recipe.imagen_url);
  const initialRecipe: RecipeFormValue = {
    id: recipe.id,
    titulo: recipe.titulo,
    descripcion: recipe.descripcion ?? "",
    instrucciones: recipe.instrucciones,
    imagenPath: recipe.imagen_url,
    imagenUrl: imageUrl,
    videoUrl: recipe.video_url,
    tipoComida: recipe.tipo_comida,
    tiempoPreparacion: recipe.tiempo_preparacion,
    porciones: recipe.porciones,
    ingredientes: (recipeIngredientsResult.data ?? []).map((ingredient) => ({
      ingredienteId: ingredient.ingrediente_id,
      nombrePersonalizado: ingredient.nombre_personalizado ?? "",
      cantidad: ingredient.cantidad,
      unidad: RECIPE_UNITS.includes(ingredient.unidad as RecipeUnit)
        ? (ingredient.unidad as RecipeUnit)
        : "unidad",
    })),
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
            Edición
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">
            {recipe.titulo}
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-100">
            Puedes guardar cambios como borrador o volver a publicar la receta.
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
