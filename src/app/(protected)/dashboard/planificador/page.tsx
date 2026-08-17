import Link from "next/link";
import { redirect } from "next/navigation";

import {
  WeeklyPlanner,
  type PlannerRecipe,
  type PlannerSlots,
} from "@/components/planner/weekly-planner";
import { createClient } from "@/lib/supabase/server";
import { getRecipeImageUrls } from "@/lib/recipe-images";
import {
  isMealType,
  isWeekDay,
  menuSlotKey,
  parseMonday,
  type MealType,
  type WeekDay,
} from "@/lib/week";

type PlannerPageProps = {
  searchParams: Promise<{ week?: string | string[] }>;
};

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const params = await searchParams;
  const weekValue = Array.isArray(params.week) ? params.week[0] : params.week;
  const week = parseMonday(weekValue);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [recipesResult, menuResult] = await Promise.all([
    supabase
      .from("recetas")
      .select(
        `id,
        titulo,
        imagen_url,
        creador_id,
        publica,
        receta_ingredientes (
          cantidad,
          unidad,
          ingrediente_id,
          nombre_personalizado,
          ingredientes (
            nombre,
            categorias_ingredientes (nombre)
          )
        )`,
      )
      .order("titulo"),
    supabase
      .from("menus_semanales")
      .select("id")
      .eq("semana_inicio", week)
      .maybeSingle(),
  ]);

  const queryError = recipesResult.error ?? menuResult.error;
  if (queryError) {
    throw new Error(`No se pudo cargar el planificador: ${queryError.message}`);
  }

  const imageUrls = await getRecipeImageUrls(
    supabase,
    (recipesResult.data ?? []).map((recipe) => recipe.imagen_url),
  );

  const { data: menuRows, error: menuRowsError } = menuResult.data
    ? await supabase
        .from("menu_recetas")
        .select("dia_semana, tipo_comida, receta_id")
        .eq("menu_id", menuResult.data.id)
    : { data: [], error: null };
  if (menuRowsError) {
    throw new Error(`No se pudo cargar el menú: ${menuRowsError.message}`);
  }

  const recipes: PlannerRecipe[] = (recipesResult.data ?? []).map((recipe) => ({
    id: recipe.id,
    titulo: recipe.titulo,
    imagenUrl: recipe.imagen_url ? imageUrls.get(recipe.imagen_url) ?? null : null,
    etiqueta:
      recipe.creador_id === user.id
        ? recipe.publica
          ? "Tu receta publicada"
          : "Tu borrador"
        : "Catálogo",
    ingredientes: recipe.receta_ingredientes.map((item) => ({
      ingredienteId: item.ingrediente_id,
      nombre: item.ingredientes?.nombre ?? item.nombre_personalizado ?? "Otros",
      categoria:
        item.ingredientes?.categorias_ingredientes?.nombre ?? "Otros",
      cantidad: Number(item.cantidad),
      unidad: item.unidad,
    })),
  }));
  const slots: PlannerSlots = {};
  const pool: string[] = [];
  for (const row of menuRows ?? []) {
    if (isWeekDay(row.dia_semana ?? "") && isMealType(row.tipo_comida ?? "")) {
      slots[menuSlotKey(row.dia_semana as WeekDay, row.tipo_comida as MealType)] =
        row.receta_id;
    } else if (row.dia_semana === null) {
      pool.push(row.receta_id);
    }
  }

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
          <Link
            className="text-sm font-semibold text-emerald-200 hover:text-white"
            href="/dashboard"
          >
            ← Dashboard
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Sincronizado en la nube
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Planificador semanal
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-100">
            Combina tus recetas con el catálogo público. Los cambios se guardan
            automáticamente en tu cuenta.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <WeeklyPlanner
          basePath="/dashboard/planificador"
          initialPool={pool}
          initialSlots={slots}
          key={week}
          mode="cloud"
          recipes={recipes}
          week={week}
        />
      </div>
    </main>
  );
}
