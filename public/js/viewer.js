(function () {
  "use strict";

  const config = window.SONGTEXT_CONFIG;
  const contentEl = document.getElementById("song-content");
  const pageTitleEl = document.getElementById("page-title");
  const statusBarEl = document.querySelector(".status-bar");
  const statusDot = document.getElementById("status-dot");
  const syncStatus = document.getElementById("sync-status");
  const statusText = document.getElementById("status-text");

  const hu = {
    baseTitle: "Most ezt énekeljük",
    songLabel: (title) => `Most ezt énekeljük — Dal: ${title}`,
    webTitle: "Most ezt énekeljük — Web",
    connecting: "Kapcsolódás…",
    waitingForSong: "Várakozás a dal kiválasztására",
    waitingForOperator: "Várakozás, amíg a kezelő kiválaszt egy dalt…",
    noSongSelected: "Még nincs dal kiválasztva",
    noPageImages: "Ehhez a dalhoz nem érhető el szöveg.",
    missingSongImages: "Hiányzó dal képek",
    pageAlt: (title, pageNumber) => `${title} — ${pageNumber}. oldal`,
    songNotInCatalogue: (number) => `A(z) ${number}. számú dal nem szerepel a listában`,
    syncError: "Szinkronizálási hiba",
    firebaseNotConfigured: "A Firebase nincs beállítva — szerkeszd a public/js/config.js fájlt",
    setupRequired: "Beállítás szükséges",
    failedToStartViewer: "A megjelenítő indítása sikertelen",
    failedToStart: "Indítás sikertelen",
    iframeTitle: "Dalszöveg",
    iframeNotShowing: "Nem jelenik meg az oldal?",
    openInBrowser: "Megnyitás böngészőben",
    externalWebsite: "A dalszöveg egy külső weboldalon van.",
    openLyrics: "Dalszöveg megnyitása",
    openingLyricsTab: "Dalszöveg megnyitása másik lapon…",
    lyricsTabOpen:
      "A dalszöveg megnyílt egy másik lapon. PDF dal választásakor automatikusan bezáródik.",
    allowPopups:
      "Engedélyezd a felugró ablakokat, hogy a dalszöveg automatikusan megnyílhasson, vagy érintsd meg az alábbi gombot.",
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
      pageTitleEl.textContent = hu.songLabel(song.title);
    } else {
      pageTitleEl.textContent = hu.baseTitle;
    }
  }

  function renderExternalUrlIframe(url) {
    setPageTitle(null);
    pageTitleEl.textContent = hu.webTitle;
    clearStatus();
    contentEl.className = "viewer-external";
    contentEl.innerHTML = `<iframe
      class="viewer-iframe"
      src="${escapeHtml(url)}"
      title="${escapeHtml(hu.iframeTitle)}"
      referrerpolicy="no-referrer-when-downgrade"
    ></iframe>
    <p class="viewer-external-fallback">
      ${escapeHtml(hu.iframeNotShowing)}
      <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(hu.openInBrowser)}</a>
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
      hintEl.textContent = hu.lyricsTabOpen;
      openBtn.classList.add("hidden");
      return;
    }

    hintEl.textContent = hu.allowPopups;
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
    pageTitleEl.textContent = hu.webTitle;
    clearStatus();
    contentEl.className = "viewer-external-redirect";

    const hint = lyricsTabOpened ? hu.lyricsTabOpen : hu.openingLyricsTab;

    const buttonClass = lyricsTabOpened ? "btn viewer-redirect-btn hidden" : "btn viewer-redirect-btn";

    contentEl.innerHTML = `<p class="viewer-redirect-message">${escapeHtml(hu.externalWebsite)}</p>
    <button type="button" class="${buttonClass}" id="open-lyrics-btn">${escapeHtml(hu.openLyrics)}</button>
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
      contentEl.innerHTML = `<p>${escapeHtml(hu.waitingForOperator)}</p>`;
      statusText.textContent = hu.noSongSelected;
      statusText.classList.remove("hidden");
      setStatus("", hu.waitingForSong);
      return;
    }

    if (!song.pages || !song.pages.length) {
      document.body.classList.remove("song-active");
      setPageTitle(song);
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = `<p>${escapeHtml(hu.noPageImages)}</p>`;
      setStatus("error", hu.missingSongImages);
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
            hu.pageAlt(song.title, index + 1)
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
      setStatus("error", hu.songNotInCatalogue(number));
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
      setStatus("error", err.message || hu.syncError);
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
        setStatus("error", hu.firebaseNotConfigured);
        statusText.textContent = hu.setupRequired;
        return;
      }

      await window.SongtextSync.initFirebase();
      await pollCurrentDisplay();

      pollTimer = window.setInterval(pollCurrentDisplay, config.pollIntervalMs);
    } catch (err) {
      setStatus("error", err.message || hu.failedToStartViewer);
      contentEl.className = "viewer-empty";
      contentEl.innerHTML = `<p>${escapeHtml(err.message || hu.failedToStart)}</p>`;
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
