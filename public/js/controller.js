(function () {
  "use strict";

  const selectEl = document.getElementById("song-select");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const numberInput = document.getElementById("song-number");
  const selectNumberBtn = document.getElementById("select-number-btn");
  const previewTitle = document.getElementById("preview-title");
  const previewLines = document.getElementById("preview-lines");
  const errorMessage = document.getElementById("error-message");

  let songs = [];
  let currentNumber = null;
  let busy = false;

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
  }

  function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
  }

  function renderPreview(song) {
    if (!song) {
      previewTitle.textContent = "No song selected";
      previewLines.innerHTML = "";
      return;
    }

    previewTitle.textContent = song.title;
    if (song.pages && song.pages.length) {
      previewLines.innerHTML = song.pages
        .map(
          (page, index) =>
            `<img class="preview-page-image" src="${escapeHtml(page)}" alt="${escapeHtml(
              song.title
            )} — page ${index + 1}" />`
        )
        .join("");
    } else {
      previewLines.innerHTML = '<p class="preview-line">No page images found.</p>';
    }
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function populateSelect(selectedNumber) {
    selectEl.innerHTML = songs
      .map(
        (song) =>
          `<option value="${song.number}"${song.number === selectedNumber ? " selected" : ""}>${escapeHtml(
            song.title
          )}</option>`
      )
      .join("");
  }

  async function selectSong(number) {
    if (busy) {
      return;
    }

    const song = window.SongtextSongs.findByNumber(songs, number);
    if (!song) {
      showError(`Song number ${number} was not found.`);
      return;
    }

    busy = true;
    clearError();

    try {
      await window.SongtextSync.setCurrentSongNumber(number);
      currentNumber = number;
      populateSelect(number);
      numberInput.value = String(number);
      renderPreview(song);
    } catch (err) {
      showError(err.message || "Could not update the current song.");
    } finally {
      busy = false;
    }
  }

  function wireEvents() {
    selectEl.addEventListener("change", () => {
      selectSong(Number(selectEl.value));
    });

    prevBtn.addEventListener("click", () => {
      const song = window.SongtextSongs.neighbour(songs, currentNumber, -1);
      if (song) {
        selectSong(song.number);
      }
    });

    nextBtn.addEventListener("click", () => {
      const song = window.SongtextSongs.neighbour(songs, currentNumber, 1);
      if (song) {
        selectSong(song.number);
      }
    });

    selectNumberBtn.addEventListener("click", () => {
      const value = Number(numberInput.value);
      if (!Number.isInteger(value) || value < 1) {
        showError("Enter a valid song number.");
        return;
      }
      selectSong(value);
    });

    numberInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        selectNumberBtn.click();
      }
    });
  }

  async function start() {
    try {
      songs = await window.SongtextSongs.loadCatalogue();
      if (!songs.length) {
        showError("No songs found. Run scripts/build_songs.py first.");
        return;
      }

      if (!window.SongtextSync.isConfigured()) {
        showError("Firebase is not configured — edit public/js/config.js");
        return;
      }

      await window.SongtextSync.initFirebase();

      wireEvents();

      try {
        const existing = await window.SongtextSync.getCurrentSongNumber();
        if (typeof existing === "number") {
          currentNumber = existing;
        }
      } catch (_err) {
        // Ignore read errors on first load.
      }

      if (currentNumber == null) {
        currentNumber = songs[0].number;
        await selectSong(currentNumber);
      } else {
        populateSelect(currentNumber);
        numberInput.value = String(currentNumber);
        renderPreview(window.SongtextSongs.findByNumber(songs, currentNumber));
      }
    } catch (err) {
      showError(err.message || "Failed to start controller.");
    }
  }

  start();
})();
