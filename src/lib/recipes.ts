export const RECIPE_UNITS = [
  "g",
  "kg",
  "ml",
  "l",
  "unidad",
  "cucharadita",
  "cucharada",
  "taza",
  "pizca",
] as const;

export type RecipeUnit = (typeof RECIPE_UNITS)[number];

export const MEAL_TYPES = ["Desayuno", "Almuerzo", "Cena", "Otro"] as const;

export type MealType = (typeof MEAL_TYPES)[number];

export function isMealType(value: string): value is MealType {
  return (MEAL_TYPES as readonly string[]).includes(value);
}

export type RecipeIngredientInput = {
  ingredienteId: string | null;
  nombrePersonalizado: string;
  cantidad: number;
  unidad: RecipeUnit;
};

export type IngredientOption = {
  id: string;
  nombre: string;
  categoriaNombre: string | null;
};

/**
 * The form asks the user for a single ingredient name and works out on its own
 * whether that name belongs to the master catalog or is free text, so nobody
 * has to learn how the ingredients are stored.
 */
export function findIngredientOption(
  text: string,
  options: IngredientOption[],
): IngredientOption | null {
  const needle = text.trim().toLocaleLowerCase("es");
  if (!needle) return null;
  return (
    options.find(
      (option) => option.nombre.toLocaleLowerCase("es") === needle,
    ) ?? null
  );
}

export function toIngredientInput(
  text: string,
  cantidad: string,
  unidad: RecipeUnit,
  options: IngredientOption[],
): RecipeIngredientInput {
  const match = findIngredientOption(text, options);
  return {
    ingredienteId: match?.id ?? null,
    nombrePersonalizado: match ? "" : text.trim(),
    cantidad: Number(cantidad),
    unidad,
  };
}

export type RecipeFormErrors = {
  titulo?: string;
  descripcion?: string;
  instrucciones?: string;
  ingredientes?: string;
  tiempo?: string;
  porciones?: string;
  imagen?: string;
  video?: string;
};

type RecipeValidationInput = {
  titulo: string;
  descripcion: string;
  instrucciones: string[];
  ingredientes: RecipeIngredientInput[];
  tiempo: number;
  porciones: number;
};

const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string) {
  return uuidPattern.test(value);
}

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
]);

export function extractYouTubeVideoId(value: string): string | null {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!YOUTUBE_HOSTS.has(host)) return null;

    let videoId = "";
    if (host === "youtu.be") {
      videoId = url.pathname.slice(1).split("/")[0] ?? "";
    } else {
      videoId =
        url.searchParams.get("v") ??
        (url.pathname.startsWith("/shorts/")
          ? url.pathname.split("/")[2] ?? ""
          : "");
    }

    return /^[A-Za-z0-9_-]{6,20}$/.test(videoId) ? videoId : null;
  } catch {
    return null;
  }
}

export function isValidVideoUrl(value: string) {
  if (!value || value.length > 500) return false;
  try {
    return (
      new URL(value).protocol === "https:" && extractYouTubeVideoId(value) !== null
    );
  } catch {
    return false;
  }
}

export function validateRecipe(input: RecipeValidationInput): RecipeFormErrors {
  const errors: RecipeFormErrors = {};
  const titleLength = input.titulo.trim().length;

  if (titleLength < 3 || titleLength > 120) {
    errors.titulo = "El título debe tener entre 3 y 120 caracteres.";
  }

  if (input.descripcion.trim().length > 1000) {
    errors.descripcion = "La descripción no puede superar 1000 caracteres.";
  }

  if (
    input.instrucciones.length === 0 ||
    input.instrucciones.length > 30 ||
    input.instrucciones.some(
      (instruction) =>
        instruction.trim().length < 2 || instruction.trim().length > 1000,
    )
  ) {
    errors.instrucciones =
      "Añade entre 1 y 30 pasos, cada uno con entre 2 y 1000 caracteres.";
  }

  const masterIngredientIds = input.ingredientes
    .map((ingredient) => ingredient.ingredienteId)
    .filter((id): id is string => id !== null);
  const customIngredientNames = input.ingredientes
    .filter((ingredient) => ingredient.ingredienteId === null)
    .map((ingredient) =>
      ingredient.nombrePersonalizado.trim().toLocaleLowerCase("es"),
    );
  if (
    input.ingredientes.length === 0 ||
    input.ingredientes.length > 50 ||
    input.ingredientes.some(
      (ingredient) =>
        (ingredient.ingredienteId !== null
          ? !isUuid(ingredient.ingredienteId) ||
            ingredient.nombrePersonalizado.trim().length > 0
          : ingredient.nombrePersonalizado.trim().length < 2 ||
            ingredient.nombrePersonalizado.trim().length > 100) ||
        !Number.isFinite(ingredient.cantidad) ||
        ingredient.cantidad <= 0 ||
        !RECIPE_UNITS.includes(ingredient.unidad),
    ) ||
    new Set(masterIngredientIds).size !== masterIngredientIds.length ||
    new Set(customIngredientNames).size !== customIngredientNames.length
  ) {
    errors.ingredientes =
      "Añade entre 1 y 50 ingredientes válidos, sin duplicados y con cantidad positiva.";
  }

  if (!Number.isInteger(input.tiempo) || input.tiempo < 1 || input.tiempo > 1440) {
    errors.tiempo = "El tiempo debe estar entre 1 y 1440 minutos.";
  }

  if (
    !Number.isInteger(input.porciones) ||
    input.porciones < 1 ||
    input.porciones > 100
  ) {
    errors.porciones = "Las porciones deben estar entre 1 y 100.";
  }

  return errors;
}

export type RecipeRequirement = {
  key: "titulo" | "ingredientes" | "instrucciones" | "medidas";
  label: string;
  done: boolean;
};

/**
 * What still has to be filled in before a recipe can be published, derived from
 * `validateRecipe` so the progress hint and the blocking errors can never
 * disagree.
 */
export function getRecipeRequirements(
  input: RecipeValidationInput,
): RecipeRequirement[] {
  const errors = validateRecipe(input);
  return [
    { key: "titulo", label: "Título", done: !errors.titulo },
    { key: "ingredientes", label: "Ingredientes", done: !errors.ingredientes },
    { key: "instrucciones", label: "Preparación", done: !errors.instrucciones },
    {
      key: "medidas",
      label: "Tiempo y porciones",
      done: !errors.tiempo && !errors.porciones,
    },
  ];
}
