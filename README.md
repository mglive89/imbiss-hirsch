# Imbiss Hirsch – Web-App

Zwei Apps, eine Datenbank (Supabase-Projekt `imbiss-hirsch`, Frankfurt):

| Datei | Für wen | Was |
|---|---|---|
| `index.html` | Gäste | Speisekarte in 5 Sprachen, Warenkorb, Bestellung am Tisch / Abholung / Lieferung, Status live |
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
