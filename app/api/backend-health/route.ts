import { NextResponse } from "next/server";

import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("backend_health")
      .select("service, status, checked_at")
      .eq("service", "resqmap-database")
      .single();

    if (error) {
      console.error(
        "Supabase backend health error:",
        error,
      );

      return NextResponse.json(
        {
          ok: false,
          database: "unavailable",
          error: error.message,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      ok: true,
      database: "connected",
      record: data,
      apiCheckedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        database: "unavailable",
        error:
          error instanceof Error
            ? error.message
            : "Unknown backend error",
      },
      { status: 500 },
    );
  }
}