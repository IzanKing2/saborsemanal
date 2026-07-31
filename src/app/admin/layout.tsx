import Link from "next/link";

import { AdminNav } from "@/components/navigation/admin-nav";
import { logoutAction } from "@/lib/actions/cuenta";

export default function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-[#f6f3ea]">
      <header className="sticky top-0 z-40 border-b border-emerald-900 bg-emerald-950/85 text-white backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          <Link className="font-black text-white" href="/admin">SaborSemanal <span className="text-amber-300">Admin</span></Link>
          <AdminNav logout={logoutAction} />
        </div>
      </header>
      {children}
    </div>
  );
}
