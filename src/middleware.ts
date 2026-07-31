import { createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";
import type { Database } from "@/types/database.types";

export async function middleware(request: NextRequest) {
  const { response } = await updateSession(request);
  function redirectWithRefreshedCookies(url: URL) {
    const redirectResponse = NextResponse.redirect(url);
    response.cookies
      .getAll()
      .forEach((cookie) => redirectResponse.cookies.set(cookie));
    return redirectResponse;
  }

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { pathname } = request.nextUrl;
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isDashboardRoute =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isGuestAuthRoute = ["/login", "/register", "/forgot-password"].includes(
    pathname,
  );

  if (user && isGuestAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return redirectWithRefreshedCookies(url);
  }

  const { data: profile } =
    user && (isAdminRoute || isDashboardRoute)
      ? await supabase
          .from("profiles")
          .select("role, banned")
          .eq("id", user.id)
          .single()
      : { data: null };

  if (isAdminRoute) {
    if (!user) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      return redirectWithRefreshedCookies(url);
    }

    if (profile?.role !== "admin" || profile.banned) {
      const url = request.nextUrl.clone();
      url.pathname = "/dashboard";
      const redirectResponse = redirectWithRefreshedCookies(url);
      redirectResponse.headers.set("x-redirect-reason", "unauthorized");
      return redirectResponse;
    }

    return response;
  }

  if (isDashboardRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    url.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return redirectWithRefreshedCookies(url);
  }

  if (isDashboardRoute && profile?.banned) {
    const url = request.nextUrl.clone();
    url.pathname = "/cuenta-bloqueada";
    url.search = "";
    return redirectWithRefreshedCookies(url);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|ico)$).*)",
  ],
};
