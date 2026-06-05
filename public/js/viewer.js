(function () {
  "use strict";

  const config = window.SONGTEXT_CONFIG;
  const contentEl = document.getElementById("song-content");
  const statusDot = document.getElementById("status-dot");
  const syncStatus = document.getElementById("sync-status");
  const statusText = document.getElementById("status-text");

  let songs = [];
  let currentNumber = null;
  let pollTimer = null;

  function setStatus(kind, message) {
    statusDot.className = "status-dot" + (kind ? " " + kind : "");
    syncStatus.textContent = message;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderSong(song) {
    if (!song) {
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = "<p>Waiting for the operator to select a song…</p>";
      statusText.textContent = "No song selected yet";
      return;
    }

    statusText.textContent = `Dal: ${song.number}: ${song.title}`;

    if (!song.pages || !song.pages.length) {
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = "<p>This song has no page images. Re-run build_songs.py.</p>";
      return;
    }

    contentEl.className = "viewer-pages";
    contentEl.innerHTML =
      `<h2 class="viewer-song-title">${escapeHtml(song.title)}</h2>` +
      song.pages
        .map(
          (page, index) =>
            `<img class="viewer-page-image" src="${escapeHtml(page)}" alt="${escapeHtml(
              song.title
            )} — page ${index + 1}" loading="eager" />`
        )
        .join("");
  }

  async function applySongNumber(number) {
    if (number === currentNumber) {
      return;
    }

    const song = window.SongtextSongs.findByNumber(songs, number);
    if (!song) {
      setStatus("error", `Song ${number} is not in the catalogue`);
      return;
    }

    currentNumber = number;
    renderSong(song);
    // setStatus("live", `Live · song ${song.number}`);
  }

  async function pollCurrentSong() {
    try {
      const number = await window.SongtextSync.getCurrentSongNumber();
      if (typeof number === "number") {
        await applySongNumber(number);
      } else {
        setStatus("", "Várakozás a következő dalra");
      }
    } catch (err) {
      setStatus("error", err.message || "Sync error");
    }
  }

  async function start() {
    try {
      songs = await window.SongtextSongs.loadCatalogue();
      if (!window.SongtextSync.isConfigured()) {
        setStatus("error", "Firebase is not configured — edit public/js/config.js");
        statusText.textContent = "Setup required";
        return;
      }

      await window.SongtextSync.initFirebase();
      await pollCurrentSong();

      pollTimer = window.setInterval(pollCurrentSong, config.pollIntervalMs);
      // setStatus("live", `Checking every ${config.pollIntervalMs / 1000}s`);
    } catch (err) {
      setStatus("error", err.message || "Failed to start viewer");
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = `<p>${escapeHtml(err.message || "Failed to start")}</p>`;
    }
  }

  window.addEventListener("beforeunload", () => {
    if (pollTimer) {
      window.clearInterval(pollTimer);
    }
  });

  start();
})();
