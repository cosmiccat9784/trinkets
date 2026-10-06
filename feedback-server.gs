/**
 * Trinkets Arcade anonymous feedback inbox + online leaderboards.
 *
 * SETUP (once, ~5 minutes):
 * 1. Create a blank spreadsheet at sheets.google.com, name it "Trinkets Feedback".
 * 2. Rename the first tab to "Feedback" and put these headers in row 1:
 *    Timestamp | Game | Type | Subject | Details | Page
 * 3. Add a second tab named "Scores" with these headers in row 1:
 *    Timestamp | Game | Name | Score | Page
 *    (Trial games post here: comet, bash, thousand, flappy, tinyblocks.
 *    All trial games are high-wins, so the client sorts biggest-first.
 *    If low-wins games join later, sort ascending for those game ids.)
 * 3b. Add a third tab named "Visits" with these headers in row 1:
 *    Timestamp | Game | Visitor | Device | Browser | Page
 *    (Anonymous arcade stats: one row per page view / game opened.
 *    Visitor is a random per-browser id, Device/Browser are coarse
 *    buckets like Mobile/Desktop and Chrome/Safari — no raw user agents.)
 * 4. In the spreadsheet: Extensions -> Apps Script.
 * 5. Delete any placeholder code, paste this whole file, press Save.
 * 6. Deploy -> New deployment -> gear icon -> Web app.
 *    - Description: feedback v1
 *    - Execute as: Me
 *    - Who has access: Anyone
 *    - Deploy, then authorize (choose account -> Advanced ->
 *      "Go to Trinkets Feedback (unsafe)" -> Allow).
 * 7. Copy the Web app URL (ends in /exec) into FEEDBACK_SHEET_URL
 *    at the top of feedback.js (or send it to your dev to wire in).
 *    The arcade leaderboard client (leaderboards.js) reuses the same URL.
 * 8. Test it: send a report from feedback.html, watch the row appear;
 *    post a score from a beta board with ?beta=1, then load
 *    <exec-url>?action=scores&game=comet to see the JSON top-10.
 *
 * NOTE: editing this script later requires redeploying:
 * Deploy -> Manage deployments -> pencil icon -> Version: New version.
 *
 * Moderation: score rows are plain text from anonymous clients. To remove
 * a junk row, delete it in the Scores tab — the next fetch drops it.
 */

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(
    ContentService.MimeType.JSON
  );
}

function doPost(e) {
  var data = {};
  try {
    data = JSON.parse(e.postData.contents);
  } catch (err) {
    data = {};
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  // Anonymous visit beacon: { action: "visit", game, visitor, device, browser, page }
  if (data.action === "visit") {
    var vgame = String(data.game || "").toLowerCase().slice(0, 32);
    if (!vgame) {
      return jsonOut({ ok: false, error: "bad visit" });
    }
    var log = ss.getSheetByName("Visits") || ss.insertSheet("Visits");
    log.appendRow([
      new Date(),
      vgame,
      String(data.visitor || "").slice(0, 16),
      String(data.device || "").slice(0, 16),
      String(data.browser || "").slice(0, 16),
      data.page || ""
    ]);
    return jsonOut({ ok: true });
  }
  if (data.action === "score") {
    var game = String(data.game || "").toLowerCase().slice(0, 32);
    var name = String(data.name || "You").slice(0, 12);
    var score = Number(data.score) || 0;
    if (!game || !(score > 0)) {
      return jsonOut({ ok: false, error: "bad score" });
    }
    var scores = ss.getSheetByName("Scores") || ss.insertSheet("Scores");
    scores.appendRow([new Date(), game, name, score, data.page || ""]);
    return jsonOut({ ok: true });
  }
  var fb = ss.getSheetByName("Feedback") || ss.getActiveSheet();
  fb.appendRow([
    new Date(),
    data.game || "",
    data.type || "",
    data.subject || "",
    data.details || "",
    data.page || ""
  ]);
  return jsonOut({ ok: true });
}

function doGet(e) {
  // Global top-10 for one game: <exec-url>?action=scores&game=comet
  // Arcade stats: <exec-url>?action=stats
  var action = "";
  var game = "";
  try {
    if (e && e.parameter) {
      action = String(e.parameter.action || "");
      game = String(e.parameter.game || "").toLowerCase();
    }
  } catch (err) {
    return jsonOut({ scores: [], stats: null });
  }
  if (action === "stats") return statsOut();
  if (action !== "scores" || !game) return jsonOut({ scores: [] });
  var sheet = null;
  try {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Scores");
  } catch (err) {}
  if (!sheet) return jsonOut({ scores: [] });
  var rows = [];
  try {
    rows = sheet.getDataRange().getValues();
  } catch (err) {
    return jsonOut({ scores: [] });
  }
  var out = [];
  for (var i = 1; i < rows.length; i++) {
    var g = String(rows[i][1] || "").toLowerCase();
    if (g !== game) continue;
    var s = Number(rows[i][3]) || 0;
    if (!(s > 0)) continue;
    var t = 0;
    try {
      t = rows[i][0] ? new Date(rows[i][0]).getTime() : 0;
    } catch (err2) {}
    out.push({ n: String(rows[i][2] || "You").slice(0, 12), s: s, d: t });
  }
  // Trial set is all high-wins (biggest first). Low-wins games need a < b here.
  out.sort(function (a, b) { return b.s - a.s; });
  return jsonOut({ scores: out.slice(0, 10) });
}

function statsOut() {
  var sheet = null;
  try {
    sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("Visits");
  } catch (err) {}
  if (!sheet) return jsonOut({ stats: null });
  var rows = [];
  try {
    rows = sheet.getDataRange().getValues();
  } catch (err) {
    return jsonOut({ stats: null });
  }
  var games = {};
  var devices = {};
  var browsers = {};
  var seen = {};
  var visitors = 0;
  var total = 0;
  var since = 0;
  var start = Math.max(1, rows.length - 20000);
  for (var i = start; i < rows.length; i++) {
    var g = String(rows[i][1] || "");
    if (!g) continue;
    total++;
    games[g] = (games[g] || 0) + 1;
    var v = String(rows[i][2] || "");
    if (v && !seen[v]) {
      seen[v] = 1;
      visitors++;
    }
    var d = String(rows[i][3] || "");
    if (d) devices[d] = (devices[d] || 0) + 1;
    var b = String(rows[i][4] || "");
    if (b) browsers[b] = (browsers[b] || 0) + 1;
    if (!since) {
      try {
        since = rows[i][0] ? new Date(rows[i][0]).getTime() : 0;
      } catch (err2) {}
    }
  }
  return jsonOut({
    stats: {
      visits: total,
      visitors: visitors,
      games: games,
      devices: devices,
      browsers: browsers,
      since: since
    }
  });
}
