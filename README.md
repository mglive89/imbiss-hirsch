# Imbiss Hirsch – Web-App

Zwei Apps, eine Datenbank (Supabase-Projekt `imbiss-hirsch`, Frankfurt):

| Datei | Für wen | Was |
|---|---|---|
| `index.html` | Gäste | Speisekarte in 5 Sprachen, Warenkorb, Bestellung am Tisch / Abholung / Lieferung, Status live |
| `kueche.html` | Küche | Großes Display (Tablet/TV): nur **bezahlte** Bestellungen, älteste Zahlung zuerst, Start → Fertig, Ton, Vollbild |
| `abholung.html` | Gastraum-TV | Abhol-Anzeige ohne Login: „In Zubereitung“ und groß „Bitte abholen“ mit Bestell- und Tischnummer, Alarmton |
| `personal.html` | Team | Küchen-Board live mit Ton, Telefon-/WhatsApp-Bestellungen erfassen, Speisekarte & Preise, „Ausverkauft“, Tagesübersicht, QR-Codes, Team |

Kein Build nötig, nur statische Dateien.

## 1. Online stellen (VPS + nginx, HTTPS ist Pflicht)

```bash
scp -r imbiss-hirsch-app/* user@server:/var/www/imbiss-hirsch/
```

```nginx
server {
    server_name menu.example.de;
    root /var/www/imbiss-hirsch;
    index index.html;
    location ~* \.(html|js|css|webmanifest)$ { add_header Cache-Control "no-cache"; }
}
```

```bash
sudo certbot --nginx -d menu.example.de
```

## 2. Supabase einmal einstellen

Dashboard → Authentication → URL Configuration:
- **Site URL**: `https://menu.example.de/personal.html`
- **Redirect URLs**: `https://menu.example.de/*`

Sonst führt der Bestätigungslink aus der Registrierungs-Mail ins Leere.

## 3. Erster Login

1. `https://menu.example.de/personal.html` öffnen → „Konto erstellen“.
2. E-Mail bestätigen, dann anmelden. **Das erste Konto wird automatisch Admin.**
3. Weitere Mitarbeiter: Sie erstellen ein Konto, du trägst ihre E-Mail unter „QR & Team“ ein.

## 4. Tische

„QR & Team“ → Anzahl Tische eintragen → Codes abfotografieren und drucken.
Jeder Code öffnet `…/?tisch=N`; die Bestellung landet mit Tischnummer in der Küche.
Der Code „Abholen & Liefern“ ist für Flyer und Tüten.

## Wie es zusammenhängt

- Gäste können Bestellungen nur über die Funktion `place_order` anlegen. Preise rechnet die Datenbank selbst, Gäste können sie nicht verändern.
- Gäste sehen nur den Status der eigenen Bestellung (Nummer + geheimer Schlüssel).
- Bestellungen, Speisekarte bearbeiten und Übersicht nur für freigeschaltete Mitarbeiter (Row Level Security).
- Spam-Bremse: max. 3 Gäste-Bestellungen pro Tisch/Telefon in 3 Minuten.
- Ohne Internet zeigt die Gäste-App die zuletzt geladene Karte (Bestellen ist dann gesperrt).

## Nach Änderungen an den Dateien

`VERSION` in `sw.js` hochzählen (z. B. `ih-app-v2`), damit installierte Apps die neue Version laden.
Preise und Gerichte änderst du **nicht** in den Dateien, sondern in `personal.html` → „Speisekarte“.

## Ablauf einer Bestellung

1. Gast bestellt per QR (oder ihr erfasst sie unter „Neue Bestellung“) → Spalte **Zu bezahlen** in der Kasse.
2. Kasse tippt **Bar bezahlt** / **Karte** (Lieferung: **Bei Lieferung**) → Bestellung erscheint auf dem **Küchen-Display**.
3. Küche: **Start** → **Fertig** → Nummer erscheint rechts unter „Fertig · zur Ausgabe“.
4. Kasse: **Ausgegeben** / **Ausgeliefert** → abgeschlossen.

Telefon-/Theken-Bestellungen, die schon bezahlt sind, gehen beim Anlegen direkt in die Küche (Zahlung „Bar“ oder „Karte“ wählen).

## Online-Zahlung (Karte, PayPal, Apple Pay, Google Pay) über Stripe

Die Funktionen `create-checkout` und `stripe-webhook` laufen schon in Supabase (Code in `supabase/functions/`).
Solange kein Stripe-Schlüssel hinterlegt ist, zeigt die Gäste-App nur „Bar an der Kasse“.

1. Stripe-Konto anlegen (stripe.com) → Einstellungen → Zahlungsmethoden → **PayPal**, Apple Pay, Google Pay aktivieren.
2. Supabase → Edge Functions → **Secrets** → `STRIPE_SECRET_KEY` = geheimer Schlüssel (`sk_test_…` zum Testen, später `sk_live_…`).
3. Stripe → Entwickler → **Webhooks** → Endpunkt hinzufügen:
   `https://trwvzjgkygoggnomfovi.supabase.co/functions/v1/stripe-webhook`
   Ereignisse: `checkout.session.completed`, `checkout.session.async_payment_succeeded`
   → Signatur-Geheimnis kopieren → Supabase-Secret `STRIPE_WEBHOOK_SECRET`.
4. Eigene Domain statt GitHub Pages? Secret `APP_ORIGINS` = `https://menu.example.de` (mehrere mit Komma).

Online bezahlte Bestellungen gehen ohne Kasse direkt in die Küche. Stornos online bezahlter Bestellungen im Stripe-Dashboard erstatten.
