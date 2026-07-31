import Link from "next/link";

import { logoutAction } from "@/lib/actions/cuenta";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="font-black" href="/admin">SaborSemanal <span className="text-amber-300">Admin</span></Link>
          <nav className="flex min-w-0 items-center gap-3 overflow-x-auto text-sm font-bold"><Link className="shrink-0 text-stone-300 hover:text-white" href="/admin/ingredientes">Catálogos</Link><Link className="shrink-0 text-stone-300 hover:text-white" href="/admin/recetas">Moderación</Link><Link className="shrink-0 text-stone-300 hover:text-white" href="/dashboard">Mi panel</Link><form action={logoutAction}><button className="rounded-lg border border-stone-700 px-3 py-2" type="submit">Salir</button></form></nav>
        </div>
      </header>
      {children}
    </div>
  );
}
