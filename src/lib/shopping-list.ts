export type ShoppingRecipeIngredient = {
  ingredienteId: string | null;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
};

export type ShoppingListItem = {
  id: string;
  nombre: string;
  categoria: string;
  cantidad: number;
  unidad: string;
  comprado: boolean;
};

type ShoppingRecipe = {
  id: string;
  ingredientes?: ShoppingRecipeIngredient[];
};

export function consolidateShoppingList(
  slots: Record<string, string>,
  recipes: ShoppingRecipe[],
  poolRecipeIds: string[] = [],
): ShoppingListItem[] {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const consolidated = new Map<string, ShoppingListItem>();

  for (const recipeId of [...Object.values(slots), ...poolRecipeIds]) {
    const recipe = recipesById.get(recipeId);
    for (const ingredient of recipe?.ingredientes ?? []) {
      const normalizedName = ingredient.nombre.trim().toLocaleLowerCase("es");
      const sourceKey = ingredient.ingredienteId
        ? `master:${ingredient.ingredienteId}`
        : `custom:${normalizedName}`;
      const id = `${sourceKey}:${ingredient.unidad}`;
      const current = consolidated.get(id);

      if (current) current.cantidad += ingredient.cantidad;
      else {
        consolidated.set(id, {
          id,
          nombre: ingredient.nombre.trim(),
          categoria: ingredient.categoria || "Otros",
          cantidad: ingredient.cantidad,
          unidad: ingredient.unidad,
          comprado: false,
        });
      }
    }
  }

  return [...consolidated.values()].sort(
    (left, right) =>
      left.categoria.localeCompare(right.categoria, "es") ||
      left.nombre.localeCompare(right.nombre, "es") ||
      left.unidad.localeCompare(right.unidad, "es"),
  );
}

export function groupShoppingList(items: ShoppingListItem[]) {
  const groups = new Map<string, ShoppingListItem[]>();
  for (const item of items) {
    const group = groups.get(item.categoria) ?? [];
    group.push(item);
    groups.set(item.categoria, group);
  }

  return [...groups.entries()].sort(([left], [right]) => {
    if (left === "Otros") return 1;
    if (right === "Otros") return -1;
    return left.localeCompare(right, "es");
  });
}

export function formatShoppingQuantity(quantity: number) {
  return new Intl.NumberFormat("es-ES", {
    maximumFractionDigits: 3,
  }).format(quantity);
}
