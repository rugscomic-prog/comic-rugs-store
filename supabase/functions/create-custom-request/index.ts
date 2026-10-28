import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
const esc = (v: unknown) => String(v ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!));
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const b = await req.json();
    const required = ["customer_name","email","phone","width_cm","height_cm","shape","style","colors"];
    if (required.some(k => b[k] === undefined || b[k] === null || String(b[k]).trim() === "")) return json({ error: "Complete all required custom rug fields." }, 400);
    const w = Number(b.width_cm), h = Number(b.height_cm);
    if (!Number.isInteger(w) || !Number.isInteger(h) || w < 30 || w > 500 || h < 30 || h > 500) return json({ error: "Dimensions must be whole centimetres between 30 and 500." }, 400);
    if (!["rectangle","circle","oval","custom"].includes(b.shape)) return json({ error: "Choose a valid shape." }, 400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const record = { customer_name: String(b.customer_name).trim(), email: String(b.email).trim(), phone: String(b.phone).trim(), width_cm: w, height_cm: h, shape: b.shape, style: String(b.style).slice(0, 100), colors: String(b.colors).slice(0, 150), notes: String(b.notes ?? "").slice(0, 1500), reference_image_url: String(b.reference_image_url ?? "").slice(0, 1000) };
    const { data, error } = await supabase.from("custom_requests").insert(record).select("request_number,created_at").single();
    if (error || !data) throw new Error("Could not save custom request.");
    let emailSent = false;
    const key = Deno.env.get("RESEND_API_KEY"), to = Deno.env.get("OWNER_EMAIL"), from = Deno.env.get("EMAIL_FROM");
    if (key && to && from) {
      const html = `<h2>New custom rug request</h2><p><b>Request:</b> ${esc(data.request_number)}</p><p><b>Customer:</b> ${esc(record.customer_name)}</p><p><b>Contact:</b> ${esc(record.email)} · ${esc(record.phone)}</p><p><b>Size:</b> ${w} × ${h} cm</p><p><b>Shape:</b> ${esc(record.shape)}</p><p><b>Style:</b> ${esc(record.style)}</p><p><b>Colours:</b> ${esc(record.colors)}</p><p><b>Notes:</b> ${esc(record.notes)}</p><p><b>Reference image URL:</b> ${esc(record.reference_image_url || "Not supplied")}</p><p>No payment has been taken. Confirm availability and quote the price with the customer.</p>`;
      const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject: `Custom rug request ${data.request_number}`, html }) });
      emailSent = r.ok; if (!r.ok) console.error("Resend email failed", await r.text());
    }
    return json({ ok: true, request_number: data.request_number, email_sent: emailSent, message: emailSent ? "Request saved and owner email sent." : "Request saved; email notification needs setup or failed." });
  } catch (e) { console.error(e); return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500); }
});
