import { NextResponse } from "next/server";
import { z } from "zod";

import { createClient } from "../../../lib/supabase/server";

export const dynamic = "force-dynamic";

const reportSchema = z
  .object({
    clientGeneratedId: z
      .string()
      .uuid("Invalid client-generated report ID"),

    hazardType: z.enum([
      "flood",
      "drought",
      "earthquake",
      "landslide",
      "wildfire",
      "storm",
      "heat",
      "other",
    ]),

    description: z
      .string()
      .trim()
      .min(10, "Description must contain at least 10 characters")
      .max(2000, "Description cannot exceed 2000 characters"),

    locationName: z
      .string()
      .trim()
      .max(200, "Location name is too long")
      .optional()
      .nullable(),

    latitude: z
      .number()
      .min(-90)
      .max(90)
      .optional()
      .nullable(),

    longitude: z
      .number()
      .min(-180)
      .max(180)
      .optional()
      .nullable(),

    urgency: z
      .enum(["low", "medium", "high", "critical"])
      .default("medium"),
  })
  .refine(
    (value) =>
      (value.latitude == null) ===
      (value.longitude == null),
    {
      message:
        "Latitude and longitude must be provided together",
      path: ["latitude"],
    },
  );

const authorityRoles = new Set([
  "field_officer",
  "authority_reviewer",
  "administrator",
]);

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store",
  };
}

/**
 * GET /api/reports
 *
 * Citizens receive their own reports.
 * Authority users receive all reports permitted by RLS.
 */
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        },
      );
    }

    const { data: profile, error: profileError } =
      await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

    if (profileError) {
      console.error(
        "Could not read report-user profile:",
        profileError,
      );
    }

    const role = profile?.role ?? "citizen";

    const baseQuery = supabase
      .from("community_reports")
      .select(
        `
          id,
          reporter_id,
          client_generated_id,
          hazard_type,
          description,
          location_name,
          latitude,
          longitude,
          urgency,
          status,
          verification_notes,
          reviewed_by,
          reviewed_at,
          created_at,
          updated_at
        `,
      )
      .order("created_at", {
        ascending: false,
      })
      .limit(100);

    const { data, error } = authorityRoles.has(role)
      ? await baseQuery
      : await baseQuery.eq("reporter_id", user.id);

    if (error) {
      console.error("Reports GET error:", error);

      return NextResponse.json(
        {
          ok: false,
          error: "Could not retrieve reports",
        },
        {
          status: 500,
          headers: noStoreHeaders(),
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        role,
        reports: data ?? [],
      },
      {
        status: 200,
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error("Unexpected reports GET error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      },
    );
  }
}

/**
 * POST /api/reports
 *
 * Creates a persistent report belonging to
 * the authenticated user.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json(
        {
          ok: false,
          error: "Authentication required",
        },
        {
          status: 401,
          headers: noStoreHeaders(),
        },
      );
    }

    let requestBody: unknown;

    try {
      requestBody = await request.json();
    } catch {
      return NextResponse.json(
        {
          ok: false,
          error: "Request body must contain valid JSON",
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        },
      );
    }

    const parsed = reportSchema.safeParse(requestBody);

    if (!parsed.success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            parsed.error.issues[0]?.message ??
            "Invalid report information",
          issues: parsed.error.flatten(),
        },
        {
          status: 400,
          headers: noStoreHeaders(),
        },
      );
    }

    /*
     * Check for a previously accepted offline report.
     * This prevents duplicate records when a device retries.
     */
    const { data: existingReport } = await supabase
      .from("community_reports")
      .select(
        `
          id,
          client_generated_id,
          hazard_type,
          description,
          urgency,
          status,
          created_at
        `,
      )
      .eq(
        "client_generated_id",
        parsed.data.clientGeneratedId,
      )
      .maybeSingle();

    if (existingReport) {
      return NextResponse.json(
        {
          ok: true,
          duplicate: true,
          message: "This report was already received",
          report: existingReport,
        },
        {
          status: 200,
          headers: noStoreHeaders(),
        },
      );
    }

    const { data: createdReport, error: insertError } =
      await supabase
        .from("community_reports")
        .insert({
          reporter_id: user.id,
          client_generated_id:
            parsed.data.clientGeneratedId,
          hazard_type: parsed.data.hazardType,
          description: parsed.data.description,
          location_name:
            parsed.data.locationName || null,
          latitude: parsed.data.latitude ?? null,
          longitude: parsed.data.longitude ?? null,
          urgency: parsed.data.urgency,
          status: "submitted",
        })
        .select(
          `
            id,
            reporter_id,
            client_generated_id,
            hazard_type,
            description,
            location_name,
            latitude,
            longitude,
            urgency,
            status,
            created_at,
            updated_at
          `,
        )
        .single();

    if (insertError) {
      console.error("Reports POST error:", insertError);

      /*
       * PostgreSQL code 23505 means the unique client ID
       * has already been inserted by a nearly simultaneous
       * retry.
       */
      if (insertError.code === "23505") {
        const { data: duplicateReport } =
          await supabase
            .from("community_reports")
            .select(
              `
                id,
                client_generated_id,
                hazard_type,
                description,
                urgency,
                status,
                created_at
              `,
            )
            .eq(
              "client_generated_id",
              parsed.data.clientGeneratedId,
            )
            .maybeSingle();

        if (duplicateReport) {
          return NextResponse.json(
            {
              ok: true,
              duplicate: true,
              message: "This report was already received",
              report: duplicateReport,
            },
            {
              status: 200,
              headers: noStoreHeaders(),
            },
          );
        }
      }

      return NextResponse.json(
        {
          ok: false,
          error: "Could not save the report",
          details:
            process.env.NODE_ENV === "development"
              ? insertError.message
              : undefined,
        },
        {
          status:
            insertError.code === "42501" ? 403 : 500,
          headers: noStoreHeaders(),
        },
      );
    }

    return NextResponse.json(
      {
        ok: true,
        duplicate: false,
        message: "Community report submitted",
        report: createdReport,
      },
      {
        status: 201,
        headers: noStoreHeaders(),
      },
    );
  } catch (error) {
    console.error("Unexpected reports POST error:", error);

    return NextResponse.json(
      {
        ok: false,
        error: "Unexpected server error",
      },
      {
        status: 500,
        headers: noStoreHeaders(),
      },
    );
  }
}