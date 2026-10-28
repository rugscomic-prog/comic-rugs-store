import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS", "Content-Type": "application/json" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: cors });
function escapeHtml(v: unknown) { return String(v ?? "").replace(/[&<>\"]/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]!)); }
async function sendOwnerEmail(subject: string, html: string) {
  const key = Deno.env.get("RESEND_API_KEY"), to = Deno.env.get("OWNER_EMAIL"), from = Deno.env.get("EMAIL_FROM");
  if (!key || !to || !from) return false;
  const r = await fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify({ from, to: [to], subject, html }) });
  if (!r.ok) console.error("Resend email failed", await r.text());
  return r.ok;
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "POST only" }, 405);
  try {
    const body = await req.json();
    const customer = body.customer ?? {}, lines = body.items;
    if (!customer.name || !customer.email || !customer.phone || !customer.address_line || !customer.city || !customer.state || !customer.postal_code || !Array.isArray(lines) || lines.length < 1 || lines.length > 30) return json({ error: "Please complete all required checkout fields." }, 400);
    if (String(customer.name).length > 120 || String(customer.email).length > 254 || String(customer.phone).length > 30) return json({ error: "Some fields are too long." }, 400);
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const ids = [...new Set(lines.map((x: any) => String(x.id)))];
    const { data: products, error: pErr } = await supabase.from("products").select("id,name,price_paise,active").in("id", ids).eq("active", true);
    if (pErr || !products || products.length !== ids.length) return json({ error: "A product is unavailable. Refresh the shop and try again." }, 400);
    const items = lines.map((line: any) => {
      const p = products.find((x: any) => x.id === String(line.id));
      const qty = Number(line.quantity);
      if (!p || !Number.isInteger(qty) || qty < 1 || qty > 10) throw new Error("Invalid product quantity.");
      return { id: p.id, name: p.name, unit_price_paise: p.price_paise, quantity: qty, line_total_paise: p.price_paise * qty };
    });
    const amount = items.reduce((n: number, x: any) => n + x.line_total_paise, 0);
    if (amount <= 0 || amount > 200000000) return json({ error: "Order total is outside the allowed range." }, 400);
    const { data: order, error } = await supabase.from("orders").insert({ customer_name: String(customer.name).trim(), email: String(customer.email).trim(), phone: String(customer.phone).trim(), address_line: String(customer.address_line).trim(), city: String(customer.city).trim(), state: String(customer.state).trim(), postal_code: String(customer.postal_code).trim(), items, amount_paise: amount, payment_method: "COD", status: "cod_pending" }).select("id,order_number,amount_paise,created_at").single();
    if (error || !order) throw new Error("Could not save order. Please try again.");
    const rows = items.map((x: any) => `<li>${escapeHtml(x.name)} × ${x.quantity} — ₹${(x.line_total_paise / 100).toLocaleString("en-IN")}</li>`).join("");
    const emailOk = await sendOwnerEmail(`New COMIC RUGS COD order ${order.order_number}`, `<h2>New COD order</h2><p><b>Order:</b> ${escapeHtml(order.order_number)}</p><p><b>Customer:</b> ${escapeHtml(customer.name)}</p><p><b>Email:</b> ${escapeHtml(customer.email)}</p><p><b>Phone:</b> ${escapeHtml(customer.phone)}</p><p><b>Address:</b> ${escapeHtml(customer.address_line)}, ${escapeHtml(customer.city)}, ${escapeHtml(customer.state)} ${escapeHtml(customer.postal_code)}</p><ul>${rows}</ul><p><b>Total:</b> ₹${(amount / 100).toLocaleString("en-IN")} (COD)</p><p>Open your COMIC RUGS owner dashboard to manage this order.</p>`);
    if (emailOk) await supabase.from("orders").update({ notification_sent_at: new Date().toISOString() }).eq("id", order.id);
    return json({ ok: true, order_number: order.order_number, total_rupees: amount / 100, email_sent: emailOk, message: emailOk ? "Order saved and owner email sent." : "Order saved. Email notification is not configured or failed; check service settings." });
  } catch (e) { console.error(e); return json({ error: e instanceof Error ? e.message : "Unexpected error" }, 500); }
});
  
