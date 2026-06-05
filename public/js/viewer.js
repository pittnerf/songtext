(function () {
  "use strict";

  const config = window.SONGTEXT_CONFIG;
  const contentEl = document.getElementById("song-content");
  const pageTitleEl = document.getElementById("page-title");
  const statusBarEl = document.querySelector(".status-bar");
  const statusDot = document.getElementById("status-dot");
  const syncStatus = document.getElementById("sync-status");
  const statusText = document.getElementById("status-text");

  const BASE_TITLE = "Most ezt énekeljük";

  let songs = [];
  let currentNumber = null;
  let pollTimer = null;

  function setStatus(kind, message) {
    document.body.classList.remove("song-active");
    statusBarEl.classList.remove("hidden");
    statusBarEl.hidden = false;
    statusText.classList.remove("hidden");
    statusDot.className = "status-dot" + (kind ? " " + kind : "");
    syncStatus.textContent = message;
  }

  function clearStatus() {
    document.body.classList.add("song-active");
    statusBarEl.classList.add("hidden");
    statusBarEl.hidden = true;
    statusDot.className = "status-dot";
    syncStatus.textContent = "";
    statusText.textContent = "";
    statusText.classList.add("hidden");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function setPageTitle(song) {
    if (song) {
      pageTitleEl.textContent = `${BASE_TITLE} — Dal: ${song.title}`;
    } else {
      pageTitleEl.textContent = BASE_TITLE;
    }
  }

  function renderSong(song) {
    if (!song) {
      document.body.classList.remove("song-active");
      setPageTitle(null);
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = "<p>Waiting for the operator to select a song…</p>";
      statusText.textContent = "No song selected yet";
      statusText.classList.remove("hidden");
      setStatus("", "Waiting for the current song");
      return;
    }

    if (!song.pages || !song.pages.length) {
      document.body.classList.remove("song-active");
      setPageTitle(song);
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = "<p>This song has no page images. Re-run build_songs.py.</p>";
      setStatus("error", "Missing song images");
      statusText.textContent = `${song.number}. ${song.title}`;
      statusText.classList.remove("hidden");
      return;
    }

    setPageTitle(song);
    clearStatus();
    contentEl.className = "viewer-pages";
    contentEl.innerHTML = song.pages
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
  }

  async function pollCurrentSong() {
    try {
      const number = await window.SongtextSync.getCurrentSongNumber();
      if (typeof number === "number") {
        await applySongNumber(number);
      } else {
        currentNumber = null;
        renderSong(null);
      }
    } catch (err) {
      setStatus("error", err.message || "Sync error");
    }
  }

  async function start() {
    try {
      const viewerUrl = new URL("viewer.html", window.location.href).href;
      const qrImage = document.getElementById("viewer-qr");
      if (qrImage) {
        qrImage.src =
          "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
          encodeURIComponent(viewerUrl);
      }

      songs = await window.SongtextSongs.loadCatalogue();
      if (!window.SongtextSync.isConfigured()) {
        setStatus("error", "Firebase is not configured — edit public/js/config.js");
        statusText.textContent = "Setup required";
        return;
      }

      await window.SongtextSync.initFirebase();
      await pollCurrentSong();

      pollTimer = window.setInterval(pollCurrentSong, config.pollIntervalMs);
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
