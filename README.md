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
| **Fahrer** | `fahrer/` | Handy der Lieferfahrer | Personal |
| **Plattform** | `plattform/` | nur du (Betreiber) | Plattform-Admin |

Live: `https://mglive89.github.io/imbiss-hirsch/` (Startseite leitet zur Kunden-App weiter).

## Ablauf einer Bestellung

1. **Kunde** bestellt per QR-Code (Tisch, Abholung oder Lieferung) und zahlt entweder online (Karte, PayPal, Apple/Google Pay) oder bar.
   Tisch-QR: die Bestellung läuft über die Tischnummer. Abholung/Lieferung: der Gast bekommt einen **4-stelligen Abholcode**, den er an der Kasse nennt (Kasse → Feld „Code“ findet die Bestellung sofort).
2. **Kasse**: Bar- und Kartenzahlungen mit einem Tipp bestätigen. Online bezahlte Bestellungen springen automatisch weiter.
3. **Küche** sieht nur bezahlte Bestellungen, mit Eingangston. *Start* → *Fertig*.
4. „Fertig“ löst einen Alarm aus: beim Gast auf dem Handy, an der Kasse und groß auf der **Abhol-Anzeige** mit Tischnummer.
5. **Kasse** gibt aus → abgeschlossen. Das **Dashboard** zählt live mit.
   **Lieferungen**: Kasse setzt die Wartezeit (30 / 45 / 60 min) → der Gast sieht „Lieferung ca. 13:45 Uhr“. Sobald die Küche „Fertig“ drückt, erscheint die Lieferung in der **Fahrer-App** (mit Ton): Adresse, Telefon, Betrag. „Losfahren“ öffnet Google Maps und meldet dem Gast „Unterwegs“. An der Tür: „Bar kassiert“ / „Karte kassiert“ bzw. „Zugestellt“ → Dashboard zeigt „Zugestellt 14:02 · pünktlich“.
   **Zahlung bei Lieferung** bleibt überall als **offen** markiert (Kasse, Küche, Fahrer, Dashboard „Offen (Lieferung)“), bis der Fahrer „Bar kassiert“ / „Karte kassiert“ tippt. Dann sieht der Gast „Danke! Bezahlt: 21,80 € bar ✓“ und die Bewertung.
   **Lieferservice an/aus**: Dashboard → Übersicht → Schalter „Lieferservice“. Aus = Gäste sehen nur Abholen und Tisch (sofort, ohne Neuladen); an der Kasse kann das Personal trotzdem Lieferungen eintragen.
6. Nach dem Abholen fragt die **Kunden-App** nach 1–5 Sternen und einem Kommentar und bietet danach **allen** Gästen den Link zur Google-Bewertung an (Google erlaubt nicht, nur zufriedene Gäste weiterzuleiten). Auswertung: **Dashboard → Bewertungen**. Der Google-Link steht in `shared/config.js`.

## Aufbau

```
Imbiss/
├─ kunde/ kasse/ dashboard/ kueche/ abholung/ fahrer/   je index.html + manifest.webmanifest
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

## Plattform (Betreiber)

`plattform/` zeigt dir als Betreiber pro Kunde (Restaurant): Bestellungen und Umsatz über die Plattform, dein Verdienst (Grundgebühr + % auf Online-Zahlungen + € pro Bestellung + Einrichtung), Monatsverlauf, offene Beträge, „Segna pagato“, CSV-Export.
Zugang nur für Konten in `platform_admins` (keine Registrierung). Du siehst nur Summen, keine Daten der Gäste.
Vertragsdaten pro Kunde im Dialog des Kunden. Abrechnungsregel: Grundgebühr und Provision ab dem Monat nach Ende der Testphase, nur im Status „Attivo“; Einrichtung im Startmonat.
## Mehrere Restaurants (GallopaySystem)

Eine Installation, beliebig viele Betriebe. Jeder Betrieb hat dieselben Apps mit eigenem Logo, eigenen Daten und eigener Speisekarte.
- Gäste-Apps: `kunde/?l=<code>` und `abholung/?l=<code>` (ohne `l` = Imbiss Hirsch, alte QR-Codes funktionieren weiter).
- Personal-Apps (Kasse, Küche, Fahrer, Dashboard): der Betrieb ergibt sich aus dem Login. Der Plattform-Admin kann mit `?l=<code>` jeden Betrieb öffnen.
- Neuer Kunde: Plattform → „+ Nuovo cliente“ → 1 Locale (Logo, Titelbild, Adresse, Telefon, Slogan, Öffnungszeiten, Google-Link) → 2 Menù (Flyer-Foto hochladen → Karte wird automatisch gelesen und in 5 Sprachen übersetzt) → 3 Contratto → 4 App e accesso (Links, QR, Inhaber freischalten).
- Logos liegen im Storage-Bucket `brand`; aus dem Logo wird automatisch ein quadratisches App-Icon erzeugt.
- Flyer-Import: Edge Function `menu-from-flyer`, braucht das Secret `ANTHROPIC_API_KEY` (Supabase → Edge Functions → Secrets).
- **Pflicht vor dem zweiten echten Kunden:** `supabase/migrations/multi_tenant_part2.sql` einmal im SQL Editor ausführen (trennt die Daten der Betriebe auch auf Datenbank-Ebene).

## Verträge

Plattform → Kunde → 3 Contratto → „Prepara e firma“: Vertrag (Deutsch) mit den Vertragsdaten des Kunden, Unterschrift von Kunde und Anbieter direkt auf dem Bildschirm → PDF.
- PDF herunterladen bzw. teilen; gespeichert im privaten Bucket `contracts`, Prüfsumme (SHA-256) in der Tabelle `contracts`.
- Der Inhaber des Kunden sieht und lädt den Vertrag im Dashboard → Support (nur Admins des Betriebs).
- Anbieterdaten, eigene Unterschrift und Support-Kontakt: Plattform → „Profilo e assistenza“.
- Der Vertragstext ist eine Vorlage – vor dem ersten Einsatz anwaltlich prüfen lassen (inkl. separater AV-Vereinbarung nach Art. 28 DSGVO).

Der Name GallopaySystem erscheint nur in der Plattform-App des Betreibers und als Eigentumsvermerk im Code, nicht in den Apps der Kunden.
