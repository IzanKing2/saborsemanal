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

export type RecipeIngredientInput = {
  ingredienteId: string | null;
  nombrePersonalizado: string;
  cantidad: number;
  unidad: RecipeUnit;
};

export type RecipeFormErrors = {
  titulo?: string;
  descripcion?: string;
  instrucciones?: string;
  ingredientes?: string;
  tiempo?: string;
  porciones?: string;
  imagen?: string;
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
