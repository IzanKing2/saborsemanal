import { readFile } from "node:fs/promises";

import { createClient } from "@supabase/supabase-js";

const ALLOWED_UNITS = new Set([
  "g",
  "kg",
  "ml",
  "l",
  "unidad",
  "cucharadita",
  "cucharada",
  "taza",
  "pizca",
]);

const normalize = (value) =>
  typeof value === "string" ? value.trim().toLowerCase() : "";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY. " +
      "Ejecuta con: node --env-file=.env.local scripts/seed-recetas.mjs",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

function fail(message, error) {
  console.error(message);
  if (error) console.error(error.message ?? error);
  process.exit(1);
}

const dataset = JSON.parse(
  await readFile(new URL("../seed-data/recetas.json", import.meta.url), "utf8"),
);

async function indexByColumn(table, column) {
  const { data, error } = await supabase.from(table).select(`id, ${column}`);
  if (error) fail(`No se pudo leer ${table}:`, error);
  return new Map(data.map((row) => [normalize(row[column]), row.id]));
}

async function countRows(table) {
  const { count, error } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true });
  if (error) fail(`No se pudo contar ${table}:`, error);
  return count;
}

console.log("Sembrando categorías...");
const categoryIdByName = await indexByColumn(
  "categorias_ingredientes",
  "nombre",
);
let createdCategories = 0;
for (const category of dataset.categorias) {
  const name = category.nombre.trim();
  if (categoryIdByName.has(normalize(name))) continue;

  const { data, error } = await supabase
    .from("categorias_ingredientes")
    .insert({ nombre: name })
    .select("id")
    .single();
  if (error) fail(`No se pudo crear la categoría "${name}":`, error);

  categoryIdByName.set(normalize(name), data.id);
  createdCategories += 1;
}
console.log(`  Categorías creadas: ${createdCategories}`);

const allergenIdByName = await indexByColumn("alergenos", "nombre");
const usedAllergens = new Set(
  dataset.ingredientes.flatMap((item) => item.alergenos ?? []),
);
for (const name of usedAllergens) {
  if (!allergenIdByName.has(normalize(name))) {
    fail(`El alérgeno "${name}" no existe en la base de datos.`);
  }
}

console.log("Sembrando ingredientes...");
const ingredientIdByName = await indexByColumn("ingredientes", "nombre");
let createdIngredients = 0;
for (const item of dataset.ingredientes) {
  const name = item.nombre.trim();
  const categoryId = categoryIdByName.get(normalize(item.categoria ?? "")) ?? null;
  let id = ingredientIdByName.get(normalize(name));

  if (!id) {
    const { data, error } = await supabase
      .from("ingredientes")
      .insert({ nombre: name, categoria_id: categoryId })
      .select("id")
      .single();
    if (error) fail(`No se pudo crear el ingrediente "${name}":`, error);

    id = data.id;
    ingredientIdByName.set(normalize(name), id);
    createdIngredients += 1;
  }

  const { error: deleteLinksError } = await supabase
    .from("ingrediente_alergenos")
    .delete()
    .eq("ingrediente_id", id);
  if (deleteLinksError) {
    fail(`No se pudieron actualizar los alérgenos de "${name}":`, deleteLinksError);
  }

  const allergenIds = (item.alergenos ?? []).map(
    (allergen) => allergenIdByName.get(normalize(allergen)),
  );
  if (allergenIds.length > 0) {
    const { error: linkError } = await supabase
      .from("ingrediente_alergenos")
      .insert(
        allergenIds.map((alergenoId) => ({
          ingrediente_id: id,
          alergeno_id: alergenoId,
        })),
      );
    if (linkError) fail(`No se pudieron enlazar los alérgenos de "${name}":`, linkError);
  }
}
console.log(`  Ingredientes creados: ${createdIngredients}`);

console.log("Sembrando recetas...");
const { data: anonymousRecipes, error: recipesError } = await supabase
  .from("recetas")
  .select("id, titulo")
  .is("creador_id", null);
if (recipesError) fail("No se pudo leer el catálogo de recetas:", recipesError);
const anonymousByTitle = new Map(
  anonymousRecipes.map((recipe) => [normalize(recipe.titulo), recipe.id]),
);

let createdRecipes = 0;
for (const recipe of dataset.recetas) {
  const title = recipe.titulo.trim();

  const existingId = anonymousByTitle.get(normalize(title));
  if (existingId) {
    const { error: deleteError } = await supabase
      .from("recetas")
      .delete()
      .eq("id", existingId);
    if (deleteError) fail(`No se pudo reemplazar la receta "${title}":`, deleteError);
  }

  const ingredients = recipe.ingredientes.map((ingredient) => {
    const name = ingredient.ingrediente.trim();
    const ingredientId = ingredientIdByName.get(normalize(name));
    if (!ingredientId) {
      fail(`Ingrediente "${name}" no encontrado en la receta "${title}".`);
    }

    const unidad = ingredient.unidad.trim().toLowerCase();
    if (!ALLOWED_UNITS.has(unidad)) {
      fail(`Unidad inválida "${unidad}" en la receta "${title}".`);
    }

    return { ingrediente_id: ingredientId, cantidad: ingredient.cantidad, unidad };
  });

  const { data: insertedRecipe, error: insertError } = await supabase
    .from("recetas")
    .insert({
      titulo: title,
      descripcion: recipe.descripcion || null,
      instrucciones: recipe.instrucciones.map((step) => step.trim()),
      creador_id: null,
      publica: true,
      aprobada: true,
      tiempo_preparacion: recipe.tiempo_preparacion,
      porciones: recipe.porciones,
    })
    .select("id")
    .single();
  if (insertError) fail(`No se pudo crear la receta "${title}":`, insertError);

  const { error: ingredientsError } = await supabase
    .from("receta_ingredientes")
    .insert(
      ingredients.map((ingredient) => ({
        receta_id: insertedRecipe.id,
        ...ingredient,
      })),
    );
  if (ingredientsError) {
    fail(`No se pudieron añadir ingredientes a "${title}":`, ingredientsError);
  }

  createdRecipes += 1;
}
console.log(`  Recetas creadas o actualizadas: ${createdRecipes}`);

console.log("Resumen:");
for (const table of [
  "categorias_ingredientes",
  "ingredientes",
  "recetas",
  "receta_ingredientes",
]) {
  console.log(`  ${table}: ${await countRows(table)}`);
}
console.log("Seed completado.");
