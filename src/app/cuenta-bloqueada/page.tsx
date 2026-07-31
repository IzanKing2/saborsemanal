import Link from "next/link";

import { BlockedAccountDeletion } from "@/components/account/blocked-account-deletion";
import { logoutAction } from "@/lib/actions/cuenta";

export default function BlockedAccountPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f6f3ea] px-4 text-stone-900">
      <div className="w-full max-w-xl rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-amber-700">Cuenta restringida</p>
        <h1 className="mt-3 text-3xl font-black">No puedes acceder al panel</h1>
        <p className="mt-4 leading-7 text-stone-600">Tu cuenta está temporalmente bloqueada. Contacta con el equipo de SaborSemanal si crees que se trata de un error.</p>
        <div className="mt-7 flex justify-center gap-3"><Link className="rounded-xl border border-stone-300 px-4 py-2 font-bold" href="/">Volver al inicio</Link><form action={logoutAction}><button className="rounded-xl bg-emerald-700 px-4 py-2 font-bold text-white" type="submit">Cerrar sesión</button></form></div>
        <BlockedAccountDeletion />
      </div>
    </main>
  );
}
