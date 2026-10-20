
const $ = (id) => document.getElementById(id);

const playerInput = $("playerInput");
const teamSizeInput = $("teamSize");
const results = $("results");
const message = $("message");

let teams = { black: [], white: [], bench: [] };
let lastRoster = [];

function getPlayers() {
  return playerInput.value
    .split(/[\n,;]+/)
    .map(name => name.trim())
    .filter(Boolean);
}

function updateParticipantCount() {
  const count = getPlayers().length;
  $("participantCount").textContent = `${count} oyuncu`;
}

function showMessage(text, type = "") {
  message.textContent = text;
  message.className = `message ${type}`.trim();
}

function shuffle(array) {
  const result = [...array];

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  return result;
}

function getTeamSize() {
  const value = Number.parseInt(teamSizeInput.value, 10);
  return Number.isFinite(value)
    ? Math.max(1, Math.min(30, value))
    : 7;
}

function createTeams(roster = getPlayers()) {
  const players = roster.filter(name => name.trim());

  if (players.length < 2) {
    showMessage("Takım oluşturmak için en az 2 oyuncu eklemelisin.", "error");
    results.hidden = true;
    return;
  }

  // Aynı isim birden fazla kez yazılmışsa ayrı katılımcı kabul edilir.
  const size = getTeamSize();
  teamSizeInput.value = size;

  const shuffled = shuffle(players);
  teams = { black: [], white: [], bench: [] };

  // Oyuncuları iki takıma dengeli dağıt.
  shuffled.forEach(player => {
    if (teams.black.length >= size && teams.white.length >= size) {
      teams.bench.push(player);
    } else if (
      teams.black.length <= teams.white.length &&
      teams.black.length < size
    ) {
      teams.black.push(player);
    } else if (teams.white.length < size) {
      teams.white.push(player);
    } else {
      teams.bench.push(player);
    }
  });

  lastRoster = [...players];
  results.hidden = false;
  renderTeams();

  if (teams.bench.length) {
    showMessage(
      `${players.length} oyuncu dağıtıldı. ${teams.bench.length} kişi yedek listesinde.`,
      "success"
    );
  } else {
    showMessage("Takımlar hazır! İyi maçlar.", "success");
  }

  saveState();
}

function renderPlayerList(elementId, list, source) {
  const container = $(elementId);
  container.replaceChildren();

  list.forEach((player, index) => {
    const row = document.createElement("div");
    row.className = "player-row";

    const number = document.createElement("span");
    number.className = "player-number";
    number.textContent = String(index + 1).padStart(2, "0");

    const name = document.createElement("span");
    name.className = "player-name";
    name.textContent = player;

    row.append(number, name);

    const targets = {
      black: [
        ["white", "Beyaz takıma taşı"],
        ["bench", "Yedeğe taşı"]
      ],
      white: [
        ["black", "Siyah takıma taşı"],
        ["bench", "Yedeğe taşı"]
      ],
      bench: [
        ["black", "Siyah takıma al"],
        ["white", "Beyaz takıma al"]
      ]
    };

    targets[source].forEach(([target, label]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "move-btn";
      button.textContent = target === "bench" ? "↓" : target === "black" ? "S" : "B";
      button.setAttribute("aria-label", `${player}: ${label}`);
      button.title = label;
      button.addEventListener("click", () => movePlayer(source, index, target));
      row.append(button);
    });

    container.append(row);
  });
}

function renderEmptySlots(elementId, team) {
  const container = $(elementId);
  container.replaceChildren();

  const missing = getTeamSize() - team.length;

  for (let i = 0; i < missing; i++) {
    const slot = document.createElement("div");
    slot.className = "empty-slot";
    slot.textContent = "＋ Boş kontenjan";

    const number = document.createElement("span");
    number.textContent = `#${team.length + i + 1}`;
    slot.append(number);

    container.append(slot);
  }
}

