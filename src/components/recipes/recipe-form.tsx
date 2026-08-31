"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import { saveRecipeAction } from "@/lib/actions/recetas";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  RecipeImagePicker,
} from "@/components/recipes/recipe-image-picker";
import {
  RecipeIngredientsEditor,
  type IngredientRow,
} from "@/components/recipes/recipe-ingredients-editor";
import {
  RecipeInstructionsEditor,
  type InstructionRow,
} from "@/components/recipes/recipe-instructions-editor";
import {
  findIngredientOption,
  getRecipeRequirements,
  isValidVideoUrl,
  MEAL_TYPES,
  toIngredientInput,
  validateRecipe,
  type IngredientOption,
  type MealType,
  type RecipeFormErrors,
  type RecipeUnit,
} from "@/lib/recipes";
import { createClient } from "@/lib/supabase/client";

export type { IngredientOption };

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
  /** Una receta ya publicada nunca se autoguarda: ver `autosaveEnabled`. */
  publicada?: boolean;
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

type SaveMode = "borrador" | "publicar";
type AutosaveStatus = "idle" | "saving" | "saved" | "error";

const inputClass =
  "w-full rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";
const errorInputClass = "border-red-500 focus:border-red-600 focus:ring-red-500/20";
const AUTOSAVE_DELAY_MS = 1800;

function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p className="mt-1 text-xs text-red-600" id={id}>
      {message}
    </p>
  );
}

function OptionalTag() {
  return (
    <span className="ml-2 rounded-full bg-stone-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-stone-500">
      Opcional
    </span>
  );
}

function RequiredMark() {
  return (
    <>
      <span aria-hidden="true" className="text-emerald-700">
        {" "}
        *
      </span>
      <span className="sr-only"> (obligatorio)</span>
    </>
  );
}

