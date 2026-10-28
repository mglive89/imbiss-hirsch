# Imbiss

Bestell- und Kassensystem für **Imbiss Hirsch**, Bietigheim-Bissingen.
Fünf Web-Apps (PWA) auf einer gemeinsamen Datenbank (Supabase). Jede App lässt sich einzeln auf dem Gerät installieren, auf dem sie gebraucht wird.

| App | Ordner | Gerät | Login |
|---|---|---|---|
| **Kunde** | `kunde/` | Handy der Gäste (per QR-Code) | – |
| **Kasse** | `kasse/` | Tablet / Handy an der Theke | Personal |
| **Dashboard** | `dashboard/` | Laptop / Tablet des Chefs | Personal |
| **Küche** | `kueche/` | Tablet oder TV in der Küche | Personal |
| **Abholung** | `abholung/` | TV im Gastraum | – |

Live: `https://mglive89.github.io/imbiss-hirsch/` (Startseite leitet zur Kunden-App weiter).

## Ablauf einer Bestellung

1. **Kunde** bestellt per QR-Code (Tisch, Abholung oder Lieferung) und zahlt entweder online (Karte, PayPal, Apple/Google Pay) oder bar.
2. **Kasse**: Bar- und Kartenzahlungen mit einem Tipp bestätigen. Online bezahlte Bestellungen springen automatisch weiter.
3. **Küche** sieht nur bezahlte Bestellungen, mit Eingangston. *Start* → *Fertig*.
4. „Fertig“ löst einen Alarm aus: beim Gast auf dem Handy, an der Kasse und groß auf der **Abhol-Anzeige** mit Tischnummer.
5. **Kasse** gibt aus → abgeschlossen. Das **Dashboard** zählt live mit.
6. Nach dem Abholen fragt die **Kunden-App** nach 1–5 Sternen und einem Kommentar und bietet danach **allen** Gästen den Link zur Google-Bewertung an (Google erlaubt nicht, nur zufriedene Gäste weiterzuleiten). Auswertung: **Dashboard → Bewertungen**. Der Google-Link steht in `shared/config.js`.

## Aufbau

```
Imbiss/
├─ kunde/ kasse/ dashboard/ kueche/ abholung/   je index.html + manifest.webmanifest
├─ shared/
│  ├─ ih.css        Design-System + Animationen
│  ├─ ih.js         Kern: Supabase, Töne, Zoom-Sperre, Animationen (FLIP, Konfetti, Zähler …)
│  ├─ staff.js      gemeinsamer Login für die Personal-Apps
│  ├─ config.js     Supabase-Adresse + öffentlicher Schlüssel
│  └─ menu-fallback.js   Speisekarte für den Offline-Fall
├─ assets/          Logo, Titelbild, App-Icons je App
├─ supabase/
│  ├─ schema.sql    komplette Datenbank (Tabellen, Rechte, Funktionen)
│  └─ functions/    create-checkout, confirm-payment, stripe-webhook (Online-Zahlung)
├─ sw.js            Offline-Cache für alle Apps
└─ index.html       Weiterleitung zur Kunden-App (alte QR-Codes funktionieren weiter)
```

Kein Build-Schritt: statische Dateien, direkt auf GitHub Pages oder jedem HTTPS-Webserver.

## Einrichtung

1. **Supabase → Authentication → URL Configuration**
   Site URL: `https://mglive89.github.io/imbiss-hirsch/kasse/`
   Redirect URLs: `https://mglive89.github.io/imbiss-hirsch/*`
2. **Erstes Konto**: Kasse oder Dashboard öffnen → „Konto erstellen“ → E-Mail bestätigen → anmelden. Das erste Konto wird Admin.
3. **Mitarbeiter**: erstellen selbst ein Konto; Admin schaltet sie im Dashboard → Team frei. Ein Login gilt für alle Personal-Apps.
4. **Tische**: Dashboard → QR-Codes → Anzahl Tische → „Als Bild speichern“ → drucken (ca. 5 × 5 cm).
5. **Online-Zahlung per QR** (Karte, PayPal, Apple Pay, Google Pay) über Stripe:
   - Stripe-Konto → Einstellungen → Zahlungsmethoden: PayPal, Apple Pay, Google Pay aktivieren
   - Supabase → Edge Functions → Secrets: `STRIPE_SECRET_KEY` = geheimer Schlüssel (`sk_test_…` zum Testen, `sk_live_…` im Betrieb)
   - Ab dann zeigt die Kunden-App „Karte / PayPal“. Nach der Zahlung prüft `confirm-payment` direkt bei Stripe und die Bestellung geht in die Küche.
   - Empfohlen als Absicherung (Gast schließt den Browser sofort nach dem Bezahlen): Stripe → Webhooks → `https://trwvzjgkygoggnomfovi.supabase.co/functions/v1/stripe-webhook`, Ereignisse `checkout.session.completed`, `checkout.session.async_payment_succeeded` → Secret `STRIPE_WEBHOOK_SECRET`
   - Andere Domain als GitHub Pages: Secret `APP_ORIGINS` setzen.

## Sicherheit

- Gäste legen Bestellungen nur über `place_order` an; Preise rechnet die Datenbank.
- Gäste sehen nur den Status der eigenen Bestellung (Nummer + geheimer Schlüssel).
- Abhol-Anzeige zeigt nur Nummern und Tische.
- Alles andere nur für freigeschaltetes Personal (Row Level Security).
- Spam-Bremse: max. 3 Gäste-Bestellungen pro Tisch/Telefon in 3 Minuten.

## Updates

Nach Änderungen an Dateien `VERSION` in `sw.js` hochzählen, damit installierte Apps neu laden.
Preise und Gerichte werden **nicht** im Code geändert, sondern im Dashboard → Speisekarte.
