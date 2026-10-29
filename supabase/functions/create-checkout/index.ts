/* GallopaySystem · © 2026 Marco Gallo · Software proprietario, tutti i diritti riservati */
// Creates a Stripe Checkout page (card, PayPal, Apple/Google Pay – whatever is enabled in Stripe)
// for one open order. The guest proves the order is theirs with the order token.
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const LOCALES: Record<string, string> = { de: "de", en: "en", it: "it", tr: "tr", fr: "fr" };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  // GET = "is online payment set up?" (used by the guest app to show the option)
  if (req.method === "GET") return json({ configured: !!key });
  if (!key) return json({ error: "Online-Zahlung ist noch nicht eingerichtet." }, 503);

  let body: { id?: number; token?: string; return_url?: string; lang?: string };
  try { body = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }
  const { id, token, return_url, lang } = body;
  if (!id || !token || !return_url) return json({ error: "Ungültige Anfrage" }, 400);

  // only send guests back to our own app
  const allowed = (Deno.env.get("APP_ORIGINS") || "https://mglive89.github.io").split(",").map((s) => s.trim());
  let ret: URL;
  try { ret = new URL(return_url); } catch { return json({ error: "Ungültige Rücksprung-Adresse" }, 400); }
  if (!allowed.includes(ret.origin)) return json({ error: "Rücksprung-Adresse nicht erlaubt" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: o } = await sb.from("orders")
    .select("id, token, total, payment, status, order_items(name_de, qty, unit_price)")
    .eq("id", id).maybeSingle();
  if (!o || o.token !== token) return json({ error: "Bestellung nicht gefunden" }, 404);
  if (o.payment !== "offen") return json({ error: "Diese Bestellung ist schon bezahlt." }, 409);
  if (o.status === "storniert") return json({ error: "Diese Bestellung wurde storniert." }, 409);

  const back = (flag: string) => { const u = new URL(ret.toString()); u.searchParams.set(flag, String(o.id)); return u.toString(); };
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: (o.order_items || []).map((i: { name_de: string; qty: number; unit_price: number }) => ({
      quantity: i.qty,
      price_data: { currency: "eur", unit_amount: Math.round(Number(i.unit_price) * 100), product_data: { name: i.name_de } },
    })),
    success_url: back("bezahlt"),
    cancel_url: back("abbruch"),
    client_reference_id: String(o.id),
    metadata: { order_id: String(o.id) },
    payment_intent_data: { description: `Imbiss Hirsch – Bestellung #${o.id}`, metadata: { order_id: String(o.id) } },
    locale: (LOCALES[lang || ""] || "auto") as Stripe.Checkout.SessionCreateParams.Locale,
    expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
  });
  await sb.from("orders").update({ pay_ref: session.id }).eq("id", o.id);
  return json({ url: session.url });
});
