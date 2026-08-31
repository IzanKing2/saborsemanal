"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

export type InstructionRow = { key: string; value: string };

type RecipeInstructionsEditorProps = {
  rows: InstructionRow[];
  error?: string;
  errorId: string;
  onChange: (rows: InstructionRow[]) => void;
};

// `overflow-hidden`: el alto lo fija `autoGrow`, así que la barra de scroll
// interna sobra -- y con `box-sizing: border-box` el borde la hacía aparecer
// aunque el texto cupiese.
const textareaClass =
  "w-full resize-none overflow-hidden rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm leading-6 text-stone-950 outline-none transition focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20";
const errorTextareaClass =
  "border-red-500 focus:border-red-600 focus:ring-red-500/20";

// Un paso vacío ocupa dos líneas y crece con el texto: así diez pasos cortos no
// generan diez cajas altas y no hace falta scroll para leerlos.
function autoGrow(element: HTMLTextAreaElement | null) {
  if (!element) return;
  element.style.height = "auto";
  element.style.height = `${Math.max(element.scrollHeight, 40)}px`;
}

export function RecipeInstructionsEditor({
  rows,
  error,
  errorId,
  onChange,
}: RecipeInstructionsEditorProps) {
  const fields = useRef(new Map<string, HTMLTextAreaElement>());
  const [pendingFocus, setPendingFocus] = useState<string | null>(null);
  const [draggingKey, setDraggingKey] = useState<string | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!pendingFocus) return;
    const field = fields.current.get(pendingFocus);
    if (field) {
      field.focus();
      field.setSelectionRange(field.value.length, field.value.length);
    }
    setPendingFocus(null);
  }, [pendingFocus]);

  function addStepAfter(index: number) {
    const key = crypto.randomUUID();
    const next = [...rows];
    next.splice(index + 1, 0, { key, value: "" });
    onChange(next);
    setPendingFocus(key);
  }

  function removeStep(index: number) {
    if (rows.length === 1) {
      onChange([{ key: rows[0].key, value: "" }]);
      setPendingFocus(rows[0].key);
      return;
    }
    const next = rows.filter((_, position) => position !== index);
    onChange(next);
    setAnnouncement(`Paso ${index + 1} eliminado.`);
    setPendingFocus(next[Math.max(index - 1, 0)].key);
  }

  function moveStep(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= rows.length) return;
    const next = [...rows];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    setAnnouncement(`Paso movido a la posición ${target + 1} de ${rows.length}.`);
  }

  function moveStepTo(fromKey: string, toKey: string) {
    if (fromKey === toKey) return;
    const from = rows.findIndex((row) => row.key === fromKey);
    const to = rows.findIndex((row) => row.key === toKey);
    if (from < 0 || to < 0) return;
    const next = [...rows];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
    setAnnouncement(`Paso movido a la posición ${to + 1} de ${rows.length}.`);
  }

  function handleKeyDown(
    event: KeyboardEvent<HTMLTextAreaElement>,
    index: number,
  ) {
    const field = event.currentTarget;

    // Alt + flechas es la alternativa accesible al arrastrar con el ratón.
    if (event.altKey && (event.key === "ArrowUp" || event.key === "ArrowDown")) {
      event.preventDefault();
      moveStep(index, event.key === "ArrowUp" ? -1 : 1);
      setPendingFocus(rows[index].key);
      return;
    }

    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      // Enter en un paso todavía vacío no encadena otro vacío detrás.
      if (field.value.trim() !== "") addStepAfter(index);
      return;
    }

    // Borrar un paso vacío devuelve al anterior, como en una lista de notas.
    if (
      event.key === "Backspace" &&
      field.value === "" &&
      rows.length > 1 &&
      index > 0
    ) {
      event.preventDefault();
      removeStep(index);
    }
  }

  return (
    <section className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-lg font-bold text-stone-950">
          Preparación{" "}
          <span aria-hidden="true" className="text-emerald-700">
            *
          </span>
          <span className="sr-only">(obligatorio)</span>
        </h2>
        <p className="text-xs text-stone-500">
          Enter crea el siguiente paso · Shift+Enter salta de línea
        </p>
      </div>

      <p aria-live="polite" className="sr-only" role="status">
        {announcement}
      </p>

      <ol className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <li
            className={`grid grid-cols-[2rem_minmax(0,1fr)_auto] items-start gap-2 rounded-xl p-1 transition ${
              dropKey === row.key && draggingKey !== row.key
                ? "bg-emerald-50 ring-2 ring-emerald-600/40"
                : ""
            } ${draggingKey === row.key ? "opacity-50" : ""}`}
            key={row.key}
            onDragEnd={() => {
              setDraggingKey(null);
              setDropKey(null);
            }}
            onDragOver={(event) => {
              if (!draggingKey) return;
              event.preventDefault();
              setDropKey(row.key);
            }}
            onDrop={(event) => {
              event.preventDefault();
              if (draggingKey) moveStepTo(draggingKey, row.key);
              setDraggingKey(null);
              setDropKey(null);
            }}
          >
            <button
              aria-label={`Mover el paso ${index + 1}. Usa Alt y las flechas arriba o abajo para reordenarlo`}
              className="mt-0.5 flex size-8 cursor-grab items-center justify-center rounded-full bg-emerald-900 text-sm font-bold text-white active:cursor-grabbing"
              draggable
              onDragStart={(event) => {
                // Firefox solo inicia el arrastre si el evento lleva datos.
                event.dataTransfer.setData("text/plain", row.key);
                event.dataTransfer.effectAllowed = "move";
                setDraggingKey(row.key);
              }}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" || event.key === "ArrowDown") {
                  event.preventDefault();
                  moveStep(index, event.key === "ArrowUp" ? -1 : 1);
                }
              }}
              type="button"
            >
              {index + 1}
            </button>

            <div>
              <label className="sr-only" htmlFor={`instruction-${row.key}`}>
                Paso {index + 1}
              </label>
              <textarea
                aria-describedby={error ? errorId : undefined}
                aria-invalid={Boolean(error)}
                className={`${textareaClass} ${error ? errorTextareaClass : ""}`}
                id={`instruction-${row.key}`}
                maxLength={1000}
                onChange={(event) => {
                  autoGrow(event.currentTarget);
                  onChange(
                    rows.map((item) =>
                      item.key === row.key
                        ? { ...item, value: event.target.value }
                        : item,
                    ),
                  );
                }}
                onKeyDown={(event) => handleKeyDown(event, index)}
                placeholder={
                  index === 0
                    ? "Describe el primer paso..."
                    : "Describe el siguiente paso..."
                }
                ref={(element) => {
                  if (element) {
                    fields.current.set(row.key, element);
                    autoGrow(element);
                  } else {
                    fields.current.delete(row.key);
                  }
                }}
                rows={1}
                value={row.value}
              />
            </div>

            <button
              aria-label={`Eliminar el paso ${index + 1}`}
              className="mt-0.5 rounded-lg px-2 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 active:bg-red-100 disabled:opacity-30"
              disabled={rows.length === 1 && rows[0].value === ""}
              onClick={() => removeStep(index)}
              type="button"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ol>

      <button
        className="mt-2 rounded-lg border border-emerald-700 px-3 py-2 text-sm font-semibold text-emerald-800 hover:bg-emerald-50 active:bg-emerald-100"
        onClick={() => addStepAfter(rows.length - 1)}
        type="button"
      >
        Añadir paso
      </button>

      {error && (
        <p className="mt-2 text-xs text-red-600" id={errorId}>
          {error}
        </p>
      )}
    </section>
  );
}
