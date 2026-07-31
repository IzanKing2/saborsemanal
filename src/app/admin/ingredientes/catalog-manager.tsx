"use client";

import { useActionState, useDeferredValue, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createAllergenAction,
  createCategoryAction,
  deleteAllergenAction,
  deleteCategoryAction,
  deleteIngredientAction,
  saveIngredientAction,
  updateAllergenAction,
  updateCategoryAction,
  type CatalogActionState,
} from "@/lib/actions/ingredientes";

type NamedItem = {
  id: string;
  nombre: string;
  usageCount?: number;
};

type IngredientItem = NamedItem & {
  categoriaId: string | null;
  alergenoIds: string[];
};

type CatalogManagerProps = {
  categories: NamedItem[];
  allergens: NamedItem[];
  ingredients: IngredientItem[];
};

type NameCatalog = "category" | "allergen";

const initialState: CatalogActionState = { ok: false, message: "" };

const inputClass =
  "w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 outline-none transition focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/20";
const primaryButtonClass =
  "rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "rounded-lg border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-700 transition hover:bg-stone-100";

function ActionMessage({ state }: { state: CatalogActionState }) {
  if (!state.message) return null;

  return (
    <p
      className={`mt-3 rounded-lg border px-3 py-2 text-sm ${
        state.ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-800"
          : "border-red-200 bg-red-50 text-red-700"
      }`}
      role={state.ok ? "status" : "alert"}
    >
      {state.message}
    </p>
  );
}

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button className={primaryButtonClass} disabled={pending} type="submit">
      {pending ? "Guardando..." : children}
    </button>
  );
}

function DeleteButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();

  return (
    <button
      className="text-xs font-semibold text-red-700 hover:underline disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
      type="submit"
    >
      {pending ? "Eliminando..." : children}
    </button>
  );
}

function CreateNameForm({ catalog }: { catalog: NameCatalog }) {
  const action =
    catalog === "category" ? createCategoryAction : createAllergenAction;
  const [state, formAction] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);
  const label = catalog === "category" ? "Nueva categoría" : "Nuevo alérgeno";
  const inputId = `create-${catalog}`;

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form action={formAction} ref={formRef}>
      <label
        className="mb-1 block text-sm font-medium text-stone-700"
        htmlFor={inputId}
      >
        {label}
      </label>
      <div className="flex gap-2">
        <input
          className={inputClass}
          id={inputId}
          maxLength={100}
          minLength={2}
          name="nombre"
          placeholder={catalog === "category" ? "Ej. Verduras" : "Ej. Sulfitos"}
          required
        />
        <SubmitButton>Añadir</SubmitButton>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

