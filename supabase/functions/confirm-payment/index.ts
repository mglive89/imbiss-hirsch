/* GallopaySystem · © 2026 Marco Gallo · Software proprietario, tutti i diritti riservati */
// The guest returns from Stripe -> ask Stripe directly whether the order is paid.
// Works without a webhook; the webhook (stripe-webhook) stays as a safety net
// for guests who close the browser right after paying.
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  if (!key) return json({ error: "Online-Zahlung ist noch nicht eingerichtet." }, 503);
  let body: { id?: number; token?: string };
  try { body = await req.json(); } catch { return json({ error: "Ungültige Anfrage" }, 400); }
  if (!body.id || !body.token) return json({ error: "Ungültige Anfrage" }, 400);

  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: o } = await sb.from("orders").select("id, token, payment, pay_ref").eq("id", body.id).maybeSingle();
  if (!o || o.token !== body.token) return json({ error: "Bestellung nicht gefunden" }, 404);
  if (o.payment !== "offen") return json({ paid: true });
  if (!o.pay_ref) return json({ paid: false });

  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });
  const s = await stripe.checkout.sessions.retrieve(o.pay_ref, { expand: ["payment_intent.payment_method"] });
  if (s.payment_status !== "paid" || Number(s.metadata?.order_id || s.client_reference_id) !== o.id) return json({ paid: false });
  const pm = (s.payment_intent as Stripe.PaymentIntent | null)?.payment_method as Stripe.PaymentMethod | null;
  const method = pm?.type ? (pm.type === "card" && pm.card?.wallet?.type ? pm.card.wallet.type : pm.type) : "online";
  await sb.from("orders").update({ payment: "online", pay_method: method }).eq("id", o.id).eq("payment", "offen");
  return json({ paid: true, method });
});
