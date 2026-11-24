(function () {
  const C = window.Capacitor;
  if (!C || !C.isNativePlatform || !C.isNativePlatform()) return; // browser me kuch nahi karega
  const P = C.Plugins;
  const LN = P.LocalNotifications, KA = P.KeepAlive, APP = P.App;
  const sleep = ms => new Promise(r => setTimeout(r, ms));

  // index.html ke top-level let/const (me, online, cur, view, contacts, toast, openChat) yahan se dikhte hain
  const state = () => {
    try { return { me: !!me, online: !!online }; } catch (e) { return { me: false, online: false }; }
  };

  // ===================== Notifications =====================
  let appActive = true;
  const counts = {}, lines = {};
  const nid = n => { let x = 0; for (const c of n) x = (x * 31 + c.charCodeAt(0)) % 2000000; return 100000 + x; };

  async function initNotifications() {
    if (!LN) return;
    try {
      await LN.createChannel({
        id: "messages", name: "Messages", description: "New message alerts",
        importance: 4, visibility: 0, vibration: true, lights: true
      });
    } catch (e) {}
    try {
      const p = await LN.checkPermissions();
      if (p.display !== "granted") await LN.requestPermissions();
    } catch (e) {}
    try {
      LN.addListener("localNotificationActionPerformed", ev => {
        const from = ev && ev.notification && ev.notification.extra && ev.notification.extra.from;
        if (from) openFrom(from);
      });
    } catch (e) {}
  }

  // notification tap -> us friend ki chat kholo (cold start me app load hone tak wait)
  async function openFrom(from) {
    for (let i = 0; i < 40; i++) {
      try { if (me && contacts[from]) { openChat(from); return; } } catch (e) {}
      await sleep(300);
    }
  }

  // index.html har naye (decrypted) incoming message par "sc:msg" event bhejta hai
  addEventListener("sc:msg", async e => {
    const d = e.detail || {};
    const from = d.from, text = String(d.text || "").slice(0, 300);
    if (!from) return;
    if (appActive && !document.hidden) {
      // app khula hai: sirf tab chhota toast jab us friend ki chat khuli nahi
      if (!d.viewing) { try { toast(from + ": " + text.slice(0, 50)); } catch (e) {} }
      return;
    }
    if (!LN) return;
    counts[from] = (counts[from] || 0) + 1;
    (lines[from] = lines[from] || []).push(text);
    if (lines[from].length > 6) lines[from].shift();
    const n = counts[from];
    try {
      await LN.schedule({
        notifications: [{
          id: nid(from),
          title: from,
          body: n > 1 ? n + " new messages: " + text : text,
          largeBody: lines[from].join("\n"),
          summaryText: n > 1 ? n + " new messages" : undefined,
          channelId: "messages",
          extra: { from }
        }]
      });
    } catch (err) {}
  });

  if (APP && APP.addListener) {
    APP.addListener("appStateChange", s => {
      appActive = s.isActive;
      if (appActive) {
        for (const k in counts) delete counts[k];
        for (const k in lines) delete lines[k];
        if (LN) LN.removeAllDeliveredNotifications().catch(() => {});
      }
    });
  }

  // ===================== Background service =====================
  // Login ho + "Online" ho to foreground service chalao, warna band.
  let svcOn = false;
  async function syncService() {
    if (!KA) return;
    const s = state();
    const want = s.me && s.online;
    if (want === svcOn) return;
    try {
      if (want) await KA.start(); else await KA.stop();
      svcOn = want;
      if (want) askBattery();
    } catch (e) {}
  }
  addEventListener("sc:online", syncService);
  setInterval(syncService, 5000);

  // ek baar poochho: battery optimization band karo (warna Android kuch der baad connection kaat deta hai)
  async function askBattery() {
    try {
      if (localStorage.getItem("sc_batt")) return;
      localStorage.setItem("sc_batt", "1");
    } catch (e) { return; }
    await sleep(2000);
    if (confirm("To get message alerts on time when the app is closed, allow SecureChat to run in the background. Open the setting now?")) {
      KA.requestIgnoreBattery().catch(() => {});
    }
  }

  setTimeout(() => { initNotifications().then(syncService); }, 1200);

  // ===================== Android back button =====================
  if (APP && APP.addListener) {
    APP.addListener("backButton", () => {
      const set = document.querySelector("#set");
      if (set && !set.hidden) { set.hidden = true; return; }
      let inChat = false;
      try { inChat = view === "chat" && !!cur && !matchMedia("(min-width:820px)").matches; } catch (e) {}
      if (inChat) { document.querySelector("#bk").click(); return; }
      // exit nahi, minimize: taaki background service + notifications chalte rahen
      if (APP.minimizeApp) APP.minimizeApp(); else APP.exitApp();
    });
  }
})();
