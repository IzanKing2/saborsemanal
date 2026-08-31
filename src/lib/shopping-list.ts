import {
  canonicalUnit,
  presentQuantity,
  roundQuantity,
  toCanonicalQuantity,
} from "@/lib/units";

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
  porciones?: number;
  ingredientes?: ShoppingRecipeIngredient[];
};

/** Formato guardado del menú local: id suelto (antiguo) o comida planificada. */
export type StoredSlotValue =
  | string
  | { recipeId: string; raciones?: number | null; esSobra?: boolean };

export function storedSlotRecipeId(value: StoredSlotValue): string | null {
  if (typeof value === "string") return value;
  return value && typeof value.recipeId === "string" ? value.recipeId : null;
}

/**
 * Consolida los ingredientes de la semana. Escala por las raciones de cada
 * comida planificada y salta las marcadas como sobra, igual que hace el RPC
 * `regenerate_shopping_list` para las cuentas con sesión.
 */
export function consolidateShoppingList(
  slots: Record<string, StoredSlotValue>,
  recipes: ShoppingRecipe[],
  poolRecipeIds: string[] = [],
): ShoppingListItem[] {
  const recipesById = new Map(recipes.map((recipe) => [recipe.id, recipe]));
  const consolidated = new Map<string, ShoppingListItem>();

  const planned: Array<{ recipeId: string; factor: number }> = [];
  for (const value of Object.values(slots)) {
    const recipeId = storedSlotRecipeId(value);
    if (!recipeId) continue;
    if (typeof value === "object" && value.esSobra === true) continue;

    const base = recipesById.get(recipeId)?.porciones ?? 0;
    const servings = typeof value === "object" ? value.raciones ?? null : null;
    planned.push({
      recipeId,
      factor: servings && base > 0 ? servings / base : 1,
    });
  }
  for (const recipeId of poolRecipeIds) planned.push({ recipeId, factor: 1 });

  for (const { recipeId, factor } of planned) {
    const recipe = recipesById.get(recipeId);
    for (const ingredient of recipe?.ingredientes ?? []) {
      const normalizedName = ingredient.nombre.trim().toLocaleLowerCase("es");
      const sourceKey = ingredient.ingredienteId
        ? `master:${ingredient.ingredienteId}`
        : `custom:${normalizedName}`;
      // Se agrupa y se acumula en la unidad canónica, así "300 g" y "1 kg" del
      // mismo ingrediente caen en la misma línea. La unidad de presentación se
      // decide al final, ya con el total sumado.
      const unidad = canonicalUnit(ingredient.unidad);
      const id = `${sourceKey}:${unidad}`;
      const current = consolidated.get(id);
      // Redondeo a 3 decimales, como el RPC: escalar raciones puede producir
      // colas de coma flotante que no aportan nada en una lista de la compra.
      const quantity = roundQuantity(
        toCanonicalQuantity(ingredient.cantidad, ingredient.unidad) * factor,
      );

      if (current) {
        current.cantidad = roundQuantity(current.cantidad + quantity);
      } else {
        consolidated.set(id, {
          id,
          nombre: ingredient.nombre.trim(),
          categoria: ingredient.categoria || "Otros",
          cantidad: quantity,
          unidad,
          comprado: false,
        });
      }
    }
  }

  return [...consolidated.values()].map(presentShoppingItem).sort(
    (left, right) =>
      left.categoria.localeCompare(right.categoria, "es") ||
      left.nombre.localeCompare(right.nombre, "es") ||
      left.unidad.localeCompare(right.unidad, "es"),
  );
}

/**
 * La base de datos guarda siempre la unidad canónica (g/ml); esta función
 * decide cómo se enseña. Se aplica tanto a la lista del servidor como a la del
 * modo invitado para que ambas muestren exactamente lo mismo.
 */
export function presentShoppingItem(item: ShoppingListItem): ShoppingListItem {
  const presented = presentQuantity(item.cantidad, item.unidad);
  return presented.unidad === item.unidad && presented.cantidad === item.cantidad
    ? item
    : { ...item, ...presented };
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

export function formatShoppingListAsText(
  items: ShoppingListItem[],
  options?: { title?: string },
) {
  const lines: string[] = [];
  if (options?.title) lines.push(options.title, "");

  const groups = groupShoppingList(items);
  if (groups.length === 0) {
    lines.push("(Lista vacía)");
  } else {
    for (const [category, categoryItems] of groups) {
      lines.push(category.toUpperCase());
      for (const item of categoryItems) {
        const mark = item.comprado ? "[x]" : "[ ]";
        lines.push(
          `${mark} ${item.nombre} — ${formatShoppingQuantity(item.cantidad)} ${item.unidad}`,
        );
      }
      lines.push("");
    }
  }

  return lines.join("\n").trimEnd();
}
