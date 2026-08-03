"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import {
  isUuid,
  isValidVideoUrl,
  RECIPE_UNITS,
  validateRecipe,
  type RecipeIngredientInput,
} from "@/lib/recipes";
import type { Database, Json } from "@/types/database.types";

export type SaveRecipeResult = {
  ok: boolean;
  message: string;
  recipeId?: string;
};

export type DeleteRecipeState = {
  ok: boolean;
  message: string;
};

export type DuplicateRecipeState = {
  ok: boolean;
  message: string;
};

type SaveRecipeArgs = Database["public"]["Functions"]["save_recipe"]["Args"];

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getInteger(formData: FormData, key: string) {
  const value = Number(getText(formData, key));
  return Number.isInteger(value) ? value : Number.NaN;
}

function parseInstructions(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) && parsed.every((item) => typeof item === "string")
      ? parsed.map((item) => item.trim())
      : [];
  } catch {
    return [];
  }
}

function parseIngredients(value: string): RecipeIngredientInput[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];

    const ingredients: RecipeIngredientInput[] = [];
    for (const item of parsed) {
      const candidate = item as Record<string, unknown>;
      if (
        (candidate.ingredienteId !== null &&
          typeof candidate.ingredienteId !== "string") ||
        typeof candidate.nombrePersonalizado !== "string" ||
        typeof candidate.cantidad !== "number" ||
        typeof candidate.unidad !== "string" ||
        !RECIPE_UNITS.includes(
          candidate.unidad as RecipeIngredientInput["unidad"],
        )
      ) {
        return [];
      }

      ingredients.push({
        ingredienteId: candidate.ingredienteId,
        nombrePersonalizado: candidate.nombrePersonalizado,
        cantidad: candidate.cantidad,
        unidad: candidate.unidad as RecipeIngredientInput["unidad"],
      });
    }

    return ingredients;
  } catch {
    return [];
  }
}

