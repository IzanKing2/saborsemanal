import { redirect } from "next/navigation";

import { DashboardHeader } from "@/components/navigation/dashboard-header";
import { getProfileAvatarUrl } from "@/lib/profile-avatars";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_path, role, banned")
    .eq("id", user.id)
    .single();
  if (profile?.banned) redirect("/cuenta-bloqueada");

  const displayName = profile?.display_name ?? user.email?.split("@")[0] ?? "Mi cuenta";
  const avatarUrl = await getProfileAvatarUrl(
    supabase,
    profile?.avatar_path ?? null,
  );

  return (
    <div className="min-h-screen bg-[#f6f3ea]">
      <DashboardHeader
        avatarUrl={avatarUrl}
        displayName={displayName}
        isAdmin={profile?.role === "admin"}
      />
      {children}
    </div>
  );
}