function NameRow({ catalog, item }: { catalog: NameCatalog; item: NamedItem }) {
  const updateAction =
    catalog === "category" ? updateCategoryAction : updateAllergenAction;
  const deleteAction =
    catalog === "category" ? deleteCategoryAction : deleteAllergenAction;
  const [updateState, updateFormAction] = useActionState(
    updateAction,
    initialState,
  );
  const [deleteState, deleteFormAction] = useActionState(
    deleteAction,
    initialState,
  );
  const [editing, setEditing] = useState(false);
  const inputId = `${catalog}-${item.id}`;

  useEffect(() => {
    if (updateState.ok) setEditing(false);
  }, [updateState]);

  return (
    <li className="rounded-xl border border-stone-200 bg-white p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span className="min-w-0 truncate text-sm font-semibold text-stone-900">
            {item.nombre}
          </span>
          {item.usageCount ? (
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
              {item.usageCount} uso{item.usageCount === 1 ? "" : "s"}
            </span>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button
            className="text-xs font-bold text-emerald-700 hover:underline"
            onClick={() => setEditing((value) => !value)}
            type="button"
          >
            {editing ? "Cerrar" : "Editar"}
          </button>
          <form
            action={deleteFormAction}
            onSubmit={(event) => {
              const impact = item.usageCount
                ? ` Afectará a ${item.usageCount} asociación${item.usageCount === 1 ? "" : "es"}.`
                : "";
              if (!window.confirm(`¿Eliminar “${item.nombre}”?${impact}`)) {
                event.preventDefault();
              }
            }}
          >
            <input name="id" type="hidden" value={item.id} />
            <DeleteButton>Eliminar</DeleteButton>
          </form>
        </div>
      </div>

      {editing && (
        <div className="mt-3 border-t border-stone-100 pt-3">
          <form action={updateFormAction}>
            <input name="id" type="hidden" value={item.id} />
            <label className="sr-only" htmlFor={inputId}>
              Editar {item.nombre}
            </label>
            <div className="flex gap-2">
              <input
                className={inputClass}
                defaultValue={item.nombre}
                id={inputId}
                maxLength={100}
                minLength={2}
                name="nombre"
                required
              />
              <SubmitButton>Guardar</SubmitButton>
              <button
                className={secondaryButtonClass}
                onClick={() => setEditing(false)}
                type="button"
              >
                Cancelar
              </button>
            </div>
          </form>
          <ActionMessage state={updateState} />
        </div>
      )}

      <ActionMessage state={deleteState} />
    </li>
  );
}

function NameCatalogPanel({
  catalog,
  items,
}: {
  catalog: NameCatalog;
  items: NamedItem[];
}) {
  const title = catalog === "category" ? "Categorías" : "Alérgenos";
  const description =
    catalog === "category"
      ? "Organizan la lista maestra y la futura lista de la compra."
      : "Permiten excluir recetas según necesidades alimentarias.";

  return (
    <details className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 marker:hidden">
        <div>
          <h2 className="text-xl font-bold text-stone-900">{title}</h2>
          <p className="mt-1 text-sm leading-6 text-stone-600">{description}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900">
            {items.length}
          </span>
          <svg
            aria-hidden="true"
            className="size-5 text-stone-400 transition group-open:rotate-180"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
          >
            <path d="m6 9 6 6 6-6" />
          </svg>
        </div>
      </summary>

      <div className="mt-5">
        <CreateNameForm catalog={catalog} />

        {items.length > 0 ? (
          <ul className="mt-5 space-y-2">
            {items.map((item) => (
              <NameRow catalog={catalog} item={item} key={item.id} />
            ))}
          </ul>
        ) : (
          <p className="mt-5 rounded-xl bg-stone-50 p-4 text-sm text-stone-500">
            Todavía no hay registros.
          </p>
        )}
      </div>
    </details>
  );
}

function IngredientForm({
  categories,
  allergens,
  ingredient,
  variant = "card",
}: {
  categories: NamedItem[];
  allergens: NamedItem[];
  ingredient?: IngredientItem;
  variant?: "card" | "plain";
}) {
  const [saveState, saveFormAction] = useActionState(
    saveIngredientAction,
    initialState,
  );
  const [deleteState, deleteFormAction] = useActionState(
    deleteIngredientAction,
    initialState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  const suffix = ingredient?.id ?? "new";
  const selectedAllergens = new Set(ingredient?.alergenoIds ?? []);

  useEffect(() => {
    if (saveState.ok && !ingredient) formRef.current?.reset();
  }, [ingredient, saveState]);

  return (
    <div
      className={
        variant === "card"
          ? "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm"
          : undefined
      }
    >
      <form action={saveFormAction} ref={formRef}>
        {ingredient && <input name="id" type="hidden" value={ingredient.id} />}

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor={`ingredient-name-${suffix}`}
            >
              Nombre
            </label>
            <input
              className={inputClass}
              defaultValue={ingredient?.nombre}
              id={`ingredient-name-${suffix}`}
              maxLength={100}
              minLength={2}
              name="nombre"
              placeholder="Ej. Tomate"
              required
            />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor={`ingredient-category-${suffix}`}
            >
              Categoría
            </label>
            <select
              className={inputClass}
              defaultValue={ingredient?.categoriaId ?? ""}
              id={`ingredient-category-${suffix}`}
              name="categoria_id"
            >
              <option value="">Sin categoría</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>

        <fieldset className="mt-4">
          <legend className="text-sm font-medium text-stone-700">
            Alérgenos asociados
          </legend>
          {allergens.length > 0 ? (
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {allergens.map((allergen) => (
                <label
                  className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
                  key={allergen.id}
                >
                  <input
                    className="size-4 accent-emerald-700"
                    defaultChecked={selectedAllergens.has(allergen.id)}
                    name="alergenos"
                    type="checkbox"
                    value={allergen.id}
                  />
                  {allergen.nombre}
                </label>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-stone-500">
              Crea alérgenos antes de asociarlos.
            </p>
          )}
        </fieldset>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <SubmitButton>
            {ingredient ? "Guardar cambios" : "Crear ingrediente"}
          </SubmitButton>
          {ingredient && (
            <span className="text-xs text-stone-500">
              Los cambios afectan a todas las recetas que lo utilicen.
            </span>
          )}
        </div>
        <ActionMessage state={saveState} />
      </form>

      {ingredient && (
        <form
          action={deleteFormAction}
          className="mt-3 border-t border-stone-100 pt-3"
          onSubmit={(event) => {
            if (!window.confirm(`¿Eliminar “${ingredient.nombre}”?`)) {
              event.preventDefault();
            }
          }}
        >
          <input name="id" type="hidden" value={ingredient.id} />
          <DeleteButton>Eliminar ingrediente</DeleteButton>
          <ActionMessage state={deleteState} />
        </form>
      )}
    </div>
  );
}

function CategoryChip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
        active
          ? "border-emerald-700 bg-emerald-700 text-white"
          : "border-stone-300 bg-white text-stone-600 hover:border-emerald-600 hover:text-emerald-700"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function CatalogManager({
  categories,
  allergens,
  ingredients,
}: CatalogManagerProps) {
  const [query, setQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const deferredQuery = useDeferredValue(query.trim().toLocaleLowerCase("es"));

  const categoryNames = new Map(categories.map((category) => [category.id, category.nombre]));
  const allergenNames = new Map(allergens.map((allergen) => [allergen.id, allergen.nombre]));

  const filteredIngredients = ingredients.filter((ingredient) => {
    const matchesQuery =
      !deferredQuery ||
      ingredient.nombre.toLocaleLowerCase("es").includes(deferredQuery);
    const matchesCategory =
      filterCategory === "all" || ingredient.categoriaId === filterCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <div className="space-y-8">
      <div className="grid gap-6 xl:grid-cols-2">
        <NameCatalogPanel catalog="category" items={categories} />
        <NameCatalogPanel catalog="allergen" items={allergens} />
      </div>

      <section aria-labelledby="ingredients-heading">
        <div className="mb-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.22em] text-emerald-700">
              Lista maestra
            </p>
            <h2
              className="mt-1 text-2xl font-bold text-stone-950"
              id="ingredients-heading"
            >
              Ingredientes
            </h2>
            <p className="mt-1 text-sm text-stone-600">
              Cada ingrediente puede pertenecer a una categoría y tener varios
              alérgenos.
            </p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="ingredient-search"
            >
              Buscar ingrediente
            </label>
            <input
              className={inputClass}
              id="ingredient-search"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Escribe un nombre..."
              type="search"
              value={query}
            />
            <p aria-live="polite" className="sr-only" role="status">
              {filteredIngredients.length} ingredientes encontrados
            </p>
          </div>
        </div>

        <div className="mb-6">
          <span className="sr-only" id="category-filter-label">
            Filtrar por categoría
          </span>
          <div
            aria-labelledby="category-filter-label"
            className="flex flex-wrap items-center gap-2"
            role="group"
          >
            <CategoryChip
              active={filterCategory === "all"}
              onClick={() => setFilterCategory("all")}
            >
              Todas
            </CategoryChip>
            {categories.map((category) => (
              <CategoryChip
                active={filterCategory === category.id}
                key={category.id}
                onClick={() => setFilterCategory(category.id)}
              >
                {category.nombre}
              </CategoryChip>
            ))}
          </div>
        </div>

        <details className="group rounded-3xl border border-emerald-300 bg-emerald-50/60 p-4 sm:p-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 marker:hidden">
            <span className="text-lg font-bold text-emerald-950">
              Añadir ingrediente
            </span>
            <span className="shrink-0 text-xs font-medium text-emerald-700 group-open:hidden">
              Abrir formulario
            </span>
          </summary>
          <div className="mt-4">
            <IngredientForm categories={categories} allergens={allergens} />
          </div>
        </details>

        <div className="mt-6 space-y-3">
          {filteredIngredients.length > 0 ? (
            filteredIngredients.map((ingredient) => (
              <details
                className="group rounded-2xl border border-stone-200 bg-white open:shadow-sm"
                key={ingredient.id}
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden">
                  <span className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="truncate font-semibold text-stone-900">
                      {ingredient.nombre}
                    </span>
                    {ingredient.categoriaId &&
                      categoryNames.get(ingredient.categoriaId) && (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                          {categoryNames.get(ingredient.categoriaId)}
                        </span>
                      )}
                    {ingredient.alergenoIds.map((allergenId) => {
                      const allergenName = allergenNames.get(allergenId);
                      if (!allergenName) return null;
                      return (
                        <span
                          className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800"
                          key={allergenId}
                        >
                          {allergenName}
                        </span>
                      );
                    })}
                  </span>
                  <span className="shrink-0 text-xs font-medium text-stone-500 group-open:hidden">
                    Editar
                  </span>
                </summary>
                <div className="border-t border-stone-200 p-3 sm:p-4">
                  <IngredientForm
                    allergens={allergens}
                    categories={categories}
                    ingredient={ingredient}
                    variant="plain"
                  />
                </div>
              </details>
            ))
          ) : (
            <p className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-500">
              {ingredients.length === 0
                ? "Todavía no hay ingredientes en la lista maestra."
                : "No hay ingredientes que coincidan con la búsqueda o el filtro."}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
