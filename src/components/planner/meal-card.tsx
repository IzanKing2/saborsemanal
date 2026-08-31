"use client";

import Image from "next/image";
import { useRef, useState, type DragEvent } from "react";

import {
  MealActionsItem,
  MealActionsMenu,
} from "@/components/planner/meal-actions-menu";
import { MAX_SERVINGS, isValidServings, type PlannedMeal } from "@/lib/planner";
import type { MealType, WeekDay } from "@/lib/week";

export type MealCardRecipe = {
  id: string;
  titulo: string;
  imagenUrl?: string | null;
  porciones: number;
};

type MealCardProps = {
  meal: PlannedMeal;
  recipe: MealCardRecipe;
  day: WeekDay;
  mealType: MealType;
  canBeLeftover: boolean;
  pending: boolean;
  dragging: boolean;
  onChange: () => void;
  onDuplicate: () => void;
  onMove: () => void;
  onRemove: () => void;
  onServingsChange: (raciones: number | null) => void;
  onToggleLeftover: () => void;
  onDragStart: (event: DragEvent<HTMLElement>) => void;
  onDragEnd: () => void;
};

export function MealCard({
  meal,
  recipe,
  day,
  mealType,
  canBeLeftover,
  pending,
  dragging,
  onChange,
  onDuplicate,
  onMove,
  onRemove,
  onServingsChange,
  onToggleLeftover,
  onDragStart,
  onDragEnd,
}: MealCardProps) {
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [editingServings, setEditingServings] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  const servings = meal.raciones ?? recipe.porciones;
  const showImage = Boolean(recipe.imagenUrl) && !imageFailed;

  function closeMenu() {
    setMenuOpen(false);
    setEditingServings(false);
    menuButtonRef.current?.focus();
  }

  function applyServings(value: number) {
    if (!isValidServings(value)) return;
    onServingsChange(value === recipe.porciones ? null : value);
  }

  return (
    <div
      className={`group relative flex items-start gap-1.5 rounded-xl border bg-white p-1.5 shadow-sm transition sm:gap-2 sm:p-2 ${
        meal.esSobra
          ? "border-amber-300 bg-amber-50/60"
          : "border-stone-200 hover:border-emerald-700"
      } ${dragging ? "opacity-40" : ""} ${pending ? "animate-pulse" : ""}`}
      draggable
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      <span className="relative block size-8 shrink-0 overflow-hidden rounded-lg bg-stone-100 sm:size-9">
        {showImage ? (
          <Image
            alt=""
            className="object-cover"
            fill
            onError={() => setImageFailed(true)}
            sizes="40px"
            src={recipe.imagenUrl as string}
          />
        ) : (
          // Placeholder neutro: ni icono de imagen rota ni hueco descuadrado.
          <span
            aria-hidden="true"
            className="flex h-full items-center justify-center bg-stone-100 text-base"
          >
            🍽️
          </span>
        )}
      </span>

      <button
        className="min-w-0 flex-1 cursor-grab text-left active:cursor-grabbing"
        onClick={onChange}
        title={`${recipe.titulo} · ${day} ${mealType}`}
        type="button"
      >
        {/* Dos líneas antes que recortar: en la columna estrecha de escritorio
            un `truncate` dejaba títulos ilegibles como "[...". */}
        <span className="line-clamp-2 text-[11px] font-bold leading-tight text-stone-900">
          {meal.esSobra ? `Sobras de ${recipe.titulo}` : recipe.titulo}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5">
          {meal.esSobra ? (
            <span className="rounded-full bg-amber-200 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-wide text-amber-900">
              Sobras
            </span>
          ) : (
            <span className="whitespace-nowrap text-[10px] font-semibold text-stone-500">
              {servings} {servings === 1 ? "ración" : "raciones"}
            </span>
          )}
        </span>
      </button>

      <button
        aria-expanded={menuOpen}
        aria-haspopup="menu"
        aria-label={`Acciones de ${recipe.titulo} en ${day} ${mealType}`}
        className="shrink-0 rounded-lg px-1.5 py-1 text-sm font-black leading-none text-stone-400 transition hover:bg-stone-100 hover:text-stone-700 focus-visible:text-stone-700 group-hover:text-stone-600"
        disabled={pending}
        onClick={() => setMenuOpen(true)}
        ref={menuButtonRef}
        type="button"
      >
        ⋯
      </button>

      {menuOpen && (
        <MealActionsMenu
          anchor={menuButtonRef.current}
          onClose={closeMenu}
          title={`${day} · ${mealType}`}
        >
          {editingServings ? (
            <div className="p-2">
              <p className="mb-2 text-sm font-bold text-stone-800">Raciones</p>
              <div className="flex items-center gap-2">
                <button
                  aria-label="Quitar una ración"
                  className="size-9 rounded-lg border border-stone-300 text-lg font-black text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                  disabled={servings <= 1}
                  onClick={() => applyServings(servings - 1)}
                  type="button"
                >
                  −
                </button>
                <label className="sr-only" htmlFor="meal-servings">
                  Número de raciones
                </label>
                <input
                  className="h-9 w-16 rounded-lg border border-stone-300 text-center text-sm font-bold text-stone-900 outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/20"
                  id="meal-servings"
                  max={MAX_SERVINGS}
                  min={1}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    if (isValidServings(value)) applyServings(value);
                  }}
                  onFocus={(event) => event.target.select()}
                  type="number"
                  value={servings}
                />
                <button
                  aria-label="Añadir una ración"
                  className="size-9 rounded-lg border border-stone-300 text-lg font-black text-stone-700 hover:bg-stone-50 disabled:opacity-40"
                  disabled={servings >= MAX_SERVINGS}
                  onClick={() => applyServings(servings + 1)}
                  type="button"
                >
                  +
                </button>
              </div>
              <p className="mt-2 text-xs text-stone-500">
                La receta trae {recipe.porciones}. La compra se ajusta a las
                raciones de este día.
              </p>
              <div className="mt-2 flex gap-2">
                {meal.raciones !== null && (
                  <button
                    className="rounded-lg px-2 py-1.5 text-xs font-bold text-stone-600 hover:bg-stone-100"
                    onClick={() => onServingsChange(null)}
                    type="button"
                  >
                    Usar {recipe.porciones}
                  </button>
                )}
                <button
                  className="ml-auto rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-emerald-800"
                  onClick={closeMenu}
                  type="button"
                >
                  Listo
                </button>
              </div>
            </div>
          ) : (
            <>
              <MealActionsItem
                onClick={() => {
                  closeMenu();
                  window.location.assign(`/recetas/${recipe.id}`);
                }}
              >
                Ver receta
              </MealActionsItem>
              <MealActionsItem
                onClick={() => {
                  setMenuOpen(false);
                  onChange();
                }}
              >
                Cambiar receta
              </MealActionsItem>
              <MealActionsItem
                disabled={meal.esSobra}
                hint={meal.esSobra ? undefined : String(servings)}
                onClick={() => setEditingServings(true)}
              >
                Editar raciones
              </MealActionsItem>
              <MealActionsItem
                onClick={() => {
                  setMenuOpen(false);
                  onMove();
                }}
              >
                Mover a...
              </MealActionsItem>
              <MealActionsItem
                onClick={() => {
                  setMenuOpen(false);
                  onDuplicate();
                }}
              >
                Duplicar en...
              </MealActionsItem>
              <MealActionsItem
                disabled={!meal.esSobra && !canBeLeftover}
                hint={
                  !meal.esSobra && !canBeLeftover
                    ? "sin cocinado previo"
                    : undefined
                }
                onClick={() => {
                  closeMenu();
                  onToggleLeftover();
                }}
              >
                {meal.esSobra ? "Quitar marca de sobra" : "Marcar como sobra"}
              </MealActionsItem>
              <MealActionsItem
                onClick={() => {
                  setMenuOpen(false);
                  onRemove();
                }}
                tone="danger"
              >
                Quitar del menú
              </MealActionsItem>
            </>
          )}
        </MealActionsMenu>
      )}
    </div>
  );
}
