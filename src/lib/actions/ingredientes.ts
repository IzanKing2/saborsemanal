"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database.types";

export type CatalogActionState = {
  ok: boolean;
  message: string;
};

type SupabaseClient = Awaited<ReturnType<typeof createClient>>;
type SaveIngredientArgs =
  Database["public"]["Functions"]["save_ingredient"]["Args"];

class CatalogDatabaseError extends Error {
  constructor(
    readonly code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function getAdminClient(): Promise<SupabaseClient> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error("Debes iniciar sesión de nuevo.");
  }

  const { data: isAdmin, error: adminError } = await supabase.rpc("is_admin");

  if (adminError || !isAdmin) {
    throw new Error("No tienes permisos para administrar el catálogo.");
  }

  return supabase;
}

function getText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function validateName(name: string, label: string) {
  if (name.length < 2 || name.length > 100) {
    throw new Error(`${label} debe tener entre 2 y 100 caracteres.`);
  }
}

function validateId(id: string, label: string) {
  if (!uuidPattern.test(id)) {
    throw new Error(`${label} no es válido.`);
  }
}

function actionError(error: unknown): CatalogActionState {
  if (error instanceof CatalogDatabaseError) {
    const messages: Record<string, string> = {
      "23503": "El registro está vinculado a datos que ya no existen.",
      "23505": "Ya existe un registro con ese nombre.",
      "23514": "No puedes eliminar un ingrediente que se usa en recetas.",
      "42501": "No tienes permisos para completar esta operación.",
      P0002: "El registro ya no existe.",
    };

    return {
      ok: false,
      message:
        (error.code && messages[error.code]) ??
        "No se pudo completar la operación.",
    };
  }

  if (error instanceof Error) {
    return { ok: false, message: error.message };
  }

  return { ok: false, message: "No se pudo completar la operación." };
}

function throwIfError(error: { code?: string; message: string } | null) {
  if (error) {
    throw new CatalogDatabaseError(error.code, error.message);
  }
}

function refreshCatalog() {
  revalidatePath("/admin");
  revalidatePath("/admin/ingredientes");
}

export async function createCategoryAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const name = getText(formData, "nombre");
    validateName(name, "El nombre de la categoría");
    const supabase = await getAdminClient();
    const { error } = await supabase
      .from("categorias_ingredientes")
      .insert({ nombre: name });
    throwIfError(error);
    refreshCatalog();
    return { ok: true, message: "Categoría creada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateCategoryAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const id = getText(formData, "id");
    const name = getText(formData, "nombre");
    validateId(id, "La categoría");
    validateName(name, "El nombre de la categoría");
    const supabase = await getAdminClient();
    const { data, error } = await supabase
      .from("categorias_ingredientes")
      .update({ nombre: name })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new Error("La categoría ya no existe.");
    refreshCatalog();
    return { ok: true, message: "Categoría actualizada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteCategoryAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const id = getText(formData, "id");
    validateId(id, "La categoría");
    const supabase = await getAdminClient();
    const { data, error } = await supabase
      .from("categorias_ingredientes")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new Error("La categoría ya no existe.");
    refreshCatalog();
    return { ok: true, message: "Categoría eliminada." };
  } catch (error) {
    return actionError(error);
  }
}

export async function createAllergenAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const name = getText(formData, "nombre");
    validateName(name, "El nombre del alérgeno");
    const supabase = await getAdminClient();
    const { error } = await supabase.from("alergenos").insert({ nombre: name });
    throwIfError(error);
    refreshCatalog();
    return { ok: true, message: "Alérgeno creado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function updateAllergenAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const id = getText(formData, "id");
    const name = getText(formData, "nombre");
    validateId(id, "El alérgeno");
    validateName(name, "El nombre del alérgeno");
    const supabase = await getAdminClient();
    const { data, error } = await supabase
      .from("alergenos")
      .update({ nombre: name })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new Error("El alérgeno ya no existe.");
    refreshCatalog();
    return { ok: true, message: "Alérgeno actualizado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteAllergenAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const id = getText(formData, "id");
    validateId(id, "El alérgeno");
    const supabase = await getAdminClient();
    const { data, error } = await supabase
      .from("alergenos")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    throwIfError(error);
    if (!data) throw new Error("El alérgeno ya no existe.");
    refreshCatalog();
    return { ok: true, message: "Alérgeno eliminado." };
  } catch (error) {
    return actionError(error);
  }
}

export async function saveIngredientAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const id = getText(formData, "id");
    const name = getText(formData, "nombre");
    const categoryId = getText(formData, "categoria_id");
    const allergenIds = [
      ...new Set(
        formData
          .getAll("alergenos")
          .filter((value): value is string => typeof value === "string"),
      ),
    ];

    validateName(name, "El nombre del ingrediente");
    if (id) validateId(id, "El ingrediente");
    if (categoryId) validateId(categoryId, "La categoría");
    allergenIds.forEach((allergenId) =>
      validateId(allergenId, "Un alérgeno"),
    );

    const args: SaveIngredientArgs = {
      p_nombre: name,
      p_alergeno_ids: allergenIds,
    };
    if (id) args.p_id = id;
    if (categoryId) args.p_categoria_id = categoryId;

    const supabase = await getAdminClient();
    const { error } = await supabase.rpc("save_ingredient", args);
    throwIfError(error);
    refreshCatalog();
    return {
      ok: true,
      message: id ? "Ingrediente actualizado." : "Ingrediente creado.",
    };
  } catch (error) {
    return actionError(error);
  }
}

export async function deleteIngredientAction(
  _previousState: CatalogActionState,
  formData: FormData,
): Promise<CatalogActionState> {
  try {
    const id = getText(formData, "id");
    validateId(id, "El ingrediente");
    const supabase = await getAdminClient();
    const { error } = await supabase.rpc("delete_ingredient", { p_id: id });
    throwIfError(error);
    refreshCatalog();
    return { ok: true, message: "Ingrediente eliminado." };
  } catch (error) {
    return actionError(error);
  }
}
