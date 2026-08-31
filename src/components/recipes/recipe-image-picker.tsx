"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";

type RecipeImagePickerProps = {
  previewUrl: string | null;
  error?: string;
  errorId: string;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
};

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];

export function RecipeImagePicker({
  previewUrl,
  error,
  errorId,
  onSelect,
  onRemove,
}: RecipeImagePickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    // Un archivo que el navegador no reconoce como imagen aceptada se deja
    // pasar igualmente: la validación de tipo y tamaño ya vive en el formulario
    // y así el usuario ve el mismo mensaje de error que al elegirlo a mano.
    if (file) onSelect(file);
  }

  if (previewUrl) {
    return (
      <div>
        <div className="flex items-center gap-3">
          <div className="relative h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-stone-100">
            <Image
              alt="Vista previa de la receta"
              className="object-cover"
              fill
              sizes="112px"
              src={previewUrl}
              unoptimized={previewUrl.startsWith("blob:")}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700 hover:bg-stone-50 active:bg-stone-100"
              onClick={() => inputRef.current?.click()}
              type="button"
            >
              Cambiar imagen
            </button>
            <button
              className="rounded-lg px-3 py-2 text-xs font-bold text-red-700 hover:bg-red-50 active:bg-red-100"
              onClick={onRemove}
              type="button"
            >
              Eliminar imagen
            </button>
          </div>
        </div>
        <input
          accept={ACCEPTED.join(",")}
          aria-label="Cambiar la imagen de la receta"
          className="sr-only"
          onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
        {error && (
          <p className="mt-2 text-xs text-red-600" id={errorId}>
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <div
        className={`rounded-xl border-2 border-dashed px-4 py-4 text-center transition focus-within:border-emerald-700 focus-within:ring-2 focus-within:ring-emerald-700/20 ${
          dragging
            ? "border-emerald-700 bg-emerald-50"
            : "border-stone-300 bg-stone-50"
        }`}
        onDragLeave={() => setDragging(false)}
        onDragOver={(event) => {
          event.preventDefault();
          setDragging(true);
        }}
        onDrop={handleDrop}
      >
        <label
          className="cursor-pointer text-sm font-semibold text-emerald-800 hover:underline"
          htmlFor="recipe-image"
        >
          Arrastra una imagen aquí o selecciónala
        </label>
        <input
          accept={ACCEPTED.join(",")}
          aria-describedby={error ? errorId : "recipe-image-hint"}
          aria-invalid={Boolean(error)}
          className="sr-only"
          id="recipe-image"
          onChange={(event) => onSelect(event.target.files?.[0] ?? null)}
          ref={inputRef}
          type="file"
        />
        <p className="mt-1 text-xs text-stone-500" id="recipe-image-hint">
          JPEG, PNG o WebP. Máximo 5 MB.
        </p>
      </div>
      {error && (
        <p className="mt-2 text-xs text-red-600" id={errorId}>
          {error}
        </p>
      )}
    </div>
  );
}
