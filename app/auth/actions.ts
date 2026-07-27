"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { createClient } from "../../lib/supabase/server";

const credentialsSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must contain at least 8 characters"),
});

const signupSchema = credentialsSchema.extend({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(100, "Name is too long"),
});

function authRedirect(
  type: "error" | "message",
  text: string,
): never {
  const params = new URLSearchParams({
    [type]: text,
  });

  redirect(`/auth?${params.toString()}`);
}

export async function signup(formData: FormData) {
  const parsed = signupSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    authRedirect(
      "error",
      parsed.error.issues[0]?.message ??
        "Invalid signup information",
    );
  }

  const supabase = await createClient();

 const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ??
  "http://localhost:3000";

const { data, error } = await supabase.auth.signUp({
  email: parsed.data.email,
  password: parsed.data.password,
  options: {
    emailRedirectTo: `${siteUrl}/auth/callback`,
    data: {
      full_name: parsed.data.fullName,
    },
  },
});

  if (error) {
    authRedirect("error", error.message);
  }

  revalidatePath("/", "layout");

  if (!data.session) {
    authRedirect(
      "message",
      "Account created. Check your email to confirm your account.",
    );
  }

  redirect("/account");
}

export async function login(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    authRedirect(
      "error",
      parsed.error.issues[0]?.message ??
        "Invalid login information",
    );
  }

  const supabase = await createClient();

  const { error } =
    await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

  if (error) {
    authRedirect(
      "error",
      "Email or password is incorrect.",
    );
  }

  revalidatePath("/", "layout");
  redirect("/account");
}

export async function logout() {
  const supabase = await createClient();

  await supabase.auth.signOut();

  revalidatePath("/", "layout");
  redirect(
    "/auth?message=You%20have%20been%20signed%20out.",
  );
}