export function RecipeForm({
  ingredientOptions,
  initialRecipe,
  returnTo = "/dashboard/recetas",
}: RecipeFormProps) {
  const router = useRouter();
  // El id se fija al montar: la página de receta nueva lo genera con
  // `crypto.randomUUID()` en cada render del servidor, así que leerlo de las
  // props haría que cualquier refresco (router.refresh, revalidación) guardase
  // la siguiente vez como una receta distinta en vez de actualizar esta.
  const [recipeId] = useState(initialRecipe.id);
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
  const [instructions, setInstructions] = useState<InstructionRow[]>(() =>
    initialRecipe.instrucciones.length > 0
      ? initialRecipe.instrucciones.map((value, index) => ({
          key: `instruction-${index}`,
          value,
        }))
      : [{ key: "instruction-0", value: "" }],
  );
  const [ingredients, setIngredients] = useState<IngredientRow[]>(() =>
    initialRecipe.ingredientes.map((ingredient, index) => ({
      key: `ingredient-${index}`,
      texto:
        ingredientOptions.find(
          (option) => option.id === ingredient.ingredienteId,
        )?.nombre ?? ingredient.nombrePersonalizado,
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
  const [unpublishConfirmationOpen, setUnpublishConfirmationOpen] =
    useState(false);
  const [success, setSuccess] = useState<{ mode: SaveMode } | null>(null);
  const [publishedNow, setPublishedNow] = useState(false);
  const [autosave, setAutosave] = useState<AutosaveStatus>("idle");
  const submittingRef = useRef(false);
  const autosaveSeqRef = useRef(0);
  const savedSnapshotRef = useRef<string | null>(null);

  const isPublished = Boolean(initialRecipe.publicada) || publishedNow;

  useEffect(() => {
    if (!imageFile) {
      setImagePreview(removeImage ? null : initialRecipe.imagenUrl);
      return;
    }

    const objectUrl = URL.createObjectURL(imageFile);
    setImagePreview(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [imageFile, initialRecipe.imagenUrl, removeImage]);

  const normalizedInstructions = useMemo(
    () => instructions.map(({ value }) => value.trim()),
    [instructions],
  );
  const normalizedIngredients = useMemo(
    () =>
      ingredients.map((row) =>
        toIngredientInput(row.texto, row.cantidad, row.unidad, ingredientOptions),
      ),
    [ingredients, ingredientOptions],
  );

  const validationInput = useMemo(
    () => ({
      titulo: title,
      descripcion: description,
      instrucciones: normalizedInstructions,
      ingredientes: normalizedIngredients,
      tiempo: Number(preparationTime),
      porciones: Number(servings),
    }),
    [
      title,
      description,
      normalizedInstructions,
      normalizedIngredients,
      preparationTime,
      servings,
    ],
  );

  const requirements = useMemo(
    () => getRecipeRequirements(validationInput),
    [validationInput],
  );
  const completedCount = requirements.filter(
    (requirement) => requirement.done,
  ).length;
  const isComplete = completedCount === requirements.length;

  // El autoguardado solo actúa sobre borradores: guardar automáticamente una
  // receta publicada la despublicaría (el RPC recibe `p_publica`), así que ahí
  // el guardado sigue siendo siempre explícito.
  const autosaveEnabled = !isPublished;

  const draftSnapshot = useMemo(
    () =>
      JSON.stringify({
        title: title.trim(),
        description: description.trim(),
        videoUrl: videoUrl.trim(),
        mealTypes,
        preparationTime,
        servings,
        instructions: normalizedInstructions,
        ingredients: normalizedIngredients,
        removeImage,
      }),
    [
      title,
      description,
      videoUrl,
      mealTypes,
      preparationTime,
      servings,
      normalizedInstructions,
      normalizedIngredients,
      removeImage,
    ],
  );

  useEffect(() => {
    if (savedSnapshotRef.current === null) savedSnapshotRef.current = draftSnapshot;
  }, [draftSnapshot]);

  function buildFormData(action: SaveMode, imagePath: string | null) {
    const formData = new FormData();
    formData.set("id", recipeId);
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
    return formData;
  }

  // Autoguardado silencioso: espera a que el usuario deje de escribir, solo
  // envía borradores que el RPC aceptaría y descarta respuestas viejas para que
  // una petición lenta no pise a otra más reciente.
  useEffect(() => {
    if (!autosaveEnabled || !isComplete || isPending || success) return;
    if (draftSnapshot === savedSnapshotRef.current) return;

    const snapshot = draftSnapshot;
    const imagePath = removeImage ? null : initialRecipe.imagenPath;
    const formData = buildFormData("borrador", imagePath);
    const timer = setTimeout(async () => {
      const seq = ++autosaveSeqRef.current;
      setAutosave("saving");
      const result = await saveRecipeAction(formData);
      if (seq !== autosaveSeqRef.current) return;
      if (result.ok) {
        savedSnapshotRef.current = snapshot;
        setAutosave("saved");
      } else {
        setAutosave("error");
      }
    }, AUTOSAVE_DELAY_MS);

    return () => clearTimeout(timer);
    // `buildFormData` lee el estado del render actual, que es justo el que
    // describe `draftSnapshot`; añadirlo como dependencia no cambiaría nada.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftSnapshot, autosaveEnabled, isComplete, isPending, success]);

  function focusFirstError() {
    requestAnimationFrame(() => {
      const target = document.querySelector<HTMLElement>('[aria-invalid="true"]');
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.focus({ preventScroll: true });
    });
  }

  function validate(action: SaveMode): RecipeFormErrors {
    const validationErrors = validateRecipe(validationInput);

    if (videoUrl.trim() && !isValidVideoUrl(videoUrl.trim())) {
      validationErrors.video = "Introduce un enlace de YouTube válido.";
    }

    if (imageFile) {
      if (!["image/jpeg", "image/png", "image/webp"].includes(imageFile.type)) {
        validationErrors.imagen = "Usa una imagen JPEG, PNG o WebP.";
      } else if (imageFile.size > 5 * 1024 * 1024) {
        validationErrors.imagen = "La imagen no puede superar 5 MB.";
      }
    }

    if (action === "publicar") {
      const customNames = ingredients
        .filter((row) => findIngredientOption(row.texto, ingredientOptions) === null)
        .map((row) => row.texto.trim())
        .filter(Boolean);
      if (customNames.length > 0) {
        validationErrors.ingredientes = `Para publicar, estos ingredientes deben existir en el catálogo: ${customNames.join(", ")}. Edítalos y elige una de las sugerencias.`;
      }
    }

    return validationErrors;
  }

  async function persistRecipe(action: SaveMode) {
    if (submittingRef.current) return;
    submittingRef.current = true;

    const validationErrors = validate(action);
    setErrors(validationErrors);
    setGlobalError(null);
    if (Object.keys(validationErrors).length > 0) {
      submittingRef.current = false;
      focusFirstError();
      return;
    }

    // Cualquier autoguardado en vuelo deja de contar: manda el guardado manual.
    autosaveSeqRef.current += 1;
    setAutosave("idle");
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
        uploadedPath = `${user.id}/${recipeId}/${crypto.randomUUID()}.${extensionByType[imageFile.type]}`;
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

      const result = await saveRecipeAction(buildFormData(action, imagePath));
      if (!result.ok) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage
            .from("recipe-images")
            .remove([uploadedPath]);
          if (cleanupError) {
            console.error("Failed to clean up recipe image after save error", {
              recipeId,
              path: uploadedPath,
            });
          }
        }
        setGlobalError(result.message);
        return;
      }

      if (initialRecipe.imagenPath && initialRecipe.imagenPath !== imagePath) {
        const { error: cleanupError } = await supabase.storage
          .from("recipe-images")
          .remove([initialRecipe.imagenPath]);
        if (cleanupError) {
          console.error("Failed to remove the previous recipe image", {
            recipeId,
            path: initialRecipe.imagenPath,
          });
        }
      }

      savedSnapshotRef.current = draftSnapshot;
      setPublishedNow(action === "publicar");
      setSuccess({ mode: action });
      setAutosave("idle");
      router.refresh();
      requestAnimationFrame(() => {
        window.scrollTo({ top: 0, behavior: "smooth" });
      });
    } catch (error) {
      if (uploadedPath) {
        const { error: cleanupError } = await supabase.storage
          .from("recipe-images")
          .remove([uploadedPath]);
        if (cleanupError) {
          console.error("Failed to clean up recipe image after exception", {
            recipeId,
            path: uploadedPath,
          });
        }
      }
      setGlobalError(
        error instanceof Error ? error.message : "No se pudo guardar la receta.",
      );
    } finally {
      submittingRef.current = false;
      setIsPending(false);
    }
  }

  function handleDraftClick() {
    setSuccess(null);
    if (isPublished) {
      setUnpublishConfirmationOpen(true);
      return;
    }
    void persistRecipe("borrador");
  }

  function handlePublishClick() {
    setSuccess(null);
    const validationErrors = validate("publicar");
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      setGlobalError(null);
      focusFirstError();
      return;
    }
    setPublishConfirmationOpen(true);
  }

  const autosaveLabel: Record<AutosaveStatus, string> = {
    idle: "",
    saving: "Guardando...",
    saved: "Guardado automáticamente",
    error: "Error al guardar automáticamente",
  };

  return (
    <form
      className="space-y-4"
      onKeyDown={(event) => {
        // Enter en un campo de una línea no debe publicar la receta: publicar
        // es siempre una acción explícita desde su botón.
        if (
          event.key === "Enter" &&
          event.target instanceof HTMLInputElement &&
          event.target.type !== "submit"
        ) {
          event.preventDefault();
        }
      }}
      onSubmit={(event) => {
        event.preventDefault();
        handlePublishClick();
      }}
    >
      {success && (
        <div
          className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3"
          role="status"
        >
          <p className="text-sm font-bold text-emerald-900">
            ✓{" "}
            {success.mode === "publicar"
              ? "Receta publicada correctamente"
              : "Borrador guardado"}
          </p>
          <div className="flex flex-wrap gap-3 text-sm font-semibold">
            {success.mode === "publicar" && (
              <Link
                className="text-emerald-800 underline hover:text-emerald-950"
                href={`/recetas/${recipeId}`}
              >
                Ver receta
              </Link>
            )}
            <button
              className="text-emerald-800 underline hover:text-emerald-950"
              onClick={() => setSuccess(null)}
              type="button"
            >
              Seguir editando
            </button>
            <button
              className="text-emerald-800 underline hover:text-emerald-950"
              onClick={() => router.push(returnTo)}
              type="button"
            >
              Ir a mis recetas
            </button>
          </div>
        </div>
      )}

      {globalError && (
        <div
          className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          role="alert"
        >
          {globalError}
        </div>
      )}

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold text-stone-950">Datos básicos</h2>

        <div className="mt-3 space-y-3">
          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-title"
            >
              Título
              <RequiredMark />
            </label>
            <input
              aria-describedby={errors.titulo ? "recipe-title-error" : undefined}
              aria-invalid={Boolean(errors.titulo)}
              className={`${inputClass} ${errors.titulo ? errorInputClass : ""}`}
              id="recipe-title"
              maxLength={120}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Ej. Lentejas con verduras"
              required
              value={title}
            />
            <FieldError id="recipe-title-error" message={errors.titulo} />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label
                className="mb-1 block text-sm font-medium text-stone-700"
                htmlFor="recipe-time"
              >
                Tiempo (min)
                <RequiredMark />
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
                <RequiredMark />
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
              <FieldError id="recipe-servings-error" message={errors.porciones} />
            </div>
          </div>

          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-description"
            >
              Descripción
              <OptionalTag />
            </label>
            <textarea
              aria-describedby={
                errors.descripcion ? "recipe-description-error" : undefined
              }
              aria-invalid={Boolean(errors.descripcion)}
              className={`${inputClass} min-h-16 resize-y ${errors.descripcion ? errorInputClass : ""}`}
              id="recipe-description"
              maxLength={1000}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Un par de líneas sobre el plato"
              rows={2}
              value={description}
            />
            <FieldError
              id="recipe-description-error"
              message={errors.descripcion}
            />
          </div>

          <fieldset>
            <legend className="mb-1 block text-sm font-medium text-stone-700">
              Tipo de comida
              <OptionalTag />
            </legend>
            <div className="flex flex-wrap gap-2">
              {MEAL_TYPES.map((option) => {
                const checked = mealTypes.includes(option);
                return (
                  <label
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm font-semibold transition active:scale-95 ${
                      checked
                        ? "border-emerald-700 bg-emerald-100 text-emerald-900"
                        : "border-stone-300 bg-white text-stone-600 hover:border-emerald-700"
                    }`}
                    key={option}
                  >
                    <input
                      checked={checked}
                      className="sr-only"
                      onChange={() =>
                        setMealTypes((current) =>
                          current.includes(option)
                            ? current.filter((item) => item !== option)
                            : [...current, option],
                        )
                      }
                      type="checkbox"
                      value={option}
                    />
                    {option}
                  </label>
                );
              })}
            </div>
          </fieldset>
        </div>
      </section>

      <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="text-lg font-bold text-stone-950">
          Imagen y vídeo
          <OptionalTag />
        </h2>
        <div className="mt-3 space-y-3">
          <RecipeImagePicker
            error={errors.imagen}
            errorId="recipe-image-error"
            onRemove={() => {
              setImageFile(null);
              setRemoveImage(true);
            }}
            onSelect={(file) => {
              setImageFile(file);
              setRemoveImage(false);
            }}
            previewUrl={imagePreview}
          />
          <div>
            <label
              className="mb-1 block text-sm font-medium text-stone-700"
              htmlFor="recipe-video-url"
            >
              Vídeo de YouTube
            </label>
            <input
              aria-describedby={
                errors.video ? "recipe-video-url-error" : undefined
              }
              aria-invalid={Boolean(errors.video)}
              className={`${inputClass} ${errors.video ? errorInputClass : ""}`}
              id="recipe-video-url"
              maxLength={500}
              onChange={(event) => setVideoUrl(event.target.value)}
              placeholder="https://www.youtube.com/watch?v=..."
              type="url"
              value={videoUrl}
            />
            <FieldError id="recipe-video-url-error" message={errors.video} />
          </div>
        </div>
      </section>

      <RecipeIngredientsEditor
        error={errors.ingredientes}
        errorId="recipe-ingredients-error"
        onChange={setIngredients}
        options={ingredientOptions}
        rows={ingredients}
      />

      <RecipeInstructionsEditor
        error={errors.instrucciones}
        errorId="recipe-instructions-error"
        onChange={setInstructions}
        rows={instructions}
      />

      {/* En móvil la barra se coloca justo encima de la navegación inferior
          (3.5rem + safe area), que es fija y la tapaba. */}
      <div className="sticky bottom-[calc(3.5rem+env(safe-area-inset-bottom)+0.5rem)] z-10 rounded-2xl border border-stone-200 bg-white/95 p-3 shadow-xl backdrop-blur sm:bottom-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-stone-600">
              {completedCount} de {requirements.length} campos necesarios
              completados
            </p>
            <p className="mt-0.5 text-xs text-stone-500">
              {isComplete
                ? "Listo para publicar"
                : `Falta: ${requirements
                    .filter((requirement) => !requirement.done)
                    .map((requirement) => requirement.label)
                    .join(", ")}`}
            </p>
            <p
              aria-live="polite"
              className="mt-0.5 text-xs text-stone-400"
              role="status"
            >
              {autosaveLabel[autosave]}
            </p>
          </div>
          {/* En fila también en móvil: apilados, la barra fija se comía media
              pantalla por encima de la navegación inferior. */}
          <div className="flex shrink-0 gap-2">
            <button
              className="flex-1 rounded-xl px-4 py-2.5 text-sm font-bold text-stone-700 hover:bg-stone-100 active:bg-stone-200 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:py-3"
              disabled={isPending}
              onClick={handleDraftClick}
              type="button"
            >
              {isPending ? "Guardando..." : "Guardar borrador"}
            </button>
            <button
              className="flex-1 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-emerald-800 active:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-6 sm:py-3"
              disabled={isPending}
              type="submit"
            >
              {isPending ? "Publicando..." : "Publicar receta"}
            </button>
          </div>
        </div>
      </div>

      <ConfirmDialog
        busy={isPending}
        cancelLabel="Cancelar"
        confirmLabel="Sí, publicar"
        description="La receta será visible para el resto de usuarios. Si aún no está lista, guárdala como borrador."
        onCancel={() => setPublishConfirmationOpen(false)}
        onConfirm={() => {
          setPublishConfirmationOpen(false);
          void persistRecipe("publicar");
        }}
        open={publishConfirmationOpen}
        title="¿Publicar esta receta?"
      />

      <ConfirmDialog
        busy={isPending}
        cancelLabel="Cancelar"
        confirmLabel="Sí, pasar a borrador"
        description="La receta dejará de ser visible para el resto de usuarios hasta que vuelvas a publicarla."
        onCancel={() => setUnpublishConfirmationOpen(false)}
        onConfirm={() => {
          setUnpublishConfirmationOpen(false);
          void persistRecipe("borrador");
        }}
        open={unpublishConfirmationOpen}
        title="¿Convertir en borrador?"
        tone="danger"
      />
    </form>
  );
}
