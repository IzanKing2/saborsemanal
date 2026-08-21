export type MenuLink = { label: string; href: string; accent?: boolean };

// Same everywhere a signed-in user can be: it doesn't matter whether
// they're on a public page or already inside the dashboard, every account
// action should be one tap away. Kept outside user-menu.tsx ("use client")
// since a Server Component (dashboard-header.tsx, site-header.tsx) needs to
// call this directly -- exports from a client module can only be rendered
// as components or passed as props, never invoked as a plain function.
export function accountMenuLinks(isAdmin: boolean): MenuLink[] {
  return [
    { label: "Mi panel", href: "/dashboard" },
    { label: "Favoritas", href: "/dashboard/favoritas" },
    { label: "Mis recetas", href: "/dashboard/recetas" },
    { label: "Mi grupo", href: "/dashboard/grupo" },
    { label: "Mi cuenta", href: "/dashboard/cuenta" },
    ...(isAdmin ? [{ label: "Administración", href: "/admin", accent: true }] : []),
  ];
}
