(function () {
  "use strict";

  const config = window.SONGTEXT_CONFIG;
  let db = null;
  let firebaseReady = false;

  function isConfigured() {
    const fb = config.firebase;
    return fb && fb.apiKey && !fb.apiKey.startsWith("YOUR_");
  }

  function initFirebase() {
    if (!isConfigured() || firebaseReady) {
      return Promise.resolve(firebaseReady);
    }

    return new Promise((resolve, reject) => {
      if (typeof firebase === "undefined") {
        reject(new Error("Firebase SDK not loaded"));
        return;
      }

      try {
        if (!firebase.apps.length) {
          firebase.initializeApp(config.firebase);
        }
        db = firebase.database();
        firebaseReady = true;
        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  }

  function parseStateValue(value) {
    if (typeof value === "number") {
      return { songNumber: value, externalUrl: null };
    }
    if (typeof value === "string" && value.length) {
      return { songNumber: null, externalUrl: value };
    }
    return { songNumber: null, externalUrl: null };
  }

  async function getCurrentDisplay() {
    await initFirebase();
    if (!db) {
      throw new Error("Firebase is not configured. See README for setup.");
    }

    const snapshot = await db.ref(config.statePath).once("value");
    return parseStateValue(snapshot.val());
  }

  async function getCurrentSongNumber() {
    const state = await getCurrentDisplay();
    return state.songNumber;
  }

  async function getExternalUrl() {
    const state = await getCurrentDisplay();
    return state.externalUrl;
  }

  async function setCurrentSongNumber(number) {
    await initFirebase();
    if (!db) {
      throw new Error("Firebase is not configured. See README for setup.");
    }

    await db.ref(config.statePath).set(number);
  }

  async function setExternalUrl(url) {
    await initFirebase();
    if (!db) {
      throw new Error("Firebase is not configured. See README for setup.");
    }

    await db.ref(config.statePath).set(url);
  }

  function watchCurrentSongNumber(onChange) {
    return initFirebase().then(() => {
      if (!db) {
        throw new Error("Firebase is not configured. See README for setup.");
      }

      const ref = db.ref(config.statePath);
      ref.on("value", (snapshot) => {
        const state = parseStateValue(snapshot.val());
        if (typeof state.songNumber === "number") {
          onChange(state.songNumber);
        }
      });
      return () => ref.off("value");
    });
  }

  window.SongtextSync = {
    isConfigured,
    initFirebase,
    getCurrentDisplay,
    getCurrentSongNumber,
    getExternalUrl,
    setCurrentSongNumber,
    setExternalUrl,
    watchCurrentSongNumber,
  };
})();
