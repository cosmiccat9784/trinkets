/* Trinkets Arcade news page.
 *
 * Source of truth: GitHub Releases.
 * Publish at: GitHub repo -> Releases -> "Draft a new release"
 *   - Release title  -> article headline
 *   - Tag            -> version chip (e.g. v1.2.0)
 *   - Description    -> article body (GitHub markdown: headings,
 *                        paragraphs, bold/italic, lists, images, links…)
 * Saving the release makes it appear here, newest first, automatically.
 */
(function () {
  "use strict";

  var OWNER = "cosmiccat9784";
  var REPO = "trinkets";
  var API_URL = "https://api.github.com/repos/" + OWNER + "/" + REPO + "/releases?per_page=100";
  var WEB_URL = "https://github.com/" + OWNER + "/" + REPO + "/releases";
  var CACHE_KEY = "trinkets-news-cache";
  var CACHE_TTL_MS = 10 * 60 * 1000;

  var listEl = document.querySelector("#newsList");
  var statusEl = document.querySelector("#newsStatus");
  var refreshBtn = document.querySelector("#newsRefresh");
  var gitHubLink = document.querySelector("#newsGitHubLink");

  if (gitHubLink) gitHubLink.href = WEB_URL;

  // Footer build tag (same idea as script.js).
  (function showBuildTag() {
    var tag = document.querySelector("#buildTag");
    if (!tag) return;
    var meta = document.querySelector('meta[name="trinkets-build"]');
    if (meta && meta.content && meta.content !== "dev") {
      tag.textContent = "· " + meta.content;
      return;
    }
    var script = document.querySelector('script[src*="news.js?v="]');
    if (!script) return;
    var match = /[?&]v=([^&"]+)/.exec(script.getAttribute("src") || "");
    if (match) tag.textContent = "· build " + match[1];
  })();

  function setStatus(text) {
    if (statusEl) statusEl.textContent = text || "";
  }

  function escapeHtml(text) {
    return String(text == null ? "" : text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isSafeUrl(url) {
    var u = String(url || "").trim();
    if (!u) return false;
    if (/^(https?:\/\/|mailto:)/i.test(u)) {
      return !/^(javascript|vbscript|data|file):/i.test(u);
    }
    // Relative links, anchors, queries stay on the page/site.
    if (/^([./#?]|[^:/?#\s]+([/?#]|$))/.test(u) && !/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(u)) return true;
    return false;
  }

  function formatBytes(bytes) {
    var n = Number(bytes);
    if (!isFinite(n) || n < 0) return "";
    if (n < 1024) return n + " B";
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + " KB";
    return (n / (1024 * 1024)).toFixed(1) + " MB";
  }

  function formatDate(iso) {
    try {
      var d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
    } catch (err) {
      return "";
    }
  }

  /* Minimal GitHub-flavoured markdown renderer (no dependencies).
   * Supports: fenced code, inline code, headings, bold, italic,
   * strikethrough, images, links, autolinks, blockquotes, hr,
   * bullet/numbered/task lists, tables, paragraphs. Raw HTML is
   * escaped on purpose so release notes can never inject scripts. */
  function renderMarkdown(src) {
    var text = String(src == null ? "" : src).replace(/\r\n?/g, "\n").replace(/\t/g, "    ");
    if (!text.trim()) return "";

    var fenced = [];
    text = text.replace(/^```(\w*)\n([\s\S]*?)^```[ \t]*$/gm, function (match, lang, code) {
      var idx = fenced.length;
      fenced.push(
        '<pre class="news-codeblock"><code' +
          (lang ? ' data-lang="' + escapeHtml(lang) + '"' : "") +
          ">" +
          escapeHtml(code.replace(/\n$/, "")) +
          "</code></pre>"
      );
      return "\n\x00FENCED" + idx + "\x00\n";
    });

    var inlineCode = [];
    text = text.replace(/`([^`\n]+)`/g, function (match, code) {
      var idx = inlineCode.length;
      inlineCode.push("<code>" + escapeHtml(code) + "</code>");
      return "\x00INLINE" + idx + "\x00";
    });

    // Escape everything left; placeholders (\x00…) survive untouched.
    text = escapeHtml(text);

    function renderInline(escaped) {
      var out = escaped;
      // Images: ![alt](url "title")
      out = out.replace(/!\[([^\]]*)\]\(\s*([^\s)]+)(?:\s+&quot;([^&]*?)&quot;)?\s*\)/g, function (m, alt, url) {
        if (!isSafeUrl(url)) return escapeHtml(alt || "image");
        return (
          '<img src="' + escapeHtml(url) + '" alt="' + escapeHtml(alt || "") +
          '" loading="lazy" decoding="async" />'
        );
      });
      // Links: [text](url "title")
      out = out.replace(/\[([^\]]+)\]\(\s*([^\s)]+)(?:\s+&quot;([^&]*?)&quot;)?\s*\)/g, function (m, label, url) {
        if (!isSafeUrl(url)) return label;
        var external = /^https?:\/\//i.test(url);
        return (
          '<a href="' + escapeHtml(url) + '"' +
          (external ? ' target="_blank" rel="noopener noreferrer"' : "") +
          ">" + label + "</a>"
        );
      });
      // Autolinks: <https://…>
      out = out.replace(/&lt;(https?:\/\/[^&\s<>]+)&gt;/g, function (m, url) {
        return '<a href="' + escapeHtml(url) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(url) + "</a>";
      });
      // Bare URLs.
      out = out.replace(/(^|[\s(>])((https?:\/\/)[^\s<)]+)/g, function (m, pre, url) {
        var clean = url.replace(/[.,;:!?]+$/, "");
        var trail = url.slice(clean.length);
        if (!isSafeUrl(clean)) return m;
        return pre + '<a href="' + escapeHtml(clean) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(clean) + "</a>" + escapeHtml(trail);
      });
      // Bold (**x** then __x__), italic (*x* then _x_), strikethrough.
      out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      out = out.replace(/__([^_]+)__/g, "<strong>$1</strong>");
      out = out.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
      out = out.replace(/(^|\W)_([^_\n]+)_(\W|$)/g, "$1<em>$2</em>$3");
      out = out.replace(/~~([^~]+)~~/g, "<del>$1</del>");
      // Restore inline code.
      out = out.replace(/\x00INLINE(\d+)\x00/g, function (m, i) {
        return inlineCode[Number(i)] || "";
      });
      return out;
    }

    function isFencedPlaceholder(line) {
      return /^\x00FENCED\d+\x00$/.test(line.trim());
    }

    function restoreFenced(line) {
      return line.trim().replace(/\x00FENCED(\d+)\x00/g, function (m, i) {
        return fenced[Number(i)] || "";
      });
    }

    var lines = text.split("\n");
    var html = [];
    var i = 0;

    function isTableDivider(line) {
      var trimmed = line.trim();
      if (trimmed.indexOf("|") === -1) return false;
      var cells = trimmed.replace(/^\||\|$/g, "").split("|");
      if (!cells.length) return false;
      return cells.every(function (c) {
        return /^\s*:?-{1,}:?\s*$/.test(c);
      });
    }

    function parseTableRow(line) {
      var cells = line.trim().replace(/^\||\|$/g, "").split("|");
      return cells.map(function (c) { return "<td>" + renderInline(c.trim()) + "</td>"; }).join("");
    }

    while (i < lines.length) {
      var line = lines[i];

      if (!line.trim()) { i += 1; continue; }

      if (isFencedPlaceholder(line)) { html.push(restoreFenced(line)); i += 1; continue; }

      var heading = /^(#{1,6})\s+(.*)$/.exec(line);
      if (heading) {
        var level = heading[1].length;
        html.push("<h" + level + ">" + renderInline(heading[2].trim()) + "</h" + level + ">");
        i += 1;
        continue;
      }

      if (/^\s*(---|\*\*\*|___)\s*$/.test(line)) { html.push("<hr />"); i += 1; continue; }

      // Tables: header | divider | rows.
      if (line.indexOf("|") !== -1 && i + 1 < lines.length && isTableDivider(lines[i + 1])) {
        var headerCells = line.trim().replace(/^\||\|$/g, "").split("|").map(function (c) {
          return "<th>" + renderInline(c.trim()) + "</th>";
        }).join("");
        var rows = ["<tr>" + headerCells + "</tr>"];
        i += 2;
        while (i < lines.length && lines[i].trim() && lines[i].indexOf("|") !== -1) {
          rows.push("<tr>" + parseTableRow(lines[i]) + "</tr>");
          i += 1;
        }
        html.push('<div class="news-table-wrap"><table>' + rows.join("") + "</table></div>");
        continue;
      }

      // Blockquotes.
      if (/^\s*&gt;/.test(line)) {
        var quoteLines = [];
        while (i < lines.length && /^\s*&gt;/.test(lines[i])) {
          quoteLines.push(lines[i].replace(/^\s*&gt;\s?/, ""));
          i += 1;
        }
        var inner = quoteLines.join("\n").split("\n").map(function (l) {
          var t = l.trim();
          return t ? "<p>" + renderInline(t) + "</p>" : "";
        }).join("");
        html.push("<blockquote>" + inner + "</blockquote>");
        continue;
      }

      // Unordered / task lists.
      if (/^\s*[-*+]\s+/.test(line)) {
        var items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          var raw = lines[i].replace(/^\s*[-*+]\s+/, "");
          var task = /^\[([ xX])\]\s+(.*)$/.exec(raw);
          if (task) {
            var checked = task[1].toLowerCase() === "x";
            items.push(
              '<li class="news-task"><input type="checkbox" disabled' + (checked ? " checked" : "") +
              ' aria-hidden="true" /> <span>' + renderInline(task[2]) + "</span></li>"
            );
          } else {
            items.push("<li>" + renderInline(raw) + "</li>");
          }
          i += 1;
        }
        html.push('<ul class="news-ul">' + items.join("") + "</ul>");
        continue;
      }

      // Ordered lists.
      if (/^\s*\d+[.)]\s+/.test(line)) {
        var ordered = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          ordered.push("<li>" + renderInline(lines[i].replace(/^\s*\d+[.)]\s+/, "")) + "</li>");
          i += 1;
        }
        html.push('<ol class="news-ol">' + ordered.join("") + "</ol>");
        continue;
      }

      // Paragraph: gather until a blank line or another block starts.
      var para = [line];
      i += 1;
      while (
        i < lines.length && lines[i].trim() &&
        !/^(#{1,6})\s+/.test(lines[i]) &&
        !/^\s*(---|\*\*\*|___)\s*$/.test(lines[i]) &&
        !/^\s*&gt;/.test(lines[i]) &&
        !/^\s*[-*+]\s+/.test(lines[i]) &&
        !/^\s*\d+[.)]\s+/.test(lines[i]) &&
        !isFencedPlaceholder(lines[i]) &&
        !(lines[i].indexOf("|") !== -1 && i + 1 < lines.length && isTableDivider(lines[i + 1]))
      ) {
        para.push(lines[i]);
        i += 1;
      }
      var joined = para.join("\n").trim();
      // Hard breaks: two trailing spaces, or single newlines (friendlier for release notes).
      joined = joined.replace(/  \n/g, "<br />").split("\n").map(renderInline).join("<br />");
      html.push("<p>" + joined + "</p>");
    }

    return html.join("\n");
  }

  function releaseDateMs(release) {
    var t = Date.parse(release.published_at || release.created_at || "");
    return isNaN(t) ? 0 : t;
  }

  function sortNewestFirst(releases) {
    return releases.slice().sort(function (a, b) {
      return releaseDateMs(b) - releaseDateMs(a);
    });
  }

  function requestedTag() {
    try {
      var params = new URLSearchParams(location.search);
      var tag = params.get("tag") || params.get("release");
      if (tag) return tag;
      var hash = (location.hash || "").replace(/^#/, "");
      if (hash && !/^news-/i.test(hash)) return decodeURIComponent(hash);
    } catch (err) {}
    return "";
  }

  function articleUrl(tag) {
    try {
      var url = new URL(location.href);
      url.search = "?tag=" + encodeURIComponent(tag);
      url.hash = "";
      return url.toString();
    } catch (err) {
      return WEB_URL;
    }
  }

  function renderCard(release, isLatest) {
    var title = release.name || release.tag_name || "Untitled release";
    var tag = release.tag_name || "";
    var dateIso = release.published_at || release.created_at || "";
    var author = release.author || {};
    var bodyHtml = renderMarkdown(release.body || "");
    var assets = Array.isArray(release.assets) ? release.assets : [];

    var card = document.createElement("article");
    card.className = "news-card";
    card.id = "news-" + String(tag || release.id || "").replace(/[^a-zA-Z0-9-_.]/g, "-");
    card.dataset.tag = tag;
    card.setAttribute("aria-label", title);

    var head = document.createElement("header");
    head.className = "news-card-head";

    var kicker = document.createElement("p");
    kicker.className = "tag news-kicker";
    var kickerBits = [];
    if (tag) kickerBits.push('<span class="news-tag-chip">' + escapeHtml(tag) + "</span>");
    if (dateIso) kickerBits.push(escapeHtml(formatDate(dateIso)));
    if (isLatest) kickerBits.push("Latest");
    if (release.prerelease) kickerBits.push("Pre-release");
    kicker.innerHTML = kickerBits.join(" · ");
    head.appendChild(kicker);

    var heading = document.createElement("h2");
    heading.textContent = title;
    head.appendChild(heading);

    var meta = document.createElement("p");
    meta.className = "news-meta";
    var metaBits = [];
    if (author.login) {
      var who = author.html_url && isSafeUrl(author.html_url)
        ? '<a href="' + escapeHtml(author.html_url) + '" target="_blank" rel="noopener noreferrer">' +
          escapeHtml(author.login) + "</a>"
        : escapeHtml(author.login);
      metaBits.push("by " + who);
    }
    if (dateIso) {
      metaBits.push(
        '<time datetime="' + escapeHtml(dateIso) + '">' + escapeHtml(formatDate(dateIso)) + "</time>"
      );
    }
    if (release.html_url && isSafeUrl(release.html_url)) {
      metaBits.push(
        '<a href="' + escapeHtml(release.html_url) + '" target="_blank" rel="noopener noreferrer">View on GitHub</a>'
      );
    }
    meta.innerHTML = metaBits.join(" · ");
    head.appendChild(meta);
    card.appendChild(head);

    var body = document.createElement("div");
    body.className = "news-body";
    if (bodyHtml) {
      body.innerHTML = bodyHtml;
    } else {
      var empty = document.createElement("p");
      empty.className = "news-empty";
      empty.textContent = "No release notes were written for this version.";
      body.appendChild(empty);
    }
    card.appendChild(body);

    if (assets.length) {
      var attach = document.createElement("div");
      attach.className = "news-assets";
      var attachTitle = document.createElement("p");
      attachTitle.className = "news-assets-title";
      attachTitle.textContent = "Downloads (" + assets.length + ")";
      attach.appendChild(attachTitle);
      var ul = document.createElement("ul");
      assets.forEach(function (asset) {
        if (!asset || !asset.browser_download_url || !isSafeUrl(asset.browser_download_url)) return;
        var li = document.createElement("li");
        var a = document.createElement("a");
        a.href = asset.browser_download_url;
        a.textContent = asset.name || "download";
        a.setAttribute("rel", "noopener noreferrer");
        li.appendChild(a);
        var bits = [];
        if (asset.size != null) bits.push(formatBytes(asset.size));
        if (asset.download_count != null) bits.push(asset.download_count + " downloads");
        if (bits.length) {
          var span = document.createElement("span");
          span.className = "news-asset-meta";
          span.textContent = " · " + bits.join(" · ");
          li.appendChild(span);
        }
        ul.appendChild(li);
      });
      if (ul.children.length) {
        attach.appendChild(ul);
        card.appendChild(attach);
      }
    }

    var foot = document.createElement("footer");
    foot.className = "news-card-foot";
    var copyBtn = document.createElement("button");
    copyBtn.className = "game-action";
    copyBtn.type = "button";
    copyBtn.textContent = "Copy link";
    copyBtn.addEventListener("click", function () {
      copyArticleLink(tag, copyBtn);
    });
    foot.appendChild(copyBtn);
    if (release.html_url && isSafeUrl(release.html_url)) {
      var gh = document.createElement("a");
      gh.className = "game-action news-gh-link";
      gh.href = release.html_url;
      gh.target = "_blank";
      gh.rel = "noopener noreferrer";
      gh.textContent = "Open on GitHub";
      foot.appendChild(gh);
    }
    card.appendChild(foot);

    return card;
  }

  function copyArticleLink(tag, btn) {
    var url = tag ? articleUrl(tag) : location.href;
    function done(ok) {
      if (!btn) return;
      var prev = btn.textContent;
      btn.textContent = ok ? "Copied!" : "Copy failed";
      setTimeout(function () { btn.textContent = prev; }, 1200);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(function () { done(true); }, function () { done(false); });
      return;
    }
    try {
      var ta = document.createElement("textarea");
      ta.value = url;
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand("copy");
      ta.remove();
      done(!!ok);
    } catch (err) {
      window.prompt("Copy this link:", url);
    }
  }

  function renderEmpty() {
    listEl.innerHTML = "";
    var card = document.createElement("article");
    card.className = "news-card news-empty-card";
    card.innerHTML =
      '<p class="tag">No releases yet</p>' +
      "<h2>Nothing published so far</h2>" +
      '<div class="news-body">' +
      "<p>When you publish your first GitHub Release, it will show up here automatically — newest first.</p>" +
      "<ol class=\"news-ol\">" +
      "<li>Open <a href=\"" + escapeHtml(WEB_URL) + "\" target=\"_blank\" rel=\"noopener noreferrer\">GitHub → Releases</a> and choose <strong>Draft a new release</strong>.</li>" +
      "<li>Pick a tag like <code>v1.0.0</code>, write a <strong>Release title</strong> (that's the headline).</li>" +
      "<li>Write the notes in the description box. You can use headings (<code>## What's new</code>), paragraphs, <code>**bold**</code>, <code>*italic*</code>, lists, <code>![alt](image-url)</code> images and <code>[text](https://…)</code> links.</li>" +
      "<li>Press <strong>Publish release</strong> — it appears on this page within minutes.</li>" +
      "</ol>" +
      "</div>";
    listEl.appendChild(card);
  }

  function renderError(message, showCachedNote) {
    if (listEl.children.length) {
      setStatus(message + (showCachedNote ? " Showing the last saved copy below." : ""));
      return;
    }
    listEl.innerHTML = "";
    var card = document.createElement("article");
    card.className = "news-card news-empty-card";
    var heading = document.createElement("h2");
    heading.textContent = "Couldn't load releases";
    var para = document.createElement("p");
    para.textContent = message + " ";
    var link = document.createElement("a");
    link.href = WEB_URL;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Read them on GitHub instead →";
    para.appendChild(link);
    card.appendChild(heading);
    card.appendChild(para);
    listEl.appendChild(card);
    setStatus(message);
  }

  function paint(releases) {
    listEl.innerHTML = "";
    var sorted = sortNewestFirst(releases);
    sorted.forEach(function (release, index) {
      listEl.appendChild(renderCard(release, index === 0));
    });
    var onlyTag = requestedTag();
    if (onlyTag) {
      var target = listEl.querySelector('[data-tag="' + onlyTag.replace(/"/g, "") + '"]');
      if (target) {
        target.classList.add("news-highlight");
        try {
          target.scrollIntoView({ block: "start" });
        } catch (err) {}
      }
    }
    setStatus(
      sorted.length === 1
        ? "1 release · newest first"
        : sorted.length + " releases · newest first"
    );
  }

  function readCache() {
    try {
      var parsed = JSON.parse(localStorage.getItem(CACHE_KEY));
      if (parsed && Array.isArray(parsed.releases)) return parsed;
    } catch (err) {}
    return null;
  }

  function writeCache(releases) {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ at: Date.now(), releases: releases }));
    } catch (err) {}
  }

  function loadReleases(opts) {
    var useCache = !(opts && opts.fresh);
    var cached = readCache();
    var cacheFresh =
      cached && typeof cached.at === "number" && Date.now() - cached.at < CACHE_TTL_MS;

    if (useCache && cached && cached.releases.length) {
      paint(cached.releases);
      if (cacheFresh) return Promise.resolve();
      setStatus("Checking for newer releases…");
    } else {
      setStatus("Loading releases…");
    }

    if (refreshBtn) {
      refreshBtn.disabled = true;
      refreshBtn.textContent = "Loading…";
    }

    return fetch(API_URL, { headers: { Accept: "application/vnd.github+json" } })
      .then(function (res) {
        if (res.status === 403) {
          throw new Error("GitHub's public API rate limit kicked in (60/hour).");
        }
        if (!res.ok) {
          throw new Error("GitHub answered with " + res.status + ".");
        }
        return res.json();
      })
      .then(function (data) {
        var releases = sortNewestFirst(Array.isArray(data) ? data : []);
        if (!releases.length) {
          renderEmpty();
          setStatus("No published releases yet.");
          return;
        }
        writeCache(releases);
        paint(releases);
      })
      .catch(function (err) {
        var message = (err && err.message) || "Something went wrong reaching GitHub.";
        if (cached && cached.releases.length) {
          paint(cached.releases);
          renderError(message, true);
        } else {
          renderError(message, false);
        }
      })
      .then(function () {
        if (refreshBtn) {
          refreshBtn.disabled = false;
          refreshBtn.textContent = "Refresh";
        }
      });
  }

  if (refreshBtn) {
    refreshBtn.addEventListener("click", function () {
      loadReleases({ fresh: true });
    });
  }

  // Exposed for quick console checks: window.__newsRender("# hello").
  window.__newsRender = renderMarkdown;

  loadReleases();
})();