function renderTeams() {
  const size = getTeamSize();

  renderPlayerList("blackPlayers", teams.black, "black");
  renderPlayerList("whitePlayers", teams.white, "white");
  renderPlayerList("benchPlayers", teams.bench, "bench");

  $("blackCount").textContent = `${teams.black.length} / ${size}`;
  $("whiteCount").textContent = `${teams.white.length} / ${size}`;
  $("benchCount").textContent = `${teams.bench.length} kişi`;

  renderEmptySlots("blackEmpty", teams.black);
  renderEmptySlots("whiteEmpty", teams.white);

  $("benchCard").hidden = teams.bench.length === 0;

  const total = teams.black.length + teams.white.length + teams.bench.length;
  const empty = Math.max(0, size - teams.black.length) +
                Math.max(0, size - teams.white.length);

  $("summary").innerHTML =
    `<strong>${total} oyuncu</strong> dağıtıldı · ` +
    `Siyah: <strong>${teams.black.length}</strong> · ` +
    `Beyaz: <strong>${teams.white.length}</strong> · ` +
    `Boş kontenjan: <strong>${empty}</strong>`;

  // Yalnızca yedekleri gösteren satırları yeniden çizmek yeterlidir.
}

function movePlayer(source, index, target) {
  if (!teams[source] || !teams[target]) return;

  if (teams[target].length >= getTeamSize()) {
    showMessage("Bu takım dolu. Önce bir oyuncuyu başka yere taşı.", "error");
    return;
  }

  const [player] = teams[source].splice(index, 1);
  teams[target].push(player);

  renderTeams();
  showMessage(`${player} oyuncusu taşındı.`, "success");
  saveState();
}

function saveState() {
  try {
    localStorage.setItem("sahaplan-players", JSON.stringify({
      input: playerInput.value,
      size: getTeamSize()
    }));
  } catch {
    // Tarayıcı depolaması kapalıysa uygulama yine çalışır.
  }
}

function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem("sahaplan-players"));
    if (!saved) return;

    if (typeof saved.input === "string") playerInput.value = saved.input;
    if (Number.isFinite(saved.size)) {
      teamSizeInput.value = Math.max(1, Math.min(30, saved.size));
    }
  } catch {
    // Bozuk veya erişilemeyen kayıt yok sayılır.
  }

  updateParticipantCount();
}

playerInput.addEventListener("input", () => {
  updateParticipantCount();
  saveState();
});

teamSizeInput.addEventListener("change", () => {
  teamSizeInput.value = getTeamSize();
  saveState();
  if (!results.hidden) createTeams(lastRoster);
});

$("decreaseSize").addEventListener("click", () => {
  teamSizeInput.value = Math.max(1, getTeamSize() - 1);
  teamSizeInput.dispatchEvent(new Event("change"));
});

$("increaseSize").addEventListener("click", () => {
  teamSizeInput.value = Math.min(30, getTeamSize() + 1);
  teamSizeInput.dispatchEvent(new Event("change"));
});

$("createTeams").addEventListener("click", () => createTeams());

$("reshuffle").addEventListener("click", () => {
  createTeams(lastRoster);
});

$("clearAll").addEventListener("click", () => {
  playerInput.value = "";
  teams = { black: [], white: [], bench: [] };
  lastRoster = [];
  results.hidden = true;
  updateParticipantCount();
  showMessage("Oyuncu listesi temizlendi.");
  saveState();
});

function getTeamText() {
  const format = (title, players) =>
    `${title}\n${players.length ? players.map((p, i) => `${i + 1}. ${p}`).join("\n") : "Henüz oyuncu yok"}\n`;

  return [
    "⚽ HALI SAHA TAKIMLARI",
    "",
    format("⚫ SİYAH TAKIM", teams.black),
    format("⚪ BEYAZ TAKIM", teams.white),
    teams.bench.length ? format("🔄 YEDEKLER", teams.bench) : ""
  ].filter(Boolean).join("\n");
}

$("copyTeams").addEventListener("click", async () => {
  const text = getTeamText();

  try {
    await navigator.clipboard.writeText(text);
    showMessage("Takım listesi kopyalandı!", "success");
  } catch {
    // Clipboard API desteklenmezse metin seçilebilir şekilde açılır.
    const area = document.createElement("textarea");
    area.value = text;
    document.body.append(area);
    area.select();

    const copied = document.execCommand("copy");
    area.remove();

    showMessage(
      copied ? "Takım listesi kopyalandı!" : "Kopyalama başarısız. TXT indirmeyi dene.",
      copied ? "success" : "error"
    );
  }
});

$("downloadTeams").addEventListener("click", () => {
  const blob = new Blob(["\uFEFF" + getTeamText()], {
    type: "text/plain;charset=utf-8"
  });

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "halisaha-takimlari.txt";
  link.click();
  URL.revokeObjectURL(url);
});

restoreState();
