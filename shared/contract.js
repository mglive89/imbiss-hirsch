/* GallopaySystem · © 2026 Marco Gallo · Software proprietario, tutti i diritti riservati */
/* =====================================================================
   Contract: text (German), on-screen preview and PDF (no external library).
   IH.contract.sections(t)  -> [{h, p:[...]}]     same text for preview and PDF
   IH.contract.html(t)      -> preview HTML
   IH.contract.pdf(t, sig)  -> Promise<Blob>       sig = {client, provider} JPEG data URLs
   ===================================================================== */
(function () {
  "use strict";
  const IH = window.IH;
  const W = [[278,278,355,556,556,889,667,191,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,278,278,584,584,584,556,1015,667,667,722,722,667,611,778,722,278,500,667,556,833,722,778,667,778,722,667,611,722,667,944,667,667,611,278,278,278,469,556,333,556,556,500,556,556,278,556,556,222,222,500,222,833,556,556,556,556,333,500,278,556,500,722,500,500,500,334,260,334,584,761,556,556,222,556,333,1000,556,556,333,1000,667,333,1000,556,611,556,556,222,222,333,333,350,556,1000,333,1000,500,333,944,556,500,667,278,333,556,556,556,556,260,556,333,737,370,556,584,333,737,333,400,584,333,333,333,556,537,278,333,333,365,556,834,834,834,611,667,667,667,667,667,667,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,500,556,556,556,556,278,278,278,278,556,556,556,556,556,556,556,584,611,556,556,556,556,500,556,500],[278,333,474,556,556,889,722,238,333,333,389,584,278,333,278,278,556,556,556,556,556,556,556,556,556,556,333,333,584,584,584,611,975,722,722,722,722,667,611,778,722,278,556,722,611,833,722,778,667,778,722,667,611,722,667,944,667,667,611,333,278,333,584,556,333,556,611,556,611,556,333,611,611,278,278,556,278,889,611,611,611,611,389,556,333,611,556,778,556,556,500,389,280,389,584,761,556,556,278,556,500,1000,556,556,333,1000,667,333,1000,556,611,556,556,278,278,500,500,350,556,1000,333,1000,556,333,944,556,500,667,278,333,556,556,556,556,280,556,333,737,370,556,584,333,737,333,400,584,333,333,333,611,556,278,333,333,365,556,834,834,834,611,722,722,722,722,722,722,1000,722,667,667,667,667,278,278,278,278,722,722,778,778,778,778,778,584,778,722,722,722,722,667,667,611,556,556,556,556,556,556,889,556,556,556,556,556,278,278,278,278,611,611,611,611,611,611,611,584,611,611,611,611,611,556,611,556]];   // Helvetica / Helvetica-Bold widths (WinAnsi 32..255, 1/1000 em)
  const eur = (v) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(+v || 0);
  const num = (v) => new Intl.NumberFormat("de-DE", { maximumFractionDigits: 2 }).format(+v || 0);
  const dDE = (s) => (s ? new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(s + (s.length === 10 ? "T12:00:00" : ""))) : "—");

  function sections(t) {
    const P = t.provider || {}, C = t.client || {};
    const fees = [`Einmalige Einrichtungsgebühr: ${eur(t.setup_fee)}`, `Monatliche Grundgebühr: ${eur(t.monthly_fee)}`];
    if (+t.pct_online) fees.push(`Provision auf Online-Zahlungen über das System: ${num(t.pct_online)} % des Bruttobetrags`);
    if (+t.fee_per_order) fees.push(`Gebühr je Bestellung über das System: ${eur(t.fee_per_order)}`);
    const trial = t.trial_until ? `Bis einschließlich ${dDE(t.trial_until)} gilt eine kostenlose Testphase; die monatliche Grundgebühr und Provisionen fallen erst danach an. ` : "";
    return [
      { h: "§ 1 Vertragsparteien", p: [
        `Anbieter: ${[P.name, P.address].filter(Boolean).join(", ")}${P.tax_id ? ` (Steuer-Nr./USt-IdNr.: ${P.tax_id})` : ""}${P.email ? `, E-Mail: ${P.email}` : ""}${P.phone ? `, Telefon: ${P.phone}` : ""}`,
        `Kunde: ${[C.name, C.address].filter(Boolean).join(", ")}${C.contact ? `, vertreten durch ${C.contact}` : ""}` ] },
      { h: "§ 2 Vertragsgegenstand", p: [
        `Der Anbieter stellt dem Kunden das Bestell- und Kassensystem „GallopaySystem“ als Webanwendung (Software as a Service) zur Nutzung über das Internet bereit. Der Leistungsumfang umfasst: Gäste-App mit mehrsprachiger Speisekarte und Bestellung per QR-Code (Tisch, Abholung, Lieferung), Kasse, Küchen-Display, Abhol-Anzeige, Fahrer-App sowie das Dashboard mit Auswertung, Speisekarten-, QR-Code- und Teamverwaltung, jeweils mit dem Logo und den Daten des Kunden.`,
        `Im Leistungsumfang enthalten sind Betrieb und Hosting, Wartung, Sicherheits- und Funktionsupdates sowie Support per E-Mail und Telefon an Werktagen.` ] },
      { h: "§ 3 Vergütung", p: [
        ...fees.map((f) => "• " + f),
        `${trial}Die Abrechnung erfolgt monatlich; Rechnungen sind innerhalb von 14 Tagen ohne Abzug zahlbar. Alle Beträge verstehen sich zuzüglich gesetzlicher Umsatzsteuer, soweit diese anfällt. Die Einrichtungsgebühr ist mit Beginn der Nutzung fällig.` ] },
      { h: "§ 4 Laufzeit und Kündigung", p: [
        `Der Vertrag beginnt am ${dDE(t.start)} und läuft auf unbestimmte Zeit${+t.min_months ? `, mindestens jedoch ${t.min_months} Monate ab Ende der Testphase` : ""}. Er kann von beiden Seiten mit einer Frist von ${t.notice_months || 1} Monat${(t.notice_months || 1) > 1 ? "en" : ""} zum Monatsende in Textform (z. B. E-Mail) gekündigt werden${+t.min_months ? ", frühestens zum Ende der Mindestlaufzeit" : ""}. Das Recht zur außerordentlichen Kündigung aus wichtigem Grund bleibt unberührt, insbesondere bei einem Zahlungsverzug von mehr als zwei Monaten.`,
        `Nach Vertragsende erhält der Kunde auf Wunsch innerhalb von 30 Tagen einen Export seiner Speisekarte und Bestelldaten; danach werden die Daten gelöscht, soweit keine gesetzlichen Aufbewahrungspflichten bestehen.` ] },
      { h: "§ 5 Pflichten des Anbieters", p: [
        `Der Anbieter betreibt das System mit der verkehrsüblichen Sorgfalt und strebt eine Verfügbarkeit von 99 % im Monatsmittel an; ausgenommen sind angekündigte Wartungsfenster und Störungen außerhalb seines Einflussbereichs (z. B. Internetverbindung des Kunden, Ausfälle von Drittanbietern). Störungen werden nach Kenntnis schnellstmöglich behoben. Daten werden regelmäßig gesichert.` ] },
      { h: "§ 6 Pflichten des Kunden", p: [
        `Der Kunde ist für die Inhalte verantwortlich, die er im System hinterlegt, insbesondere für Speisekarte, Preise sowie Angaben zu Allergenen und Zusatzstoffen. Er hält die Zugangsdaten seines Personals geheim, entfernt ausgeschiedene Mitarbeiter im Dashboard und informiert den Anbieter unverzüglich über erkennbare Störungen oder Missbrauch.` ] },
      { h: "§ 7 Online-Zahlungen", p: [
        `Online-Zahlungen der Gäste werden über einen Zahlungsdienstleister (derzeit Stripe) abgewickelt. Dessen Transaktionsgebühren trägt der Kunde. Die Zahlungen in bar oder mit Karte vor Ort bleiben Sache des Kunden; das System dokumentiert sie lediglich.` ] },
      { h: "§ 8 Datenschutz", p: [
        `Soweit der Anbieter personenbezogene Daten der Gäste oder Mitarbeiter im Auftrag des Kunden verarbeitet (z. B. Name, Telefonnummer, Lieferadresse), geschieht dies als Auftragsverarbeitung nach Art. 28 DSGVO. Die Parteien schließen hierzu eine gesonderte Vereinbarung zur Auftragsverarbeitung. Die Daten werden auf Servern in der Europäischen Union gespeichert.` ] },
      { h: "§ 9 Nutzungsrechte und Eigentum", p: [
        `Die Software „GallopaySystem“ einschließlich Quellcode, Design und Dokumentation ist und bleibt geistiges Eigentum des Anbieters. Der Kunde erhält für die Dauer dieses Vertrags ein einfaches, nicht übertragbares und nicht unterlizenzierbares Recht, das System für seinen eigenen Betrieb zu nutzen. Kopieren, Weitergabe, Bearbeitung oder Nachbau der Software sind nicht gestattet. Inhalte und Daten des Kunden (Logo, Speisekarte, Bestellungen) bleiben Eigentum des Kunden.` ] },
      { h: "§ 10 Haftung", p: [
        `Der Anbieter haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben, Körper oder Gesundheit. Bei leichter Fahrlässigkeit haftet er nur bei Verletzung wesentlicher Vertragspflichten und begrenzt auf den vertragstypischen, vorhersehbaren Schaden, höchstens auf die vom Kunden in den letzten zwölf Monaten gezahlte Vergütung. Eine Haftung für entgangenen Gewinn bei leichter Fahrlässigkeit ist ausgeschlossen.` ] },
      ...(t.notes ? [{ h: "§ 11 Besondere Vereinbarungen", p: [t.notes] }] : []),
      { h: `§ ${t.notes ? 12 : 11} Schlussbestimmungen`, p: [
        `Änderungen und Ergänzungen bedürfen der Textform. Es gilt das Recht der Bundesrepublik Deutschland. Sollte eine Bestimmung unwirksam sein, bleibt die Wirksamkeit der übrigen Bestimmungen unberührt. Die Parteien sind sich einig, dass dieser Vertrag durch eigenhändige Unterschrift auf dem Bildschirm (elektronische Unterschrift) wirksam geschlossen wird; jede Partei erhält eine PDF-Ausfertigung.` ] },
    ];
  }

  function html(t) {
    return `<div class="ctitle">Softwarenutzungsvertrag</div><div class="csub">Bestell- und Kassensystem · Vertrag Nr. ${IH.esc(t.nr)}</div>` +
      sections(t).map((s) => `<h4>${IH.esc(s.h)}</h4>${s.p.map((x) => `<p>${IH.esc(x)}</p>`).join("")}`).join("");
  }

  /* ---------- tiny PDF writer: Helvetica text, lines, JPEG images ---------- */
  const CP = { "€": 128, "‚": 130, "„": 132, "…": 133, "‘": 145, "’": 146, "“": 147, "”": 148, "•": 149, "–": 150, "—": 151, "™": 153 };
  const code = (ch) => { if (CP[ch]) return CP[ch]; const c = ch.charCodeAt(0); return c < 256 ? c : 63; };
  const width = (s, bold, size) => { let w = 0; for (const ch of s) { const c = code(ch); w += c >= 32 ? W[bold ? 1 : 0][c - 32] : 0; } return (w * size) / 1000; };
  const pdfStr = (s) => { let o = "("; for (const ch of s) { const c = code(ch); o += c === 40 || c === 41 || c === 92 ? "\\" + String.fromCharCode(c) : c > 126 || c < 32 ? "\\" + c.toString(8).padStart(3, "0") : String.fromCharCode(c); } return o + ")"; };
  const dataToBytes = (d) => { const b = atob(d.split(",")[1]); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
  const imgSize = (src) => new Promise((r) => { const i = new Image(); i.onload = () => r([i.naturalWidth, i.naturalHeight]); i.onerror = () => r([1, 1]); i.src = src; });
  // any image URL -> JPEG data URL on white (PDF embeds JPEG directly)
  async function toJpeg(src, max = 900) {
    if (!src) return null;
    try {
      const img = await new Promise((res, rej) => { const i = new Image(); i.crossOrigin = "anonymous"; i.onload = () => res(i); i.onerror = rej; i.src = src; });
      const k = Math.min(1, max / Math.max(img.naturalWidth, img.naturalHeight)), cv = document.createElement("canvas");
      cv.width = Math.max(1, Math.round(img.naturalWidth * k)); cv.height = Math.max(1, Math.round(img.naturalHeight * k));
      const g = cv.getContext("2d"); g.fillStyle = "#fff"; g.fillRect(0, 0, cv.width, cv.height); g.drawImage(img, 0, 0, cv.width, cv.height);
      return cv.toDataURL("image/jpeg", 0.9);
    } catch (e) { return null; }
  }

  async function pdf(t, sig) {
    const PW = 595.28, PH = 841.89, M = 56, CW = PW - 2 * M;
    const pages = []; let ops = [], y = 0;
    const imgs = [];   // {bytes, w, h}
    const newPage = () => { ops = []; pages.push(ops); y = M; };
    const txt = (s, x, yy, size, bold, color = "0.1 0.1 0.1") => ops.push(`BT ${color} rg /F${bold ? 2 : 1} ${size} Tf ${x.toFixed(2)} ${(PH - yy).toFixed(2)} Td ${pdfStr(s)} Tj ET`);
    const line = (x1, y1, x2, y2, w = 0.6, col = "0.75 0.75 0.75") => ops.push(`${col} RG ${w} w ${x1.toFixed(2)} ${(PH - y1).toFixed(2)} m ${x2.toFixed(2)} ${(PH - y2).toFixed(2)} l S`);
    const img = async (dataUrl, x, yy, maxW, maxH) => {
      if (!dataUrl) return 0;
      const [iw, ih] = await imgSize(dataUrl), k = Math.min(maxW / iw, maxH / ih), w = iw * k, h = ih * k;
      imgs.push({ bytes: dataToBytes(dataUrl), w: iw, h: ih }); const n = imgs.length;
      ops.push(`q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${x.toFixed(2)} ${(PH - yy - h).toFixed(2)} cm /Im${n} Do Q`);
      return h;
    };
    const wrap = (s, size, bold, maxW) => {
      const out = []; let cur = "";
      for (const word of String(s).split(/\s+/)) {
        const tryS = cur ? cur + " " + word : word;
        if (width(tryS, bold, size) <= maxW || !cur) cur = tryS; else { out.push(cur); cur = word; }
      }
      if (cur) out.push(cur); return out;
    };
    const need = (h) => { if (y + h > PH - M - 20) newPage(); };
    const para = (s, size = 10, bold = false, gap = 4, indent = 0) => {
      const lh = size * 1.38;
      for (const l of wrap(s, size, bold, CW - indent)) { need(lh); txt(l, M + indent, y + size, size, bold); y += lh; }
      y += gap;
    };

    newPage();
    // header: provider left, client logo right
    const logo = await toJpeg(t.client && t.client.logo_url, 600);
    if (logo) await img(logo, PW - M - 130, y - 6, 130, 54);
    txt((t.provider && t.provider.name) || "", M, y + 10, 10, true, "0.35 0.35 0.35");
    txt([t.provider && t.provider.email, t.provider && t.provider.phone].filter(Boolean).join(" · "), M, y + 24, 8.5, false, "0.45 0.45 0.45");
    y += 70;
    txt("Softwarenutzungsvertrag", M, y, 22, true); y += 18;
    txt(`Bestell- und Kassensystem (SaaS) · Vertrag Nr. ${t.nr} · ${dDE(t.date)}`, M, y, 10, false, "0.4 0.4 0.4"); y += 12;
    line(M, y, PW - M, y, 1.2, "0.95 0.7 0.24"); y += 20;
    for (const s of sections(t)) {
      need(40); para(s.h, 11.5, true, 3);
      for (const p of s.p) para(p, 9.6, false, 5, p.startsWith("• ") ? 6 : 0);
      y += 4;
    }
    // signatures
    need(190);
    y += 10; para("Unterschriften", 11.5, true, 8);
    const colW = (CW - 30) / 2, top = y, place = t.place ? t.place + ", " : "";
    const when = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(t.signed_at || Date.now()));
    for (const [i, who, name, s] of [[0, "Anbieter", t.provider && t.provider.name, sig.provider], [1, "Kunde", t.signer_name, sig.client]]) {
      const x = M + i * (colW + 30);
      await img(s, x, top, colW, 70);
      line(x, top + 76, x + colW, top + 76, 0.8, "0.3 0.3 0.3");
      txt(`${who}: ${name || ""}`, x, top + 90, 9.5, true);
      txt(i === 1 && t.client ? t.client.name : "", x, top + 103, 9, false, "0.35 0.35 0.35");
      txt(`${place}${when} Uhr`, x, top + 116, 9, false, "0.35 0.35 0.35");
    }
    y = top + 140;
    para(`Elektronisch unterzeichnet am ${when} Uhr auf dem Bildschirm. Dokument-ID: ${t.id || t.nr}.`, 8, false, 0);

    // footer with page numbers
    pages.forEach((o, i) => {
      o.push(`BT 0.55 0.55 0.55 rg /F1 7.5 Tf ${M} ${(M - 26).toFixed(2)} Td ${pdfStr(`Vertrag Nr. ${t.nr} · ${(t.client && t.client.name) || ""}`)} Tj ET`);
      const pn = `Seite ${i + 1} von ${pages.length}`;
      o.push(`BT 0.55 0.55 0.55 rg /F1 7.5 Tf ${(PW - M - width(pn, false, 7.5)).toFixed(2)} ${(M - 26).toFixed(2)} Td ${pdfStr(pn)} Tj ET`);
    });

    // ---- assemble the file ----
    const enc = new TextEncoder(), chunks = [], offs = [];
    let len = 0;
    const push = (x) => { const b = typeof x === "string" ? Uint8Array.from(x, (c) => c.charCodeAt(0) & 255) : x; chunks.push(b); len += b.length; };
    const obj = (n, body) => { offs[n] = len; push(`${n} 0 obj\n`); for (const b of [].concat(body)) push(b); push("\nendobj\n"); };
    push("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");
    const nPages = pages.length, firstPage = 5, firstImg = firstPage + nPages * 2;
    obj(1, `<< /Type /Catalog /Pages 2 0 R >>`);
    obj(2, `<< /Type /Pages /Count ${nPages} /Kids [${pages.map((_, i) => `${firstPage + i * 2} 0 R`).join(" ")}] >>`);
    obj(3, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`);
    obj(4, `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`);
    const xo = imgs.map((_, i) => `/Im${i + 1} ${firstImg + i} 0 R`).join(" ");
    pages.forEach((o, i) => {
      const content = o.join("\n");
      obj(firstPage + i * 2, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PW} ${PH}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> /XObject << ${xo} >> >> /Contents ${firstPage + i * 2 + 1} 0 R >>`);
      obj(firstPage + i * 2 + 1, [`<< /Length ${content.length} >>\nstream\n`, content, "\nendstream"]);
    });
    imgs.forEach((im, i) => obj(firstImg + i, [`<< /Type /XObject /Subtype /Image /Width ${im.w} /Height ${im.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${im.bytes.length} >>\nstream\n`, im.bytes, "\nendstream"]));
    const total = firstImg + imgs.length, xref = len;
    push(`xref\n0 ${total}\n0000000000 65535 f \n` + Array.from({ length: total - 1 }, (_, i) => String(offs[i + 1]).padStart(10, "0") + " 00000 n \n").join(""));
    push(`trailer\n<< /Size ${total} /Root 1 0 R /Info << /Title ${pdfStr("Softwarenutzungsvertrag " + t.nr)} /Producer (GallopaySystem) >> >>\nstartxref\n${xref}\n%%EOF`);
    void enc;
    return new Blob(chunks, { type: "application/pdf" });
  }

  /* ---------- signature pad ---------- */
  function pad(canvas) {
    const g = canvas.getContext("2d"); let drawing = false, last = null, dirty = false;
    const fit = () => { const r = canvas.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1); const keep = dirty ? canvas.toDataURL() : null;
      canvas.width = Math.round(r.width * d); canvas.height = Math.round(r.height * d); g.setTransform(d, 0, 0, d, 0, 0); clear(false);
      if (keep) { const i = new Image(); i.onload = () => g.drawImage(i, 0, 0, r.width, r.height); i.src = keep; } };
    const clear = (reset = true) => { const r = canvas.getBoundingClientRect(); g.fillStyle = "#fff"; g.fillRect(0, 0, r.width, r.height); if (reset) dirty = false; canvas.dispatchEvent(new Event("change")); };
    const pt = (e) => { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };
    canvas.style.touchAction = "none";
    canvas.addEventListener("pointerdown", (e) => { drawing = true; last = pt(e); canvas.setPointerCapture(e.pointerId); g.beginPath(); g.arc(last[0], last[1], 1.2, 0, 7); g.fillStyle = "#0b1f4d"; g.fill(); });
    canvas.addEventListener("pointermove", (e) => { if (!drawing) return; const p = pt(e); g.strokeStyle = "#0b1f4d"; g.lineWidth = 2.4; g.lineCap = g.lineJoin = "round"; g.beginPath(); g.moveTo(last[0], last[1]); g.lineTo(p[0], p[1]); g.stroke(); last = p; if (!dirty) { dirty = true; canvas.dispatchEvent(new Event("change")); } });
    const end = () => (drawing = false);
    canvas.addEventListener("pointerup", end); canvas.addEventListener("pointercancel", end);
    requestAnimationFrame(fit);
    return {
      clear, get empty() { return !dirty; },
      jpeg: () => canvas.toDataURL("image/jpeg", 0.92),
      load(src) { const i = new Image(); i.onload = () => { const r = canvas.getBoundingClientRect(); clear(); const k = Math.min(r.width / i.naturalWidth, r.height / i.naturalHeight); g.drawImage(i, (r.width - i.naturalWidth * k) / 2, (r.height - i.naturalHeight * k) / 2, i.naturalWidth * k, i.naturalHeight * k); dirty = true; canvas.dispatchEvent(new Event("change")); }; i.src = src; },
    };
  }

  async function sha256(blob) {
    const h = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  IH.contract = { sections, html, pdf, pad, sha256, toJpeg, dDE };
})();
