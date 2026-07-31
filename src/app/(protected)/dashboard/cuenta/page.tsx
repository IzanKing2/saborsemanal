import { redirect } from "next/navigation";

import { AccountSettings } from "@/components/account/account-settings";
import { getProfileAvatarUrl } from "@/lib/profile-avatars";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Mi cuenta",
};

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [profileResult, allergensResult, preferencesResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, display_name, avatar_path")
      .eq("id", user.id)
      .single(),
    supabase.from("alergenos").select("id, nombre").order("nombre"),
    supabase
      .from("profile_allergens")
      .select("allergen_id")
      .eq("user_id", user.id),
  ]);
  const error =
    profileResult.error ?? allergensResult.error ?? preferencesResult.error;
  if (error) throw new Error(`No se pudo cargar la cuenta: ${error.message}`);

  const profile = profileResult.data;
  if (!profile) throw new Error("No se encontró el perfil de la cuenta.");
  const avatarUrl = await getProfileAvatarUrl(supabase, profile.avatar_path);

  return (
    <main className="px-4 py-10 text-stone-900 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <p className="text-xs font-black uppercase tracking-[0.25em] text-amber-700">
          Preferencias y seguridad
        </p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-stone-950 sm:text-5xl">
          Mi cuenta
        </h1>
        <p className="mt-3 max-w-2xl leading-7 text-stone-600">
          Gestiona cómo te ven en tus recetas, adapta el catálogo y protege tu
          acceso.
        </p>
        <div className="mt-9">
          <AccountSettings
            allergens={allergensResult.data ?? []}
            avatarPath={profile.avatar_path}
            avatarUrl={avatarUrl}
            displayName={profile.display_name ?? "Cocinero de SaborSemanal"}
            email={profile.email}
            selectedAllergenIds={(preferencesResult.data ?? []).map(
              (item) => item.allergen_id,
            )}
            userId={user.id}
          />
        </div>
      </div>
    </main>
  );
}
