(function () {
  "use strict";

  const config = window.SONGTEXT_CONFIG;
  const contentEl = document.getElementById("song-content");
  const pageTitleEl = document.getElementById("page-title");
  const statusBarEl = document.querySelector(".status-bar");
  const statusDot = document.getElementById("status-dot");
  const syncStatus = document.getElementById("sync-status");
  const statusText = document.getElementById("status-text");

  const copy = {
    baseTitle: "Now singing",
    songLabel: (title) => `Now singing — ${title}`,
    webTitle: "Now singing — Web",
    connecting: "Connecting…",
    waitingForSong: "Waiting for a song to be selected",
    waitingForOperator: "Waiting for the operator to select a song…",
    noSongSelected: "No song selected yet",
    noPageImages: "No lyrics are available for this song.",
    missingSongImages: "Missing song images",
    pageAlt: (title, pageNumber) => `${title} — page ${pageNumber}`,
    songNotInCatalogue: (number) => `Song number ${number} is not in the catalogue`,
    syncError: "Sync error",
    firebaseNotConfigured: "Firebase is not configured — edit public/js/config.js",
    setupRequired: "Setup required",
    failedToStartViewer: "Failed to start the viewer",
    failedToStart: "Failed to start",
    iframeTitle: "Lyrics",
    iframeNotShowing: "Page not showing?",
    openInBrowser: "Open in browser",
    externalWebsite: "The lyrics are on an external website.",
    openLyrics: "Open lyrics",
    openingLyricsTab: "Opening lyrics in another tab…",
    lyricsTabOpen:
      "Lyrics opened in another tab. It will close automatically when a PDF song is selected.",
    allowPopups:
      "Allow pop-ups so lyrics can open automatically, or tap the button below.",
  };

  const LYRICS_WINDOW_NAME = "songtext_lyrics";

  let songs = [];
  let currentNumber = null;
  let currentExternalUrl = null;
  let pollTimer = null;
  let lyricsWindow = null;

  function externalUrlMode() {
    const mode = config.externalUrlMode;
    if (mode === "redirect") {
      return "open";
    }
    return mode === "iframe" ? "iframe" : "open";
  }

  function adoptPreopenedLyricsWindow() {
    if (
      window.__songtextPreopenedLyricsWindow &&
      !window.__songtextPreopenedLyricsWindow.closed
    ) {
      lyricsWindow = window.__songtextPreopenedLyricsWindow;
      return;
    }

    try {
      const reclaimed = window.open("", LYRICS_WINDOW_NAME);
      if (reclaimed && !reclaimed.closed) {
        lyricsWindow = reclaimed;
      }
    } catch (_err) {
      // Ignore reclaim errors.
    }
  }

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
      pageTitleEl.textContent = copy.songLabel(song.title);
    } else {
      pageTitleEl.textContent = copy.baseTitle;
    }
  }

  function renderExternalUrlIframe(url) {
    setPageTitle(null);
    pageTitleEl.textContent = copy.webTitle;
    clearStatus();
    contentEl.className = "viewer-external";
    contentEl.innerHTML = `<iframe
      class="viewer-iframe"
      src="${escapeHtml(url)}"
      title="${escapeHtml(copy.iframeTitle)}"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
    <p class="viewer-external-fallback">
      ${escapeHtml(copy.iframeNotShowing)}
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(copy.openInBrowser)}</a>
    </p>`;
  }

  function isLyricsTabOpen() {
    return Boolean(lyricsWindow && !lyricsWindow.closed);
  }

  function closeExternalLyricsTab() {
    if (lyricsWindow && !lyricsWindow.closed) {
      try {
        lyricsWindow.close();
      } catch (_err) {
        // Ignore close errors (some mobile browsers restrict this).
      }
    }
    lyricsWindow = null;
  }

  function openExternalLyricsTab(url) {
    adoptPreopenedLyricsWindow();

    if (isLyricsTabOpen()) {
      try {
        lyricsWindow.location.href = url;
        lyricsWindow.focus();
        return true;
      } catch (_err) {
        closeExternalLyricsTab();
      }
    }

    const opened = window.open(url, LYRICS_WINDOW_NAME);
    if (!opened) {
      return false;
    }

    lyricsWindow = opened;
    try {
      lyricsWindow.focus();
    } catch (_err) {
      // Ignore focus errors.
    }
    return true;
  }

  function updateExternalUrlHint(lyricsTabOpened) {
    const hintEl = document.getElementById("open-lyrics-hint");
    const openBtn = document.getElementById("open-lyrics-btn");
    if (!hintEl || !openBtn) {
      return;
    }

    if (lyricsTabOpened) {
      hintEl.textContent = copy.lyricsTabOpen;
      openBtn.classList.add("hidden");
      return;
    }

    hintEl.textContent = copy.allowPopups;
    openBtn.classList.remove("hidden");
  }

  function wireOpenLyricsButton(url) {
    const openBtn = document.getElementById("open-lyrics-btn");
    if (!openBtn) {
      return;
    }

    openBtn.addEventListener("click", () => {
      const opened = openExternalLyricsTab(url);
      updateExternalUrlHint(opened);
    });
  }

  function renderExternalUrlOpen(url, lyricsTabOpened) {
    setPageTitle(null);
    pageTitleEl.textContent = copy.webTitle;
    clearStatus();
    contentEl.className = "viewer-external-redirect";

    const hint = lyricsTabOpened ? copy.lyricsTabOpen : copy.openingLyricsTab;

    const buttonClass = lyricsTabOpened ? "btn viewer-redirect-btn hidden" : "btn viewer-redirect-btn";

    contentEl.innerHTML = `<p class="viewer-redirect-message">${escapeHtml(copy.externalWebsite)}</p>
    <button type="button" class="${buttonClass}" id="open-lyrics-btn">${escapeHtml(copy.openLyrics)}</button>
    <p class="viewer-external-fallback" id="open-lyrics-hint">${escapeHtml(hint)}</p>`;

    wireOpenLyricsButton(url);
  }

  function renderExternalUrl(url) {
    if (externalUrlMode() === "iframe") {
      renderExternalUrlIframe(url);
      return;
    }
    renderExternalUrlOpen(url, false);
  }

  function renderSong(song) {
    if (!song) {
      closeExternalLyricsTab();
      document.body.classList.remove("song-active");
      setPageTitle(null);
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = `<p>${escapeHtml(copy.waitingForOperator)}</p>`;
      statusText.textContent = copy.noSongSelected;
      statusText.classList.remove("hidden");
      setStatus("", copy.waitingForSong);
      return;
    }

    if (!song.pages || !song.pages.length) {
      document.body.classList.remove("song-active");
      setPageTitle(song);
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = `<p>${escapeHtml(copy.noPageImages)}</p>`;
      setStatus("error", copy.missingSongImages);
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
            copy.pageAlt(song.title, index + 1)
          )}" loading="eager" />`
      )
      .join("");
  }

  function ensureExternalLyricsTab(url) {
    if (isLyricsTabOpen()) {
      try {
        if (lyricsWindow.location.href !== url) {
          lyricsWindow.location.href = url;
        }
        lyricsWindow.focus();
        return true;
      } catch (_err) {
        closeExternalLyricsTab();
      }
    }

    return openExternalLyricsTab(url);
  }

  async function applyExternalUrl(url) {
    const urlChanged = url !== currentExternalUrl;
    if (urlChanged) {
      currentExternalUrl = url;
      currentNumber = null;
    }

    if (externalUrlMode() === "iframe") {
      if (urlChanged) {
        renderExternalUrl(url);
      }
      return;
    }

    if (!urlChanged && isLyricsTabOpen()) {
      return;
    }

    if (urlChanged) {
      renderExternalUrlOpen(url, false);
    }

    const opened = ensureExternalLyricsTab(url);
    updateExternalUrlHint(opened);
  }

  async function applySongNumber(number) {
    if (number === currentNumber && currentExternalUrl == null) {
      return;
    }

    const song = window.SongtextSongs.findByNumber(songs, number);
    if (!song) {
      setStatus("error", copy.songNotInCatalogue(number));
      return;
    }

    closeExternalLyricsTab();
    currentExternalUrl = null;
    currentNumber = number;
    renderSong(song);
  }

  async function pollCurrentDisplay() {
    try {
      const state = await window.SongtextSync.getCurrentDisplay();

      if (state.externalUrl) {
        await applyExternalUrl(state.externalUrl);
        return;
      }

      if (currentExternalUrl) {
        closeExternalLyricsTab();
        currentExternalUrl = null;
      }

      if (typeof state.songNumber === "number") {
        await applySongNumber(state.songNumber);
      } else {
        currentNumber = null;
        renderSong(null);
      }
    } catch (err) {
      setStatus("error", err.message || copy.syncError);
    }
  }

  async function start() {
    try {
      adoptPreopenedLyricsWindow();

      const viewerUrl = new URL("viewer.html", window.location.href).href;
      const qrImage = document.getElementById("viewer-qr");
      if (qrImage) {
        qrImage.src =
          "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
          encodeURIComponent(viewerUrl);
      }

      songs = await window.SongtextSongs.loadCatalogue();
      if (!window.SongtextSync.isConfigured()) {
        setStatus("error", copy.firebaseNotConfigured);
        statusText.textContent = copy.setupRequired;
        return;
      }

      await window.SongtextSync.initFirebase();
      await pollCurrentDisplay();

      pollTimer = window.setInterval(pollCurrentDisplay, config.pollIntervalMs);
    } catch (err) {
      setStatus("error", err.message || copy.failedToStartViewer);
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = `<p>${escapeHtml(err.message || copy.failedToStart)}</p>`;
    }
  }

  window.addEventListener("beforeunload", () => {
    closeExternalLyricsTab();
    if (pollTimer) {
      window.clearInterval(pollTimer);
    }
  });

  start();
})();
