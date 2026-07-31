// Edge Function: validate-license
// Recebe { license_key, hardware_id } e ativa/valida a licenca.
// Usa a service role key (variavel de ambiente do proprio Supabase), nunca exposta ao client.

import { createClient } from "npm:@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ valid: false, error: "method_not_allowed" }, 405);
  }

  let body: { license_key?: string; hardware_id?: string };
  try {
    body = await req.json();
  } catch {
    return json({ valid: false, error: "invalid_body" }, 400);
  }

  const licenseKey = (body.license_key ?? "").trim();
  const hardwareId = (body.hardware_id ?? "").trim();

  if (!licenseKey || !hardwareId) {
    return json({ valid: false, error: "missing_fields" }, 400);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: license, error } = await supabase
    .from("licenses")
    .select("*")
    .eq("license_key", licenseKey)
    .maybeSingle();

  if (error) {
    return json({ valid: false, error: "server_error" }, 500);
  }

  if (!license) {
    return json({ valid: false, error: "not_found" }, 404);
  }

  if (license.status === "blocked") {
    return json({ valid: false, error: "blocked" }, 403);
  }

  if (license.status === "unused") {
    const { error: updateError } = await supabase
      .from("licenses")
      .update({
        status: "active",
        hardware_id: hardwareId,
        activated_at: new Date().toISOString(),
        last_check_at: new Date().toISOString(),
      })
      .eq("id", license.id);

    if (updateError) return json({ valid: false, error: "server_error" }, 500);
    return json({ valid: true, activated_now: true });
  }

  // status === "active"
  if (license.hardware_id !== hardwareId) {
    return json({ valid: false, error: "already_activated_elsewhere" }, 409);
  }

  await supabase
    .from("licenses")
    .update({ last_check_at: new Date().toISOString() })
    .eq("id", license.id);

  return json({ valid: true, activated_now: false });
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}
