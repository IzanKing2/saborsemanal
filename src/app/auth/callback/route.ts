import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";
import { createRecoveryToken } from "@/lib/recovery-token";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const requestedNext = requestUrl.searchParams.get("next");
  let next = "/dashboard";
  if (requestedNext && !requestedNext.includes("\\")) {
    const parsedNext = new URL(requestedNext, requestUrl.origin);
    if (parsedNext.origin === requestUrl.origin) {
      next = `${parsedNext.pathname}${parsedNext.search}${parsedNext.hash}`;
    }
  }

  if (code) {
    const cookieStore = await cookies();
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      if (next === "/reset-password") {
        await supabase.auth.signOut();
        const response = NextResponse.redirect(
          new URL("/reset-password", requestUrl.origin),
        );
        response.cookies.set(
          "saborsemanal-recovery",
          createRecoveryToken(data.user.id),
          {
            httpOnly: true,
            maxAge: 600,
            path: "/reset-password",
            sameSite: "lax",
            secure: process.env.NODE_ENV === "production",
          },
        );
        for (const cookie of cookieStore.getAll()) {
          if (cookie.name.startsWith("sb-")) {
            response.cookies.set(cookie.name, "", {
              httpOnly: true,
              path: "/",
              sameSite: "lax",
              secure: process.env.NODE_ENV === "production",
              maxAge: 0,
            });
          }
        }
        return response;
      }
      return NextResponse.redirect(new URL(next, requestUrl.origin));
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
}
