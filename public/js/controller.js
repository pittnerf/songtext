(function () {
  "use strict";

  const selectEl = document.getElementById("song-select");
  const prevBtn = document.getElementById("prev-btn");
  const nextBtn = document.getElementById("next-btn");
  const numberInput = document.getElementById("song-number");
  const selectNumberBtn = document.getElementById("select-number-btn");
  const externalUrlInput = document.getElementById("external-url");
  const showUrlBtn = document.getElementById("show-url-btn");
  const previewTitle = document.getElementById("preview-title");
  const previewLines = document.getElementById("preview-lines");
  const errorMessage = document.getElementById("error-message");

  let songs = [];
  let currentNumber = null;
  let currentExternalUrl = null;
  let busy = false;

  function showError(message) {
    errorMessage.textContent = message;
    errorMessage.classList.remove("hidden");
  }

  function clearError() {
    errorMessage.textContent = "";
    errorMessage.classList.add("hidden");
  }

  function renderExternalPreview(url) {
    previewTitle.textContent = "External web page";
    previewLines.innerHTML = `<p class="preview-line">Audience opens lyrics in a second tab:</p><p class="preview-line"><a href="${escapeHtml(
      url
    )}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></p><p class="preview-line">That tab closes automatically when you select a PDF song.</p>`;
  }

  function isValidHttpUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_err) {
      return false;
    }
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
      currentExternalUrl = null;
      populateSelect(number);
      numberInput.value = String(number);
      renderPreview(song);
    } catch (err) {
      showError(err.message || "Could not update the current song.");
    } finally {
      busy = false;
    }
  }

  async function showExternalUrl() {
    if (busy) {
      return;
    }

    const url = externalUrlInput.value.trim();
    if (!isValidHttpUrl(url)) {
      showError("Enter a valid http or https URL.");
      return;
    }

    busy = true;
    clearError();

    try {
      await window.SongtextSync.setExternalUrl(url);
      currentNumber = null;
      currentExternalUrl = url;
      renderExternalPreview(url);
    } catch (err) {
      showError(err.message || "Could not show the external page.");
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

    showUrlBtn.addEventListener("click", () => {
      showExternalUrl();
    });

    externalUrlInput.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        showUrlBtn.click();
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
        const state = await window.SongtextSync.getCurrentDisplay();
        if (state.externalUrl) {
          currentExternalUrl = state.externalUrl;
          externalUrlInput.value = state.externalUrl;
          renderExternalPreview(state.externalUrl);
        } else if (typeof state.songNumber === "number") {
          currentNumber = state.songNumber;
        }
      } catch (_err) {
        // Ignore read errors on first load.
      }

      if (currentExternalUrl) {
        // Already showing an external page.
      } else if (currentNumber == null) {
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
