import Link from "next/link";
import { redirect } from "next/navigation";

import {
  WeeklyPlanner,
  type PlannerRecipe,
} from "@/components/planner/weekly-planner";
import { createClient } from "@/lib/supabase/server";
import { parseMonday } from "@/lib/week";

type GuestPlannerPageProps = {
  searchParams: Promise<{ week?: string | string[] }>;
};

export default async function GuestPlannerPage({
  searchParams,
}: GuestPlannerPageProps) {
  const params = await searchParams;
  const weekValue = Array.isArray(params.week) ? params.week[0] : params.week;
  const week = parseMonday(weekValue);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect(`/dashboard/planificador?week=${week}`);

  const { data, error } = await supabase
    .from("recetas")
    .select(
      `
        id,
        titulo,
        receta_ingredientes (
          cantidad,
          unidad,
          ingrediente_id,
          nombre_personalizado,
          ingredientes (
            nombre,
            categorias_ingredientes (nombre)
          )
        )
      `,
    )
    .eq("publica", true)
    .eq("aprobada", true)
    .order("titulo");

  if (error) {
    throw new Error(`No se pudieron cargar las recetas: ${error.message}`);
  }

  const recipes: PlannerRecipe[] = (data ?? []).map((recipe) => ({
    id: recipe.id,
    titulo: recipe.titulo,
    ingredientes: recipe.receta_ingredientes.map((item) => ({
      ingredienteId: item.ingrediente_id,
      nombre: item.ingredientes?.nombre ?? item.nombre_personalizado ?? "Otros",
      categoria:
        item.ingredientes?.categorias_ingredientes?.nombre ?? "Otros",
      cantidad: Number(item.cantidad),
      unidad: item.unidad,
    })),
  }));

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-6xl px-4 py-9 sm:px-6 lg:px-8">
          <Link
            className="text-sm font-semibold text-emerald-200 hover:text-white"
            href="/recetas"
          >
            ← Catálogo de recetas
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Modo invitado
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Planifica tu semana
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-100">
            Tu menú se guarda únicamente en este navegador. Inicia sesión para
            sincronizarlo entre dispositivos y usar tus propias recetas.
          </p>
          <Link
            className="mt-5 inline-block rounded-lg bg-amber-300 px-4 py-2 text-sm font-bold text-emerald-950 hover:bg-amber-200"
            href="/login"
          >
            Iniciar sesión
          </Link>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <WeeklyPlanner
          basePath="/planificador"
          initialSlots={{}}
          key={week}
          mode="local"
          recipes={recipes}
          week={week}
        />
      </div>
    </main>
  );
}
