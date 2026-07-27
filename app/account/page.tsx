import Link from "next/link";
import { redirect } from "next/navigation";

import { logout } from "../auth/actions";
import { createClient } from "../../lib/supabase/server";

export default async function AccountPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect(
      "/auth?error=Please%20sign%20in%20to%20open%20your%20account.",
    );
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select(
      "full_name, role, organisation, created_at",
    )
    .eq("id", user.id)
    .single();

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#061522",
        color: "#f4f8fb",
        padding: "48px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "760px",
          margin: "0 auto",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#55dfd0",
            textDecoration: "none",
          }}
        >
          ← Return to ResQMap
        </Link>

        <section
          style={{
            marginTop: "36px",
            padding: "32px",
            border: "1px solid #244154",
            borderRadius: "16px",
            background: "#0b2030",
          }}
        >
          <p
            style={{
              color: "#55dfd0",
              fontWeight: 700,
              letterSpacing: "0.1em",
            }}
          >
            AUTHENTICATED USER
          </p>

          <h1>
            Welcome,{" "}
            {profile?.full_name ||
              user.email ||
              "ResQMap user"}
          </h1>

          <dl
            style={{
              display: "grid",
              gap: "18px",
              marginTop: "28px",
            }}
          >
            <div>
              <dt style={{ color: "#8fa8b9" }}>
                Email
              </dt>
              <dd style={{ margin: "4px 0 0" }}>
                {user.email}
              </dd>
            </div>

            <div>
              <dt style={{ color: "#8fa8b9" }}>
                Current role
              </dt>
              <dd style={{ margin: "4px 0 0" }}>
                {profile?.role ?? "citizen"}
              </dd>
            </div>

            <div>
              <dt style={{ color: "#8fa8b9" }}>
                Organisation
              </dt>
              <dd style={{ margin: "4px 0 0" }}>
                {profile?.organisation ||
                  "Not assigned"}
              </dd>
            </div>
          </dl>

          <form
            action={logout}
            style={{ marginTop: "32px" }}
          >
            <button
              type="submit"
              style={{
                padding: "12px 18px",
                border: "1px solid #ef6b73",
                borderRadius: "8px",
                background: "transparent",
                color: "#ef9197",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Sign out
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}