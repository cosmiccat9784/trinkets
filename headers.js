/* Trinkets Arcade announcement headers.
 *
 * A site-wide banner that cycles through messages from your Google Sheet,
 * styled exactly like the beta banner (it reuses the .beta-banner class).
 *
 * SHEET SETUP:
 *   1. In the same spreadsheet as Feedback/Scores/Visits, add a tab named
 *      "Headers" with this header row:  Text | Link
 *   2. Add one row per message. Text is the banner message, Link is an
 *      optional URL it points to (leave blank for plain text).
 *      Blank-Text rows are skipped; row order is the carousel order.
 *   3. In Extensions -> Apps Script, paste the latest feedback-server.gs
 *      (it serves ?action=headers) and redeploy: Manage deployments ->
 *      pencil icon -> Version: New version.
 *
 * BEHAVIOR:
 *   - Auto-rotates every 6 seconds with < > arrows and dots.
 *   - A single row renders as a static banner (no arrows, dots or timer).
 *   - No rows (or no connection and nothing cached) = no banner at all.
 *   - The x button dismisses it for the session (it returns on reload,
 *     or immediately if the sheet rows change).
 *   - Feed is cached 10 minutes in localStorage and shown instantly
 *     while a fresh copy loads in the background.
 */
(function () {
  "use strict";

  if (typeof document === "undefined") return;
  try {
    if (document.body && document.body.classList.contains("embed")) return;
  } catch (e) {}

  // Same web-app URL as the feedback inbox (script.js / feedback.js).
  // Hardcoded fallback so pages without that global (news.html) still work.
  var FALLBACK_URL = "https://script.google.com/macros/s/AKfycbx5mjh-z38RvN9M7o_mAyfVq70TOsZoUwIQjylAvdXlIX5hGpPSHCm-K-qRVEvgRAclOg/exec";
  var CACHE_KEY = "trinkets-headers-cache";
  var DISMISS_KEY = "trinkets-headers-dismissed";
  var CACHE_TTL_MS = 10 * 60 * 1000;
  var ROTATE_MS = 6000;
  var MAX_HEADERS = 20;

  function sheetURL() {
    try {
      if (typeof FEEDBACK_SHEET_URL === "string" && FEEDBACK_SHEET_URL) return FEEDBACK_SHEET_URL;
    } catch (err) {}
    return FALLBACK_URL;
  }

  // Same allowlist as news.js: http(s)/mailto plus relative links.
  function isSafeUrl(url) {
    var u = String(url || "").trim();
    if (!u) return false;
    if (/^(https?:\/\/|mailto:)/i.test(u)) {
      return !/^(javascript|vbscript|data|file):/i.test(u);
    }
    if (/^([./#?]|[^:/?#\s]+([/?#]|$))/.test(u) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return true;
    return false;
  }

  function isExternal(url) {
    return /^https?:\/\//i.test(String(url || ""));
  }

  // Accepts [{ text, link }] but tolerates strings and rival field names.
  function normalize(list) {
    var out = [];
    if (!Array.isArray(list)) return out;
    for (var i = 0; i < list.length && out.length < MAX_HEADERS; i++) {
      var item = list[i];
      var text = "";
      var link = "";
      if (typeof item === "string") {
        text = item;
      } else if (item && typeof item === "object") {
        if (item.text != null) text = item.text;
        else if (item.t != null) text = item.t;
        else if (item.message != null) text = item.message;
        else if (item.title != null) text = item.title;
        if (item.link != null) link = item.link;
        else if (item.url != null) link = item.url;
        else if (item.href != null) link = item.href;
        else if (item.l != null) link = item.l;
      }
      text = String(text).trim().slice(0, 200);
      link = String(link).trim().slice(0, 500);
      if (!text) continue;
      if (link && !isSafeUrl(link)) link = "";
      out.push({ text: text, link: link });
    }
    return out;
  }

  function signature(list) {
    var parts = [];
    for (var i = 0; i < list.length; i++) parts.push(list[i].text + "|" + list[i].link);
    return parts.join("~");
  }

  function readCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (parsed && typeof parsed.at === "number" && Array.isArray(parsed.headers)) {
        if (Date.now() - parsed.at < CACHE_TTL_MS) return normalize(parsed.headers);
      }
    } catch (err) {}
    return [];
  }

  function writeCache(list) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), headers: list }));
    } catch (err) {}
  }

  function wasDismissed(list) {
    try {
      return sessionStorage.getItem(DISMISS_KEY) === signature(list);
    } catch (err) {
      return false;
    }
  }

  var banner = null;
  var viewport = null;
  var dotsWrap = null;
  var headers = [];
  var index = 0;
  var timer = 0;

  function paint(i) {
    if (!viewport || !headers.length) return;
    index = ((i % headers.length) + headers.length) % headers.length;
    var h = headers[index];
    viewport.innerHTML = "";
    var node;
    if (h.link) {
      node = document.createElement("a");
      node.href = h.link;
      if (isExternal(h.link)) {
        node.target = "_blank";
        node.rel = "noopener noreferrer";
      }
    } else {
      node = document.createElement("span");
    }
    node.className = "announce-text";
    node.textContent = h.text;
    viewport.appendChild(node);
    if (dotsWrap) {
      var dots = dotsWrap.querySelectorAll(".announce-dot");
      for (var d = 0; d < dots.length; d++) {
        if (d === index) {
          dots[d].classList.add("active");
          dots[d].setAttribute("aria-current", "true");
        } else {
          dots[d].classList.remove("active");
          dots[d].setAttribute("aria-current", "false");
        }
      }
    }
  }

  function show(i) {
    if (!banner || headers.length < 2) return;
    viewport.classList.add("is-fading");
    setTimeout(function () {
      paint(i);
      if (viewport) viewport.classList.remove("is-fading");
    }, 160);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = 0;
    }
  }

  function restart() {
    stop();
    if (banner && headers.length > 1) {
      timer = setInterval(function () { show(index + 1); }, ROTATE_MS);
    }
  }

  function goNext() {
    show(index + 1);
    restart();
  }

  function goPrev() {
    show(index - 1);
    restart();
  }

  function dismiss() {
    stop();
    try {
      sessionStorage.setItem(DISMISS_KEY, signature(headers));
    } catch (err) {}
    if (banner && banner.remove) banner.remove();
    banner = null;
    viewport = null;
    dotsWrap = null;
  }

  function build(list) {
    if (banner && banner.remove) banner.remove();
    banner = null;
    viewport = null;
    dotsWrap = null;
    stop();
    headers = list;
    index = 0;
    if (!headers.length) return;
    if (wasDismissed(headers)) return;
    var main = document.querySelector("main");
    if (!main || !main.parentNode) return;

    banner = document.createElement("div");
    // NOTE: .beta-banner carries the whole look — same style by construction.
    banner.className = "beta-banner announce-banner";
    banner.setAttribute("role", "status");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Announcements");

    if (headers.length > 1) {
      var prev = document.createElement("button");
      prev.className = "announce-nav";
      prev.type = "button";
      prev.textContent = "‹";
      prev.setAttribute("aria-label", "Previous announcement");
      prev.addEventListener("click", goPrev);
      banner.appendChild(prev);
    }

    viewport = document.createElement("span");
    viewport.className = "announce-viewport";
    banner.appendChild(viewport);

    if (headers.length > 1) {
      var next = document.createElement("button");
      next.className = "announce-nav";
      next.type = "button";
      next.textContent = "›";
      next.setAttribute("aria-label", "Next announcement");
      next.addEventListener("click", goNext);
      banner.appendChild(next);

      dotsWrap = document.createElement("span");
      dotsWrap.className = "announce-dots";
      dotsWrap.setAttribute("role", "tablist");
      dotsWrap.setAttribute("aria-label", "Choose announcement");
      headers.forEach(function (h, i) {
        var dot = document.createElement("button");
        dot.className = "announce-dot" + (i === 0 ? " active" : "");
        dot.type = "button";
        dot.setAttribute("role", "tab");
        dot.setAttribute("aria-label", "Show announcement " + (i + 1));
        dot.setAttribute("aria-current", i === 0 ? "true" : "false");
        dot.addEventListener("click", function () {
          show(i);
          restart();
        });
        dotsWrap.appendChild(dot);
      });
      banner.appendChild(dotsWrap);
    }

    var close = document.createElement("button");
    // .filter = the same button class as the beta banner's Exit button.
    close.className = "filter announce-close";
    close.type = "button";
    close.textContent = "×";
    close.setAttribute("aria-label", "Dismiss announcements");
    close.addEventListener("click", dismiss);
    banner.appendChild(close);

    banner.addEventListener("mouseenter", stop);
    banner.addEventListener("mouseleave", restart);
    banner.addEventListener("focusin", stop);
    banner.addEventListener("focusout", restart);
    document.addEventListener("visibilitychange", function () {
      if (!banner) return;
      if (document.hidden) stop();
      else restart();
    });

    // Same slot as the beta banner (beta.js runs first, so this stacks below it).
    main.parentNode.insertBefore(banner, main);
    paint(0);
    restart();
  }

  function fetchHeaders() {
    var url = sheetURL();
    if (!url) return;
    try {
      fetch(url + "?action=headers")
        .then(function (res) { return res.json(); })
        .then(function (data) {
          var list = normalize(data && data.headers);
          if (list.length) {
            writeCache(list);
            // Rebuild only if the feed actually changed — keeps the
            // current slide, timer and any dismissal intact otherwise.
            if (signature(list) !== signature(headers)) build(list);
          }
        })
        .catch(function () {
          // Offline: the cached copy (if any) already on screen stays up.
        });
    } catch (err) {}
  }

  function boot() {
    var cached = readCache();
    if (cached.length) build(cached);
    fetchHeaders();
  }

  // Console hooks: window.__headers.refresh(), window.__headers.dismiss().
  window.__headers = {
    refresh: fetchHeaders,
    dismiss: dismiss
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
