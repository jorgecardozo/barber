import { NextResponse } from "next/server";
import { createClient } from "@/shared/api/supabase/server";
import { supabaseAdmin } from "@/shared/api/supabase/admin";

// Callback de OAuth (Google): intercambia el code por sesión, asegura el profile
// del usuario y redirige a `next`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/mis-turnos";

  if (!code) return NextResponse.redirect(`${origin}/ingresar?error=google`);

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) return NextResponse.redirect(`${origin}/ingresar?error=google`);

  // Asegurar que exista el profile (si es el primer login con Google).
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();
    if (!profile) {
      await supabaseAdmin.from("profiles").insert({
        id: user.id,
        email: user.email ?? "",
        full_name:
          (user.user_metadata?.full_name as string) ??
          (user.user_metadata?.name as string) ??
          (user.email ? user.email.split("@")[0] : "Cliente"),
        avatar_url: (user.user_metadata?.avatar_url as string) ?? null,
        role: "cliente",
      });
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
