const FEEDBACK_REPO = "cosmiccat9784/trinkets";
const FEEDBACK_LOG_KEY = "trinkets-feedback-log";
const GAME_NAMES = {
  "": "Whole arcade",
  switchback: "Switchback Tiles",
  comet: "Comet Catch",
  forge: "Four-Letter Forge",
  maze: "Pocket Maze",
  bash: "Button Bash",
  clue: "Clue Crate",
  toybox: "Toybox",
  thousand: "2048",
  powder: "Powder Sim",
  wrap: "Bubble Wrap",
  zen: "Zen Sand",
  gravity: "Gravity Balls",
  spiro: "Spirograph",
  facts: "Useless Facts",
  orchard: "Orchard Go"
};

const fbGame = document.querySelector("#fbGame");
const fbType = document.querySelector("#fbType");
const fbSubject = document.querySelector("#fbSubject");
const fbDetails = document.querySelector("#fbDetails");
const fbMsg = document.querySelector("#fbMsg");

function readLog() {
  try {
    const parsed = JSON.parse(localStorage.getItem(FEEDBACK_LOG_KEY));
    if (Array.isArray(parsed)) return parsed;
  } catch (err) {}
  return [];
}

function writeLog(entries) {
  try {
    localStorage.setItem(FEEDBACK_LOG_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch (err) {}
}

function formatDate(at) {
  try {
    return new Date(at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch (err) {
    return "";
  }
}

function renderLog() {
  const list = document.querySelector("#fbLog");
  const entries = readLog();
  list.innerHTML = "";
  if (!entries.length) {
    const li = document.createElement("li");
    li.textContent = "Nothing here yet. Your sent reports will appear on this device.";
    list.append(li);
    return;
  }
  entries.forEach((entry) => {
    const li = document.createElement("li");
    const title = document.createElement("div");
    title.className = "feedback-item-title";
    title.textContent = entry.subject;
    const meta = document.createElement("div");
    meta.className = "feedback-item-meta";
    meta.textContent = `${GAME_NAMES[entry.game] || entry.game} · ${entry.type} · ${formatDate(entry.at)}`;
    li.append(title, meta);
    list.append(li);
  });
}

function parseChips(title) {
  const match = /^\[(.+?)\] \[(.+?)\]/.exec(title || "");
  if (!match) return [];
  return [match[1], match[2]];
}

function renderInbox() {
  const list = document.querySelector("#fbInbox");
  const status = document.querySelector("#fbInboxStatus");
  fetch(`https://api.github.com/repos/${FEEDBACK_REPO}/issues?state=open&labels=feedback&per_page=20`)
    .then((response) => {
      if (!response.ok) throw new Error("http " + response.status);
      return response.json();
    })
    .then((items) => {
      const issues = items.filter((item) => !item.pull_request);
      list.innerHTML = "";
      if (!issues.length) {
        status.textContent = "No open reports. Be the first!";
        return;
      }
      status.textContent = `${issues.length} open report${issues.length === 1 ? "" : "s"}:`;
      issues.forEach((issue) => {
        const li = document.createElement("li");
        const title = document.createElement("div");
        title.className = "feedback-item-title";
        const link = document.createElement("a");
        link.className = "feedback-item-link";
        link.href = issue.html_url;
        link.target = "_blank";
        link.rel = "noopener";
        link.textContent = issue.title;
        title.append(link);
        const meta = document.createElement("div");
        meta.className = "feedback-item-meta";
        parseChips(issue.title).forEach((chip) => {
          const span = document.createElement("span");
          span.className = "feedback-chip";
          span.textContent = chip;
          meta.append(span);
        });
        meta.append(document.createTextNode(formatDate(issue.created_at)));
        li.append(title, meta);
        if (issue.body) {
          const snippet = document.createElement("div");
          snippet.className = "feedback-item-meta";
          snippet.textContent = issue.body.slice(0, 140) + (issue.body.length > 140 ? "…" : "");
          li.append(snippet);
        }
        list.append(li);
      });
    })
    .catch(() => {
      status.textContent = "Couldn't load live reports.";
      const li = document.createElement("li");
      const link = document.createElement("a");
      link.className = "feedback-item-link";
      link.href = `https://github.com/${FEEDBACK_REPO}/issues?q=is%3Aissue+is%3Aopen+label%3Afeedback`;
      link.target = "_blank";
      link.rel = "noopener";
      link.textContent = "View reports on GitHub instead";
      li.append(link);
      list.innerHTML = "";
      list.append(li);
    });
}

document.querySelector("#fbSend").addEventListener("click", () => {
  const game = fbGame.value;
  const type = fbType.value;
  const subject = fbSubject.value.trim();
  const details = fbDetails.value.trim();
  if (!subject || !details) {
    fbMsg.textContent = "Give it a subject and a few details first.";
    return;
  }
  const title = `[${GAME_NAMES[game] || game}] [${type}] ${subject}`;
  const body = `Game: ${GAME_NAMES[game] || game} (${game || "arcade"})\nType: ${type}\nPage: ${location.href}\n\n${details}\n\n---\nSent from the Trinkets Arcade feedback page.`;
  const url = `https://github.com/${FEEDBACK_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}&labels=${encodeURIComponent("feedback")}`;
  const entries = readLog();
  entries.unshift({ game, type, subject, details, at: Date.now() });
  writeLog(entries);
  renderLog();
  fbSubject.value = "";
  fbDetails.value = "";
  fbMsg.textContent = "Opened! Hit Submit on GitHub to send it.";
  window.open(url, "_blank", "noopener");
});

document.querySelector("#fbClear").addEventListener("click", () => {
  writeLog([]);
  renderLog();
});

renderLog();
renderInbox();
