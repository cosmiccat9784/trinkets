/* Trinkets beta mode.
 *
 * HOW TO SHIP SOMETHING AS BETA:
 *   1. Add data-beta to its card (or any element):
 *        <article class="game-card" data-beta data-game="mygame">…
 *   2. Test locally (npx serve .) and push — normal visitors won't see it:
 *      the element is removed, Surprise-me skips it, deep links won't open
 *      it, and the game counter ignores it.
 *   3. Share https://cosmiccat9784.github.io/trinkets/?beta=1 with testers.
 *   4. Graduate it: delete the data-beta attribute. Done.
 *
 * ?beta=1 / ?beta=0 overrides the stored choice (param is stripped so
 * copied URLs stay clean); the footer has a Beta toggle that persists.
 */
(function () {
  "use strict";

  var KEY = "trinkets-beta";
  var on = false;

  try {
    var params = new URLSearchParams(location.search);
    if (params.has("beta")) {
      var v = (params.get("beta") || "1").toLowerCase();
      on = !(v === "0" || v === "off" || v === "false" || v === "no");
      try { localStorage.setItem(KEY, on ? "1" : "0"); } catch (e) {}
      params.delete("beta");
      var rest = params.toString();
      var clean = location.pathname + (rest ? "?" + rest : "") + location.hash;
      try { history.replaceState(null, "", clean); } catch (e) {}
    } else {
      try { on = localStorage.getItem(KEY) === "1"; } catch (e) {}
    }
  } catch (e) {}

  function betaGameIds() {
    var ids = [];
    try {
      document.querySelectorAll('.game-card[data-beta]').forEach(function (card) {
        if (card.dataset && card.dataset.game) ids.push(card.dataset.game);
      });
    } catch (e) {}
    return ids;
  }

  var stat = document.querySelector("#statGames");

  function visibleCardCount() {
    try {
      return document.querySelectorAll(".game-card" + (on ? "" : ":not([data-beta])")).length;
    } catch (e) {
      return 0;
    }
  }

  function syncStat() {
    if (!stat) return;
    var n = visibleCardCount();
    if (n) stat.textContent = String(n);
  }

  if (on) {
    document.body.classList.add("beta-on");
  } else {
    // Collect ids FIRST — the elements are about to be removed.
    var locked = betaGameIds();
    // Normal visitors: beta elements never existed. Strip them so filters,
    // save-pick sync and every other shelf script can't trip over them.
    try {
      document.querySelectorAll("[data-beta]").forEach(function (el) {
        if (el.remove) el.remove();
      });
    } catch (e) {}
    // Lock beta games for Surprise-me, deep links and the Konami warp:
    // they all resolve showGame through the global scope, so wrapping it
    // here covers every entry point at once.
    if (locked.length && typeof showGame === "function") {
      var realShowGame = showGame;
      showGame = function (id) {
        if (locked.indexOf(id) !== -1) return false;
        return realShowGame(id);
      };
    }
    // The score band recounts every card (beta included) — keep it honest.
    if (typeof updateStatsBand === "function") {
      var realBand = updateStatsBand;
      updateStatsBand = function () {
        realBand();
        syncStat();
      };
    }
  }

  syncStat();

  // Beta banner with an exit button.
  if (on) {
    var banner = document.createElement("div");
    banner.className = "beta-banner";
    banner.setAttribute("role", "status");
    var label = document.createElement("span");
    label.textContent = "🧪 Beta mode — you're seeing unreleased stuff.";
    var exit = document.createElement("button");
    exit.className = "filter";
    exit.type = "button";
    exit.textContent = "Exit beta";
    exit.addEventListener("click", function () {
      try { localStorage.setItem(KEY, "0"); } catch (e) {}
      location.reload();
    });
    banner.appendChild(label);
    banner.appendChild(exit);
    var main = document.querySelector("main");
    if (main && main.parentNode) main.parentNode.insertBefore(banner, main);
  }

  // Tester panel (beta only): list everything under test with Play
  // buttons, plus a one-click beta link to share with other testers.
  if (on) {
    var names = [];
    try {
      document.querySelectorAll(".game-card[data-beta]").forEach(function (card) {
        var title = "";
        try {
          var h = card.querySelector("h3");
          if (h && h.textContent) title = h.textContent;
        } catch (e) {}
        if (card.dataset && card.dataset.game) names.push({ id: card.dataset.game, title: title || card.dataset.game });
      });
    } catch (e) {}
    var list = document.querySelector("#testerList");
    if (list) {
      list.innerHTML = "";
      if (!names.length) {
        var empty = document.createElement("li");
        empty.textContent = "Nothing in beta right now — ship something!";
        list.appendChild(empty);
      } else {
        names.forEach(function (n) {
          var li = document.createElement("li");
          li.className = "tester-row";
          var nm = document.createElement("span");
          nm.textContent = n.title;
          var play = document.createElement("button");
          play.type = "button";
          play.className = "game-action tester-play";
          play.textContent = "Play";
          play.addEventListener("click", function () {
            if (typeof showGame === "function") showGame(n.id);
          });
          li.appendChild(nm);
          li.appendChild(play);
          list.appendChild(li);
        });
      }
    }
    var panelCount = document.querySelector("#testerCount");
    if (panelCount) panelCount.textContent = String(names.length);
    var copyBeta = document.querySelector("#testerCopy");
    if (copyBeta) {
      copyBeta.addEventListener("click", function () {
        var url = location.origin + location.pathname + "?beta=1";
        var prev = copyBeta.textContent;
        function flash(text) {
          copyBeta.textContent = text;
          setTimeout(function () { copyBeta.textContent = prev; }, 1200);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(function () { flash("Copied!"); }, function () { flash("Copy failed"); });
        } else {
          flash("Copy failed");
        }
      });
    }
  }

  // Footer toggle (both modes).
  var links = document.querySelector(".footer-links");
  if (links) {
    links.appendChild(document.createTextNode(" · "));
    var toggle = document.createElement("a");
    toggle.href = "#";
    toggle.textContent = on ? "Exit beta" : "Beta";
    toggle.addEventListener("click", function (ev) {
      ev.preventDefault();
      try { localStorage.setItem(KEY, on ? "0" : "1"); } catch (e) {}
      location.reload();
    });
    links.appendChild(toggle);
  }
})();
