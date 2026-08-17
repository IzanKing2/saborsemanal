"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";

import { saveRecipeAction } from "@/lib/actions/recetas";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  isValidVideoUrl,
  MEAL_TYPES,
  RECIPE_UNITS,
  validateRecipe,
  type MealType,
  type RecipeFormErrors,
  type RecipeUnit,
} from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";

export type IngredientOption = {
  id: string;
  nombre: string;
  categoriaNombre: string | null;
};

export type RecipeFormValue = {
  id: string;
  titulo: string;
  descripcion: string;
  instrucciones: string[];
  imagenPath: string | null;
  imagenUrl: string | null;
  videoUrl: string | null;
  tipoComida: string[];
  tiempoPreparacion: number;
  porciones: number;
  ingredientes: Array<{
    ingredienteId: string | null;
    nombrePersonalizado: string;
    cantidad: number;
    unidad: RecipeUnit;
  }>;
};

type RecipeFormProps = {
  ingredientOptions: IngredientOption[];
  initialRecipe: RecipeFormValue;
  returnTo?: string;
};

type InstructionRow = { key: string; value: string };
type IngredientRow = {
  key: string;
  ingredienteId: string | null;
  nombrePersonalizado: string;
  catalogText: string;
  cantidad: string;
  unidad: RecipeUnit;
};

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-sm text-stone-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";
const errorInputClass = "border-red-500 focus:border-red-600 focus:ring-red-500/20";

function newKey() {
  return crypto.randomUUID();
}

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600" id={id}>
      {message}
    </p>
  );
}