export async function saveRecipeAction(
  formData: FormData,
): Promise<SaveRecipeResult> {
  const id = getText(formData, "id");
  const title = getText(formData, "titulo");
  const description = getText(formData, "descripcion");
  const imagePath = getText(formData, "imagen_url");
  const videoUrl = getText(formData, "video_url");
  const instructions = parseInstructions(getText(formData, "instrucciones"));
  const ingredients = parseIngredients(getText(formData, "ingredientes"));
  const preparationTime = getInteger(formData, "tiempo_preparacion");
  const servings = getInteger(formData, "porciones");
  const shouldPublish = getText(formData, "accion") === "publicar";
  const errors = validateRecipe({
    titulo: title,
    descripcion: description,
    instrucciones: instructions,
    ingredientes: ingredients,
    tiempo: preparationTime,
    porciones: servings,
  });

  if (videoUrl && !isValidVideoUrl(videoUrl)) {
    errors.video = "Introduce un enlace HTTPS válido.";
  }

  if (!isUuid(id) || Object.keys(errors).length > 0) {
    return {
      ok: false,
      message: "Revisa los campos marcados antes de guardar la receta.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { ok: false, message: "Tu sesión ha caducado. Inicia sesión de nuevo." };
  }

  if (
    imagePath &&
    (!imagePath.startsWith(`${user.id}/${id}/`) || imagePath.length > 500)
  ) {
    return { ok: false, message: "La ruta de la imagen no es válida." };
  }

  const args: SaveRecipeArgs = {
    p_id: id,
    p_titulo: title,
    p_instrucciones: instructions,
    p_tiempo_preparacion: preparationTime,
    p_porciones: servings,
    p_publica: shouldPublish,
    p_ingredientes: ingredients.map((ingredient) => ({
      ingrediente_id: ingredient.ingredienteId,
      nombre_personalizado:
        ingredient.ingredienteId === null
          ? ingredient.nombrePersonalizado.trim()
          : null,
      cantidad: ingredient.cantidad,
      unidad: ingredient.unidad,
    })) as Json,
  };
  args.p_descripcion = description || null;
  args.p_imagen_url = imagePath || null;
  args.p_video_url = videoUrl || null;

  const { data, error } = await supabase.rpc("save_recipe", args);

  if (error || !data) {
    return {
      ok: false,
      message:
        error?.code === "42501"
          ? "No tienes permisos para guardar esta receta."
          : "No se pudo guardar la receta. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/recetas");
  revalidatePath(`/dashboard/recetas/${data}/editar`);
  revalidatePath("/recetas");

  return {
    ok: true,
    message: shouldPublish ? "Receta publicada." : "Borrador guardado.",
    recipeId: data,
  };
}

export async function duplicateRecipeAction(
  _previousState: DuplicateRecipeState,
  formData: FormData,
): Promise<DuplicateRecipeState> {
  const id = getText(formData, "id");
  if (!isUuid(id)) {
    return { ok: false, message: "La receta no es válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user) {
    return { ok: false, message: "Tu sesión ha caducado. Inicia sesión de nuevo." };
  }

  const { data: recipe, error: recipeError } = await supabase
    .from("recetas")
    .select("titulo, descripcion, instrucciones, tiempo_preparacion, porciones, video_url")
    .eq("id", id)
    .eq("publica", true)
    .eq("aprobada", true)
    .maybeSingle();
  if (recipeError || !recipe) {
    return { ok: false, message: "La receta ya no existe." };
  }

  const { data: ingredientRows, error: ingredientsError } = await supabase
    .from("receta_ingredientes")
    .select("ingrediente_id, nombre_personalizado, cantidad, unidad")
    .eq("receta_id", id);
  if (ingredientsError || !ingredientRows || ingredientRows.length === 0) {
    return { ok: false, message: "No se pudo copiar la receta." };
  }

  const ingredients: RecipeIngredientInput[] = ingredientRows.map((ingredient) => ({
    ingredienteId: ingredient.ingrediente_id,
    nombrePersonalizado: ingredient.nombre_personalizado ?? "",
    cantidad: ingredient.cantidad,
    unidad: ingredient.unidad as RecipeIngredientInput["unidad"],
  }));

  const args: SaveRecipeArgs = {
    p_id: randomUUID(),
    p_titulo: recipe.titulo,
    p_instrucciones: recipe.instrucciones,
    p_tiempo_preparacion: recipe.tiempo_preparacion,
    p_porciones: recipe.porciones,
    p_publica: false,
    p_ingredientes: ingredients.map((ingredient) => ({
      ingrediente_id: ingredient.ingredienteId,
      nombre_personalizado:
        ingredient.ingredienteId === null
          ? ingredient.nombrePersonalizado.trim()
          : null,
      cantidad: ingredient.cantidad,
      unidad: ingredient.unidad,
    })) as Json,
  };
  args.p_descripcion = recipe.descripcion;
  args.p_imagen_url = null;
  args.p_video_url = recipe.video_url;

  const { data: newRecipeId, error } = await supabase.rpc("save_recipe", args);

  if (error || !newRecipeId) {
    return {
      ok: false,
      message: "No se pudo copiar la receta. Inténtalo de nuevo.",
    };
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/recetas");
  revalidatePath("/recetas");
  redirect(`/dashboard/recetas/${newRecipeId}/editar`);
}

export async function deleteRecipeAction(
  _previousState: DeleteRecipeState,
  formData: FormData,
): Promise<DeleteRecipeState> {
  const id = getText(formData, "id");
  if (!isUuid(id)) {
    return { ok: false, message: "La receta no es válida." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Tu sesión ha caducado." };
  }

  const { data: recipe, error: readError } = await supabase
    .from("recetas")
    .select("id, imagen_url")
    .eq("id", id)
    .eq("creador_id", user.id)
    .maybeSingle();
  if (readError || !recipe) {
    return { ok: false, message: "La receta ya no existe o no es tuya." };
  }

  const { data: deletedRecipe, error: deleteError } = await supabase
    .from("recetas")
    .delete()
    .eq("id", id)
    .eq("creador_id", user.id)
    .select("id")
    .maybeSingle();
  if (deleteError || !deletedRecipe) {
    return { ok: false, message: "No se pudo eliminar la receta." };
  }

  if (recipe.imagen_url) {
    const { error: storageError } = await supabase.storage
      .from("recipe-images")
      .remove([recipe.imagen_url]);
    if (storageError) {
      console.error("Failed to remove image for deleted recipe", {
        recipeId: id,
        path: recipe.imagen_url,
      });
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/recetas");
  revalidatePath("/recetas");
  return { ok: true, message: "Receta eliminada." };
}
