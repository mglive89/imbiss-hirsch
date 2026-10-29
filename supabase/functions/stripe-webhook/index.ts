/* GallopaySystem · © 2026 Marco Gallo · Software proprietario, tutti i diritti riservati */
// Stripe tells us a payment went through -> order is marked paid and appears in the kitchen.
import Stripe from "npm:stripe@14.25.0";
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  const key = Deno.env.get("STRIPE_SECRET_KEY");
  const whsec = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!key || !whsec) return new Response("not configured", { status: 503 });
  const stripe = new Stripe(key, { apiVersion: "2024-06-20" });

  const sig = req.headers.get("stripe-signature") || "";
  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(raw, sig, whsec, undefined, Stripe.createSubtleCryptoProvider());
  } catch (e) {
    return new Response(`bad signature: ${(e as Error).message}`, { status: 400 });
  }

  if (event.type === "checkout.session.completed" || event.type === "checkout.session.async_payment_succeeded") {
    const s = event.data.object as Stripe.Checkout.Session;
    if (s.payment_status !== "paid") return new Response("pending", { status: 200 });
    const orderId = Number(s.metadata?.order_id || s.client_reference_id);
    let method = "online";
    try {
      const full = await stripe.checkout.sessions.retrieve(s.id, { expand: ["payment_intent.payment_method"] });
      const pm = (full.payment_intent as Stripe.PaymentIntent | null)?.payment_method as Stripe.PaymentMethod | null;
      if (pm?.type) method = pm.type === "card" && pm.card?.wallet?.type ? pm.card.wallet.type : pm.type; // card, paypal, apple_pay, google_pay
    } catch { /* keep "online" */ }
    const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await sb.from("orders").update({ payment: "online", pay_method: method, pay_ref: s.id })
      .eq("id", orderId).eq("payment", "offen");
  }
  return new Response("ok", { status: 200 });
});