export function RecipeForm({
  ingredientOptions,
  initialRecipe,
  returnTo = "/dashboard/recetas",
}: RecipeFormProps) {
  const router = useRouter();
  const [title, setTitle] = useState(initialRecipe.titulo);
  const [description, setDescription] = useState(initialRecipe.descripcion);
  const [videoUrl, setVideoUrl] = useState(initialRecipe.videoUrl ?? "");
  const [mealTypes, setMealTypes] = useState<MealType[]>(
    initialRecipe.tipoComida.filter((value): value is MealType =>
      (MEAL_TYPES as readonly string[]).includes(value),
    ),
  );
  const [preparationTime, setPreparationTime] = useState(
    String(initialRecipe.tiempoPreparacion),
  );
  const [servings, setServings] = useState(String(initialRecipe.porciones));
  const [instructions, setInstructions] = useState<InstructionRow[]>(
    initialRecipe.instrucciones.map((value, index) => ({
      key: `instruction-${index}`,
      value,
    })),
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initialRecipe.ingredientes.map((ingredient, index) => ({
      key: `ingredient-${index}`,
      ingredienteId: ingredient.ingredienteId,
      nombrePersonalizado: ingredient.nombrePersonalizado,
      catalogText:
        ingredientOptions.find((option) => option.id === ingredient.ingredienteId)
          ?.nombre ?? "",
      cantidad: String(ingredient.cantidad),
      unidad: ingredient.unidad,
    })),
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(
    initialRecipe.imagenUrl,
  );
  const [errors, setErrors] = useState<RecipeFormErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [publishConfirmationOpen, setPublishConfirmationOpen] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(removeImage ? null : initialRecipe.imagenUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, initialRecipe.imagenUrl, removeImage]);

  function updateInstruction(key: string, value: string) {
    setInstructions((current) =>
      current.map((instruction) =>
        instruction.key === key ? { ...instruction, value } : instruction,
      ),
    );
  }

  function moveInstruction(index: number, direction: -1 | 1) {
    setInstructions((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[index], next[nextIndex]] = [next[nextIndex], next[index]];
      return next;
    });
  }

  function toggleMealType(value: MealType) {
    setMealTypes((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function updateIngredient(key: string, patch: Partial<IngredientRow>) {
    setIngredients((current) =>
      current.map((ingredient) =>
        ingredient.key === key ? { ...ingredient, ...patch } : ingredient,
      ),
    );
  }

  async function persistRecipe(action: "borrador" | "publicar") {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const normalizedInstructions = instructions.map(({ value }) => value.trim());
    const normalizedIngredients = ingredients.map((ingredient) => ({
      ingredienteId: ingredient.ingredienteId,
      nombrePersonalizado: ingredient.nombrePersonalizado.trim(),
      cantidad: Number(ingredient.cantidad),
      unidad: ingredient.unidad,
    }));
    const validationErrors = validateRecipe({
      titulo: title,
      descripcion: description,
      instrucciones: normalizedInstructions,
      ingredientes: normalizedIngredients,
      tiempo: Number(preparationTime),
      porciones: Number(servings),
    });

    if (videoUrl.trim() && !isValidVideoUrl(videoUrl.trim())) {
      validationErrors.video = "Introduce un enlace de YouTube válido.";
    }

    if (imageFile) {
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)
      ) {
        validationErrors.imagen = "Usa una imagen JPEG, PNG o WebP.";
      } else if (imageFile.size > 5 * 1024 * 1024) {
        validationErrors.imagen = "La imagen no puede superar 5 MB.";
      }
    }

    if (
      action === "publicar" &&
      normalizedIngredients.some(
        (ingredient) => ingredient.ingredienteId === null,
      )
    ) {
      validationErrors.ingredientes =
        "Para enviar a revisión, sustituye los ingredientes de texto libre por ingredientes de la lista maestra.";
    }

    setErrors(validationErrors);
    setGlobalError(null);
    if (Object.keys(validationErrors).length > 0) {
      submittingRef.current = false;
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>('[aria-invalid="true"]')
          ?.focus();
      });
      return;
    }

    setIsPending(true);
    const supabase = createClient();
    let uploadedPath: string | null = null;
    let imagePath = removeImage ? null : initialRecipe.imagenPath;

    try {
      if (imageFile) {
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError || !user) throw new Error("Tu sesión ha caducado.");

        const extensionByType: Record<string, string> = {
          "image/jpeg": "jpg",
          "image/png": "png",
          "image/webp": "webp",
        };
        uploadedPath = `${user.id}/${initialRecipe.id}/${newKey()}.${extensionByType[imageFile.type]}`;
        const { error: uploadError } = await supabase.storage
          .from("recipe-images")
          .upload(uploadedPath, imageFile, {
            cacheControl: "3600",
            contentType: imageFile.type,
            upsert: false,
          });
        if (uploadError) throw new Error("No se pudo subir la imagen.");
        imagePath = uploadedPath;
      }

      const formData = new FormData();
      formData.set("id", initialRecipe.id);
      formData.set("titulo", title);
      formData.set("descripcion", description);
      formData.set("instrucciones", JSON.stringify(normalizedInstructions));
      formData.set("ingredientes", JSON.stringify(normalizedIngredients));
      formData.set("tiempo_preparacion", preparationTime);
      formData.set("porciones", servings);
      formData.set("accion", action);
      if (imagePath) formData.set("imagen_url", imagePath);
      formData.set("video_url", videoUrl.trim());
      formData.set("tipo_comida", JSON.stringify(mealTypes));

      const result = await saveRecipeAction(formData);
      if (!result.ok) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from("recipe-images")
            .remove([uploadedPath]);
          if (cleanupError) {
            console.error("Failed to clean up recipe image after save error", {
              recipeId: initialRecipe.id,
              path: uploadedPath,
            });
          }
        }
        setGlobalError(result.message);
        return;
      }

      if (
        initialRecipe.imagenPath &&
        initialRecipe.imagenPath !== imagePath
      ) {
        const { error: cleanupError } = await supabase.storage
          .from("recipe-images")
          .remove([initialRecipe.imagenPath]);
        if (cleanupError) {
          console.error("Failed to remove the previous recipe image", {
            recipeId: initialRecipe.id,
            path: initialRecipe.imagenPath,
          });
        }
      }

      router.push(returnTo);
      router.refresh();
    } catch (error) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("recipe-images")
          .remove([uploadedPath]);
        if (cleanupError) {
          console.error("Failed to clean up recipe image after exception", {
            recipeId: initialRecipe.id,
            path: uploadedPath,
          });
        }
      }
      setGlobalError(
        error instanceof Error
          ? error.message
          : "No se pudo guardar la receta.",
      );
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as
      | HTMLButtonElement
      | null;
    const action = submitter?.value === "publicar" ? "publicar" : "borrador";
    if (action === "publicar") {
      setPublishConfirmationOpen(true);
      return;
    }
    startTransition(() => {
      void persistRecipe(action);
    });
  }

  function confirmPublication() {
    setPublishConfirmationOpen(false);
    startTransition(() => {
      void persistRecipe("publicar");
    });
  }

  return (
    <form className="space-y-7" onSubmit={handleSubmit}>
      {globalError && (
        <div
          className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {globalError}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            01 · Identidad
          </p>
          <h2 className="mt-1 text-xl font-bold text-stone-950">
            Datos básicos
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-title"
            >
              Título
            </label>
            <input
              aria-describedby={errors.titulo ? "recipe-title-error" : undefined}
              aria-invalid={Boolean(errors.titulo)}
              className={`${inputClass} ${errors.titulo ? errorInputClass : ""}`}
              id="recipe-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
            <FieldError id="recipe-title-error" message={errors.titulo} />
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-description"
            >
              Descripción
            </label>
            <textarea
              aria-describedby={
                errors.descripcion ? "recipe-description-error" : undefined
              }
              aria-invalid={Boolean(errors.descripcion)}
              className={`${inputClass} min-h-28 resize-y ${errors.descripcion ? errorInputClass : ""}`}
              id="recipe-description"
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              value={description}
            />
            <FieldError
              id="recipe-description-error"
              message={errors.descripcion}
            />
          </div>

          <fieldset className="mt-1">
            <legend className="mb-1 block text-sm font-medium text-stone-700">
              Tipo de comida
            </legend>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((option) => {
                const checked = mealTypes.includes(option);
                return (
                  <label
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition ${
                      checked
                        ? "border-emerald-700 bg-emerald-100 text-emerald-900"
                        : "border-stone-300 bg-white text-stone-600 hover:border-emerald-700"
                    }`}
                    key={option}
                  >
                    <input
                      checked={checked}
                      className="sr-only"
                      onChange={() => toggleMealType(option)}
                      type="checkbox"
                      value={option}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
            <p className="mt-2 text-xs text-stone-500">
              Opcional. Marca los momentos del día para los que encaja esta receta.
            </p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-stone-700"
                htmlFor="recipe-time"
              >
                Tiempo de preparación (min)
              </label>
              <input
                aria-describedby={errors.tiempo ? "recipe-time-error" : undefined}
                aria-invalid={Boolean(errors.tiempo)}
                className={`${inputClass} ${errors.tiempo ? errorInputClass : ""}`}
                id="recipe-time"
                max={1440}
                min={1}
                onChange={(event) => setPreparationTime(event.target.value)}
                onFocus={(event) => event.target.select()}
                required
                type="number"
                value={preparationTime}
              />
              <FieldError id="recipe-time-error" message={errors.tiempo} />
            </div>
            <div>
              <label
                className="mb-1 block text-sm font-medium text-stone-700"
                htmlFor="recipe-servings"
              >
                Porciones
              </label>
              <input
                aria-describedby={
                  errors.porciones ? "recipe-servings-error" : undefined
                }
                aria-invalid={Boolean(errors.porciones)}
                className={`${inputClass} ${errors.porciones ? errorInputClass : ""}`}
                id="recipe-servings"
                max={100}
                min={1}
                onChange={(event) => setServings(event.target.value)}
                onFocus={(event) => event.target.select()}
                required
                type="number"
                value={servings}
              />
              <FieldError
                id="recipe-servings-error"
                message={errors.porciones}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
          02 · Presentación
        </p>
        <h2 className="mt-1 text-xl font-bold text-stone-950">Imagen principal</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-[180px_1fr] sm:items-center">
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-stone-100">
            {imagePreview ? (
              <Image
                alt="Vista previa de la receta"
                className="object-cover"
                fill
                sizes="180px"
                src={imagePreview}
                unoptimized={imagePreview.startsWith("blob:")}
              />
            ) : (
              <div className="flex h-full items-center justify-center px-4 text-center text-xs text-stone-500">
                Sin imagen seleccionada
              </div>
            )}
          </div>
          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-image"
            >
              Archivo de imagen
            </label>
            <input
              accept="image/jpeg,image/png,image/webp"
              aria-describedby={errors.imagen ? "recipe-image-error" : undefined}
              aria-invalid={Boolean(errors.imagen)}
              className="block w-full text-sm text-stone-600 file:mr-3 file:rounded-lg file:border-0 file:bg-emerald-100 file:px-3 file:py-2 file:font-semibold file:text-emerald-900 hover:file:bg-emerald-200"
              id="recipe-image"
              onChange={(event) => {
                setImageFile(event.target.files?.[0] ?? null);
                setRemoveImage(false);
              }}
              type="file"
            />
            <p className="mt-2 text-xs text-stone-500">
              JPEG, PNG o WebP. Máximo 5 MB.
            </p>
            <FieldError id="recipe-image-error" message={errors.imagen} />
            {initialRecipe.imagenPath && !removeImage && (
              <button
                className="mt-3 text-xs font-semibold text-red-700 hover:underline"
                onClick={() => {
                  setImageFile(null);
                  setRemoveImage(true);
                }}
                type="button"
              >
                Quitar imagen actual
              </button>
            )}
          </div>
        </div>
        <div className="mt-6 border-t border-stone-100 pt-5">
          <label
            className="mb-1 block text-sm font-medium text-stone-700"
            htmlFor="recipe-video-url"
          >
            Vídeo de YouTube
          </label>
          <input
            aria-describedby={errors.video ? "recipe-video-url-error" : undefined}
            aria-invalid={Boolean(errors.video)}
            className={`${inputClass} ${errors.video ? errorInputClass : ""}`}
            id="recipe-video-url"
            maxLength={500}
            onChange={(event) => setVideoUrl(event.target.value)}
            placeholder="https://www.youtube.com/watch?v=..."
            type="url"
            value={videoUrl}
          />
          <p className="mt-2 text-xs text-stone-500">
            Opcional. Añade un enlace de YouTube con la guía de preparación.
          </p>
          <FieldError id="recipe-video-url-error" message={errors.video} />
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              03 · Elaboración
            </p>
            <h2 className="mt-1 text-xl font-bold text-stone-950">
              Instrucciones
            </h2>
          </div>
          <button
            className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50"
            onClick={() =>
              setInstructions((current) => [
                ...current,
                { key: newKey(), value: "" },
              ])
            }
            type="button"
          >
            Añadir paso
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {instructions.map((instruction, index) => (
            <div
              className="grid grid-cols-[2rem_1fr] gap-3 rounded-xl bg-stone-50 p-3"
              key={instruction.key}
            >
              <span className="flex size-8 items-center justify-center rounded-full bg-emerald-900 text-sm font-bold text-white">
                {index + 1}
              </span>
              <div>
                <label className="sr-only" htmlFor={`instruction-${instruction.key}`}>
                  Paso {index + 1}
                </label>
                <textarea
                  aria-describedby={
                    errors.instrucciones
                      ? "recipe-instructions-error"
                      : undefined
                  }
                  aria-invalid={Boolean(errors.instrucciones)}
                  className={`${inputClass} min-h-20 resize-y`}
                  id={`instruction-${instruction.key}`}
                  maxLength={1000}
                  onChange={(event) =>
                    updateInstruction(instruction.key, event.target.value)
                  }
                  required
                  value={instruction.value}
                />
                <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                  <button
                    className="text-stone-600 disabled:opacity-30"
                    disabled={index === 0}
                    onClick={() => moveInstruction(index, -1)}
                    type="button"
                  >
                    Subir
                  </button>
                  <button
                    className="text-stone-600 disabled:opacity-30"
                    disabled={index === instructions.length - 1}
                    onClick={() => moveInstruction(index, 1)}
                    type="button"
                  >
                    Bajar
                  </button>
                  <button
                    className="text-red-700 disabled:opacity-30"
                    disabled={instructions.length === 1}
                    onClick={() =>
                      setInstructions((current) =>
                        current.filter((item) => item.key !== instruction.key),
                      )
                    }
                    type="button"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <FieldError
          id="recipe-instructions-error"
          message={errors.instrucciones}
        />
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
              04 · Composición
            </p>
            <h2 className="mt-1 text-xl font-bold text-stone-950">
              Ingredientes
            </h2>
          </div>
          <button
            className="rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
            onClick={() =>
              setIngredients((current) => [
                ...current,
                {
                  key: newKey(),
                  ingredienteId: ingredientOptions.length > 0 ? "" : null,
                  nombrePersonalizado: "",
                  catalogText: "",
                  cantidad: "1",
                  unidad: "unidad",
                },
              ])
            }
            type="button"
          >
            Añadir ingrediente
          </button>
        </div>

        <datalist id="ingredient-catalog-options">
          {ingredientOptions.map((option) => (
            <option key={option.id} value={option.nombre}>
              {option.categoriaNombre ? `${option.nombre} · ${option.categoriaNombre}` : option.nombre}
            </option>
          ))}
        </datalist>

        {ingredientOptions.length === 0 && (
          <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            El catálogo está vacío, pero puedes escribir ingredientes propios
            usando texto libre.
          </p>
        )}

        <div className="mt-5 space-y-3">
          {ingredients.map((ingredient, index) => (
            <div
              className="grid gap-3 rounded-xl bg-stone-50 p-3 md:grid-cols-[minmax(0,1fr)_8rem_10rem_auto] md:items-end"
              key={ingredient.key}
            >
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-stone-600"
                  htmlFor={`ingredient-source-${ingredient.key}`}
                >
                  Origen del ingrediente {index + 1}
                </label>
                <select
                  className={`${inputClass} mb-2`}
                  id={`ingredient-source-${ingredient.key}`}
                  onChange={(event) =>
                    updateIngredient(
                      ingredient.key,
                      event.target.value === "custom"
                        ? { ingredienteId: null, nombrePersonalizado: "" }
                        : { ingredienteId: "", nombrePersonalizado: "", catalogText: "" },
                    )
                  }
                  value={ingredient.ingredienteId === null ? "custom" : "catalog"}
                >
                  <option disabled={ingredientOptions.length === 0} value="catalog">
                    Lista maestra
                  </option>
                  <option value="custom">Texto libre</option>
                </select>

                {ingredient.ingredienteId === null ? (
                  <>
                    <label
                      className="sr-only"
                      htmlFor={`ingredient-custom-${ingredient.key}`}
                    >
                      Nombre personalizado del ingrediente {index + 1}
                    </label>
                    <input
                      aria-describedby={
                        errors.ingredientes
                          ? "recipe-ingredients-error"
                          : undefined
                      }
                      aria-invalid={Boolean(errors.ingredientes)}
                      className={inputClass}
                      id={`ingredient-custom-${ingredient.key}`}
                      maxLength={100}
                      minLength={2}
                      onChange={(event) =>
                        updateIngredient(ingredient.key, {
                          nombrePersonalizado: event.target.value,
                        })
                      }
                      placeholder="Ej. Setas de temporada"
                      required
                      type="text"
                      value={ingredient.nombrePersonalizado}
                    />
                    <p className="mt-1 text-xs text-amber-700">
                      Disponible para recetas propias y borradores. Para publicar,
                      deberá existir en la lista maestra.
                    </p>
                  </>
                ) : (
                  <>
                    <label
                      className="sr-only"
                      htmlFor={`ingredient-option-${ingredient.key}`}
                    >
                      Ingrediente de la lista maestra {index + 1}
                    </label>
                    <input
                      aria-describedby={
                        errors.ingredientes
                          ? "recipe-ingredients-error"
                          : undefined
                      }
                      aria-invalid={Boolean(errors.ingredientes)}
                      autoComplete="off"
                      className={inputClass}
                      id={`ingredient-option-${ingredient.key}`}
                      list="ingredient-catalog-options"
                      onChange={(event) => {
                        const text = event.target.value;
                        const match = ingredientOptions.find(
                          (option) =>
                            option.nombre.toLocaleLowerCase("es") ===
                            text.trim().toLocaleLowerCase("es"),
                        );
                        updateIngredient(ingredient.key, {
                          catalogText: text,
                          ingredienteId: match ? match.id : "",
                        });
                      }}
                      placeholder="Escribe para buscar..."
                      required
                      type="text"
                      value={ingredient.catalogText}
                    />
                  </>
                )}
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-stone-600"
                  htmlFor={`ingredient-amount-${ingredient.key}`}
                >
                  Cantidad
                </label>
                <input
                  aria-describedby={
                    errors.ingredientes ? "recipe-ingredients-error" : undefined
                  }
                  aria-invalid={Boolean(errors.ingredientes)}
                  className={inputClass}
                  id={`ingredient-amount-${ingredient.key}`}
                  min="0.01"
                  onChange={(event) =>
                    updateIngredient(ingredient.key, {
                      cantidad: event.target.value,
                    })
                  }
                  required
                  step="any"
                  type="number"
                  value={ingredient.cantidad}
                />
              </div>
              <div>
                <label
                  className="mb-1 block text-xs font-medium text-stone-600"
                  htmlFor={`ingredient-unit-${ingredient.key}`}
                >
                  Unidad
                </label>
                <select
                  aria-describedby={
                    errors.ingredientes ? "recipe-ingredients-error" : undefined
                  }
                  aria-invalid={Boolean(errors.ingredientes)}
                  className={inputClass}
                  id={`ingredient-unit-${ingredient.key}`}
                  onChange={(event) =>
                    updateIngredient(ingredient.key, {
                      unidad: event.target.value as RecipeUnit,
                    })
                  }
                  value={ingredient.unidad}
                >
                  {RECIPE_UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </select>
              </div>
              <button
                className="rounded-lg px-2 py-2.5 text-sm font-semibold text-red-700 hover:bg-red-50"
                onClick={() =>
                  setIngredients((current) =>
                    current.filter((item) => item.key !== ingredient.key),
                  )
                }
                type="button"
              >
                Quitar
              </button>
            </div>
          ))}
        </div>
        <FieldError
          id="recipe-ingredients-error"
          message={errors.ingredientes}
        />
      </section>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white/95 p-4 shadow-xl backdrop-blur sm:flex-row sm:justify-end">
        <button
          className="rounded-xl border border-stone-300 px-5 py-3 text-sm font-bold text-stone-700 hover:bg-stone-50 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          name="accion"
          onClick={() => setPublishConfirmationOpen(true)}
          type="button"
          value="borrador"
        >
          {isPending ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={isPending}
          name="accion"
          type="submit"
          value="publicar"
        >
          {isPending ? "Publicando..." : "Publicar receta"}
        </button>
      </div>
      <ConfirmDialog
        busy={isPending}
        cancelLabel="Guardar borrador"
        confirmLabel="Sí, publicar"
        description="La receta será visible para el resto de usuarios. Si aún no está lista, guárdala como borrador."
        dismissible={false}
        onCancel={() => {
          setPublishConfirmationOpen(false);
          startTransition(() => {
            void persistRecipe("borrador");
          });
        }}
        onConfirm={confirmPublication}
        open={publishConfirmationOpen}
        title="¿Publicar esta receta?"
      />
    </form>
  );
}
