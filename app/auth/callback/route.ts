import {
  type NextRequest,
  NextResponse,
} from "next/server";

import { createClient } from "../../../lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = await createClient();

    const { error } =
      await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return NextResponse.redirect(
        new URL("/account", requestUrl.origin),
      );
    }
  }

  const errorUrl = new URL(
    "/auth",
    requestUrl.origin,
  );

  errorUrl.searchParams.set(
    "error",
    "The confirmation link is invalid or has expired.",
  );

  return NextResponse.redirect(errorUrl);
}