const FEEDBACK_LOG_KEY = "trinkets-feedback-log";
// Anonymous inbox: paste your Google Apps Script web-app URL between the quotes.
// (See feedback-server.gs for the 5-minute setup.) Leave empty to hide the
// anonymous option until then.
const FEEDBACK_SHEET_URL = "https://script.google.com/macros/s/AKfycbx5mjh-z38RvN9M7o_mAyfVq70TOsZoUwIQjylAvdXlIX5hGpPSHCm-K-qRVEvgRAclOg/exec";
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
  orchard: "Orchard Go",
  magnet: "Magnet Mess",
  ice: "Ice Cube",
  coin: "Coin Flip",
  cheese: "Cheese Thief",
  machine: "Completely Normal Machine",
  onebutton: "One Button",
  penguin: "Penguin Parkour",
  defence: "Penguin Defence",
  spider: "Spider",
  ikea: "Guess the IKEA Product",
  flappy: "Flappy Bird",
  zigzag: "Zigzag",
  gravityball: "Gravity Ball",
  tinyblocks: "Tiny Blocks",
  tag: "Trinkets Tag",
  ludo: "Ludo",
  mayhem: "Magnet Mayhem",
  tycoon: "Penguin Park Tycoon"
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

function readFields() {
  return {
    game: fbGame.value,
    type: fbType.value,
    subject: fbSubject.value.trim(),
    details: fbDetails.value.trim()
  };
}

function logSent(game, type, subject, details) {
  const entries = readLog();
  entries.unshift({ game, type, subject, details, at: Date.now() });
  writeLog(entries);
  renderLog();
  fbSubject.value = "";
  fbDetails.value = "";
}

async function sendAnonymous() {
  const { game, type, subject, details } = readFields();
  if (!subject || !details) {
    fbMsg.textContent = "Give it a subject and a few details first.";
    return;
  }
  if (!FEEDBACK_SHEET_URL) {
    fbMsg.textContent = "Anonymous inbox isn't set up yet — use GitHub for now.";
    return;
  }
  fbMsg.textContent = "Sending…";
  try {
    await fetch(FEEDBACK_SHEET_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        game: GAME_NAMES[game] || game,
        type,
        subject,
        details,
        page: location.href
      })
    });
    logSent(game, type, subject, details);
    fbMsg.textContent = "Sent anonymously. Thank you!";
  } catch (err) {
    fbMsg.textContent = "Couldn't reach the inbox. Try GitHub instead?";
  }
}

document.querySelector("#fbSendAnon").addEventListener("click", sendAnonymous);

document.querySelector("#fbClear").addEventListener("click", () => {
  writeLog([]);
  renderLog();
});

renderLog();
