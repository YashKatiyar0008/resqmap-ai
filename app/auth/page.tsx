import Link from "next/link";

import { login, signup } from "./actions";

type AuthPageProps = {
  searchParams: Promise<{
    error?: string | string[];
    message?: string | string[];
  }>;
};

function firstValue(
  value: string | string[] | undefined,
): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AuthPage({
  searchParams,
}: AuthPageProps) {
  const params = await searchParams;

  const error = firstValue(params.error);
  const message = firstValue(params.message);

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
          maxWidth: "960px",
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

        <div style={{ marginTop: "36px" }}>
          <p
            style={{
              color: "#55dfd0",
              letterSpacing: "0.12em",
              fontSize: "13px",
              fontWeight: 700,
            }}
          >
            SECURE RESQMAP ACCESS
          </p>

          <h1
            style={{
              fontSize: "42px",
              margin: "8px 0 12px",
            }}
          >
            Sign in or create an account
          </h1>

          <p
            style={{
              color: "#aebdca",
              maxWidth: "650px",
              lineHeight: 1.6,
            }}
          >
            Citizens can submit reports. Verified authority
            roles will later manage incidents, evidence and
            accountable actions.
          </p>
        </div>

        {error && (
          <div
            role="alert"
            style={{
              marginTop: "24px",
              padding: "14px 16px",
              border: "1px solid #ef6b73",
              borderRadius: "10px",
              background: "rgba(239,107,115,0.12)",
            }}
          >
            {error}
          </div>
        )}

        {message && (
          <div
            role="status"
            style={{
              marginTop: "24px",
              padding: "14px 16px",
              border: "1px solid #55dfd0",
              borderRadius: "10px",
              background: "rgba(85,223,208,0.1)",
            }}
          >
            {message}
          </div>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "24px",
            marginTop: "32px",
          }}
        >
          <section
            style={{
              padding: "28px",
              border: "1px solid #244154",
              borderRadius: "16px",
              background: "#0b2030",
            }}
          >
            <h2>Sign in</h2>

            <form
              action={login}
              style={{
                display: "grid",
                gap: "16px",
                marginTop: "22px",
              }}
            >
              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="current-password"
                  style={inputStyle}
                />
              </label>

              <button type="submit" style={buttonStyle}>
                Sign in
              </button>
            </form>
          </section>

          <section
            style={{
              padding: "28px",
              border: "1px solid #244154",
              borderRadius: "16px",
              background: "#0b2030",
            }}
          >
            <h2>Create citizen account</h2>

            <form
              action={signup}
              style={{
                display: "grid",
                gap: "16px",
                marginTop: "22px",
              }}
            >
              <label>
                Full name
                <input
                  name="fullName"
                  type="text"
                  required
                  minLength={2}
                  maxLength={100}
                  autoComplete="name"
                  style={inputStyle}
                />
              </label>

              <label>
                Email address
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  style={inputStyle}
                />
              </label>

              <label>
                Password
                <input
                  name="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  style={inputStyle}
                />
              </label>

              <button type="submit" style={buttonStyle}>
                Create account
              </button>
            </form>
          </section>
        </div>
      </div>
    </main>
  );
}

const inputStyle = {
  display: "block",
  width: "100%",
  boxSizing: "border-box" as const,
  marginTop: "8px",
  padding: "12px",
  border: "1px solid #39566a",
  borderRadius: "8px",
  background: "#061522",
  color: "#ffffff",
  fontSize: "16px",
};

const buttonStyle = {
  padding: "13px 18px",
  border: "none",
  borderRadius: "8px",
  background: "#55dfd0",
  color: "#04131d",
  fontWeight: 700,
  fontSize: "16px",
  cursor: "pointer",
};