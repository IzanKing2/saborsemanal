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
    await cookies();
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      const response = NextResponse.redirect(new URL(next, requestUrl.origin));
      if (next === "/reset-password") {
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
      }
      return response;
    }
  }

  return NextResponse.redirect(new URL("/login?error=auth", requestUrl.origin));
}
