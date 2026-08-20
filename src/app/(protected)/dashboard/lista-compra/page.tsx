import Link from "next/link";
import { redirect } from "next/navigation";

import { OfflineBanner } from "@/components/shopping/offline-banner";
import {
  CloudShoppingList,
  ExtraShoppingList,
} from "@/components/shopping/shopping-list";
import { ShoppingListTools } from "@/components/shopping/shopping-list-tools";
import type { ShoppingListItem } from "@/lib/shopping-list";
import { createClient } from "@/lib/supabase/server";
import { addWeeks, parseMonday } from "@/lib/week";

type ShoppingListPageProps = {
  searchParams: Promise<{ week?: string | string[] }>;
};

function formatWeek(week: string) {
  const start = new Date(`${week}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const formatter = new Intl.DateTimeFormat("es-ES", {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
  return `${formatter.format(start)} al ${formatter.format(end)}`;
}

export default async function ShoppingListPage({
  searchParams,
}: ShoppingListPageProps) {
  const params = await searchParams;
  const weekValue = Array.isArray(params.week) ? params.week[0] : params.week;
  const week = parseMonday(weekValue);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: menu, error: menuError } = await supabase
    .from("menus_semanales")
    .select("id")
    .eq("semana_inicio", week)
    .maybeSingle();
  if (menuError) {
    throw new Error(`No se pudo cargar el menú: ${menuError.message}`);
  }

  const { data, error } = menu
    ? await supabase
        .from("shopping_list_items")
        .select(
          `
            id,
            ingrediente_id,
            nombre_personalizado,
            cantidad,
            unidad,
            comprado,
            ingredientes (
              nombre,
              categorias_ingredientes (nombre)
            )
          `,
        )
        .eq("menu_id", menu.id)
        .order("created_at")
    : { data: [], error: null };
  if (error) {
    throw new Error(`No se pudo cargar la lista: ${error.message}`);
  }

  const items: ShoppingListItem[] = (data ?? []).map((item) => ({
    id: item.id,
    nombre: item.ingredientes?.nombre ?? item.nombre_personalizado ?? "Otros",
    categoria: item.ingredientes?.categorias_ingredientes?.nombre ?? "Otros",
    cantidad: Number(item.cantidad),
    unidad: item.unidad,
    comprado: item.comprado,
  }));

  const { data: extraRows, error: extraError } = await supabase
    .from("shopping_list_extra")
    .select(
      `
        id,
        ingrediente_id,
        nombre_personalizado,
        cantidad,
        unidad,
        comprado,
        ingredientes (
          nombre,
          categorias_ingredientes (nombre)
        )
      `,
    )
    .order("created_at");
  if (extraError) {
    throw new Error(`No se pudo cargar tu lista: ${extraError.message}`);
  }

  const extraItems: ShoppingListItem[] = (extraRows ?? []).map((item) => ({
    id: item.id,
    nombre: item.ingredientes?.nombre ?? item.nombre_personalizado ?? "Otros",
    categoria: item.ingredientes?.categorias_ingredientes?.nombre ?? "Otros",
    cantidad: Number(item.cantidad),
    unidad: item.unidad,
    comprado: item.comprado,
  }));

  return (
    <main className="min-h-screen bg-[#f6f3ea] text-stone-900">
      <header className="bg-emerald-950 text-white">
        <div className="mx-auto max-w-4xl px-4 py-9 sm:px-6 lg:px-8">
          <Link
            className="text-sm font-semibold text-emerald-200 hover:text-white"
            href={`/dashboard/planificador?week=${week}`}
          >
            ← Volver al planificador
          </Link>
          <p className="mt-6 text-xs font-bold uppercase tracking-[0.25em] text-amber-300">
            Semana del {formatWeek(week)}
          </p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">
            Lista de la compra
          </h1>
          <p className="mt-3 max-w-2xl text-emerald-100">
            Cantidades consolidadas por ingrediente y unidad, sincronizadas con
            tu cuenta.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <nav
          aria-label="Cambiar semana"
          className="mb-6 grid grid-cols-2 gap-3"
        >
          <Link
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
            href={`/dashboard/lista-compra?week=${addWeeks(week, -1)}`}
          >
            ← Semana anterior
          </Link>
          <Link
            className="rounded-lg border border-stone-300 bg-white px-4 py-2 text-center text-sm font-bold text-stone-700 hover:bg-stone-50"
            href={`/dashboard/lista-compra?week=${addWeeks(week, 1)}`}
          >
            Semana siguiente →
          </Link>
        </nav>
        <OfflineBanner />
        <div className="mb-6">
          <ShoppingListTools
            items={[...items, ...extraItems]}
            title={`Lista de la compra – Semana del ${formatWeek(week)}`}
          />
        </div>
        <CloudShoppingList initialItems={items} key={week} week={week} />
        <ExtraShoppingList initialItems={extraItems} />
      </div>
    </main>
  );
}
