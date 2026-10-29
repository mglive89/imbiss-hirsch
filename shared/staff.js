/* =====================================================================
   Imbiss – login gate for the staff apps (Kasse, Dashboard, Küche)
   One login works for all staff apps on the same device.
   The very first account becomes admin automatically.
   ===================================================================== */
(function () {
  "use strict";
  const { $, esc } = IH;

  // role: "staff" (restaurant team) or "platform" (owner of the platform – no sign-up, no auto-admin)
  IH.staffGate = function ({ app, logo = "../assets/logo.jpg", onReady, allowSignup = true, role = "staff" }) {
    if (role === "platform") allowSignup = false;
    const sb = IH.client();
    IH.sb = sb;
    const gate = document.createElement("div");
    gate.className = "gate"; gate.hidden = true;
    gate.innerHTML = `
      <div class="box" id="g-login">
        <img src="${logo}" width="846" height="490" alt="Imbiss Hirsch">
        <p class="appname">${esc(app)}</p>
        <p id="g-msg">Mit deinem Personal-Konto anmelden.</p>
        <div class="field"><label for="g-email">E-Mail</label><input id="g-email" type="email" autocomplete="username"></div>
        <div class="field"><label for="g-pass">Passwort</label><input id="g-pass" type="password" autocomplete="current-password"></div>
        <p class="err" id="g-err" hidden></p>
        <div class="row">
          <button class="btn big primary" id="g-in" type="button">Anmelden</button>
          ${allowSignup ? `<button class="btn big" id="g-up" type="button">Konto erstellen</button>` : ""}
        </div>
      </div>
      <div class="box" id="g-wait" hidden>
        <img src="${logo}" width="846" height="490" alt="Imbiss Hirsch">
        <p class="appname">Fast geschafft</p>
        <p>Dein Konto <b id="g-who"></b> ist angelegt. Ein Admin schaltet dich im <b>Dashboard → Team</b> frei.</p>
        <div class="row"><button class="btn" id="g-re" type="button">Erneut prüfen</button><button class="btn" type="button" data-logout>Abmelden</button></div>
      </div>`;
    document.body.prepend(gate);
    const appEl = $("app");
    const err = (m) => { $("g-err").textContent = m || ""; $("g-err").hidden = !m; };
    const show = (v) => {
      gate.hidden = v === "app"; $("g-login").hidden = v !== "login"; $("g-wait").hidden = v !== "wait";
      if (appEl) appEl.hidden = v !== "app";
      if (v !== "app") gate.querySelector(".box:not([hidden])")?.classList.add("view-in");
    };

    async function boot() {
      const { data: { session } } = await sb.auth.getSession();
      const me = session?.user;
      if (!me) return show("login");
      if (role === "platform"){
        const { data: ok } = await sb.rpc("is_platform_admin");
        if (!ok){ await sb.auth.signOut(); show("login"); err("Dieses Konto hat keinen Zugang zur Plattform."); return; }
        show("app");
        document.querySelectorAll("[data-who]").forEach((el) => (el.textContent = me.email));
        return onReady({ sb, me, staff: null });
      }
      let r = await sb.from("staff").select("*").eq("user_id", me.id).maybeSingle();
      if (!r.data) {
        const c = await sb.rpc("claim_first_admin");
        if (c.data === true) r = await sb.from("staff").select("*").eq("user_id", me.id).maybeSingle();
      }
      if (!r.data) { $("g-who").textContent = me.email; return show("wait"); }
      show("app");
      document.querySelectorAll("[data-who]").forEach((el) => (el.textContent = me.email + (r.data.is_admin ? " · Admin" : "")));
      onReady({ sb, me, staff: r.data });
    }
    $("g-in").onclick = async () => {
      err("");
      const { error } = await sb.auth.signInWithPassword({ email: $("g-email").value.trim(), password: $("g-pass").value });
      if (error) { err(error.message === "Invalid login credentials" ? "E-Mail oder Passwort stimmt nicht." : error.message); gate.querySelector(".box").animate?.([{ transform: "translateX(0)" }, { transform: "translateX(-8px)" }, { transform: "translateX(8px)" }, { transform: "translateX(0)" }], { duration: 300 }); return; }
      boot();
    };
    $("g-pass").addEventListener("keydown", (e) => { if (e.key === "Enter") $("g-in").click(); });
    if ($("g-up")) $("g-up").onclick = async () => {
      err("");
      const email = $("g-email").value.trim(), password = $("g-pass").value;
      if (!email || password.length < 8) return err("E-Mail eingeben und ein Passwort mit mindestens 8 Zeichen wählen.");
      const { data, error } = await sb.auth.signUp({ email, password, options: { emailRedirectTo: location.origin + location.pathname } });
      if (error) return err(error.message);
      if (!data.session) { $("g-msg").textContent = "Fast fertig: Bestätige deine E-Mail über den Link, den wir dir geschickt haben. Danach hier anmelden."; return; }
      boot();
    };
    $("g-re").onclick = boot;
    document.addEventListener("click", async (e) => {
      if (!e.target.closest("[data-logout]")) return;
      await sb.auth.signOut(); location.hash = ""; location.reload();
    });
    sb.auth.onAuthStateChange((ev) => { if (ev === "SIGNED_OUT") show("login"); });
    boot();
    return sb;
  };
})();
