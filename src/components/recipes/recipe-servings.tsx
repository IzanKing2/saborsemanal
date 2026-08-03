"use client";

import { useState } from "react";

import { formatShoppingQuantity } from "@/lib/shopping-list";

type RecipeIngredient = {
  cantidad: number;
  nombre: string;
  unidad: string;
};

export function RecipeServings({
  baseServings,
  ingredients,
}: {
  baseServings: number;
  ingredients: RecipeIngredient[];
}) {
  const [servings, setServings] = useState(baseServings);
  const ratio = servings / baseServings;

  return (
    <section aria-labelledby="ingredients-heading">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-950" id="ingredients-heading">
            Ingredientes
          </h2>
          <p className="mt-1 text-sm text-stone-500">
            Cantidades ajustadas para {servings} {servings === 1 ? "porción" : "porciones"}.
          </p>
        </div>
        <label className="text-sm font-bold text-stone-700" htmlFor="recipe-servings-scale">
          Porciones
          <input
            className="ml-2 w-20 rounded-lg border border-stone-300 px-2 py-1.5 text-center outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
            id="recipe-servings-scale"
            max={100}
            min={1}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (Number.isInteger(value) && value >= 1 && value <= 100) {
                setServings(value);
              }
            }}
            type="number"
            value={servings}
          />
        </label>
      </div>
      <ul className="mt-5 divide-y divide-stone-100">
        {ingredients.map((ingredient, index) => (
          <li
            className="flex items-baseline justify-between gap-4 py-3 text-sm"
            key={`${ingredient.nombre}-${ingredient.unidad}-${index}`}
          >
            <span className="font-medium text-stone-800">{ingredient.nombre}</span>
            <span className="shrink-0 text-stone-500">
              {formatShoppingQuantity(ingredient.cantidad * ratio)} {ingredient.unidad}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
