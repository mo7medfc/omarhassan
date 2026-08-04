import { createClient } from "npm:@supabase/supabase-js@2";
import { Pool } from "jsr:@db/postgres";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const SETUP_SQL = `
drop policy if exists "designs public read" on storage.objects;
drop policy if exists "designs public upload" on storage.objects;
drop policy if exists "designs public update" on storage.objects;
drop policy if exists "designs public delete" on storage.objects;
create policy "designs public read" on storage.objects for select to public using (bucket_id = 'designs');
create policy "designs public upload" on storage.objects for insert to public with check (bucket_id = 'designs');
create policy "designs public update" on storage.objects for update to public using (bucket_id = 'designs');
create policy "designs public delete" on storage.objects for delete to public using (bucket_id = 'designs');
`;

function adminClient() {
  const url = Deno.env.get("SUPABASE_URL") ?? "";
  const secretKeys = Deno.env.get("SUPABASE_SECRET_KEYS");
  const legacy = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  let key = legacy ?? "";
  if (secretKeys) {
    try {
      const parsed = JSON.parse(secretKeys);
      key = parsed.default || parsed[Object.keys(parsed)[0]] || key;
    } catch (_) { /* ignore */ }
  }
  return createClient(url, key);
}

async function setupPolicies() {
  const dbUrl = Deno.env.get("SUPABASE_DB_URL");
  if (!dbUrl) throw new Error("SUPABASE_DB_URL not available");
  const pool = new Pool(dbUrl, 1);
  const conn = await pool.connect();
  try {
    await conn.queryArray(SETUP_SQL);
  } finally {
    conn.release();
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const url = new URL(req.url);

  try {
    if (req.method === "GET" && url.searchParams.get("action") === "setup-policies") {
      await setupPolicies();
      return new Response(JSON.stringify({ ok: true, message: "Storage policies created" }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    if (req.method === "POST") {
      const form = await req.formData();
      const file = form.get("file");
      const path = String(form.get("path") || "");
      if (!(file instanceof File) || !path) {
        return new Response(JSON.stringify({ error: "file and path required" }), {
          status: 400,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      }
      const supabase = adminClient();
      const bucket = "designs";
      const { error } = await supabase.storage.from(bucket).upload(path, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      return new Response(JSON.stringify({ url: data.publicUrl, storagePath: path }), {
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unsupported request" }), {
      status: 405,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e?.message || String(e) }), {
      status: 400,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
