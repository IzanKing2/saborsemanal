import Link from "next/link";

import { AdminNav } from "@/components/navigation/admin-nav";
import { logoutAction } from "@/lib/actions/cuenta";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-stone-100">
      <header className="sticky top-0 z-40 border-b border-stone-800 bg-stone-950 text-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="font-black" href="/admin">SaborSemanal <span className="text-amber-300">Admin</span></Link>
          <AdminNav logout={logoutAction} />
        </div>
      </header>
      {children}
    </div>
  );
}
