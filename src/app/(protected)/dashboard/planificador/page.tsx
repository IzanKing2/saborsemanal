import Link from "next/link";
import { redirect } from "next/navigation";

import {
  WeeklyPlanner,
  type PlannerRecipe,
  type PlannerSlots,
} from "@/components/planner/weekly-planner";
import { createClient } from "@/lib/supabase/server";
import {
  isMealType,
  isWeekDay,
  menuSlotKey,
  parseMonday,
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
      .select("id, titulo, creador_id, publica, aprobada")
      .order("titulo"),
    supabase
      .from("menus_semanales")
      .select("id")
      .eq("usuario_id", user.id)
      .eq("semana_inicio", week)
      .maybeSingle(),
  ]);

  const queryError = recipesResult.error ?? menuResult.error;
  if (queryError) {
    throw new Error(`No se pudo cargar el planificador: ${queryError.message}`);
  }

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
    etiqueta:
      recipe.creador_id === user.id
        ? recipe.publica
          ? recipe.aprobada
            ? "Tu receta publicada"
            : "Tu receta pendiente"
          : "Tu borrador"
        : "Catálogo",
  }));
  const slots: PlannerSlots = {};
  for (const row of menuRows ?? []) {
    if (isWeekDay(row.dia_semana) && isMealType(row.tipo_comida)) {
      slots[menuSlotKey(row.dia_semana, row.tipo_comida)] = row.receta_id;
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
