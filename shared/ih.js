/* =====================================================================
   Imbiss – shared core for all apps
   helpers · Supabase client · sounds · zoom lock · motion · layers
   ===================================================================== */
(function () {
  "use strict";
  const IH = (window.IH = {});
  const mm = (q) => (window.matchMedia ? matchMedia(q).matches : false);

  IH.reduced = mm("(prefers-reduced-motion: reduce)");
  IH.standalone = mm("(display-mode: standalone)") || mm("(display-mode: fullscreen)") || navigator.standalone === true;

  /* ---------- small helpers ---------- */
  IH.$ = (id) => document.getElementById(id);
  IH.esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  IH.store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} },
  };
  IH.eur = (v, locale = "de-DE") => new Intl.NumberFormat(locale, { style: "currency", currency: "EUR" }).format(+v || 0);
  IH.berlinParts = (d) => Object.fromEntries(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23", weekday: "short" }).formatToParts(d).map((p) => [p.type, p.value]));
  IH.berlinToday = () => { const p = IH.berlinParts(new Date()); return `${p.year}-${p.month}-${p.day}`; };
  IH.addDays = (ymd, n) => { const [y, m, d] = ymd.split("-").map(Number); const t = new Date(Date.UTC(y, m - 1, d + n, 12)); return t.toISOString().slice(0, 10); };
  IH.dayRange = (ymd) => {
    const [y, m, d] = ymd.split("-").map(Number);
    const noon = new Date(Date.UTC(y, m - 1, d, 12));
    const p = IH.berlinParts(noon);
    const off = (Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - noon.getTime()) / 60000;
    const start = new Date(Date.UTC(y, m - 1, d) - off * 60000);
    return [start.toISOString(), new Date(start.getTime() + 864e5).toISOString()];
  };
  IH.hhmm = (iso) => new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
  IH.minsAgo = (iso) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000));
  IH.client = (opts) => window.supabase.createClient(IH_CONFIG.url, IH_CONFIG.key, opts);
  IH.CH = { tisch: "Tisch", abholung: "Abholung", lieferung: "Lieferung" };
  IH.SRC = { qr: "QR", telefon: "Telefon", whatsapp: "WhatsApp", theke: "Theke" };
  IH.ST = { neu: "Neu", zubereitung: "In Zubereitung", fertig: "Fertig", unterwegs: "Unterwegs", abgeschlossen: "Abgeschlossen", storniert: "Storniert" };
  IH.mapsUrl = (addr) => "https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=" + encodeURIComponent(addr || "");
  IH.etaText = (o) => {
    if (!o.eta_at) return "";
    const left = Math.round((new Date(o.eta_at).getTime() - Date.now()) / 60000);
    return `bis ${IH.hhmm(o.eta_at)} · ${left >= 0 ? "noch " + left + " min" : Math.abs(left) + " min drüber"}`;
  };
  IH.PAY = { offen: "Offen", bar: "Bar bezahlt", karte: "Karte bezahlt", bei_lieferung: "Zahlung bei Lieferung", online: "Online bezahlt" };
  IH.PM = { card: "Karte", paypal: "PayPal", apple_pay: "Apple Pay", google_pay: "Google Pay" };
  IH.where = (o) => (o.channel === "tisch" ? `Tisch ${IH.esc(o.table_no)}` : o.channel === "abholung" ? "Abholung" : "Lieferung");

  /* ---------- app feel: no zoom (also iOS), no image long-press ---------- */
  const stop = (e) => e.preventDefault();
  document.addEventListener("gesturestart", stop, { passive: false });
  document.addEventListener("gesturechange", stop, { passive: false });
  document.addEventListener("touchstart", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", (e) => { if ((e.scale && e.scale !== 1) || e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault(); });
  document.addEventListener("contextmenu", (e) => { if (e.target.closest && e.target.closest("img")) e.preventDefault(); });

  /* ---------- tap ripple on buttons ---------- */
  document.addEventListener("pointerdown", (e) => {
    const b = e.target.closest && e.target.closest(".btn");
    if (!b || b.disabled || IH.reduced) return;
    const r = b.getBoundingClientRect(), s = Math.max(r.width, r.height);
    const dot = document.createElement("span");
    dot.className = "ripple";
    dot.style.cssText = `width:${s}px;height:${s}px;left:${e.clientX - r.left - s / 2}px;top:${e.clientY - r.top - s / 2}px`;
    b.appendChild(dot);
    setTimeout(() => dot.remove(), 600);
  });

  /* ---------- sounds (browsers allow audio only after a tap → unlock()) ---------- */
  let ctx = null;
  function tone(seq) {
    if (!ctx) return;
    if (ctx.state === "suspended") ctx.resume();
    const t0 = ctx.currentTime + 0.02;
    for (const [dt, freq, dur, vol = 0.4, type = "sine"] of seq) {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = freq;
      g.gain.setValueAtTime(0.0001, t0 + dt);
      g.gain.exponentialRampToValueAtTime(vol, t0 + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + dur);
      o.connect(g).connect(ctx.destination);
      o.start(t0 + dt); o.stop(t0 + dt + dur + 0.02);
    }
  }
  const vibrate = (p) => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };
  IH.sound = window.IHSound = {
    unlock() {
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        tone([[0, 1, 0.01, 0.0002]]);
        return true;
      } catch (e) { return false; }
    },
    get on() { return !!ctx && ctx.state !== "closed"; },
    off() { if (ctx) { ctx.close(); ctx = null; } },
    tap() { tone([[0, 660, 0.06, 0.12]]); },
    received() { tone([[0, 880, 0.18], [0.2, 1175, 0.18], [0.4, 1568, 0.32]]); vibrate([120, 80, 120]); },
    paid() { tone([[0, 988, 0.12, 0.3], [0.12, 1319, 0.26, 0.3]]); },
    ready() {
      const s = [];
      for (let r = 0; r < 3; r++) {
        const b = r * 0.95;
        s.push([b, 1046, 0.22, 0.5, "square"], [b + 0.26, 784, 0.22, 0.5, "square"], [b + 0.52, 1046, 0.34, 0.5, "square"]);
      }
      tone(s); vibrate([300, 150, 300, 150, 600]);
    },
  };

  /* ---------- toast ---------- */
  IH.toast = (msg, kind) => {
    let t = document.querySelector(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg;
    t.classList.toggle("err", kind === "err");
    t.classList.remove("show"); void t.offsetWidth; t.classList.add("show");
    clearTimeout(t._t); t._t = setTimeout(() => t.classList.remove("show"), kind === "err" ? 4200 : 2300);
  };

  /* ---------- layers (sheet / dialog with scrim) ---------- */
  IH.open = (el, scrim) => {
    clearTimeout(el._t); if (scrim) clearTimeout(scrim._t);
    if (scrim) { scrim.hidden = false; void scrim.offsetWidth; scrim.classList.add("open"); }
    el.hidden = false; void el.offsetWidth; el.classList.add("open");
  };
  IH.close = (el, scrim, after) => {
    el.classList.remove("open"); if (scrim) scrim.classList.remove("open");
    const done = () => { el.hidden = true; if (scrim) scrim.hidden = true; after && after(); };
    if (IH.reduced) return done();
    el._t = setTimeout(done, 380); if (scrim) scrim._t = el._t;
  };

  /* ---------- motion ---------- */
  // reveal on scroll: elements with .rv get .in when they enter the screen
  let io = null;
  IH.reveal = (root = document) => {
    const els = root.querySelectorAll("[data-rv]");
    if (IH.reduced || !("IntersectionObserver" in window)) return;
    if (!io) io = new IntersectionObserver((entries) => {
      for (const en of entries) if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
    }, { rootMargin: "0px 0px -6% 0px" });
    let k = 0, lastParent = null;
    els.forEach((el) => {
      if (el.parentElement !== lastParent) { k = 0; lastParent = el.parentElement; }
      el.style.setProperty("--i", Math.min(k++, 8));
      el.classList.add("rv"); el.removeAttribute("data-rv");
      io.observe(el);
    });
  };

  // FLIP: keyed elements ([data-k]) glide from their old to their new place after a re-render
  // root may be an element or a selector (use a selector when mutate() replaces the root itself)
  IH.flip = (rootOrSel, mutate, opts = {}) => {
    const get = () => (typeof rootOrSel === "string" ? document.querySelector(rootOrSel) : rootOrSel);
    let root = get();
    if (IH.reduced || !root) { mutate(); return; }
    const before = new Map();
    root.querySelectorAll("[data-k]").forEach((el) => before.set(el.dataset.k, el.getBoundingClientRect()));
    const firstRender = before.size === 0;
    mutate();
    root = get(); if (!root) return;
    let n = 0;
    root.querySelectorAll("[data-k]").forEach((el) => {
      const b = before.get(el.dataset.k), a = el.getBoundingClientRect();
      if (!b) {
        if (firstRender && opts.noEnterOnFirst) return;
        el.animate([{ opacity: 0, transform: "translateY(-14px) scale(.96)" }, { opacity: 1, transform: "none" }],
          { duration: 420, easing: "cubic-bezier(.2,.8,.2,1)", delay: firstRender ? Math.min(n++, 10) * 40 : 0, fill: "backwards" });
        return;
      }
      const dx = b.left - a.left, dy = b.top - a.top;
      if (Math.abs(dx) > 1 || Math.abs(dy) > 1)
        el.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: "none" }], { duration: 480, easing: "cubic-bezier(.2,.8,.2,1)" });
    });
  };

  // number count-up for KPI tiles
  IH.countUp = (el, to, fmt = (v) => Math.round(v), from) => {
    const start = from ?? +(el.dataset.val || 0);
    el.dataset.val = to;
    if (IH.reduced || start === to) { el.textContent = fmt(to); return; }
    const t0 = performance.now(), dur = 900;
    const step = (t) => {
      const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(start + (to - start) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  };

  IH.bump = (el) => { if (!el || IH.reduced) return; el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump"); };

  // a small dot flies from one element to another (add to cart)
  IH.flyTo = (fromEl, toEl, color = "var(--kraft)") => {
    if (IH.reduced || !fromEl || !toEl) return Promise.resolve();
    const a = fromEl.getBoundingClientRect(), b = toEl.getBoundingClientRect();
    const dot = document.createElement("div");
    dot.style.cssText = `position:fixed;z-index:99;left:${a.left + a.width / 2 - 9}px;top:${a.top + a.height / 2 - 9}px;width:18px;height:18px;border-radius:50%;background:${color};box-shadow:0 0 18px ${color};pointer-events:none`;
    document.body.appendChild(dot);
    const dx = b.left + Math.min(60, b.width / 2) - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
    const anim = dot.animate([
      { transform: "translate(0,0) scale(1)" },
      { transform: `translate(${dx * 0.5}px,${dy * 0.5 - 120}px) scale(1.15)`, offset: 0.45 },
      { transform: `translate(${dx}px,${dy}px) scale(.35)`, opacity: 0.6 },
    ], { duration: 650, easing: "cubic-bezier(.45,0,.55,1)" });
    return anim.finished.then(() => dot.remove(), () => dot.remove());
  };

  // confetti burst (ready!)
  IH.burst = (x = innerWidth / 2, y = innerHeight / 2, colors = ["#c9a274", "#7fbf5f", "#f3efe8", "#e5b54a", "#7fa8d9"]) => {
    if (IH.reduced) return;
    const c = document.createElement("canvas"), dpr = Math.min(2, devicePixelRatio || 1);
    c.width = innerWidth * dpr; c.height = innerHeight * dpr;
    c.style.cssText = "position:fixed;inset:0;width:100%;height:100%;z-index:98;pointer-events:none";
    document.body.appendChild(c);
    const g = c.getContext("2d"); g.scale(dpr, dpr);
    const P = Array.from({ length: 90 }, () => {
      const a = Math.random() * Math.PI * 2, v = 4 + Math.random() * 9;
      return { x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 6, s: 4 + Math.random() * 6, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4, c: colors[(Math.random() * colors.length) | 0] };
    });
    const t0 = performance.now();
    const frame = (t) => {
      const k = (t - t0) / 1600;
      g.clearRect(0, 0, innerWidth, innerHeight);
      for (const p of P) {
        p.vy += 0.32; p.vx *= 0.985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        g.save(); g.globalAlpha = Math.max(0, 1 - k); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
      }
      if (k < 1) requestAnimationFrame(frame); else c.remove();
    };
    requestAnimationFrame(frame);
  };

  // animated thumb for segmented controls
  IH.seg = (seg) => {
    if (!seg) return;
    let th = seg.querySelector(".thumb");
    if (!th) { th = document.createElement("span"); th.className = "thumb"; seg.prepend(th); }
    const on = seg.querySelector('button[aria-pressed="true"]');
    if (!on) { th.style.width = "0"; return; }
    const prev = seg.dataset.left;
    th.style.transition = prev === undefined ? "none" : "";
    th.style.left = on.offsetLeft + "px"; th.style.width = on.offsetWidth + "px";
    seg.dataset.left = on.offsetLeft;
  };

  // installed-app splash (only when launched from the home screen, once per session)
  IH.splash = (logo, tag) => {
    let shown = false;
    try { shown = sessionStorage.getItem("ih-splash") === "1"; sessionStorage.setItem("ih-splash", "1"); } catch (e) {}
    if (!IH.standalone || IH.reduced || shown) return;
    const s = document.createElement("div");
    s.className = "splash";
    s.innerHTML = `<img src="${logo}" alt="">${tag ? `<div class="tag">${IH.esc(tag)}</div>` : ""}`;
    document.body.appendChild(s);
    setTimeout(() => { s.classList.add("out"); setTimeout(() => s.remove(), 400); }, 1100);
  };

  /* ---------- device ---------- */
  let lock = null;
  IH.wake = async () => { try { if ("wakeLock" in navigator && !lock) { lock = await navigator.wakeLock.request("screen"); lock.addEventListener("release", () => (lock = null)); } } catch (e) {} };
  document.addEventListener("visibilitychange", () => { if (!document.hidden && IH._wantWake) IH.wake(); });
  IH.keepAwake = () => { IH._wantWake = true; IH.wake(); };
  IH.fullscreen = () => { try { const d = document; (d.fullscreenElement ? d.exitFullscreen() : d.documentElement.requestFullscreen?.())?.catch?.(() => {}); } catch (e) {} };
  IH.clock = (el) => {
    const f = () => (el.textContent = new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", hour: "2-digit", minute: "2-digit" }).format(new Date()));
    f(); setInterval(f, 10000);
  };
  IH.registerSW = (path = "../sw.js") => {
    if ("serviceWorker" in navigator && location.protocol === "https:")
      addEventListener("load", () => navigator.serviceWorker.register(path).catch(() => {}));
  };
  // blinking tab title for attention
  let titleT, baseTitle = document.title;
  IH.blinkTitle = (msg, times = 10) => {
    clearInterval(titleT); let k = 0;
    titleT = setInterval(() => { document.title = k++ % 2 ? baseTitle : "● " + msg; if (k > times * 2) { clearInterval(titleT); document.title = baseTitle; } }, 800);
  };
})();
