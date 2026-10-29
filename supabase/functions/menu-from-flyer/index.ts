// GallopaySystem · Speisekarte aus einem Flyer-Foto lesen (nur Plattform-Admin).
// Bilder gehen an die Claude API und kommen als strukturierte Karte zurück (DE + EN/IT/TR/FR).
// Secret nötig: ANTHROPIC_API_KEY (Supabase → Edge Functions → Secrets). Optional: ANTHROPIC_MODEL.
import { createClient } from "npm:@supabase/supabase-js@2.45.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, "Content-Type": "application/json" } });

const L = { type: "object", properties: { de: { type: "string" }, en: { type: "string" }, it: { type: "string" }, tr: { type: "string" }, fr: { type: "string" } }, required: ["de", "en", "it", "tr", "fr"] };
const TOOL = {
  name: "save_menu",
  description: "Speichert die vollständige Speisekarte, die auf dem Flyer steht.",
  input_schema: {
    type: "object",
    properties: {
      categories: {
        type: "array",
        items: {
          type: "object",
          properties: {
            names: L,
            is_drink: { type: "boolean", description: "true für Getränke-Kategorien" },
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  names: L,
                  descs: { anyOf: [L, { type: "null" }], description: "Beschreibung/Zutaten, wenn auf dem Flyer vorhanden, sonst null" },
                  price_pickup: { type: ["number", "null"], description: "Preis Abholen/vor Ort in Euro; null wenn kein Preis" },
                  price_delivery: { type: ["number", "null"], description: "Lieferpreis, nur wenn der Flyer einen eigenen Lieferpreis zeigt, sonst null" },
                  tag: { type: ["string", "null"], enum: ["veg", "house", null] },
                },
                required: ["names", "descs", "price_pickup", "price_delivery", "tag"],
              },
            },
          },
          required: ["names", "is_drink", "items"],
        },
      },
      tagline: { anyOf: [L, { type: "null" }], description: "Kurzer Slogan des Lokals, falls auf dem Flyer (z. B. 'Pizza & Pasta seit 1990')" },
      hours: { type: ["object", "null"], description: "Öffnungszeiten falls auf dem Flyer: Schlüssel 0=So … 6=Sa, Wert [von, bis] als Dezimalstunden, z. B. {\"1\":[11,22]}" },
      phone: { type: ["string", "null"] },
      address: { type: ["string", "null"] },
    },
    required: ["categories"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  const key = Deno.env.get("ANTHROPIC_API_KEY");
  if (req.method === "GET") return json({ configured: !!key });
  if (!key) return json({ error: "Import non ancora attivo: manca il secret ANTHROPIC_API_KEY." }, 503);

  // only the platform owner may use this
  const auth = req.headers.get("Authorization") || "";
  const user = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
  const { data: ok } = await user.rpc("is_platform_admin");
  if (ok !== true) return json({ error: "Nur für den Plattform-Admin." }, 403);

  let body: { images?: { data: string; media_type: string }[] };
  try { body = await req.json(); } catch { return json({ error: "Richiesta non valida" }, 400); }
  const imgs = (body.images || []).filter((i) => i && i.data && /^image\/(jpeg|png|webp|gif)$/.test(i.media_type)).slice(0, 4);
  if (!imgs.length) return json({ error: "Nessuna immagine" }, 400);

  const content = [
    ...imgs.map((i) => ({ type: "image", source: { type: "base64", media_type: i.media_type, data: i.data } })),
    { type: "text", text:
      "Das ist der Flyer / die Speisekarte eines Imbiss-Restaurants in Deutschland. Lies ALLE Gerichte und Getränke mit Preisen ab, " +
      "in der Reihenfolge und Gruppierung des Flyers. Deutsche Namen genau wie auf dem Flyer (Schreibweise beibehalten), " +
      "dann natürliche Übersetzungen auf Englisch, Italienisch, Türkisch, Französisch (Eigennamen wie 'Döner', 'Tantuni', 'Currywurst' nicht übersetzen). " +
      "Preise als Zahl in Euro (\"6,50 €\" → 6.5). Gibt es zwei Preise (z. B. Abholen/Lieferung oder klein/groß), " +
      "nimm bei Abholen/Lieferung beide Felder; bei Größen lege je Größe einen eigenen Eintrag an (z. B. 'Pizza Margherita · 26 cm'). " +
      "Nichts erfinden: Was nicht lesbar ist, weglassen. Rufe save_menu genau einmal auf." },
  ];
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "x-api-key": key, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("ANTHROPIC_MODEL") || "claude-sonnet-5-5",
      max_tokens: 16000,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "save_menu" },
      messages: [{ role: "user", content }],
    }),
  });
  const d = await r.json();
  if (!r.ok) return json({ error: d?.error?.message || "Errore Claude API" }, 502);
  const use = (d.content || []).find((b: { type: string }) => b.type === "tool_use");
  if (!use) return json({ error: "Menù non riconosciuto" }, 422);
  return json({ menu: use.input, truncated: d.stop_reason === "max_tokens" });
});
