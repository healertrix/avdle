// Native-app feel on phones: the system Back button/gesture closes whatever is on top
// (a dialog, the country panel, Warpath, Crorepati, the current game) instead of leaving
// the site; light haptics; swipe to dismiss the menu and bottom sheets; the status bar
// follows the screen's colour; and "Install app" in the menu.
// Loaded last, it only drives the page's own buttons, so every screen keeps working without it.
(function () {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  // getClientRects, not offsetParent: full-screen layers are position: fixed
  const visible = (el) => !!el && !el.hidden && el.getClientRects().length > 0;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const standalone = matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
  if (standalone) document.documentElement.classList.add("is-app");

  // ---------- haptics ----------
  const buzz = (pattern) => {
    try {
      // only after a real tap: browsers refuse (and log) vibrate before that
      const ua = navigator.userActivation;
      if (navigator.vibrate && !reduceMotion.matches && (!ua || ua.hasBeenActive)) navigator.vibrate(pattern);
    } catch (_) {}
  };
  document.addEventListener(
    "click",
    (e) => {
      if (e.target.closest(".btn.primary, .tile, .kbc-btn, .wp-btn, #dropBtn, #guessBtn")) buzz(8);
    },
    true
  );
  // the result of a pick: a double tap for a correct answer, one longer buzz for a miss
  const sheet = $("#sheet");
  if (sheet)
    new MutationObserver(() => {
      if (sheet.hidden) return;
      const chip = $("#verdictChip");
      buzz(chip && /\bt\d/.test(chip.className) ? [12, 60, 18] : 45);
    }).observe(sheet, { attributes: true, attributeFilter: ["hidden"] });

  // ---------- status bar colour follows the screen ----------
  const meta = $('meta[name="theme-color"]');
  const wp = $("#warpath");
  const kbc = $("#kbc");
  let baseColor = meta ? meta.content : "#ffffff";
  let lastSet = null;
  const syncBar = () => {
    if (!meta) return;
    const want = (visible(wp) ? "#07090d" : visible(kbc) ? "#03051a" : null) || baseColor;
    if (meta.content === want) return;
    lastSet = want;
    meta.content = want;
  };
  if (meta)
    new MutationObserver(() => {
      if (meta.content === lastSet) return; // our own change
      baseColor = meta.content; // the app changed it (Night chart theme)
      syncBar();
    }).observe(meta, { attributes: true, attributeFilter: ["content"] });
  [wp, kbc].forEach((el) => el && new MutationObserver(syncBar).observe(el, { attributes: true, attributeFilter: ["hidden"] }));

  // ---------- Back button / back gesture ----------
  // One extra history entry sits on top while there is something to close. Back pops it;
  // we close the top-most thing and put the entry back. On the home screen with nothing
  // open, the entry is removed so Back leaves the app as usual.
  const openDialogs = () => [...document.querySelectorAll("dialog[open]")];
  const overlay = () => [...document.querySelectorAll('#warpath [role="dialog"], #kbc [role="dialog"]')].filter(visible).pop();
  function backAction() {
    const dlg = openDialogs().pop();
    if (dlg) return () => dlg.close();
    const ov = overlay();
    if (ov)
      return () => {
        document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
        if (ov.isConnected && visible(ov)) ov.dispatchEvent(new MouseEvent("click", { bubbles: true }));
        // overlays that can't be dismissed (a result card): leave the screen instead
        setTimeout(() => {
          if (ov.isConnected && visible(ov)) ($("#wpExit") && visible(wp) ? $("#wpExit") : $("#kbcExit"))?.click();
        }, 80);
      };
    if (visible($("#detail"))) return () => $("#detailClose").click();
    if (visible(kbc)) return () => $("#kbcExit").click();
    if (visible(wp)) return () => $("#wpExit").click();
    if (visible($("#exitBtn"))) return () => $("#exitBtn").click();
    return null;
  }

  let armed = false;
  let unwinding = false;
  let trapUrl = location.href;
  // keep the trap entry's address in step with the app's own replaceState calls (?room=CODE)
  const replace = history.replaceState.bind(history);
  history.replaceState = function (state, title, url) {
    const r = replace(armed && state == null ? { avdleBack: 1 } : state, title, url);
    if (armed) trapUrl = location.href;
    return r;
  };
  function sync() {
    const need = !!backAction();
    if (need && !armed && !unwinding) {
      history.pushState({ avdleBack: 1 }, "", location.href);
      trapUrl = location.href;
      armed = true;
    } else if (!need && armed && !unwinding && history.state && history.state.avdleBack) {
      unwinding = true;
      history.back();
    }
  }
  addEventListener("popstate", () => {
    if (unwinding) {
      unwinding = false;
      armed = false;
      return;
    }
    if (!armed) return;
    armed = false;
    if (location.href !== trapUrl) replace(history.state, "", trapUrl);
    const act = backAction();
    if (act) act();
    setTimeout(sync, 120);
  });
  // re-check after anything the player does (taps open and close screens)
  const later = () => setTimeout(sync, 60);
  document.addEventListener("click", later);
  document.addEventListener("keyup", later);
  document.addEventListener("close", later, true); // a <dialog> closed
  // screens that appear after a download (people, Warpath, room invites) arm Back too
  const screens = ["#home", "#exitBtn", "#detail", "#warpath", "#kbc"].map((s) => $(s)).filter(Boolean);
  const watch = new MutationObserver(later);
  screens.forEach((el) => watch.observe(el, { attributes: true, attributeFilter: ["hidden"] }));
  later(); // opened straight into a screen (?warpath, ?kbc, ?room=CODE)
  syncBar();

  // ---------- swipe to dismiss ----------
  // The ☰ drawer slides away to the left; dialogs (bottom sheets on phones) slide down.
  function swipeAway(dlg, axis, panelSel) {
    let start = null;
    let delta = 0;
    const panel = () => (panelSel ? $(panelSel, dlg) : dlg.firstElementChild) || dlg;
    dlg.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length !== 1) return (start = null);
        const p = panel();
        // a sheet only follows the finger when its content is scrolled to the top
        if (axis === "y" && (p.scrollTop > 0 || dlg.scrollTop > 0)) return (start = null);
        if (e.target.closest("input[type=range], textarea, .choose-list")) return (start = null);
        start = { x: e.touches[0].clientX, y: e.touches[0].clientY, locked: null };
        delta = 0;
      },
      { passive: true }
    );
    dlg.addEventListener(
      "touchmove",
      (e) => {
        if (!start) return;
        const dx = e.touches[0].clientX - start.x;
        const dy = e.touches[0].clientY - start.y;
        if (start.locked === null && Math.abs(dx) + Math.abs(dy) > 8) start.locked = axis === "x" ? Math.abs(dx) > Math.abs(dy) : Math.abs(dy) > Math.abs(dx);
        if (!start.locked) return;
        delta = axis === "x" ? Math.min(0, dx) : Math.max(0, dy);
        const p = panel();
        p.style.transition = "none";
        p.style.transform = axis === "x" ? `translateX(${delta}px)` : `translateY(${delta}px)`;
      },
      { passive: true }
    );
    const end = () => {
      if (!start) return;
      const p = panel();
      const size = axis === "x" ? p.offsetWidth : p.offsetHeight;
      const gone = start.locked && Math.abs(delta) > Math.min(110, size * 0.3);
      start = null;
      p.style.transition = "transform .2s cubic-bezier(.2,.8,.2,1)";
      if (gone) {
        p.style.transform = axis === "x" ? "translateX(-105%)" : "translateY(105%)";
        setTimeout(() => {
          dlg.close();
          p.style.transform = p.style.transition = "";
        }, 180);
      } else {
        p.style.transform = "";
        setTimeout(() => (p.style.transition = ""), 220);
      }
    };
    dlg.addEventListener("touchend", end);
    dlg.addEventListener("touchcancel", end);
  }
  const menu = $("#menuDlg");
  if (menu) swipeAway(menu, "x", ".menu");
  const phone = matchMedia("(max-width: 640px)");
  document.querySelectorAll("dialog:not(.menu-dlg)").forEach((d) => {
    if (phone.matches) swipeAway(d, "y");
  });

  // ---------- on-screen keyboard ----------
  // iOS keeps the page full height when the keyboard opens and covers the answer bar;
  // --kb is how much of the page's bottom the keyboard hides, so the bars can sit above it.
  const vv = window.visualViewport;
  if (vv) {
    const root = document.documentElement;
    let kbFrame = 0;
    const kb = () => {
      cancelAnimationFrame(kbFrame);
      kbFrame = requestAnimationFrame(() => {
        const typing = document.activeElement && document.activeElement.matches("input:not([type=range]), textarea");
        const hidden = typing ? Math.max(0, Math.round(innerHeight - vv.height - vv.offsetTop)) : 0;
        root.style.setProperty("--kb", hidden + "px");
      });
    };
    vv.addEventListener("resize", kb);
    vv.addEventListener("scroll", kb);
    document.addEventListener("focusin", kb);
    document.addEventListener("focusout", () => setTimeout(kb, 50));
  }

  // ---------- Install app ----------
  const item = $("#installItem");
  const iosDlg = $("#iosInstallDlg");
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let deferred = null;
  addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e;
    if (item) item.hidden = false;
  });
  addEventListener("appinstalled", () => {
    deferred = null;
    if (item) item.hidden = true;
  });
  if (item && ios && !standalone && iosDlg) item.hidden = false;
  if (item)
    item.addEventListener("click", async () => {
      menu && menu.open && menu.close();
      if (deferred) {
        deferred.prompt();
        try {
          await deferred.userChoice;
        } catch (_) {}
        deferred = null;
        item.hidden = true;
      } else if (iosDlg) iosDlg.showModal();
    });

  // ---------- home-screen shortcuts (?go=daily) and the app's own start address ----------
  const qs = new URLSearchParams(location.search);
  if (qs.has("source") || qs.has("go")) {
    const go = qs.get("go");
    // drop just these two, leaving the rest exactly as written (?warpath stays ?warpath)
    const rest = location.search
      .slice(1)
      .split("&")
      .filter((p) => p && !/^(source|go)(=|$)/.test(p))
      .join("&");
    replace(history.state, "", location.pathname + (rest ? "?" + rest : "") + location.hash);
    if (go === "daily") setTimeout(() => $("#playDaily") && $("#playDaily").click(), 0);
  }

  // the service worker is what makes the app installable; offline.js registers it, but
  // make sure it is there even if that script didn't run
  if ("serviceWorker" in navigator && location.protocol !== "file:") navigator.serviceWorker.register("sw.js").catch(() => {});
})();
