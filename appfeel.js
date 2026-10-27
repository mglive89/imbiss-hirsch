// Imbiss Hirsch – app feel (no zoom, also on iPhone) + shared sounds
(function () {
  // iOS Safari ignores user-scalable=no, so block pinch and ctrl/cmd zoom here
  const stop = (e) => e.preventDefault();
  document.addEventListener("gesturestart", stop, { passive: false });
  document.addEventListener("gesturechange", stop, { passive: false });
  document.addEventListener("touchstart", (e) => { if (e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("touchmove", (e) => { if ((e.scale && e.scale !== 1) || e.touches.length > 1) e.preventDefault(); }, { passive: false });
  document.addEventListener("wheel", (e) => { if (e.ctrlKey) e.preventDefault(); }, { passive: false });
  document.addEventListener("keydown", (e) => { if ((e.ctrlKey || e.metaKey) && ["+", "-", "=", "0"].includes(e.key)) e.preventDefault(); });
  document.addEventListener("contextmenu", (e) => { if (e.target.closest && e.target.closest("img")) e.preventDefault(); });

  // Sounds. Browsers only allow audio after a tap, so pages call IHSound.unlock() from a button.
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
  window.IHSound = {
    unlock() {
      try {
        if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
        if (ctx.state === "suspended") ctx.resume();
        tone([[0, 1, 0.01, 0.0002]]); // silent tick, keeps iOS happy
        return true;
      } catch (e) { return false; }
    },
    get on() { return !!ctx && ctx.state !== "closed"; },
    off() { if (ctx) { ctx.close(); ctx = null; } },
    // new order arrived (kitchen / till): bright three-note chime
    received() { tone([[0, 880, 0.18], [0.2, 1175, 0.18], [0.4, 1568, 0.32]]); vibrate([120, 80, 120]); },
    // order ready for pickup: loud repeating alarm
    ready() {
      const s = [];
      for (let r = 0; r < 3; r++) {
        const b = r * 0.95;
        s.push([b, 1046, 0.22, 0.5, "square"], [b + 0.26, 784, 0.22, 0.5, "square"], [b + 0.52, 1046, 0.34, 0.5, "square"]);
      }
      tone(s); vibrate([300, 150, 300, 150, 600]);
    },
  };
})();
